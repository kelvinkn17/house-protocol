// player-side clearnode WS client for 2-party app session signing
// flow: connect -> auth (EIP-712 wallet popup) -> sign createAppSession -> disconnect
// only used during session creation, not needed afterwards

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

// sign an app session on clearnode as the player
// authenticates via EIP-712 (wallet popup), signs createAppSessionMessage, sends to clearnode
export async function playerSignAppSession(
  walletClient: WalletClient,
  playerAddress: string,
  definition: Record<string, unknown>,
  allocations: Array<{ participant: string; asset: string; amount: string }>,
): Promise<void> {
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
    const ws = new WebSocket(CLEARNODE_URL)
    let settled = false

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        ws.close()
        reject(new Error('Clearnode signing timeout'))
      }
    }, 60000)

    const finish = (err?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (err) {
        ws.close()
        reject(err)
      } else {
        // small delay so clearnode processes the signed message before we disconnect
        setTimeout(() => {
          ws.close()
          resolve()
        }, 2000)
      }
    }

    ws.onopen = async () => {
      try {
        const msg = await createAuthRequestMessage({
          address: playerAddress,
          application: APP_NAME,
          ...authConfig,
        })
        ws.send(msg)
      } catch (err) {
        finish(err as Error)
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
          // authenticated, now sign the app session
          try {
            const msg = await createAppSessionMessage(sessionSigner, {
              definition,
              allocations,
            } as any)
            ws.send(msg)
            // signed and sent, finish after a short delay
            finish()
          } catch (err) {
            finish(err as Error)
          }
        }

        if (method === 'create_app_session') {
          // clearnode responded to us too (might happen), all good
          finish()
        }

        if (method === 'error') {
          finish(new Error(params?.error || params?.message || 'Clearnode error'))
        }
      } catch {
        // ignore JSON parse errors from non-relevant messages
      }
    }

    ws.onerror = () => finish(new Error('Clearnode connection failed'))
  })
}
