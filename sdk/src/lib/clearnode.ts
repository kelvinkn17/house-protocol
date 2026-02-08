// player-side clearnode WS client for 2-party app session signing
// flow: connect -> auth (EIP-712 wallet popup) -> poll ledger balance -> sign createAppSession -> keep alive
// the connection must stay open until clearnode confirms the session

import {
  createECDSAMessageSigner,
  createAuthRequestMessage,
  createAuthVerifyMessageFromChallenge,
  createEIP712AuthMessageSigner,
  createAppSessionMessage,
  createGetLedgerBalancesMessage,
} from '@erc7824/nitrolite'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import type { WalletClient } from 'viem'

const DEFAULT_CLEARNODE_URL = 'wss://nitrolite.kwek.dev/ws'
const APP_NAME = 'the-house-protocol'
const ASSET_SYMBOL = 'usdh'

const BALANCE_POLL_INTERVAL = 2000
const BALANCE_POLL_MAX_ATTEMPTS = 20

let activeWs: WebSocket | null = null

export async function playerSignAppSession(
  walletClient: WalletClient,
  playerAddress: string,
  definition: Record<string, unknown>,
  allocations: Array<{ participant: string; asset: string; amount: string }>,
  brokerSignature: string,
  requestId: number,
  timestamp: number,
  onDepositNeeded?: (deficit: string) => Promise<void>,
  clearnodeUrl?: string,
): Promise<string> {
  console.log('[clearnode] starting session signing for', playerAddress)

  const sessionKey = generatePrivateKey()
  const sessionAccount = privateKeyToAccount(sessionKey)
  const sessionSigner = createECDSAMessageSigner(sessionKey)

  const playerAlloc = allocations.find(
    a => a.participant.toLowerCase() === playerAddress.toLowerCase(),
  )
  const requiredAmount = parseFloat(playerAlloc?.amount || '0')

  const authConfig = {
    session_key: sessionAccount.address,
    allowances: [{ asset: ASSET_SYMBOL, amount: '100000000000' }],
    expires_at: BigInt(Math.floor(Date.now() / 1000) + 86400),
    scope: APP_NAME,
  }

  const wsUrl = clearnodeUrl || DEFAULT_CLEARNODE_URL

  return new Promise((resolve, reject) => {
    if (activeWs) {
      activeWs.close()
      activeWs = null
    }

    const ws = new WebSocket(wsUrl)
    let settled = false
    let pollAttempts = 0
    let pollTimer: ReturnType<typeof setTimeout> | null = null
    let depositTriggered = false

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        if (pollTimer) clearTimeout(pollTimer)
        ws.close()
        activeWs = null
        reject(new Error('Clearnode signing timeout'))
      }
    }, 90000)

    const fail = (err: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (pollTimer) clearTimeout(pollTimer)
      ws.close()
      activeWs = null
      reject(err)
    }

    const submitSession = async () => {
      const playerMsg = await createAppSessionMessage(sessionSigner, {
        definition,
        allocations,
      } as any, requestId, timestamp)
      const playerParsed = JSON.parse(playerMsg)
      playerParsed.sig = [...playerParsed.sig, brokerSignature]
      ws.send(JSON.stringify(playerParsed))
    }

    const checkBalance = async () => {
      const msg = await createGetLedgerBalancesMessage(sessionSigner)
      ws.send(msg)
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

          const eip712Signer = createEIP712AuthMessageSigner(
            walletClient as any,
            authConfig,
            { name: APP_NAME },
          )
          const verifyMsg = await createAuthVerifyMessageFromChallenge(eip712Signer, challenge)
          ws.send(verifyMsg)
        }

        if (method === 'auth_verify' && params?.success) {
          try {
            await checkBalance()
          } catch (err) {
            fail(err as Error)
          }
        }

        if (method === 'get_ledger_balances') {
          const balances = params?.ledger_balances || params?.balances || []
          const entry = (balances as Array<{ asset: string; amount: string }>).find(
            b => b.asset === ASSET_SYMBOL,
          )
          const available = parseFloat(entry?.amount || '0')

          if (available >= requiredAmount) {
            try {
              await submitSession()
            } catch (err) {
              fail(err as Error)
            }
          } else if (!depositTriggered && onDepositNeeded) {
            depositTriggered = true
            const deficitHuman = requiredAmount - available
            const deficitRaw = Math.ceil(deficitHuman * 1e6)
            try {
              await onDepositNeeded(String(deficitRaw))
              pollAttempts = 0
              pollTimer = setTimeout(async () => {
                try { await checkBalance() } catch (err) { fail(err as Error) }
              }, BALANCE_POLL_INTERVAL)
            } catch (err) {
              fail(err as Error)
            }
          } else {
            pollAttempts++
            if (pollAttempts >= BALANCE_POLL_MAX_ATTEMPTS) {
              fail(new Error(`Clearnode ledger sync timeout: have ${available}, need ${requiredAmount}`))
              return
            }
            pollTimer = setTimeout(async () => {
              try {
                await checkBalance()
              } catch (err) {
                fail(err as Error)
              }
            }, BALANCE_POLL_INTERVAL)
          }
        }

        if (method === 'create_app_session') {
          if (params?.app_session_id) {
            if (!settled) {
              settled = true
              clearTimeout(timer)
              if (pollTimer) clearTimeout(pollTimer)
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
        // ignore parse errors
      }
    }

    ws.onerror = () => {
      fail(new Error('Clearnode connection failed'))
    }

    ws.onclose = () => {
      // noop
    }
  })
}

export function disconnectClearnode() {
  if (activeWs) {
    activeWs.close()
    activeWs = null
  }
}
