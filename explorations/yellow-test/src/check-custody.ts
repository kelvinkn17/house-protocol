import 'dotenv/config'
import { privateKeyToAccount } from 'viem/accounts'
import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  type Address,
  formatUnits,
} from 'viem'
import { sepolia } from 'viem/chains'
import { USDH_ADDRESS, CUSTODY_ADDRESS, BROKER_ADDRESS } from './types'

const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex
const BROKER_PRIVATE_KEY = process.env.BROKER_PRIVATE_KEY as Hex
const RPC_URL = process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'

const mainAccount = privateKeyToAccount(PRIVATE_KEY)
const brokerAccount = privateKeyToAccount(BROKER_PRIVATE_KEY)

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
})

const walletClient = createWalletClient({
  account: mainAccount,
  chain: sepolia,
  transport: http(RPC_URL),
})

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

async function getCustodyBalance(account: Address): Promise<bigint> {
  const balances = await publicClient.readContract({
    address: CUSTODY_ADDRESS,
    abi: CUSTODY_ABI,
    functionName: 'getAccountsBalances',
    args: [[account], [USDH_ADDRESS]],
  })
  return balances[0]?.[0] ?? 0n
}

async function main() {
  console.log('=== Custody Balance Check (On-Chain) ===\n')
  console.log('This is the ON-CHAIN custody contract balance.')
  console.log('This is SEPARATE from clearnode ledger balance.\n')

  console.log('Addresses:')
  console.log(`  Player: ${mainAccount.address}`)
  console.log(`  Broker: ${brokerAccount.address}`)
  console.log(`  Custody Contract: ${CUSTODY_ADDRESS}`)
  console.log(`  USDH Token: ${USDH_ADDRESS}\n`)

  const playerCustody = await getCustodyBalance(mainAccount.address)
  const brokerCustody = await getCustodyBalance(brokerAccount.address)

  console.log('Custody Balances:')
  console.log(`  Player: ${formatUnits(playerCustody, 6)} USDH`)
  console.log(`  Broker: ${formatUnits(brokerCustody, 6)} USDH`)
  console.log(`  Total:  ${formatUnits(playerCustody + brokerCustody, 6)} USDH\n`)

  // Check if player can withdraw
  if (playerCustody > 0n) {
    console.log(`Player can withdraw ${formatUnits(playerCustody, 6)} USDH from custody.`)
    console.log('Run with --withdraw to withdraw all.\n')

    if (process.argv.includes('--withdraw')) {
      console.log('Withdrawing...')
      const hash = await walletClient.writeContract({
        address: CUSTODY_ADDRESS,
        abi: CUSTODY_ABI,
        functionName: 'withdraw',
        args: [USDH_ADDRESS, playerCustody],
      })
      console.log(`Tx: https://sepolia.etherscan.io/tx/${hash}`)

      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      if (receipt.status === 'success') {
        console.log(`✓ Withdrawn in block ${receipt.blockNumber}`)
      } else {
        console.log('✗ Withdraw failed')
      }
    }
  } else {
    console.log('Player has no custody balance to withdraw.')
  }

  console.log('\n=== About Ledger vs Custody ===')
  console.log('- CUSTODY: On-chain contract balance (what you see here)')
  console.log('- LEDGER: Off-chain clearnode balance (synced from custody)')
  console.log('')
  console.log('If ledger is negative but custody has funds:')
  console.log('  1. Clearnode has unclosed sessions from past runs')
  console.log('  2. Ask clearnode admin to reset your ledger')
  console.log('  3. Or deposit more to custody to cover the deficit')
}

main().catch(console.error)
