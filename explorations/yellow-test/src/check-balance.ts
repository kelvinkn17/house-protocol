import 'dotenv/config'
import { privateKeyToAccount } from 'viem/accounts'
import {
  createPublicClient,
  http,
  type Hex,
  type Address,
  formatUnits,
  formatEther,
} from 'viem'
import { sepolia } from 'viem/chains'
import { USDH_ADDRESS, CUSTODY_ADDRESS, BROKER_ADDRESS } from './types'

const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex
const BROKER_PRIVATE_KEY = process.env.BROKER_PRIVATE_KEY as Hex
const OPERATOR_PRIVATE_KEY = process.env.OPERATOR_PRIVATE_KEY as Hex
const RPC_URL = process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'

if (!PRIVATE_KEY) {
  console.error('ERROR: Missing PRIVATE_KEY in .env')
  process.exit(1)
}

const mainAccount = privateKeyToAccount(PRIVATE_KEY)
const brokerAccount = BROKER_PRIVATE_KEY ? privateKeyToAccount(BROKER_PRIVATE_KEY) : null
const operatorAccount = OPERATOR_PRIVATE_KEY ? privateKeyToAccount(OPERATOR_PRIVATE_KEY) : null

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
})

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

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

async function getETHBalance(address: Address): Promise<bigint> {
  return await publicClient.getBalance({ address })
}

async function getUSDHBalance(address: Address): Promise<bigint> {
  return await publicClient.readContract({
    address: USDH_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  })
}

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
  console.log('=== Balance Check ===\n')

  console.log('Contracts:')
  console.log(`  USDH Token: ${USDH_ADDRESS}`)
  console.log(`  Custody:    ${CUSTODY_ADDRESS}`)
  console.log('')

  // Player balances
  console.log('PLAYER:')
  console.log(`  Address: ${mainAccount.address}`)
  const playerETH = await getETHBalance(mainAccount.address)
  const playerUSDH = await getUSDHBalance(mainAccount.address)
  const playerCustody = await getCustodyBalance(mainAccount.address)
  console.log(`  ETH (wallet):   ${formatEther(playerETH)} ETH`)
  console.log(`  USDH (wallet):  ${formatUnits(playerUSDH, 6)} USDH`)
  console.log(`  USDH (custody): ${formatUnits(playerCustody, 6)} USDH`)
  console.log('')

  // Broker balances
  const brokerAddr = brokerAccount?.address || BROKER_ADDRESS
  console.log('BROKER:')
  console.log(`  Address: ${brokerAddr}`)
  const brokerETH = await getETHBalance(brokerAddr)
  const brokerUSDH = await getUSDHBalance(brokerAddr)
  const brokerCustody = await getCustodyBalance(brokerAddr)
  console.log(`  ETH (wallet):   ${formatEther(brokerETH)} ETH`)
  console.log(`  USDH (wallet):  ${formatUnits(brokerUSDH, 6)} USDH`)
  console.log(`  USDH (custody): ${formatUnits(brokerCustody, 6)} USDH`)
  console.log('')

  // Operator balances
  if (operatorAccount) {
    console.log('OPERATOR (broker):')
    console.log(`  Address: ${operatorAccount.address}`)
    const operatorETH = await getETHBalance(operatorAccount.address)
    const operatorUSDH = await getUSDHBalance(operatorAccount.address)
    const operatorCustody = await getCustodyBalance(operatorAccount.address)
    console.log(`  ETH (wallet):   ${formatEther(operatorETH)} ETH`)
    console.log(`  USDH (wallet):  ${formatUnits(operatorUSDH, 6)} USDH`)
    console.log(`  USDH (custody): ${formatUnits(operatorCustody, 6)} USDH`)
    console.log('')
  }

  // Summary
  console.log('SUMMARY:')
  console.log(`  Total USDH in custody: ${formatUnits(playerCustody + brokerCustody, 6)} USDH`)
  console.log(`  Player custody (ledger units): ${playerCustody / 1000000n}`)
  console.log(`  Broker custody (ledger units): ${brokerCustody / 1000000n}`)
  if (operatorAccount) {
    const operatorCustody = await getCustodyBalance(operatorAccount.address)
    console.log(`  Operator custody (ledger units): ${operatorCustody / 1000000n}`)
  }
}

main().catch(console.error)
