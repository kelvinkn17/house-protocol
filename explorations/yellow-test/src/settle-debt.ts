import 'dotenv/config'
import { WebSocket } from 'ws'
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'
import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  type Address,
  formatUnits,
} from 'viem'
import { sepolia } from 'viem/chains'
import {
  createECDSAMessageSigner,
  createAuthRequestMessage,
  createAuthVerifyMessageFromChallenge,
  createEIP712AuthMessageSigner,
  createAppSessionMessage,
  createCloseAppSessionMessage,
  createGetLedgerBalancesMessage,
  createGetConfigMessageV2,
  RPCProtocolVersion,
} from '@erc7824/nitrolite'
import { USDH_ADDRESS, CUSTODY_ADDRESS, BROKER_ADDRESS } from './types'

// =============================================================================
// CONFIG
// =============================================================================

const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex
const BROKER_PRIVATE_KEY = process.env.BROKER_PRIVATE_KEY as Hex
const RPC_URL = process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'
const CLEARNODE_URL = process.env.CLEARNODE_URL || 'wss://nitrolite.kwek.dev/ws'
const ASSET_SYMBOL = process.env.ASSET_SYMBOL || 'usdh'

const APP_NAME = 'settle-debt'

// Withdraw amount (in on-chain units - 6 decimals)
const WITHDRAW_AMOUNT = 50n * 1000000n // 50 USDH

if (!PRIVATE_KEY || !BROKER_PRIVATE_KEY) {
  console.error('ERROR: Missing PRIVATE_KEY or BROKER_PRIVATE_KEY')
  process.exit(1)
}

// =============================================================================
// SETUP
// =============================================================================

const playerAccount = privateKeyToAccount(PRIVATE_KEY)
const brokerAccount = privateKeyToAccount(BROKER_PRIVATE_KEY)
const brokerSigner = createECDSAMessageSigner(BROKER_PRIVATE_KEY)

const sessionPrivateKey = generatePrivateKey()
const sessionAccount = privateKeyToAccount(sessionPrivateKey)
const sessionSigner = createECDSAMessageSigner(sessionPrivateKey)

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
})

const playerWalletClient = createWalletClient({
  account: playerAccount,
  chain: sepolia,
  transport: http(RPC_URL),
})

const brokerWalletClient = createWalletClient({
  account: brokerAccount,
  chain: sepolia,
  transport: http(RPC_URL),
})

// =============================================================================
// CONTRACT ABIs
// =============================================================================

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
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

// =============================================================================
// HELPERS
// =============================================================================

async function getCustodyBalance(account: Address): Promise<bigint> {
  const balances = await publicClient.readContract({
    address: CUSTODY_ADDRESS,
    abi: CUSTODY_ABI,
    functionName: 'getAccountsBalances',
    args: [[account], [USDH_ADDRESS]],
  })
  return balances[0]?.[0] ?? 0n
}

async function withdrawFromCustody(
  walletClient: typeof playerWalletClient,
  amount: bigint,
  label: string
): Promise<void> {
  console.log(`\n  ${label} withdrawing ${formatUnits(amount, 6)} USDH from custody...`)

  const hash = await walletClient.writeContract({
    address: CUSTODY_ADDRESS,
    abi: CUSTODY_ABI,
    functionName: 'withdraw',
    args: [USDH_ADDRESS, amount],
  })
  console.log(`    Tx: https://sepolia.etherscan.io/tx/${hash}`)

  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status === 'success') {
    console.log(`    ✓ Withdrawn`)
  } else {
    console.log(`    ✗ Withdraw failed`)
  }
}

// =============================================================================
// LEDGER BALANCE
// =============================================================================

async function getLedgerBalance(
  account: typeof playerAccount,
  walletClient: typeof playerWalletClient,
  label: string
): Promise<bigint> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(CLEARNODE_URL)
    let ledgerBalance = 0n

    const sessionKey = generatePrivateKey()
    const sessionAcc = privateKeyToAccount(sessionKey)
    const sessionSign = createECDSAMessageSigner(sessionKey)

    const authParams = {
      address: account.address,
      session_key: sessionAcc.address,
      application: 'check-ledger',
      scope: 'check-ledger',
      expires_at: BigInt(Math.floor(Date.now() / 1000) + 300),
      allowances: [{ asset: ASSET_SYMBOL, amount: '0' }],
    }

    ws.on('open', async () => {
      try {
        const msg = await createAuthRequestMessage({
          address: authParams.address,
          application: authParams.application,
          session_key: authParams.session_key,
          allowances: authParams.allowances,
          expires_at: authParams.expires_at,
          scope: authParams.scope,
        })
        ws.send(msg)
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
            const msg = await createGetLedgerBalancesMessage(sessionSign)
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

    ws.on('error', (err) => reject(err))

    setTimeout(() => {
      ws.close()
      reject(new Error(`Timeout getting ${label} ledger`))
    }, 15000)
  })
}

// =============================================================================
// PRINT BALANCES
// =============================================================================

async function printBalances(label: string): Promise<void> {
  console.log(`\n=== ${label} ===`)

  const playerCustody = await getCustodyBalance(playerAccount.address)
  const brokerCustody = await getCustodyBalance(brokerAccount.address)

  console.log('  Custody (on-chain):')
  console.log(`    Player: ${formatUnits(playerCustody, 6)} USDH`)
  console.log(`    Broker: ${formatUnits(brokerCustody, 6)} USDH`)

  console.log('  Ledger (off-chain):')
  try {
    const playerLedger = await getLedgerBalance(playerAccount, playerWalletClient, 'player')
    console.log(`    Player: ${playerLedger} ${ASSET_SYMBOL}`)
  } catch (e: any) {
    console.log(`    Player: error - ${e.message}`)
  }

  try {
    const brokerLedger = await getLedgerBalance(brokerAccount, brokerWalletClient, 'broker')
    console.log(`    Broker: ${brokerLedger} ${ASSET_SYMBOL}`)
  } catch (e: any) {
    console.log(`    Broker: error - ${e.message}`)
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('=== Simple Settlement ===')
  console.log('')
  console.log('This script:')
  console.log('  1. Shows current balances')
  console.log('  2. Player withdraws 50 USDH from custody')
  console.log('  3. Broker withdraws 50 USDH from custody')
  console.log('')
  console.log(`Player: ${playerAccount.address}`)
  console.log(`Broker: ${brokerAccount.address}`)
  console.log(`Withdraw amount: ${formatUnits(WITHDRAW_AMOUNT, 6)} USDH each`)

  // Step 1: Show initial balances
  await printBalances('Initial Balances')

  // Step 2: Withdraw from custody
  console.log('\n=== Withdrawing from Custody ===')

  const playerCustody = await getCustodyBalance(playerAccount.address)
  const brokerCustody = await getCustodyBalance(brokerAccount.address)

  // Player withdraw
  if (playerCustody >= WITHDRAW_AMOUNT) {
    await withdrawFromCustody(playerWalletClient, WITHDRAW_AMOUNT, 'Player')
  } else {
    console.log(`\n  Player: Insufficient custody balance (${formatUnits(playerCustody, 6)} < ${formatUnits(WITHDRAW_AMOUNT, 6)})`)
  }

  // Broker withdraw
  if (brokerCustody >= WITHDRAW_AMOUNT) {
    await withdrawFromCustody(brokerWalletClient, WITHDRAW_AMOUNT, 'Broker')
  } else {
    console.log(`\n  Broker: Insufficient custody balance (${formatUnits(brokerCustody, 6)} < ${formatUnits(WITHDRAW_AMOUNT, 6)})`)
  }

  // Step 3: Show final balances
  await printBalances('Final Balances')

  console.log('\n=== Done ===')
  console.log('Custody withdraw moves on-chain funds to your wallet.')
  console.log('This is separate from off-chain ledger balance.')
}

main().catch((err) => {
  console.error('\nFATAL:', err.message)
  process.exit(1)
})
