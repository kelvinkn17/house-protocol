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
  keccak256,
  encodeAbiParameters,
} from 'viem'
import { sepolia } from 'viem/chains'
import {
  createECDSAMessageSigner,
  createAuthRequestMessage,
  createAuthVerifyMessageFromChallenge,
  createEIP712AuthMessageSigner,
  createAppSessionMessage,
  createSubmitAppStateMessage,
  createCloseAppSessionMessage,
  createGetLedgerBalancesMessage,
  NitroliteService,
  StateIntent,
  SessionKeyStateSigner,
  generateChannelNonce,
  RPCProtocolVersion,
  RPCAppStateIntent,
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

const APP_NAME = 'channel-flow'
const CHAIN_ID = 11155111n // Sepolia

// Adjudicator from clearnode config
const ADJUDICATOR_ADDRESS = '0x27f6C661929E4BF44455eEE2A7fc3C61E5AE768d' as Address

if (!PRIVATE_KEY || !BROKER_PRIVATE_KEY) {
  console.error('ERROR: Missing PRIVATE_KEY or BROKER_PRIVATE_KEY')
  process.exit(1)
}

// =============================================================================
// SETUP
// =============================================================================

const playerAccount = privateKeyToAccount(PRIVATE_KEY)
const brokerAccount = privateKeyToAccount(BROKER_PRIVATE_KEY)

// Player session key (for signing app session messages via WebSocket)
const playerSessionKey = generatePrivateKey()
const playerSessionAccount = privateKeyToAccount(playerSessionKey)
const playerSessionSigner = createECDSAMessageSigner(playerSessionKey)

// Broker ECDSA signer for app session co-signing (clearnode verifies against broker address)
const brokerECDSASigner = createECDSAMessageSigner(BROKER_PRIVATE_KEY)

// On-chain state signers (for channel create/close)
const playerStateSigner = new SessionKeyStateSigner(PRIVATE_KEY)
const brokerStateSigner = new SessionKeyStateSigner(BROKER_PRIVATE_KEY)

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

// NitroliteService for on-chain channel operations
const brokerNitrolite = new NitroliteService(
  publicClient,
  { custody: CUSTODY_ADDRESS, adjudicator: ADJUDICATOR_ADDRESS },
  brokerWalletClient,
  brokerAccount
)

// =============================================================================
// CONTRACT ABIs
// =============================================================================

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

const CUSTODY_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
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

// =============================================================================
// HELPERS
// =============================================================================

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

// =============================================================================
// BALANCE HELPERS
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

async function getLedgerBalance(
  account: typeof playerAccount,
  walletClient: typeof playerWalletClient,
  label: string
): Promise<bigint> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(CLEARNODE_URL)
    let ledgerBalance = 0n

    const sessionKey = generatePrivateKey()
    const sessionAccount = privateKeyToAccount(sessionKey)
    const sessionSigner = createECDSAMessageSigner(sessionKey)

    const authParams = {
      address: account.address,
      session_key: sessionAccount.address,
      application: 'check-balance',
      scope: 'check-balance',
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
        // ignore parse errors
      }
    })

    ws.on('error', (err) => reject(err))
    setTimeout(() => {
      ws.close()
      reject(new Error(`Timeout getting ${label} ledger balance`))
    }, 15000)
  })
}

async function printBalances(step: string): Promise<void> {
  console.log(`\n--- ${step} ---`)

  const playerCustody = await getCustodyBalance(playerAccount.address)
  const brokerCustody = await getCustodyBalance(brokerAccount.address)
  console.log(`  Custody:  Player=${formatUnits(playerCustody, 6)} | Broker=${formatUnits(brokerCustody, 6)} USDH`)

  try {
    const playerLedger = await getLedgerBalance(playerAccount, playerWalletClient, 'player')
    const brokerLedger = await getLedgerBalance(brokerAccount, brokerWalletClient, 'broker')
    console.log(`  Ledger:   Player=${playerLedger} | Broker=${brokerLedger} ${ASSET_SYMBOL}`)
  } catch (e: any) {
    console.log(`  Ledger:   error - ${e.message}`)
  }
}

// =============================================================================
// ON-CHAIN: DEPOSIT TO CUSTODY
// =============================================================================

async function depositToCustody(
  walletClient: typeof playerWalletClient,
  account: Address,
  amount: bigint,
  label: string
): Promise<void> {
  const amountOnChain = amount * 1000000n // Convert to 6 decimals
  console.log(`  ${label} depositing ${amount} USDH to custody...`)

  const allowance = await publicClient.readContract({
    address: USDH_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account, CUSTODY_ADDRESS],
  })

  if (allowance < amountOnChain) {
    const approveHash = await walletClient.writeContract({
      address: USDH_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CUSTODY_ADDRESS, amountOnChain * 100n],
    })
    await publicClient.waitForTransactionReceipt({ hash: approveHash })
  }

  const hash = await walletClient.writeContract({
    address: CUSTODY_ADDRESS,
    abi: CUSTODY_ABI,
    functionName: 'deposit',
    args: [account, USDH_ADDRESS, amountOnChain],
  })
  await publicClient.waitForTransactionReceipt({ hash })
  console.log(`    Deposited (tx: ${hash.slice(0, 18)}...)`)
}

// =============================================================================
// ON-CHAIN CHANNEL OPERATIONS (via NitroliteService)
// =============================================================================

async function createOnChainChannel(
  brokerAmount: bigint,
  playerAmount: bigint
): Promise<{ channelId: Hex; channel: any }> {
  // Channel between broker and player
  const channel = {
    participants: [brokerAccount.address, playerAccount.address] as Address[],
    adjudicator: ADJUDICATOR_ADDRESS,
    challenge: 3600n, // 1 hour challenge period
    nonce: generateChannelNonce(brokerAccount.address),
  }

  const channelId = getChannelId(channel)

  // Initial state: broker locks funds, player locks funds
  const stateForSigning = {
    intent: StateIntent.INITIALIZE,
    version: 0n,
    data: '0x' as Hex,
    allocations: [
      { destination: brokerAccount.address, token: USDH_ADDRESS, amount: brokerAmount },
      { destination: playerAccount.address, token: USDH_ADDRESS, amount: playerAmount },
    ],
  }

  // Both parties sign initial state
  const brokerSig = await brokerStateSigner.signState(channelId, stateForSigning)
  const playerSig = await playerStateSigner.signState(channelId, stateForSigning)

  const initialState = {
    ...stateForSigning,
    sigs: [brokerSig, playerSig] as Hex[],
  }

  // Create channel on-chain (broker submits tx)
  const createTx = await brokerNitrolite.createChannel(channel, initialState)
  console.log(`  Tx: https://sepolia.etherscan.io/tx/${createTx}`)
  await publicClient.waitForTransactionReceipt({ hash: createTx })

  return { channelId, channel }
}

async function closeOnChainChannel(
  channelId: Hex,
  brokerFinalAmount: bigint,
  playerFinalAmount: bigint,
  version: bigint
): Promise<void> {
  const finalStateForSigning = {
    intent: StateIntent.FINALIZE,
    version,
    data: '0x' as Hex,
    allocations: [
      { destination: brokerAccount.address, token: USDH_ADDRESS, amount: brokerFinalAmount },
      { destination: playerAccount.address, token: USDH_ADDRESS, amount: playerFinalAmount },
    ],
  }

  // Both parties sign final state
  const brokerSig = await brokerStateSigner.signState(channelId, finalStateForSigning)
  const playerSig = await playerStateSigner.signState(channelId, finalStateForSigning)

  const finalState = {
    ...finalStateForSigning,
    sigs: [brokerSig, playerSig] as Hex[],
  }

  const closeTx = await brokerNitrolite.close(channelId, finalState)
  console.log(`  Tx: https://sepolia.etherscan.io/tx/${closeTx}`)
  await publicClient.waitForTransactionReceipt({ hash: closeTx })
}

// =============================================================================
// APP SESSION OPERATIONS (player opens a new WS per game session)
// =============================================================================

interface SessionState {
  ws: WebSocket
  sessionId: Hex | null
  authenticated: boolean
}

async function openSessionInChannel(
  playerAmount: bigint,
  brokerAmount: bigint
): Promise<SessionState> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(CLEARNODE_URL)
    const state: SessionState = { ws, sessionId: null, authenticated: false }

    const authParams = {
      address: playerAccount.address,
      session_key: playerSessionAccount.address,
      application: APP_NAME,
      scope: APP_NAME,
      expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600),
      allowances: [{ asset: ASSET_SYMBOL, amount: (playerAmount + brokerAmount).toString() }],
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
        if (!parsed.res) return

        const method = parsed.res[1]
        const params = parsed.res[2]

        if (method === 'auth_challenge') {
          const challenge = params?.challenge_message
          if (challenge) {
            const eip712Signer = createEIP712AuthMessageSigner(
              playerWalletClient,
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
          state.authenticated = true

          // Create app session with both player and broker allocations
          const definition = {
            protocol: RPCProtocolVersion.NitroRPC_0_4,
            participants: [playerAccount.address, brokerAccount.address],
            weights: [100, 0],
            quorum: 100,
            challenge: 0,
            nonce: Date.now(),
            application: APP_NAME,
          }

          const allocations = [
            { participant: playerAccount.address, asset: ASSET_SYMBOL, amount: playerAmount.toString() },
            { participant: brokerAccount.address, asset: ASSET_SYMBOL, amount: brokerAmount.toString() },
          ]

          const requestId = Math.floor(Math.random() * 1000000)
          const timestamp = Date.now()

          const playerMsg = await createAppSessionMessage(playerSessionSigner, { definition, allocations }, requestId, timestamp)
          const playerParsed = JSON.parse(playerMsg)

          const brokerMsg = await createAppSessionMessage(brokerECDSASigner, { definition, allocations }, requestId, timestamp)
          const brokerParsed = JSON.parse(brokerMsg)

          // Combine signatures
          playerParsed.sig = [...playerParsed.sig, ...brokerParsed.sig]

          ws.send(JSON.stringify(playerParsed))
        }

        if (method === 'create_app_session') {
          if (params?.app_session_id) {
            state.sessionId = params.app_session_id
            resolve(state)
          } else {
            reject(new Error(params?.error || 'Failed to create session'))
          }
        }

        if (method === 'error') {
          reject(new Error(params?.error || params?.message))
        }
      } catch (e) {
        // ignore parse errors
      }
    })

    ws.on('error', (err) => reject(err))
    setTimeout(() => reject(new Error('Timeout opening session')), 30000)
  })
}

async function submitState(
  state: SessionState,
  playerAmount: bigint,
  brokerAmount: bigint,
  version: number,
  label: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!state.sessionId) {
      reject(new Error('No session'))
      return
    }

    const allocations = [
      { participant: playerAccount.address, asset: ASSET_SYMBOL, amount: playerAmount.toString() },
      { participant: brokerAccount.address, asset: ASSET_SYMBOL, amount: brokerAmount.toString() },
    ]

    const handleMessage = async (data: any) => {
      try {
        const parsed = JSON.parse(data.toString())
        if (!parsed.res) return

        const method = parsed.res[1]
        const params = parsed.res[2]

        if (method === 'submit_app_state') {
          state.ws.off('message', handleMessage)
          if (params?.error) {
            reject(new Error(params.error))
          } else {
            console.log(`    ${label}`)
            resolve()
          }
        }

        if (method === 'error') {
          state.ws.off('message', handleMessage)
          reject(new Error(params?.error || params?.message))
        }
      } catch (e) {
        // ignore
      }
    }

    state.ws.on('message', handleMessage)

    const stateParams = {
      app_session_id: state.sessionId,
      intent: RPCAppStateIntent.Operate,
      version,
      allocations,
    }

    const requestId = Math.floor(Math.random() * 1000000)
    const timestamp = Date.now()

    createSubmitAppStateMessage<typeof RPCProtocolVersion.NitroRPC_0_4>(
      playerSessionSigner,
      stateParams,
      requestId,
      timestamp
    ).then((msg) => {
      state.ws.send(msg)
    })

    setTimeout(() => {
      state.ws.off('message', handleMessage)
      reject(new Error(`Timeout: ${label}`))
    }, 15000)
  })
}

async function closeSession(
  state: SessionState,
  playerAmount: bigint,
  brokerAmount: bigint
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!state.sessionId) {
      reject(new Error('No session to close'))
      return
    }

    const allocations = [
      { participant: playerAccount.address, asset: ASSET_SYMBOL, amount: playerAmount.toString() },
      { participant: brokerAccount.address, asset: ASSET_SYMBOL, amount: brokerAmount.toString() },
    ]

    const handleMessage = async (data: any) => {
      try {
        const parsed = JSON.parse(data.toString())
        if (!parsed.res) return

        const method = parsed.res[1]
        const params = parsed.res[2]

        if (method === 'close_app_session') {
          state.ws.off('message', handleMessage)
          if (params?.status === 'closed' || params?.app_session_id) {
            resolve()
          } else {
            reject(new Error(params?.error || 'Failed to close session'))
          }
        }

        if (method === 'error') {
          state.ws.off('message', handleMessage)
          reject(new Error(params?.error || params?.message))
        }
      } catch (e) {
        // ignore
      }
    }

    state.ws.on('message', handleMessage)

    createCloseAppSessionMessage(playerSessionSigner, {
      app_session_id: state.sessionId,
      allocations,
    }).then((msg) => {
      state.ws.send(msg)
    })

    setTimeout(() => {
      state.ws.off('message', handleMessage)
      reject(new Error('Timeout closing session'))
    }, 15000)
  })
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('=== Channel-Based Betting Flow ===')
  console.log('')
  console.log('Architecture:')
  console.log('  - Broker opens an ON-CHAIN CHANNEL backed by custody balance')
  console.log('  - Players bet off-chain via APP SESSIONS within the channel')
  console.log('  - Each game = open session -> play -> close session')
  console.log('  - Channel closed on-chain with final allocations')
  console.log('')
  console.log('Flow:')
  console.log('  1. Deposit to custody (broker=100, player=10)')
  console.log('  2. Broker creates on-chain channel (broker=100, player=10)')
  console.log('  3. Game 1: open session, player wins 5, close session')
  console.log('  4. Game 2: open session, player loses 5, close session')
  console.log('  5. Close channel on-chain')
  console.log('')
  console.log(`Player:      ${playerAccount.address}`)
  console.log(`Broker:      ${brokerAccount.address}`)
  console.log(`Adjudicator: ${ADJUDICATOR_ADDRESS}`)
  console.log(`Custody:     ${CUSTODY_ADDRESS}`)

  // =========================================================================
  // STEP 1: Deposit to custody
  // =========================================================================
  console.log('\n=== STEP 1: Deposit to Custody ===')
  await printBalances('Before Deposit')

  await depositToCustody(brokerWalletClient, brokerAccount.address, 100n, 'Broker')
  await depositToCustody(playerWalletClient, playerAccount.address, 10n, 'Player')

  console.log('  Waiting for ledger sync (5s)...')
  await new Promise(r => setTimeout(r, 5000))
  await printBalances('After Deposit')

  // =========================================================================
  // STEP 2: Create on-chain channel (locks funds from custody)
  // =========================================================================
  console.log('\n=== STEP 2: Create On-Chain Channel ===')
  console.log('  Broker=100 USDH, Player=10 USDH locked in channel')

  const brokerChannelAmount = 100n * 1000000n // 100 USDH (6 decimals)
  const playerChannelAmount = 10n * 1000000n  // 10 USDH (6 decimals)

  const { channelId, channel } = await createOnChainChannel(brokerChannelAmount, playerChannelAmount)
  console.log(`  Channel created: ${channelId}`)

  // Verify channel on-chain
  try {
    const channelData = await brokerNitrolite.getChannelData(channelId)
    console.log(`  Channel status: ${channelData.status}`)
    for (const alloc of channelData.lastValidState.allocations) {
      console.log(`    ${alloc.destination.slice(0, 10)}...: ${formatUnits(alloc.amount, 6)} USDH`)
    }
  } catch (err: any) {
    console.log(`  Channel data check: ${err.message}`)
  }

  await printBalances('After Channel Create')

  // =========================================================================
  // STEP 3: Game 1 — Player bets 10, wins 5
  // =========================================================================
  console.log('\n=== STEP 3: Game 1 — Open session (player=10, broker=10) ===')
  const game1 = await openSessionInChannel(10n, 10n)
  console.log(`  Session 1: ${game1.sessionId?.slice(0, 18)}...`)

  console.log('\n  Game 1: Player wins 5 (player=15, broker=5)')
  await submitState(game1, 15n, 5n, 2, 'State updated: player=15, broker=5')

  console.log('\n  Closing Game 1 session...')
  await closeSession(game1, 15n, 5n)
  console.log('  Game 1 session closed')
  game1.ws.close()

  await new Promise(r => setTimeout(r, 3000))
  await printBalances('After Game 1')

  // =========================================================================
  // STEP 4: Game 2 — Player bets 10, loses 5
  // =========================================================================
  console.log('\n=== STEP 4: Game 2 — Open session (player=10, broker=10) ===')
  const game2 = await openSessionInChannel(10n, 10n)
  console.log(`  Session 2: ${game2.sessionId?.slice(0, 18)}...`)

  console.log('\n  Game 2: Player loses 5 (player=5, broker=15)')
  await submitState(game2, 5n, 15n, 2, 'State updated: player=5, broker=15')

  console.log('\n  Closing Game 2 session...')
  await closeSession(game2, 5n, 15n)
  console.log('  Game 2 session closed')
  game2.ws.close()

  await new Promise(r => setTimeout(r, 3000))
  await printBalances('After Game 2')

  // =========================================================================
  // STEP 5: Close channel on-chain (distributes funds back to custody)
  // =========================================================================
  console.log('\n=== STEP 5: Close On-Chain Channel ===')
  console.log('  Final allocations: Broker=100, Player=10 (net zero — wins/losses cancel out)')

  // Close with same amounts as opened (games net to zero)
  await closeOnChainChannel(channelId, brokerChannelAmount, playerChannelAmount, 1n)
  console.log('  Channel closed on-chain')

  // =========================================================================
  // STEP 6: Final balances
  // =========================================================================
  await new Promise(r => setTimeout(r, 3000))
  await printBalances('FINAL')

  console.log('\n=== DONE ===')
  console.log('')
  console.log('Summary:')
  console.log('  - On-chain channel locked funds from custody (broker=100, player=10)')
  console.log('  - Game 1: player won 5 via app session (player=15, broker=5)')
  console.log('  - Game 2: player lost 5 via app session (player=5, broker=15)')
  console.log('  - Channel closed on-chain, funds returned to custody')
  console.log('  - On-chain txs: deposit + channel create + channel close')
  console.log('  - Off-chain ops: all game sessions (gasless)')
}

main().catch((err) => {
  console.error('\nFATAL:', err.message)
  process.exit(1)
})
