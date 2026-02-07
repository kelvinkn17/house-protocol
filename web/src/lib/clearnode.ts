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

const CLEARNODE_URL = 'wss://nitrolite.kwek.dev/ws'
const APP_NAME = 'the-house-protocol'
const ASSET_SYMBOL = 'usdh'

// polling config for ledger balance sync
const BALANCE_POLL_INTERVAL = 2000
const BALANCE_POLL_MAX_ATTEMPTS = 20 // 40s max wait

// keep reference to the active clearnode WS so we can close it later
let activeWs: WebSocket | null = null

// sign an app session on clearnode as the player
// authenticates via EIP-712 (wallet popup), checks clearnode ledger,
// triggers on-chain deposit if needed, waits for ledger sync,
// combines player + broker signatures, submits to clearnode
// returns the app_session_id from clearnode
//
// onDepositNeeded: called when clearnode ledger is insufficient.
// receives the deficit amount (as bigint string). caller should do the on-chain custody deposit.
export async function playerSignAppSession(
  walletClient: WalletClient,
  playerAddress: string,
  definition: Record<string, unknown>,
  allocations: Array<{ participant: string; asset: string; amount: string }>,
  brokerSignature: string,
  requestId: number,
  timestamp: number,
  onDepositNeeded?: (deficit: string) => Promise<void>,
): Promise<string> {
  console.log('[clearnode] starting session signing for', playerAddress)
  console.log('[clearnode] allocations:', JSON.stringify(allocations))
  console.log('[clearnode] brokerSig:', brokerSignature.slice(0, 20) + '...')

  // ephemeral session key, fresh each time
  const sessionKey = generatePrivateKey()
  const sessionAccount = privateKeyToAccount(sessionKey)
  const sessionSigner = createECDSAMessageSigner(sessionKey)

  console.log('[clearnode] session key:', sessionAccount.address)

  // figure out how much the player needs in the clearnode ledger
  const playerAlloc = allocations.find(
    a => a.participant.toLowerCase() === playerAddress.toLowerCase(),
  )
  const requiredAmount = parseFloat(playerAlloc?.amount || '0')
  console.log('[clearnode] required ledger balance:', requiredAmount, ASSET_SYMBOL)

  const authConfig = {
    session_key: sessionAccount.address,
    allowances: [{ asset: ASSET_SYMBOL, amount: '100000000000' }],
    expires_at: BigInt(Math.floor(Date.now() / 1000) + 86400),
    scope: APP_NAME,
  }

  return new Promise((resolve, reject) => {
    if (activeWs) {
      console.log('[clearnode] closing previous WS connection')
      activeWs.close()
      activeWs = null
    }

    console.log('[clearnode] connecting to', CLEARNODE_URL)
    const ws = new WebSocket(CLEARNODE_URL)
    let settled = false
    let pollAttempts = 0
    let pollTimer: ReturnType<typeof setTimeout> | null = null
    let depositTriggered = false // only deposit once per attempt

    const timer = setTimeout(() => {
      if (!settled) {
        console.error('[clearnode] TIMEOUT after 90s')
        settled = true
        if (pollTimer) clearTimeout(pollTimer)
        ws.close()
        activeWs = null
        reject(new Error('Clearnode signing timeout'))
      }
    }, 90000)

    const fail = (err: Error) => {
      if (settled) return
      console.error('[clearnode] FAIL:', err.message)
      settled = true
      clearTimeout(timer)
      if (pollTimer) clearTimeout(pollTimer)
      ws.close()
      activeWs = null
      reject(err)
    }

    // send the combined create_app_session message
    const submitSession = async () => {
      console.log('[clearnode] submitting combined create_app_session...')
      const playerMsg = await createAppSessionMessage(sessionSigner, {
        definition,
        allocations,
      } as any, requestId, timestamp)
      const playerParsed = JSON.parse(playerMsg)

      // combine both signatures: [player, broker] matching participants order
      playerParsed.sig = [...playerParsed.sig, brokerSignature]
      console.log('[clearnode] sending message with', playerParsed.sig.length, 'signatures')
      ws.send(JSON.stringify(playerParsed))
    }

    // poll clearnode ledger until the custody deposit shows up
    const checkBalance = async () => {
      console.log('[clearnode] checking ledger balance... (attempt', pollAttempts + 1 + ')')
      const msg = await createGetLedgerBalancesMessage(sessionSigner)
      ws.send(msg)
    }

    ws.onopen = async () => {
      console.log('[clearnode] WS connected, sending auth request...')
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
        console.log('[clearnode] <<', method, params ? JSON.stringify(params).slice(0, 200) : '')

        if (method === 'auth_challenge') {
          const challenge = params?.challenge_message
          if (!challenge) return

          console.log('[clearnode] signing EIP-712 auth challenge...')
          const eip712Signer = createEIP712AuthMessageSigner(
            walletClient as any,
            authConfig,
            { name: APP_NAME },
          )
          const verifyMsg = await createAuthVerifyMessageFromChallenge(eip712Signer, challenge)
          ws.send(verifyMsg)
          console.log('[clearnode] auth_verify sent, waiting for confirmation...')
        }

        if (method === 'auth_verify' && params?.success) {
          console.log('[clearnode] authenticated! checking ledger balance...')
          try {
            await checkBalance()
          } catch (err) {
            fail(err as Error)
          }
        }

        if (method === 'get_ledger_balances') {
          const balances = params?.ledger_balances || params?.balances || []
          console.log('[clearnode] raw balances:', JSON.stringify(balances))
          const entry = (balances as Array<{ asset: string; amount: string }>).find(
            b => b.asset === ASSET_SYMBOL,
          )
          const available = parseFloat(entry?.amount || '0')
          console.log('[clearnode] available:', available, '/ required:', requiredAmount)

          if (available >= requiredAmount) {
            console.log('[clearnode] balance sufficient, submitting session...')
            try {
              await submitSession()
            } catch (err) {
              fail(err as Error)
            }
          } else if (!depositTriggered && onDepositNeeded) {
            // first time seeing insufficient balance, trigger on-chain deposit
            depositTriggered = true
            const deficitHuman = requiredAmount - available
            // convert to raw 6-decimal units for on-chain deposit, round up to cover dust
            const deficitRaw = Math.ceil(deficitHuman * 1e6)
            console.log('[clearnode] ledger deficit:', deficitHuman, 'USDH (', deficitRaw, 'raw), triggering deposit...')
            try {
              await onDepositNeeded(String(deficitRaw))
              console.log('[clearnode] on-chain deposit done, polling for clearnode to index...')
              pollAttempts = 0 // reset poll counter, fresh deposit just happened
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
            console.log('[clearnode] insufficient, retrying in', BALANCE_POLL_INTERVAL + 'ms...')
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
            console.log('[clearnode] session created:', params.app_session_id)
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
        // ignore JSON parse errors from non-relevant messages
      }
    }

    ws.onerror = (e) => {
      console.error('[clearnode] WS error:', e)
      fail(new Error('Clearnode connection failed'))
    }

    ws.onclose = (e) => {
      console.log('[clearnode] WS closed, code:', e.code, 'reason:', e.reason)
    }
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
