import 'dotenv/config'
import { WebSocket } from 'ws'
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'
import { createPublicClient, createWalletClient, http, type Hex, formatEther } from 'viem'
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
  createGetLedgerTransactionsMessageV2,
  createGetConfigMessageV2,
  RPCProtocolVersion,
  RPCAppStateIntent,
} from '@erc7824/nitrolite'

import {
  createCommitment,
  verifyCommitment,
  deriveBombPosition,
  calculateRowMultiplier,
  applyHouseEdge,
  generateGameRows,
  randomNonce,
  randomTileChoice,
  formatMultiplier,
  encodeGameState,
  calculateMaxPayout,
} from './game-logic'

import {
  type GameState,
  type GameSession,
  type RoundState,
  type RowConfig,
  MULTIPLIER_SCALE,
  DEFAULT_GAME_CONFIG,
  BROKER_ADDRESS,
  USDH_ADDRESS,
  CUSTODY_ADDRESS,
} from './types'

// =============================================================================
// CONFIG
// =============================================================================

const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex
const BROKER_PRIVATE_KEY = process.env.BROKER_PRIVATE_KEY as Hex
const RPC_URL = process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'

// Nitrolite hosted clearnode
const CLEARNODE_URL = process.env.CLEARNODE_URL || 'wss://nitrolite.kwek.dev/ws'

// Asset symbol as registered on clearnode (check your clearnode config)
const ASSET_SYMBOL = process.env.ASSET_SYMBOL || 'usdh'

// optional: reuse session key
const SAVED_SESSION_KEY = process.env.SESSION_KEY as Hex | undefined

const APP_NAME = 'death-game'
const SEPOLIA_CHAIN_ID = 11155111

if (!PRIVATE_KEY) {
  console.error('ERROR: Missing PRIVATE_KEY in .env')
  process.exit(1)
}

if (!BROKER_PRIVATE_KEY) {
  console.error('ERROR: Missing BROKER_PRIVATE_KEY in .env')
  console.error('This is required for house funding. Get it from the clearnode .env')
  process.exit(1)
}

// =============================================================================
// SETUP
// =============================================================================

// main wallet (player)
const mainAccount = privateKeyToAccount(PRIVATE_KEY)

// broker wallet (house)
const brokerAccount = privateKeyToAccount(BROKER_PRIVATE_KEY)
const brokerSigner = createECDSAMessageSigner(BROKER_PRIVATE_KEY)

// session key (reuse from env or generate fresh)
const sessionPrivateKey = SAVED_SESSION_KEY || generatePrivateKey()
const sessionAccount = privateKeyToAccount(sessionPrivateKey)
const sessionSigner = createECDSAMessageSigner(sessionPrivateKey)
const isNewSession = !SAVED_SESSION_KEY

// viem clients
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
})

const walletClient = createWalletClient({
  account: mainAccount,
  chain: sepolia,
  transport: http(RPC_URL),
})

// =============================================================================
// STATE
// =============================================================================

let ws: WebSocket
let isAuthenticated = false
let jwtToken: string | null = null
let appSessionId: Hex | null = null
let ledgerBalance: bigint = 0n
let brokerAddressFromConfig: Hex | null = null

// pending response handlers
const pendingResponses = new Map<string, {
  resolve: (value: any) => void
  reject: (error: Error) => void
  timeout: NodeJS.Timeout
}>()

// =============================================================================
// HELPERS
// =============================================================================

function sepoliaEtherscanAddress(addr: string): string {
  return `https://sepolia.etherscan.io/address/${addr}`
}

async function checkSepoliaBalance(): Promise<bigint> {
  const balance = await publicClient.getBalance({ address: mainAccount.address })
  return balance
}

function generateRequestId(): string {
  return Math.floor(Math.random() * 1000000).toString()
}

// =============================================================================
// WEBSOCKET MESSAGING
// =============================================================================

function handleResponse(method: string, params: any, error?: string) {
  const pending = pendingResponses.get(method)
  if (pending) {
    clearTimeout(pending.timeout)
    pendingResponses.delete(method)

    if (error) {
      pending.reject(new Error(error))
    } else {
      pending.resolve(params)
    }
  }
}

// =============================================================================
// AUTH
// =============================================================================

const authParams = {
  address: mainAccount.address,
  session_key: sessionAccount.address,
  application: APP_NAME,
  scope: APP_NAME,
  expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600),
  allowances: [{ asset: ASSET_SYMBOL, amount: '1000000000' }],
}

function connectAndAuth(): Promise<void> {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(CLEARNODE_URL)

    ws.on('open', async () => {
      console.log('✓ Connected to Yellow Network')

      try {
        const authRequestMsg = await createAuthRequestMessage({
          address: authParams.address,
          application: authParams.application,
          session_key: authParams.session_key,
          allowances: authParams.allowances,
          expires_at: authParams.expires_at,
          scope: authParams.scope,
        })
        console.log('  Sending auth_request...')
        ws.send(authRequestMsg)
      } catch (err) {
        reject(new Error(`Auth request failed: ${(err as Error).message}`))
      }
    })

    ws.on('message', async (data) => {
      const msg = data.toString()
      try {
        const parsed = JSON.parse(msg)

        if (parsed.res) {
          const method = parsed.res[1]
          const params = parsed.res[2]

          // auth challenge
          if (method === 'auth_challenge') {
            const challenge = params?.challenge_message
            if (challenge) {
              console.log(`  Received challenge: ${challenge.slice(0, 8)}...`)

              try {
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
                console.log('  Signed EIP-712, sending auth_verify...')
                ws.send(verifyMsg)
              } catch (err) {
                reject(new Error(`EIP-712 signing failed: ${(err as Error).message}`))
              }
            }
          }

          // auth success
          if (method === 'auth_verify') {
            if (params?.success) {
              console.log('✓ Authenticated!')
              isAuthenticated = true
              jwtToken = params.jwt_token
              console.log(`  JWT: ${jwtToken?.slice(0, 30)}...`)
              resolve()
            } else {
              reject(new Error(`Auth failed: ${JSON.stringify(params)}`))
            }
          }

          // app session created
          if (method === 'create_app_session') {
            handleResponse('create_app_session', params, params?.error)
          }

          // app state submitted
          if (method === 'submit_app_state') {
            handleResponse('submit_app_state', params, params?.error)
          }

          // app session closed
          if (method === 'close_app_session') {
            handleResponse('close_app_session', params, params?.error)
          }

          // ledger balances
          if (method === 'get_ledger_balances') {
            if (params?.balances && Array.isArray(params.balances)) {
              for (const bal of params.balances) {
                if (bal.asset === ASSET_SYMBOL || bal.asset === 'usdh') {
                  ledgerBalance = BigInt(Math.floor(parseFloat(bal.amount)))
                  console.log(`  ${bal.asset}: ${bal.amount}`)
                }
              }
            }
            handleResponse('get_ledger_balances', params, params?.error)
          }

          // ledger transactions
          if (method === 'get_ledger_transactions') {
            const txs = params?.ledger_transactions || params?.transactions || []
            if (Array.isArray(txs) && txs.length > 0) {
              console.log('  Recent transactions:')
              for (const tx of txs.slice(0, 5)) {
                console.log(`    ${tx.tx_type || tx.type}: ${tx.amount} ${tx.asset}`)
              }
            }
          }

          // config response
          if (method === 'get_config' || method === 'config') {
            console.log('  Config received')
            if (params?.broker_address || params?.brokerAddress) {
              brokerAddressFromConfig = (params?.broker_address || params?.brokerAddress) as Hex
              console.log(`  Broker address: ${brokerAddressFromConfig}`)
            }
            handleResponse('get_config', params, params?.error)
          }

          // error response
          if (method === 'error') {
            const errorMsg = params?.error || params?.message || 'Unknown error'
            console.error(`  Server error: ${errorMsg}`)
            // check all pending and reject them
            for (const [key, pending] of pendingResponses) {
              clearTimeout(pending.timeout)
              pending.reject(new Error(errorMsg))
            }
            pendingResponses.clear()
          }
        }
      } catch (e) {
        // non-JSON message, ignore
      }
    })

    ws.on('error', (err) => {
      reject(new Error(`WebSocket error: ${err.message}`))
    })

    ws.on('close', () => {
      console.log('Disconnected from clearnode')
    })

    // auth timeout
    setTimeout(() => {
      if (!isAuthenticated) {
        reject(new Error('Authentication timeout'))
      }
    }, 15000)
  })
}

// =============================================================================
// CONFIG
// =============================================================================

async function getConfig(): Promise<void> {
  console.log('  Fetching clearnode config...')

  const msg = createGetConfigMessageV2()
  ws.send(msg)

  // wait for response
  await new Promise<any>((resolve) => {
    const timeout = setTimeout(() => {
      console.log('  Config timeout, continuing...')
      resolve({})
    }, 5000)
    pendingResponses.set('get_config', {
      resolve: (params) => {
        clearTimeout(timeout)
        resolve(params)
      },
      reject: () => {
        clearTimeout(timeout)
        resolve({})
      },
      timeout
    })
  })
}

// =============================================================================
// LEDGER
// =============================================================================

async function getLedgerBalance(): Promise<bigint> {
  console.log('  Fetching ledger balance...')

  const msg = await createGetLedgerBalancesMessage(sessionSigner)
  ws.send(msg)

  // wait for response
  await new Promise<any>((resolve) => {
    const timeout = setTimeout(() => {
      console.log('  Ledger balance timeout')
      resolve({})
    }, 5000)
    pendingResponses.set('get_ledger_balances', {
      resolve: (params) => {
        clearTimeout(timeout)
        resolve(params)
      },
      reject: () => {
        clearTimeout(timeout)
        resolve({})
      },
      timeout
    })
  })

  return ledgerBalance
}

async function getLedgerTransactions(): Promise<void> {
  console.log('  Fetching recent transactions...')

  const msg = createGetLedgerTransactionsMessageV2(mainAccount.address, { limit: 5 })
  ws.send(msg)

  // wait for response
  await new Promise(r => setTimeout(r, 2000))
}

// =============================================================================
// APP SESSION WITH HOUSE FUNDING
// =============================================================================

// track state version globally for the session
let stateVersion = 1 // starts at 1
let sessionTotalPool = 0n // total funds in session (player bet + house max payout)
let sessionPlayerBet = 0n // player's original bet
let sessionHouseFunding = 0n // house's contribution (max payout)

async function createAppSessionWithHouseFunding(betAmount: bigint, numRows: number): Promise<Hex> {
  console.log('\n=== Creating House-Funded Session ===')

  // use broker address from config, fallback to constant
  const broker = brokerAddressFromConfig || BROKER_ADDRESS

  // verify broker key matches
  if (brokerAccount.address.toLowerCase() !== broker.toLowerCase()) {
    console.warn(`  WARNING: Broker key mismatch!`)
    console.warn(`    Config broker: ${broker}`)
    console.warn(`    Key broker:    ${brokerAccount.address}`)
  }

  // calculate max payout (what player could win)
  sessionHouseFunding = calculateMaxPayout(betAmount, numRows, DEFAULT_GAME_CONFIG.houseEdgeBps)
  sessionPlayerBet = betAmount
  sessionTotalPool = sessionPlayerBet + sessionHouseFunding

  console.log(`  Player bet: ${sessionPlayerBet} ${ASSET_SYMBOL}`)
  console.log(`  House funding: ${sessionHouseFunding} ${ASSET_SYMBOL}`)
  console.log(`  Total pool: ${sessionTotalPool} ${ASSET_SYMBOL}`)
  console.log(`  Broker: ${broker}`)

  // step 1: create session with BOTH participants and BOTH allocations
  // both player and broker must sign since both are contributing funds
  console.log('\n  Step 1: Creating session with dual funding...')

  const definition = {
    protocol: RPCProtocolVersion.NitroRPC_0_4,
    participants: [mainAccount.address, broker],
    weights: [100, 0], // player controls game state
    quorum: 100,
    challenge: 0,
    nonce: Date.now(),
    application: APP_NAME,
  }

  // both parties fund the session
  const allocations = [
    {
      participant: mainAccount.address,
      asset: ASSET_SYMBOL,
      amount: sessionPlayerBet.toString(),
    },
    {
      participant: broker,
      asset: ASSET_SYMBOL,
      amount: sessionHouseFunding.toString(),
    },
  ]

  // reset version for new session
  stateVersion = 1

  // CRITICAL: Both signers must sign the SAME payload (same requestId and timestamp)
  const requestId = Math.floor(Math.random() * 1000000)
  const timestamp = Date.now()

  // create the message with player signature using shared requestId/timestamp
  const playerMsg = await createAppSessionMessage(sessionSigner, {
    definition,
    allocations,
  }, requestId, timestamp)

  // parse and add broker signature
  const parsed = JSON.parse(playerMsg)

  // broker signs the SAME payload (same requestId and timestamp)
  const brokerMsg = await createAppSessionMessage(brokerSigner, {
    definition,
    allocations,
  }, requestId, timestamp)
  const brokerParsed = JSON.parse(brokerMsg)

  // combine signatures (player + broker)
  parsed.sig = [...parsed.sig, ...brokerParsed.sig]

  ws.send(JSON.stringify(parsed))

  // wait for response
  const response = await new Promise<any>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('App session creation timeout')), 15000)
    pendingResponses.set('create_app_session', {
      resolve: (params) => {
        clearTimeout(timeout)
        resolve(params)
      },
      reject: (err) => {
        clearTimeout(timeout)
        reject(err)
      },
      timeout
    })
  })

  if (response?.app_session_id) {
    appSessionId = response.app_session_id as Hex
    console.log(`✓ House-funded session created: ${appSessionId.slice(0, 18)}...`)
    console.log(`  Total pool: ${sessionTotalPool} ${ASSET_SYMBOL}`)
    return appSessionId
  }

  throw new Error(`Failed to create app session: ${JSON.stringify(response)}`)
}

async function submitAppState(
  gameState: GameState,
  playerPayout: bigint
): Promise<void> {
  if (!appSessionId) {
    throw new Error('No app session active')
  }

  // increment version for each state submission
  stateVersion++

  const stateData = encodeGameState(gameState)
  const broker = brokerAddressFromConfig || BROKER_ADDRESS

  // allocations must sum to sessionTotalPool
  // player gets their payout, broker gets the rest
  const playerAllocation = playerPayout > sessionTotalPool ? sessionTotalPool : playerPayout
  const brokerAllocation = sessionTotalPool - playerAllocation

  const allocations = [
    {
      participant: mainAccount.address,
      asset: ASSET_SYMBOL,
      amount: playerAllocation.toString(),
    },
    {
      participant: broker,
      asset: ASSET_SYMBOL,
      amount: brokerAllocation.toString(),
    },
  ]

  console.log(`  State v${stateVersion}: player=${playerAllocation}, broker=${brokerAllocation}`)

  const msg = await createSubmitAppStateMessage<RPCProtocolVersion.NitroRPC_0_4>(
    sessionSigner,
    {
      app_session_id: appSessionId,
      intent: RPCAppStateIntent.Operate,
      version: stateVersion,
      allocations,
      session_data: stateData,
    }
  )

  ws.send(msg)

  // wait for response
  const response = await new Promise<any>((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.log(`  State v${stateVersion} timeout, continuing...`)
      resolve({ status: 'timeout' })
    }, 3000)
    pendingResponses.set('submit_app_state', {
      resolve: (params) => {
        clearTimeout(timeout)
        resolve(params)
      },
      reject: (err) => {
        clearTimeout(timeout)
        reject(err)
      },
      timeout
    })
  })

  if (response?.error) {
    throw new Error(`State submission failed: ${response.error}`)
  }
}

async function closeAppSession(playerPayout: bigint): Promise<void> {
  if (!appSessionId) {
    console.log('  No app session to close')
    return
  }

  console.log('  Closing app session...')

  const broker = brokerAddressFromConfig || BROKER_ADDRESS

  // allocations must sum to sessionTotalPool
  const playerAllocation = playerPayout > sessionTotalPool ? sessionTotalPool : playerPayout
  const brokerAllocation = sessionTotalPool - playerAllocation

  const allocations = [
    {
      participant: mainAccount.address,
      asset: ASSET_SYMBOL,
      amount: playerAllocation.toString(),
    },
    {
      participant: broker,
      asset: ASSET_SYMBOL,
      amount: brokerAllocation.toString(),
    },
  ]

  console.log(`  Final: player=${playerAllocation}, broker=${brokerAllocation}`)

  const msg = await createCloseAppSessionMessage(sessionSigner, {
    app_session_id: appSessionId,
    allocations,
  })

  ws.send(msg)

  // wait for response
  const response = await new Promise<any>((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.log('  Close session timeout, continuing...')
      resolve({ status: 'timeout' })
    }, 5000)
    pendingResponses.set('close_app_session', {
      resolve: (params) => {
        clearTimeout(timeout)
        resolve(params)
      },
      reject: (err) => {
        clearTimeout(timeout)
        reject(err)
      },
      timeout
    })
  })

  if (response?.status === 'closed' || response?.status === 'timeout') {
    console.log(`✓ App session closed`)
  } else {
    console.log(`  Close response: ${JSON.stringify(response)}`)
  }

  appSessionId = null
  sessionTotalPool = 0n
  sessionPlayerBet = 0n
  sessionHouseFunding = 0n
}

// =============================================================================
// GAME LOGIC
// =============================================================================

async function playRound(session: GameSession, row: RowConfig): Promise<RoundState> {
  const round: RoundState = {
    row,
    playerRevealed: false,
    houseRevealed: false,
  }

  console.log(`\nRow ${row.rowIndex + 1} (${row.tilesInRow} tiles):`)

  const playerChoice = randomTileChoice(row.tilesInRow)
  const playerNonce = randomNonce()
  round.playerCommit = createCommitment(playerChoice, playerNonce)
  console.log(`  Player commit: ${round.playerCommit.hash.slice(0, 18)}...`)

  const houseNonce = randomNonce()
  round.houseCommit = createCommitment(0, houseNonce)
  console.log(`  House commit: ${round.houseCommit.hash.slice(0, 18)}...`)

  round.playerChoice = playerChoice
  round.playerRevealed = true
  round.houseRevealed = true

  if (!verifyCommitment(round.playerCommit)) {
    throw new Error('Player commitment failed')
  }

  round.bombPosition = deriveBombPosition(playerNonce, houseNonce, row.tilesInRow)
  console.log(`  Bomb at position ${round.bombPosition}`)

  const hit = playerChoice === round.bombPosition
  round.result = hit ? 'boom' : 'safe'

  if (hit) {
    console.log(`  ✗ BOOM! Picked ${playerChoice}`)
  } else {
    const rowMult = calculateRowMultiplier(row.tilesInRow)
    console.log(`  ✓ SAFE! Picked ${playerChoice}. Row multiplier: ${formatMultiplier(rowMult)}`)
  }

  return round
}

async function runGame(): Promise<void> {
  const gameIdBytes = crypto.getRandomValues(new Uint8Array(32))
  const gameId = ('0x' + Array.from(gameIdBytes).map(b => b.toString(16).padStart(2, '0')).join('')) as Hex

  const numRows = 5
  const rows = generateGameRows(numRows)
  const betAmount = DEFAULT_GAME_CONFIG.initialBalance

  // create house-funded app session
  await createAppSessionWithHouseFunding(betAmount, numRows)

  const session: GameSession = {
    gameId,
    player: mainAccount.address,
    virtualBet: betAmount,
    rows,
    currentRowIndex: 0,
    rounds: [],
    cumulativeMultiplier: MULTIPLIER_SCALE,
    status: 'playing',
  }

  console.log('\n=== Game Start ===')
  console.log(`Game ID: ${gameId.slice(0, 18)}...`)
  console.log(`Bet: ${session.virtualBet} ${ASSET_SYMBOL}`)
  console.log(`Max win: ${sessionHouseFunding} ${ASSET_SYMBOL}`)
  console.log(`Rows: ${numRows}`)

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    session.currentRowIndex = i

    const round = await playRound(session, row)
    session.rounds.push(round)

    if (round.result === 'boom') {
      session.status = 'lost'
      session.cumulativeMultiplier = 0n

      // player loses everything, broker gets all
      const gameState: GameState = {
        gameId: BigInt(gameId),
        currentRow: i,
        virtualBalance: 0n,
        multiplier: 0n,
        status: 'lost',
      }
      await submitAppState(gameState, 0n)
      break
    }

    const rowMult = calculateRowMultiplier(row.tilesInRow)
    session.cumulativeMultiplier = (session.cumulativeMultiplier * rowMult) / MULTIPLIER_SCALE

    // calculate current payout with house edge applied
    const currentPayout = (betAmount * applyHouseEdge(session.cumulativeMultiplier, DEFAULT_GAME_CONFIG.houseEdgeBps)) / MULTIPLIER_SCALE
    console.log(`  Cumulative multiplier: ${formatMultiplier(session.cumulativeMultiplier)}`)
    console.log(`  Current payout: ${currentPayout} ${ASSET_SYMBOL}`)

    // submit state update with current payout
    const gameState: GameState = {
      gameId: BigInt(gameId),
      currentRow: i,
      virtualBalance: currentPayout,
      multiplier: session.cumulativeMultiplier,
      status: 'playing',
    }
    await submitAppState(gameState, currentPayout)

    await new Promise(r => setTimeout(r, 100))
  }

  if (session.status === 'playing') {
    session.status = 'won'
  }

  console.log('\n=== Game Over ===')
  console.log(`Rows completed: ${session.rounds.filter(r => r.result === 'safe').length}`)
  console.log(`Final multiplier: ${formatMultiplier(session.cumulativeMultiplier)}`)
  console.log(`Result: ${session.status.toUpperCase()}`)

  // calculate final payout based on multiplier with house edge
  const finalPayout = session.status === 'won'
    ? (session.virtualBet * applyHouseEdge(session.cumulativeMultiplier, DEFAULT_GAME_CONFIG.houseEdgeBps)) / MULTIPLIER_SCALE
    : 0n

  const profit = session.status === 'won'
    ? finalPayout - session.virtualBet
    : -session.virtualBet

  console.log(`Final payout: ${finalPayout} ${ASSET_SYMBOL}`)
  console.log(`Profit: ${profit >= 0n ? '+' : ''}${profit} ${ASSET_SYMBOL}`)

  // close the app session with final allocation
  await closeAppSession(finalPayout)
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('Death Game - House-Funded Nitrolite State Channels')
  console.log('==================================================')
  console.log('')
  console.log('CONFIG:')
  console.log(`  Player wallet: ${mainAccount.address}`)
  console.log(`  Broker wallet: ${brokerAccount.address}`)
  console.log(`  Session key: ${sessionAccount.address}${isNewSession ? ' (new)' : ' (saved)'}`)
  console.log(`  Chain: Sepolia (${SEPOLIA_CHAIN_ID})`)
  console.log(`  Clearnode: ${CLEARNODE_URL}`)
  console.log(`  Asset: ${ASSET_SYMBOL}`)
  console.log('')
  console.log('LINKS:')
  console.log(`  Player: ${sepoliaEtherscanAddress(mainAccount.address)}`)
  console.log(`  Broker: ${sepoliaEtherscanAddress(brokerAccount.address)}`)
  console.log('')

  // check Sepolia balance
  const balance = await checkSepoliaBalance()
  console.log(`Sepolia ETH: ${formatEther(balance)} ETH`)

  if (balance === 0n) {
    throw new Error('No Sepolia ETH. Get some from https://sepoliafaucet.com/')
  }
  console.log('')

  // connect and authenticate
  await connectAndAuth()

  if (!isAuthenticated) {
    throw new Error('Failed to authenticate with Yellow Network')
  }

  // wait for connection to stabilize
  await new Promise(r => setTimeout(r, 1000))

  // get clearnode config to find broker address
  await getConfig()

  // get ledger balance before game
  console.log('\n=== Ledger Balances ===')
  await getLedgerBalance()

  // print session info for saving
  if (isNewSession) {
    console.log('')
    console.log('  To reuse this session key, add to .env:')
    console.log(`  SESSION_KEY=${sessionPrivateKey}`)
  }

  // run the game
  await runGame()

  // show transaction history
  console.log('\n=== Post-Game ===')
  await getLedgerTransactions()

  // get final balance
  await getLedgerBalance()

  // cleanup
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close()
  }

  console.log('\n✓ Done!')
}

main().catch((err) => {
  console.error('\nFATAL ERROR:', err.message)
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close()
  }
  process.exit(1)
})
