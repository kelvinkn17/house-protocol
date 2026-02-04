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
  CLEARNODE_URL as PROD_CLEARNODE_URL,
  CLEARNODE_SANDBOX_URL,
  FAUCET_URL as SANDBOX_FAUCET_URL,
  ASSET_SYMBOL as PROD_ASSET_SYMBOL,
  ASSET_SYMBOL_SANDBOX,
  BROKER_ADDRESS,
  USDH_ADDRESS,
  CUSTODY_ADDRESS,
} from './types'

// =============================================================================
// CONFIG
// =============================================================================

const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex
const RPC_URL = process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'

// toggle between sandbox (no real funds) and production (real USDH)
const USE_PRODUCTION = process.env.USE_PRODUCTION === 'true'
const CLEARNODE_URL = USE_PRODUCTION ? PROD_CLEARNODE_URL : CLEARNODE_SANDBOX_URL
const FAUCET_URL = SANDBOX_FAUCET_URL
const SKIP_FAUCET = process.env.SKIP_FAUCET === 'true' || USE_PRODUCTION
const ASSET_SYMBOL = USE_PRODUCTION ? PROD_ASSET_SYMBOL : ASSET_SYMBOL_SANDBOX

// optional: reuse session key
const SAVED_SESSION_KEY = process.env.SESSION_KEY as Hex | undefined

const APP_NAME = 'death-game'
const SEPOLIA_CHAIN_ID = 11155111

if (!PRIVATE_KEY) {
  console.error('ERROR: Missing PRIVATE_KEY in .env')
  process.exit(1)
}

// =============================================================================
// SETUP
// =============================================================================

// main wallet
const mainAccount = privateKeyToAccount(PRIVATE_KEY)

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
let brokerAddress: Hex | null = null

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

async function requestFaucetTokens(): Promise<boolean> {
  console.log('Requesting faucet tokens...')
  try {
    const response = await fetch(FAUCET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAddress: mainAccount.address }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.log(`  Faucet response (${response.status}): ${text.slice(0, 100)}`)
      return false
    }

    const data = await response.json()
    console.log('  Faucet:', JSON.stringify(data))
    return true
  } catch (err) {
    console.log(`  Faucet error: ${(err as Error).message}`)
    return false
  }
}

function generateRequestId(): string {
  return Math.floor(Math.random() * 1000000).toString()
}

// =============================================================================
// WEBSOCKET MESSAGING
// =============================================================================

// send message and wait for response
function sendAndWait<T>(message: string, method: string, timeoutMs = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    const requestId = generateRequestId()

    const timeout = setTimeout(() => {
      pendingResponses.delete(method)
      reject(new Error(`Timeout waiting for ${method} response`))
    }, timeoutMs)

    pendingResponses.set(method, { resolve, reject, timeout })
    ws.send(message)
  })
}

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
      console.log('✓ Connected to Yellow Network (sandbox)')

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
            console.log(`  Ledger balances: ${JSON.stringify(params)}`)
            if (params?.balances && Array.isArray(params.balances)) {
              for (const bal of params.balances) {
                if (bal.asset === ASSET_SYMBOL || bal.asset === 'ytest.usd') {
                  ledgerBalance = BigInt(bal.amount)
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
            console.log('  Config received:', JSON.stringify(params).slice(0, 200))
            if (params?.broker_address || params?.brokerAddress) {
              brokerAddress = (params?.broker_address || params?.brokerAddress) as Hex
              console.log(`  Broker address: ${brokerAddress}`)
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
  const response = await new Promise<any>((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.log('  Config timeout, continuing...')
      resolve({})
    }, 5000)
    pendingResponses.set('get_config', {
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

  console.log(`  Config: ${JSON.stringify(response).slice(0, 300)}`)
}

// =============================================================================
// LEDGER
// =============================================================================

async function getLedgerBalance(): Promise<bigint> {
  console.log('  Fetching ledger balance...')

  const msg = await createGetLedgerBalancesMessage(sessionSigner)
  ws.send(msg)

  // wait for response
  const response = await new Promise<any>((resolve) => {
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
// APP SESSION
// =============================================================================

// track state version globally for the session
let stateVersion = 1 // starts at 1, first submit should be 2
let sessionTotalPool = 0n // total funds in session (player bet + house max payout)
let sessionMaxPayout = 0n // house's contribution (what player can win)

async function createAppSession(betAmount: bigint, numRows: number): Promise<Hex> {
  console.log('  Creating app session...')

  // use broker address from config, fallback to constant
  const counterparty = brokerAddress || BROKER_ADDRESS
  console.log(`  Counterparty (broker): ${counterparty}`)

  // calculate max payout based on game config
  // for N rows with 2 tiles each: max multiplier = 2^N
  // max payout = bet * maxMultiplier * (1 - houseEdge)
  sessionMaxPayout = calculateMaxPayout(betAmount, numRows, DEFAULT_GAME_CONFIG.houseEdgeBps)
  sessionTotalPool = betAmount + sessionMaxPayout

  console.log(`  Bet amount: ${betAmount} ${ASSET_SYMBOL}`)
  console.log(`  Max payout (house funding): ${sessionMaxPayout} ${ASSET_SYMBOL}`)
  console.log(`  Total pool: ${sessionTotalPool} ${ASSET_SYMBOL}`)

  // 2 participants: player and house (broker)
  // weights give player 100%, quorum 100% means only player needs to sign
  const definition = {
    protocol: RPCProtocolVersion.NitroRPC_0_4,
    participants: [mainAccount.address, counterparty],
    weights: [100, 0],
    quorum: 100,
    challenge: 0,
    nonce: Date.now(),
    application: APP_NAME,
  }

  // CRITICAL: both player and house fund the session
  // player contributes bet, house contributes max potential payout
  const allocations = [
    {
      participant: mainAccount.address,
      asset: ASSET_SYMBOL,
      amount: betAmount.toString(),
    },
    {
      participant: counterparty,
      asset: ASSET_SYMBOL,
      amount: sessionMaxPayout.toString(),
    },
  ]

  // reset version for new session
  stateVersion = 1

  const msg = await createAppSessionMessage(sessionSigner, {
    definition,
    allocations,
  })

  ws.send(msg)

  // wait for response
  const response = await new Promise<any>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('App session creation timeout')), 10000)
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
    console.log(`✓ App session created: ${appSessionId.slice(0, 18)}...`)
    return appSessionId
  }

  throw new Error(`Failed to create app session: ${JSON.stringify(response)}`)
}

async function submitAppState(
  gameState: GameState,
  playerAllocation: bigint
): Promise<void> {
  if (!appSessionId) {
    throw new Error('No app session active')
  }

  // increment version for each state submission
  stateVersion++

  const stateData = encodeGameState(gameState)

  // allocations must sum to session total pool (player bet + house max payout)
  // player gets playerAllocation, house gets the rest
  const houseAllocation = sessionTotalPool - playerAllocation
  const counterparty = brokerAddress || BROKER_ADDRESS

  const allocations = [
    {
      participant: mainAccount.address,
      asset: ASSET_SYMBOL,
      amount: playerAllocation.toString(),
    },
    {
      participant: counterparty,
      asset: ASSET_SYMBOL,
      amount: houseAllocation.toString(),
    },
  ]

  console.log(`  Submitting state v${stateVersion} (player: ${playerAllocation}, house: ${houseAllocation})...`)

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

  console.log(`  ✓ State v${stateVersion} accepted`)
}

async function closeAppSession(finalPlayerAmount: bigint): Promise<void> {
  if (!appSessionId) {
    console.log('  No app session to close')
    return
  }

  console.log('  Closing app session...')

  // allocations must sum to session total pool
  const houseAllocation = sessionTotalPool - finalPlayerAmount
  const counterparty = brokerAddress || BROKER_ADDRESS

  const allocations = [
    {
      participant: mainAccount.address,
      asset: ASSET_SYMBOL,
      amount: finalPlayerAmount.toString(),
    },
    {
      participant: counterparty,
      asset: ASSET_SYMBOL,
      amount: houseAllocation.toString(),
    },
  ]

  console.log(`  Final allocation: player ${finalPlayerAmount}, house ${houseAllocation}`)

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
  sessionMaxPayout = 0n
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
  console.log(`  Revealing... Bomb at position ${round.bombPosition}`)

  const hit = playerChoice === round.bombPosition
  round.result = hit ? 'boom' : 'safe'

  if (hit) {
    console.log(`  ✗ BOOM! Picked ${playerChoice}, bomb was at ${round.bombPosition}`)
  } else {
    const rowMult = calculateRowMultiplier(row.tilesInRow)
    console.log(`  ✓ SAFE! Picked ${playerChoice}. Multiplier: ${formatMultiplier(rowMult)}`)
  }

  return round
}

async function runGame(): Promise<void> {
  const gameIdBytes = crypto.getRandomValues(new Uint8Array(32))
  const gameId = ('0x' + Array.from(gameIdBytes).map(b => b.toString(16).padStart(2, '0')).join('')) as Hex

  const numRows = 5
  const rows = generateGameRows(numRows)
  const betAmount = DEFAULT_GAME_CONFIG.initialBalance

  // create app session with house funding
  // session now includes both player bet AND house max payout
  await createAppSession(betAmount, numRows)

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
  console.log(`Bet amount: ${session.virtualBet} ${ASSET_SYMBOL}`)
  console.log(`House funding: ${sessionMaxPayout} ${ASSET_SYMBOL}`)
  console.log(`Total pool: ${sessionTotalPool} ${ASSET_SYMBOL}`)
  console.log(`Rows: ${numRows}`)

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    session.currentRowIndex = i

    const round = await playRound(session, row)
    session.rounds.push(round)

    if (round.result === 'boom') {
      session.status = 'lost'
      session.cumulativeMultiplier = 0n

      // player loses everything, house takes the full pool
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
    console.log(`  Cumulative: ${formatMultiplier(session.cumulativeMultiplier)}`)
    console.log(`  Current payout: ${currentPayout} ${ASSET_SYMBOL}`)

    // submit state update, player's allocation reflects their potential cashout
    // if they cashed out now, they'd get currentPayout
    const gameState: GameState = {
      gameId: BigInt(gameId),
      currentRow: i,
      virtualBalance: currentPayout,
      multiplier: session.cumulativeMultiplier,
      status: 'playing',
    }
    // player allocation = what they'd get if they cash out now
    // house allocation = total pool minus player allocation
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

  // calculate actual payout based on multiplier with house edge
  const actualPayout = session.status === 'won'
    ? (session.virtualBet * applyHouseEdge(session.cumulativeMultiplier, DEFAULT_GAME_CONFIG.houseEdgeBps)) / MULTIPLIER_SCALE
    : 0n

  const profit = session.status === 'won' ? actualPayout - session.virtualBet : -session.virtualBet

  console.log(`Payout: ${actualPayout} ${ASSET_SYMBOL}`)
  console.log(`Profit: ${profit > 0n ? '+' : ''}${profit} ${ASSET_SYMBOL}`)

  // close the app session with final allocation
  await closeAppSession(actualPayout)
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('Death Game - Yellow Network State Channels')
  console.log('==========================================')
  console.log('')
  console.log('MODE:', USE_PRODUCTION ? 'PRODUCTION (real USDH)' : 'SANDBOX (test tokens)')
  console.log('')
  console.log('CONFIG:')
  console.log(`  Main wallet: ${mainAccount.address}`)
  console.log(`  Session key: ${sessionAccount.address}${isNewSession ? ' (new)' : ' (saved)'}`)
  console.log(`  Chain: Sepolia (${SEPOLIA_CHAIN_ID})`)
  console.log(`  Clearnode: ${CLEARNODE_URL}`)
  console.log(`  Asset: ${ASSET_SYMBOL}`)
  if (USE_PRODUCTION) {
    console.log(`  Broker: ${BROKER_ADDRESS}`)
    console.log(`  USDH: ${USDH_ADDRESS}`)
    console.log(`  Custody: ${CUSTODY_ADDRESS}`)
  }
  console.log('')
  console.log('LINKS:')
  console.log(`  Wallet: ${sepoliaEtherscanAddress(mainAccount.address)}`)
  console.log('')

  // check Sepolia balance
  const balance = await checkSepoliaBalance()
  console.log(`Sepolia ETH: ${formatEther(balance)} ETH`)

  if (balance === 0n) {
    throw new Error('No Sepolia ETH. Get some from https://sepoliafaucet.com/')
  }
  console.log('')

  // request faucet tokens for unified balance
  if (!SKIP_FAUCET) {
    await requestFaucetTokens()
    console.log('')
  }

  // connect and authenticate, this MUST succeed
  await connectAndAuth()

  if (!isAuthenticated) {
    throw new Error('Failed to authenticate with Yellow Network')
  }

  // wait for connection to stabilize
  await new Promise(r => setTimeout(r, 1000))

  // get clearnode config to find broker address
  await getConfig()

  // get ledger balance before game
  await getLedgerBalance()

  // print session info for saving
  if (isNewSession) {
    console.log('')
    console.log('  To reuse this session, add to .env:')
    console.log(`  SESSION_KEY=${sessionPrivateKey}`)
  }

  // run the game
  await runGame()

  // show transaction history
  console.log('')
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
