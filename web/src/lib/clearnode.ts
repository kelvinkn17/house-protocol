// clearnode client for Nitrolite state channels
// handles player auth + app session lifecycle on the clearnode WS
// the player's wallet signs the auth challenge, an ephemeral session key signs everything else

import {
  createECDSAMessageSigner,
  createAuthRequestMessage,
  createAuthVerifyMessageFromChallenge,
  createEIP712AuthMessageSigner,
  createAppSessionMessage,
  createCloseAppSessionMessage,
} from '@erc7824/nitrolite'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import type { WalletClient, Address, Hex } from 'viem'

const CLEARNODE_URL = import.meta.env.VITE_CLEARNODE_URL || 'wss://nitrolite.kwek.dev/ws'
const ASSET_SYMBOL = 'usdh'
const APP_NAME = 'the-house-protocol'

let ws: WebSocket | null = null
let authenticated = false
let sessionKeyHex: Hex | null = null
let sessionAccount: ReturnType<typeof privateKeyToAccount> | null = null
let sessionSigner: ReturnType<typeof createECDSAMessageSigner> | null = null

function ensureSessionKey() {
  if (!sessionKeyHex) {
    sessionKeyHex = generatePrivateKey()
    sessionAccount = privateKeyToAccount(sessionKeyHex)
    sessionSigner = createECDSAMessageSigner(sessionKeyHex)
  }
  return { sessionKeyHex, sessionAccount: sessionAccount!, sessionSigner: sessionSigner! }
}

// connect to clearnode and authenticate the player
// walletClient is a viem WalletClient backed by Privy provider
export async function authenticate(
  playerAddress: Address,
  walletClient: WalletClient,
): Promise<void> {
  if (authenticated && ws?.readyState === WebSocket.OPEN) return

  const { sessionAccount: sa } = ensureSessionKey()

  return new Promise((resolve, reject) => {
    // close any old connection
    if (ws) {
      ws.onclose = null
      ws.onerror = null
      ws.close()
    }

    ws = new WebSocket(CLEARNODE_URL)

    const authParams = {
      address: playerAddress,
      session_key: sa.address,
      application: APP_NAME,
      scope: APP_NAME,
      expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600),
      allowances: [{ asset: ASSET_SYMBOL, amount: '1000000' }],
    }

    const timeout = setTimeout(() => {
      reject(new Error('Clearnode auth timeout'))
    }, 30000)

    ws.onopen = async () => {
      try {
        const msg = await createAuthRequestMessage({
          address: authParams.address,
          application: authParams.application,
          session_key: authParams.session_key,
          allowances: authParams.allowances,
          expires_at: authParams.expires_at,
          scope: authParams.scope,
        })
        ws!.send(msg)
      } catch (err) {
        clearTimeout(timeout)
        reject(err)
      }
    }

    ws.onmessage = async (event) => {
      try {
        const parsed = JSON.parse(event.data)
        if (!parsed.res) return

        const method = parsed.res[1]
        const params = parsed.res[2]

        if (method === 'auth_challenge') {
          const challenge = params?.challenge_message
          if (challenge) {
            const eip712Signer = createEIP712AuthMessageSigner(
              walletClient,
              {
                scope: authParams.scope,
                session_key: authParams.session_key,
                expires_at: authParams.expires_at,
                allowances: authParams.allowances,
              },
              { name: authParams.application },
            )
            const verifyMsg = await createAuthVerifyMessageFromChallenge(eip712Signer, challenge)
            ws!.send(verifyMsg)
          }
        }

        if (method === 'auth_verify' && params?.success) {
          clearTimeout(timeout)
          authenticated = true
          resolve()
        }

        if (method === 'error') {
          clearTimeout(timeout)
          reject(new Error(params?.error || params?.message || 'Auth failed'))
        }
      } catch {
        // ignore parse errors
      }
    }

    ws.onerror = () => {
      clearTimeout(timeout)
      reject(new Error('Clearnode connection error'))
    }

    ws.onclose = () => {
      authenticated = false
    }
  })
}

// create an app session on the clearnode
// definition, allocations, requestId, timestamp, brokerSigs all come from the backend
export async function openAppSession(
  definition: Record<string, unknown>,
  allocations: Array<{ participant: string; asset: string; amount: string }>,
  brokerSigs: string[],
  requestId: number,
  timestamp: number,
): Promise<string> {
  if (!authenticated || !ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error('Not authenticated with clearnode')
  }

  const { sessionSigner: signer } = ensureSessionKey()

  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      if (ws) ws.removeEventListener('message', handleMessage as EventListener)
      reject(new Error('Timeout creating app session'))
    }, 30000)

    function handleMessage(event: MessageEvent) {
      try {
        const data = JSON.parse(event.data)
        if (!data.res) return

        const method = data.res[1]
        const params = data.res[2]

        if (method === 'create_app_session') {
          clearTimeout(timeout)
          ws!.removeEventListener('message', handleMessage as EventListener)
          if (params?.app_session_id) {
            resolve(params.app_session_id)
          } else {
            reject(new Error(params?.error || 'Failed to create app session'))
          }
        }

        if (method === 'error') {
          clearTimeout(timeout)
          ws!.removeEventListener('message', handleMessage as EventListener)
          reject(new Error(params?.error || params?.message || 'Session creation failed'))
        }
      } catch {
        // ignore
      }
    }

    ws!.addEventListener('message', handleMessage as EventListener)

    try {
      // player signs the same params the broker signed
      const playerMsg = await createAppSessionMessage(
        signer,
        { definition, allocations } as any,
        requestId,
        timestamp,
      )
      const parsed = JSON.parse(playerMsg)

      // combine player sigs + broker sigs
      parsed.sig = [...parsed.sig, ...brokerSigs]

      ws!.send(JSON.stringify(parsed))
    } catch (err) {
      clearTimeout(timeout)
      ws!.removeEventListener('message', handleMessage as EventListener)
      reject(err)
    }
  })
}

// close an app session on the clearnode
// only player session key needs to sign (weights: [100, 0], quorum: 100)
export async function closeAppSession(
  appSessionId: string,
  playerAddress: Address,
  brokerAddress: Address,
  playerAmount: string,
  brokerAmount: string,
): Promise<void> {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error('Not connected to clearnode')
  }

  const { sessionSigner: signer } = ensureSessionKey()

  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      if (ws) ws.removeEventListener('message', handleMessage as EventListener)
      reject(new Error('Timeout closing app session'))
    }, 15000)

    function handleMessage(event: MessageEvent) {
      try {
        const data = JSON.parse(event.data)
        if (!data.res) return

        const method = data.res[1]
        const params = data.res[2]

        if (method === 'close_app_session') {
          clearTimeout(timeout)
          ws!.removeEventListener('message', handleMessage as EventListener)
          if (params?.status === 'closed' || params?.app_session_id) {
            resolve()
          } else {
            reject(new Error(params?.error || 'Failed to close session'))
          }
        }

        if (method === 'error') {
          clearTimeout(timeout)
          ws!.removeEventListener('message', handleMessage as EventListener)
          reject(new Error(params?.error || params?.message || 'Close failed'))
        }
      } catch {
        // ignore
      }
    }

    ws!.addEventListener('message', handleMessage as EventListener)

    try {
      const allocations = [
        { participant: playerAddress, asset: ASSET_SYMBOL, amount: playerAmount },
        { participant: brokerAddress, asset: ASSET_SYMBOL, amount: brokerAmount },
      ]

      const msg = await createCloseAppSessionMessage(signer, {
        app_session_id: appSessionId as Hex,
        allocations,
      })
      ws!.send(msg)
    } catch (err) {
      clearTimeout(timeout)
      ws!.removeEventListener('message', handleMessage as EventListener)
      reject(err)
    }
  })
}

export function disconnect() {
  if (ws) {
    ws.onclose = null
    ws.onerror = null
    ws.close()
    ws = null
  }
  authenticated = false
  sessionKeyHex = null
  sessionAccount = null
  sessionSigner = null
}

export function isAuthenticated(): boolean {
  return authenticated && ws?.readyState === WebSocket.OPEN
}

export const ClearnodeClient = {
  authenticate,
  openAppSession,
  closeAppSession,
  disconnect,
  isAuthenticated,
}
