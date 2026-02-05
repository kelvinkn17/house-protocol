import 'dotenv/config'
import { WebSocket } from 'ws'
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'
import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  formatUnits,
} from 'viem'
import { sepolia } from 'viem/chains'
import {
  createECDSAMessageSigner,
  createAuthRequestMessage,
  createAuthVerifyMessageFromChallenge,
  createEIP712AuthMessageSigner,
  createGetLedgerBalancesMessage,
} from '@erc7824/nitrolite'
import { USDH_ADDRESS, CUSTODY_ADDRESS, BROKER_ADDRESS } from './types'

const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex
const BROKER_PRIVATE_KEY = process.env.BROKER_PRIVATE_KEY as Hex
const RPC_URL = process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'
const CLEARNODE_URL = process.env.CLEARNODE_URL || 'wss://nitrolite.kwek.dev/ws'
const ASSET_SYMBOL = process.env.ASSET_SYMBOL || 'usdh'

const mainAccount = privateKeyToAccount(PRIVATE_KEY)
const brokerAccount = privateKeyToAccount(BROKER_PRIVATE_KEY)

// Session keys for each account
const playerSessionKey = generatePrivateKey()
const playerSessionAccount = privateKeyToAccount(playerSessionKey)
const playerSessionSigner = createECDSAMessageSigner(playerSessionKey)

const brokerSessionKey = generatePrivateKey()
const brokerSessionAccount = privateKeyToAccount(brokerSessionKey)
const brokerSessionSigner = createECDSAMessageSigner(brokerSessionKey)

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
})

// Get custody balance
const CUSTODY_ABI = [
  {
    name: 'getAccountsBalances',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'accounts', type: 'address[]' },
      { name: 'tokens', type: 'address[]' },
    ],
    outputs: [{ name: '', type: 'uint256[][]' }],
  },
] as const

async function getCustodyBalance(account: Hex): Promise<bigint> {
  const balances = await publicClient.readContract({
    address: CUSTODY_ADDRESS,
    abi: CUSTODY_ABI,
    functionName: 'getAccountsBalances',
    args: [[account], [USDH_ADDRESS]],
  })
  return balances[0]?.[0] ?? 0n
}

// Get ledger balance via websocket
async function getLedgerBalance(
  account: typeof mainAccount,
  sessionAccount: typeof playerSessionAccount,
  sessionSigner: ReturnType<typeof createECDSAMessageSigner>,
  label: string
): Promise<bigint> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(CLEARNODE_URL)
    let ledgerBalance = 0n

    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(RPC_URL),
    })

    const authParams = {
      address: account.address,
      session_key: sessionAccount.address,
      application: 'check-ledger',
      scope: 'check-ledger',
      expires_at: BigInt(Math.floor(Date.now() / 1000) + 300),
      allowances: [{ asset: ASSET_SYMBOL, amount: '0' }],
    }

    ws.on('open', async () => {
      try {
        const authRequestMsg = await createAuthRequestMessage({
          address: authParams.address,
          application: authParams.application,
          session_key: authParams.session_key,
          allowances: authParams.allowances,
          expires_at: authParams.expires_at,
          scope: authParams.scope,
        })
        ws.send(authRequestMsg)
      } catch (err) {
        reject(err)
      }
    })

    ws.on('message', async (data) => {
      try {
        const parsed = JSON.parse(data.toString())
        if (parsed.res) {
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
                { name: authParams.application }
              )
              const verifyMsg = await createAuthVerifyMessageFromChallenge(eip712Signer, challenge)
              ws.send(verifyMsg)
            }
          }

          if (method === 'auth_verify' && params?.success) {
            // Authenticated, now get ledger balance
            const msg = await createGetLedgerBalancesMessage(sessionSigner)
            ws.send(msg)
          }

          if (method === 'get_ledger_balances') {
            const balances = params?.ledger_balances || params?.balances
            if (balances && Array.isArray(balances)) {
              for (const bal of balances) {
                if (bal.asset === ASSET_SYMBOL) {
                  ledgerBalance = BigInt(Math.floor(parseFloat(bal.amount)))
                }
              }
            }
            ws.close()
            resolve(ledgerBalance)
          }
        }
      } catch (e) {
        // ignore
      }
    })

    ws.on('error', (err) => {
      reject(err)
    })

    setTimeout(() => {
      ws.close()
      reject(new Error(`Timeout getting ${label} ledger`))
    }, 15000)
  })
}

async function main() {
  console.log('=== Ledger & Custody Balance Check ===\n')

  console.log('Addresses:')
  console.log(`  Player: ${mainAccount.address}`)
  console.log(`  Broker: ${brokerAccount.address}`)
  console.log('')

  // Get custody balances (on-chain)
  console.log('=== ON-CHAIN (Custody Contract) ===')
  const playerCustody = await getCustodyBalance(mainAccount.address)
  const brokerCustody = await getCustodyBalance(brokerAccount.address)
  console.log(`  Player custody: ${formatUnits(playerCustody, 6)} USDH`)
  console.log(`  Broker custody: ${formatUnits(brokerCustody, 6)} USDH`)
  console.log('')

  // Get ledger balances (off-chain)
  console.log('=== OFF-CHAIN (Clearnode Ledger) ===')
  console.log('  Fetching player ledger...')
  const playerLedger = await getLedgerBalance(mainAccount, playerSessionAccount, playerSessionSigner, 'player')
  console.log(`  Player ledger: ${playerLedger} ${ASSET_SYMBOL}`)

  console.log('  Fetching broker ledger...')
  const brokerLedger = await getLedgerBalance(brokerAccount, brokerSessionAccount, brokerSessionSigner, 'broker')
  console.log(`  Broker ledger: ${brokerLedger} ${ASSET_SYMBOL}`)
  console.log('')

  // Summary
  console.log('=== SUMMARY ===')
  console.log('On-chain custody only changes via deposit()/withdraw() tx')
  console.log('Off-chain ledger changes via Nitrolite sessions')
  console.log('')
  console.log(`  Player: custody=${formatUnits(playerCustody, 6)}, ledger=${playerLedger}`)
  console.log(`  Broker: custody=${formatUnits(brokerCustody, 6)}, ledger=${brokerLedger}`)
}

main().catch(console.error)
