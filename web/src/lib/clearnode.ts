// player-side clearnode WS client for 2-party app session signing
// flow: connect -> auth (EIP-712 wallet popup) -> sign createAppSession -> keep alive
// the connection must stay open until the broker also signs and clearnode confirms

import {
  createECDSAMessageSigner,
  createAuthRequestMessage,
  createAuthVerifyMessageFromChallenge,
  createEIP712AuthMessageSigner,
  createAppSessionMessage,
} from '@erc7824/nitrolite'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import type { WalletClient } from 'viem'

const CLEARNODE_URL = 'wss://nitrolite.kwek.dev/ws'
const APP_NAME = 'the-house-protocol'
const ASSET_SYMBOL = 'usdh'

// keep reference to the active clearnode WS so we can close it later
let activeWs: WebSocket | null = null

// sign an app session on clearnode as the player
// authenticates via EIP-712 (wallet popup), combines player + broker signatures, submits to clearnode
// returns the app_session_id from clearnode
// caller must call disconnectClearnode() after session is confirmed
export async function playerSignAppSession(
  walletClient: WalletClient,
  playerAddress: string,
  definition: Record<string, unknown>,
  allocations: Array<{ participant: string; asset: string; amount: string }>,
  brokerSignature: string,
  requestId: number,
  timestamp: number,
): Promise<string> {
  // ephemeral session key, fresh each time
  const sessionKey = generatePrivateKey()
  const sessionAccount = privateKeyToAccount(sessionKey)
  const sessionSigner = createECDSAMessageSigner(sessionKey)

  const authConfig = {
    session_key: sessionAccount.address,
    allowances: [{ asset: ASSET_SYMBOL, amount: '100000000000' }],
    expires_at: BigInt(Math.floor(Date.now() / 1000) + 86400),
    scope: APP_NAME,
  }

  return new Promise((resolve, reject) => {
    // close any previous connection
    if (activeWs) {
      activeWs.close()
      activeWs = null
    }

    const ws = new WebSocket(CLEARNODE_URL)
    let settled = false

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        ws.close()
        activeWs = null
        reject(new Error('Clearnode signing timeout'))
      }
    }, 60000)

    const fail = (err: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      ws.close()
      activeWs = null
      reject(err)
    }

    ws.onopen = async () => {
      try {
        const msg = await createAuthRequestMessage({
          address: playerAddress as `0x${string}`,
          application: APP_NAME,
          ...authConfig,
        })
        ws.send(msg)
      } catch (err) {
        fail(err as Error)
      }
    }

    ws.onmessage = async (event) => {
      try {
        const parsed = JSON.parse(event.data as string)
        if (!parsed.res) return

        const method = parsed.res[1]
        const params = parsed.res[2]

        if (method === 'auth_challenge') {
          const challenge = params?.challenge_message
          if (!challenge) return

          // EIP-712 signature via player's wallet (popup)
          const eip712Signer = createEIP712AuthMessageSigner(
            walletClient as any,
            authConfig,
            { name: APP_NAME },
          )
          const verifyMsg = await createAuthVerifyMessageFromChallenge(eip712Signer, challenge)
          ws.send(verifyMsg)
        }

        if (method === 'auth_verify' && params?.success) {
          // authenticated, now sign and submit combined message
          try {
            // sign with player's session key using same requestId/timestamp as broker
            const playerMsg = await createAppSessionMessage(sessionSigner, {
              definition,
              allocations,
            } as any, requestId, timestamp)
            const playerParsed = JSON.parse(playerMsg)

            // combine both signatures: [player, broker] matching participants order
            playerParsed.sig = [...playerParsed.sig, brokerSignature]
            ws.send(JSON.stringify(playerParsed))
          } catch (err) {
            fail(err as Error)
          }
        }

        if (method === 'create_app_session') {
          if (params?.app_session_id) {
            if (!settled) {
              settled = true
              clearTimeout(timer)
              activeWs = ws
              resolve(params.app_session_id)
            }
          } else {
            fail(new Error(params?.error || 'Failed to create app session'))
          }
        }

        if (method === 'error') {
          fail(new Error(params?.error || params?.message || 'Clearnode error'))
        }
      } catch {
        // ignore JSON parse errors from non-relevant messages
      }
    }

    ws.onerror = () => fail(new Error('Clearnode connection failed'))
  })
}

// close the player's clearnode connection after session is confirmed
// call this after receiving session_created from backend
export function disconnectClearnode() {
  if (activeWs) {
    activeWs.close()
    activeWs = null
  }
}
