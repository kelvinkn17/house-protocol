import 'dotenv/config'
import { privateKeyToAccount } from 'viem/accounts'
import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  formatUnits,
  parseUnits,
} from 'viem'
import { sepolia } from 'viem/chains'
import { USDH_ADDRESS } from './types'

// =============================================================================
// Mint USDH for testing
// =============================================================================
// USDH is a test token on Sepolia. This script attempts to mint if the
// contract has a public mint function. If not, you'll need to get USDH from
// the deployer wallet.

const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex
const RPC_URL = process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'

if (!PRIVATE_KEY) {
  console.error('ERROR: Missing PRIVATE_KEY in .env')
  process.exit(1)
}

const account = privateKeyToAccount(PRIVATE_KEY)

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
})

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(RPC_URL),
})

// common test token ABIs for minting
const MINT_ABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'faucet',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

async function main() {
  console.log('USDH Mint Helper')
  console.log('================')
  console.log(`Wallet: ${account.address}`)
  console.log(`USDH: ${USDH_ADDRESS}`)
  console.log('')

  // check current balance
  const balance = await publicClient.readContract({
    address: USDH_ADDRESS,
    abi: MINT_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  })
  console.log(`Current balance: ${formatUnits(balance, 6)} USDH`)

  const mintAmount = parseUnits('1000', 6) // 1000 USDH

  // try mint(to, amount)
  try {
    console.log(`\nTrying mint(to, amount)...`)
    const hash = await walletClient.writeContract({
      address: USDH_ADDRESS,
      abi: MINT_ABI,
      functionName: 'mint',
      args: [account.address, mintAmount],
    })
    console.log(`Tx: https://sepolia.etherscan.io/tx/${hash}`)
    await publicClient.waitForTransactionReceipt({ hash })
    console.log(`✓ Minted ${formatUnits(mintAmount, 6)} USDH`)

    const newBalance = await publicClient.readContract({
      address: USDH_ADDRESS,
      abi: MINT_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    })
    console.log(`New balance: ${formatUnits(newBalance, 6)} USDH`)
    return
  } catch (e: any) {
    console.log(`  Failed: ${e.message?.slice(0, 100)}`)
  }

  // try mint(amount)
  try {
    console.log(`\nTrying mint(amount)...`)
    const hash = await walletClient.writeContract({
      address: USDH_ADDRESS,
      abi: [MINT_ABI[1]],
      functionName: 'mint',
      args: [mintAmount],
    })
    console.log(`Tx: https://sepolia.etherscan.io/tx/${hash}`)
    await publicClient.waitForTransactionReceipt({ hash })
    console.log(`✓ Minted ${formatUnits(mintAmount, 6)} USDH`)
    return
  } catch (e: any) {
    console.log(`  Failed: ${e.message?.slice(0, 100)}`)
  }

  // try faucet(amount)
  try {
    console.log(`\nTrying faucet(amount)...`)
    const hash = await walletClient.writeContract({
      address: USDH_ADDRESS,
      abi: [MINT_ABI[2]],
      functionName: 'faucet',
      args: [mintAmount],
    })
    console.log(`Tx: https://sepolia.etherscan.io/tx/${hash}`)
    await publicClient.waitForTransactionReceipt({ hash })
    console.log(`✓ Got ${formatUnits(mintAmount, 6)} USDH from faucet`)
    return
  } catch (e: any) {
    console.log(`  Failed: ${e.message?.slice(0, 100)}`)
  }

  console.log('')
  console.log('Could not mint USDH. Options:')
  console.log('  1. Ask the USDH deployer to send you some tokens')
  console.log('  2. Use the deployer wallet that minted the original USDH')
  console.log('  3. Deploy a new test USDH contract with public mint')
  console.log('')
  console.log('Deployer wallet (from FundHouseVault script) has USDH.')
  console.log('Check: https://sepolia.etherscan.io/address/0x25FfCCE632a03898c2ecB0EF9bb6a86177a363Ed#readContract')
}

main().catch(console.error)
