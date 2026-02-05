import 'dotenv/config'
import { privateKeyToAccount } from 'viem/accounts'
import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  type Address,
  formatUnits,
  keccak256,
  encodeAbiParameters,
} from 'viem'
import { sepolia } from 'viem/chains'
import {
  NitroliteService,
  StateIntent,
  SessionKeyStateSigner,
  generateChannelNonce,
} from '@erc7824/nitrolite'
import { USDH_ADDRESS, CUSTODY_ADDRESS } from './types'

// =============================================================================
// CONFIG
// =============================================================================

const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex
const BROKER_PRIVATE_KEY = process.env.BROKER_PRIVATE_KEY as Hex
const RPC_URL = process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'

// Adjudicator from clearnode config
const ADJUDICATOR_ADDRESS = '0x27f6C661929E4BF44455eEE2A7fc3C61E5AE768d' as Address

const CHAIN_ID = 11155111n // Sepolia

if (!PRIVATE_KEY || !BROKER_PRIVATE_KEY) {
  console.error('ERROR: Missing PRIVATE_KEY or BROKER_PRIVATE_KEY')
  process.exit(1)
}

// =============================================================================
// SETUP
// =============================================================================

const playerAccount = privateKeyToAccount(PRIVATE_KEY)
const brokerAccount = privateKeyToAccount(BROKER_PRIVATE_KEY)

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

// NitroliteService for on-chain operations
const playerNitrolite = new NitroliteService(
  publicClient,
  { custody: CUSTODY_ADDRESS, adjudicator: ADJUDICATOR_ADDRESS },
  playerWalletClient,
  playerAccount
)

const brokerNitrolite = new NitroliteService(
  publicClient,
  { custody: CUSTODY_ADDRESS, adjudicator: ADJUDICATOR_ADDRESS },
  brokerWalletClient,
  brokerAccount
)

// =============================================================================
// HELPERS
// =============================================================================

// Create signers using the SDK's proper signing mechanism
const playerSigner = new SessionKeyStateSigner(PRIVATE_KEY)
const brokerSigner = new SessionKeyStateSigner(BROKER_PRIVATE_KEY)

function getChannelId(channel: {
  participants: Address[]
  adjudicator: Address
  challenge: bigint
  nonce: bigint
}): Hex {
  const encoded = encodeAbiParameters(
    [
      { name: 'participants', type: 'address[]' },
      { name: 'adjudicator', type: 'address' },
      { name: 'challenge', type: 'uint64' },
      { name: 'nonce', type: 'uint64' },
      { name: 'chainId', type: 'uint256' },
    ],
    [channel.participants, channel.adjudicator, channel.challenge, channel.nonce, CHAIN_ID]
  )
  return keccak256(encoded)
}

async function printBalances(label: string): Promise<void> {
  console.log(`\n--- ${label} ---`)

  const playerBal = await playerNitrolite.getAccountBalance(playerAccount.address, USDH_ADDRESS)
  const brokerBal = await playerNitrolite.getAccountBalance(brokerAccount.address, USDH_ADDRESS)

  console.log(`  Player custody: ${formatUnits(playerBal as bigint, 6)} USDH`)
  console.log(`  Broker custody: ${formatUnits(brokerBal as bigint, 6)} USDH`)
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('=== On-Chain Channel Test ===')
  console.log('')
  console.log('This uses NitroliteService to create/close channels ON-CHAIN')
  console.log('(directly calling custody contract, not clearnode WebSocket)')
  console.log('')
  console.log(`Player: ${playerAccount.address}`)
  console.log(`Broker: ${brokerAccount.address}`)
  console.log(`Adjudicator: ${ADJUDICATOR_ADDRESS}`)
  console.log(`Custody: ${CUSTODY_ADDRESS}`)

  await printBalances('Initial')

  // ==========================================================================
  // Step 1: Create channel definition
  // ==========================================================================
  console.log('\n=== Step 1: Create Channel ===')

  // Use a 1 hour challenge period (minimum might be required)
  const channel = {
    participants: [playerAccount.address, brokerAccount.address] as Address[],
    adjudicator: ADJUDICATOR_ADDRESS,
    challenge: 3600n, // 1 hour challenge period
    nonce: generateChannelNonce(playerAccount.address),
  }

  const channelId = getChannelId(channel)
  console.log(`  Channel ID: ${channelId}`)
  console.log(`  Challenge period: ${channel.challenge} seconds`)

  // Initial state: player puts 10 USDH, broker puts 0
  const playerAmount = 10n * 1000000n // 10 USDH (6 decimals)
  const brokerAmount = 0n

  const stateForSigning = {
    intent: StateIntent.INITIALIZE,
    version: 0n,
    data: '0x' as Hex,
    allocations: [
      { destination: playerAccount.address, token: USDH_ADDRESS, amount: playerAmount },
      { destination: brokerAccount.address, token: USDH_ADDRESS, amount: brokerAmount },
    ],
  }

  // Both parties sign initial state using SDK signers
  console.log('  Signing initial state...')
  const playerSig = await playerSigner.signState(channelId, stateForSigning)
  const brokerSig = await brokerSigner.signState(channelId, stateForSigning)
  console.log(`    Player sig: ${playerSig.slice(0, 20)}...`)
  console.log(`    Broker sig: ${brokerSig.slice(0, 20)}...`)

  const initialState = {
    ...stateForSigning,
    sigs: [playerSig, brokerSig] as Hex[],
  }

  // Create channel on-chain
  console.log('  Creating channel on-chain...')
  console.log('    Channel:', JSON.stringify(channel, (k, v) => typeof v === 'bigint' ? v.toString() : v))
  console.log('    InitialState intent:', initialState.intent, 'version:', initialState.version.toString())
  console.log('    Allocations:', initialState.allocations.map(a => `${a.destination.slice(0,10)}:${a.amount.toString()}`).join(', '))
  try {
    const createTx = await playerNitrolite.createChannel(channel, initialState)
    console.log(`  Tx: https://sepolia.etherscan.io/tx/${createTx}`)
    await publicClient.waitForTransactionReceipt({ hash: createTx })
    console.log('  ✓ Channel created on-chain!')
  } catch (err: any) {
    console.log(`  ✗ Create failed: ${err.message}`)
    // Try to extract more error details
    if (err.cause) {
      console.log(`    Cause: ${JSON.stringify(err.cause)}`)
    }
    if (err.details) {
      console.log(`    Details: ${err.details}`)
    }
    if (err.shortMessage) {
      console.log(`    Short: ${err.shortMessage}`)
    }
    return
  }

  await printBalances('After Channel Create')

  // Check channel data
  console.log('\n  Checking channel data...')
  try {
    const channelData = await playerNitrolite.getChannelData(channelId)
    console.log(`    Status: ${channelData.status}`)
    console.log(`    Allocations:`)
    for (const alloc of channelData.lastValidState.allocations) {
      console.log(`      ${alloc.destination.slice(0, 10)}...: ${formatUnits(alloc.amount, 6)} USDH`)
    }
  } catch (err: any) {
    console.log(`    Error: ${err.message}`)
  }

  // ==========================================================================
  // Step 2: Close channel with different allocations
  // ==========================================================================
  console.log('\n=== Step 2: Close Channel (Transfer 5 USDH to Broker) ===')

  // Final state: player gets 5, broker gets 5 (transferred 5 to broker)
  const finalPlayerAmount = 5n * 1000000n
  const finalBrokerAmount = 5n * 1000000n

  const finalStateForSigning = {
    intent: StateIntent.FINALIZE,
    version: 1n,
    data: '0x' as Hex,
    allocations: [
      { destination: playerAccount.address, token: USDH_ADDRESS, amount: finalPlayerAmount },
      { destination: brokerAccount.address, token: USDH_ADDRESS, amount: finalBrokerAmount },
    ],
  }

  // Both parties sign final state
  console.log('  Signing final state...')
  const playerFinalSig = await playerSigner.signState(channelId, finalStateForSigning)
  const brokerFinalSig = await brokerSigner.signState(channelId, finalStateForSigning)

  const finalState = {
    ...finalStateForSigning,
    sigs: [playerFinalSig, brokerFinalSig] as Hex[],
  }

  // Close channel on-chain
  console.log('  Closing channel on-chain...')
  try {
    const closeTx = await playerNitrolite.close(channelId, finalState)
    console.log(`  Tx: https://sepolia.etherscan.io/tx/${closeTx}`)
    await publicClient.waitForTransactionReceipt({ hash: closeTx })
    console.log('  ✓ Channel closed on-chain!')
  } catch (err: any) {
    console.log(`  ✗ Close failed: ${err.message}`)
    return
  }

  await printBalances('After Channel Close')

  // ==========================================================================
  // Summary
  // ==========================================================================
  console.log('\n=== Summary ===')
  console.log('On-chain channel flow:')
  console.log('  1. createChannel() - locks funds in channel (from custody)')
  console.log('  2. close() - distributes funds per final allocations (back to custody)')
  console.log('')
  console.log('This ACTUALLY moves funds on-chain!')
  console.log('(Unlike app sessions which only update off-chain ledger)')
}

main().catch((err) => {
  console.error('\nFATAL:', err.message)
  process.exit(1)
})
