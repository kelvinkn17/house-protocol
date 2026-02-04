import 'dotenv/config'
import { WebSocket } from 'ws'
import { privateKeyToAccount } from 'viem/accounts'
import { createPublicClient, http, type Hex, toHex, keccak256 } from 'viem'
import { sepolia } from 'viem/chains'
import {
  createAppSessionMessage,
  createCloseAppSessionMessage,
  parseAnyRPCResponse,
  getMethod,
  getParams,
  getResult,
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
} from './game-logic'

import {
  type GameState,
  type GameSession,
  type RoundState,
  type RowConfig,
  MULTIPLIER_SCALE,
  DEFAULT_GAME_CONFIG,
} from './types'

// config
const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex
const CLEARNODE_URL = 'wss://clearnet-sandbox.yellow.com/ws'

if (!PRIVATE_KEY) {
  console.error('Missing PRIVATE_KEY in .env')
  process.exit(1)
}

// wallet setup
const account = privateKeyToAccount(PRIVATE_KEY)

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
})

console.log('Death Game - Yellow Network State Channels')
console.log('==========================================')
console.log(`Wallet: ${account.address}`)
console.log(`Chain: Sepolia`)
console.log(`Clearnode: ${CLEARNODE_URL}`)
console.log('')

// message signer using personal_sign style (as per Yellow docs)
const messageSigner = async (message: string | object): Promise<Hex> => {
  const msgStr = typeof message === 'string' ? message : JSON.stringify(message)
  // sign with ethereum personal_sign prefix
  return await account.signMessage({ message: msgStr })
}

// websocket state
let ws: WebSocket
let sessionId: string | null = null

// auth state
let isAuthenticated = false
let authResolve: (() => void) | null = null

// connect and authenticate
function connect(): Promise<void> {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(CLEARNODE_URL)

    ws.on('open', async () => {
      console.log('✓ Connected to Yellow Network (sandbox)')

      // send auth request
      const authRequest = {
        req: [
          Date.now(),
          'auth_request',
          {
            wallet: account.address,
            participant: account.address,
            app_name: 'death-game',
          },
          Math.floor(Date.now() / 1000),
        ],
        sig: [],
      }
      ws.send(JSON.stringify(authRequest))
    })

    ws.on('message', async (data) => {
      const msg = data.toString()
      try {
        const parsed = JSON.parse(msg)

        if (parsed.res) {
          const method = parsed.res[1]
          const params = parsed.res[2]

          // handle auth challenge
          if (method === 'auth_challenge') {
            const challenge = params?.challenge_message
            if (challenge) {
              console.log('  Signing auth challenge...')
              const signature = await account.signMessage({ message: challenge })

              const authVerify = {
                req: [
                  Date.now(),
                  'auth_verify',
                  {
                    participant: account.address,
                    signature,
                  },
                  Math.floor(Date.now() / 1000),
                ],
                sig: [],
              }
              ws.send(JSON.stringify(authVerify))
            }
          }

          // handle auth success
          if (method === 'auth_verify') {
            console.log('✓ Authenticated!')
            isAuthenticated = true
            if (authResolve) authResolve()
            resolve()
          }

          // handle session created
          if (method === 'session_created' || method === 'create_app_session') {
            sessionId = params?.session_id || params?.sessionId
            console.log(`✓ Session: ${sessionId?.slice(0, 18)}...`)
          }

          // handle errors
          if (method === 'error') {
            const error = params?.error || params?.message || 'Unknown error'
            // auth errors are expected if signature format doesn't match
            if (error.includes('signature') || error.includes('auth')) {
              console.log('  Auth issue (expected for demo):', error.slice(0, 50))
              resolve() // continue anyway for demo
            } else {
              console.log('Clearnode:', error)
            }
          }

          if (method === 'assets') {
            // supported assets broadcast, ignore
          }
        }

      } catch (e) {
        // non-JSON, ignore
      }
    })

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message)
      reject(err)
    })

    ws.on('close', () => {
      console.log('Disconnected')
    })

    // timeout
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        resolve()
      } else {
        reject(new Error('Connection timeout'))
      }
    }, 8000)
  })
}

// create app session for the death game
async function createGameSession(partnerAddress: string): Promise<void> {
  const appDefinition = {
    protocol: 'death-game-v1',
    participants: [account.address, partnerAddress],
    weights: [50, 50],
    quorum: 100,
    challenge: 0,
    nonce: Date.now(),
  }

  // virtual allocations (100 tokens each)
  const allocations = [
    { participant: account.address, asset: 'virtual', amount: '100000000' },
    { participant: partnerAddress, asset: 'virtual', amount: '100000000' },
  ]

  try {
    const sessionMessage = await createAppSessionMessage(
      messageSigner,
      [{ definition: appDefinition, allocations }]
    )
    ws.send(sessionMessage)
    console.log('Session request sent...')
  } catch (err) {
    console.log('Session creation:', (err as Error).message)
  }
}

// simulate a death game round
async function playRound(
  session: GameSession,
  row: RowConfig
): Promise<RoundState> {
  const round: RoundState = {
    row,
    playerRevealed: false,
    houseRevealed: false,
  }

  console.log(`\nRow ${row.rowIndex + 1} (${row.tilesInRow} tiles):`)

  // player commits
  const playerChoice = randomTileChoice(row.tilesInRow)
  const playerNonce = randomNonce()
  round.playerCommit = createCommitment(playerChoice, playerNonce)
  console.log(`  Player commit: ${round.playerCommit.hash.slice(0, 18)}...`)

  // house commits (simulated locally)
  const houseNonce = randomNonce()
  round.houseCommit = createCommitment(0, houseNonce)
  console.log(`  House commit: ${round.houseCommit.hash.slice(0, 18)}...`)

  // reveal
  round.playerChoice = playerChoice
  round.playerRevealed = true
  round.houseRevealed = true

  if (!verifyCommitment(round.playerCommit)) {
    throw new Error('Player commitment failed')
  }

  // bomb position from combined nonces
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

// run the game
async function runGame(): Promise<void> {
  const gameIdBytes = crypto.getRandomValues(new Uint8Array(32))
  const gameId = ('0x' + Array.from(gameIdBytes).map(b => b.toString(16).padStart(2, '0')).join('')) as Hex

  const numRows = 5
  const rows = generateGameRows(numRows)

  const session: GameSession = {
    gameId,
    player: account.address,
    virtualBet: DEFAULT_GAME_CONFIG.initialBalance,
    rows,
    currentRowIndex: 0,
    rounds: [],
    cumulativeMultiplier: MULTIPLIER_SCALE,
    status: 'playing',
  }

  console.log('\n=== Game Start ===')
  console.log(`Game ID: ${gameId.slice(0, 18)}...`)
  console.log(`Virtual bet: ${session.virtualBet}`)
  console.log(`Rows: ${numRows}`)

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    session.currentRowIndex = i

    const round = await playRound(session, row)
    session.rounds.push(round)

    if (round.result === 'boom') {
      session.status = 'lost'
      session.cumulativeMultiplier = 0n
      break
    }

    const rowMult = calculateRowMultiplier(row.tilesInRow)
    session.cumulativeMultiplier = (session.cumulativeMultiplier * rowMult) / MULTIPLIER_SCALE

    const withEdge = applyHouseEdge(session.cumulativeMultiplier, DEFAULT_GAME_CONFIG.houseEdgeBps)
    console.log(`  Cumulative: ${formatMultiplier(session.cumulativeMultiplier)} (with edge: ${formatMultiplier(withEdge)})`)

    await new Promise(r => setTimeout(r, 50))
  }

  if (session.status === 'playing') {
    session.status = 'won'
  }

  console.log('\n=== Game Over ===')
  console.log(`Rows completed: ${session.rounds.filter(r => r.result === 'safe').length}`)
  console.log(`Final multiplier: ${formatMultiplier(session.cumulativeMultiplier)}`)
  console.log(`Result: ${session.status.toUpperCase()}`)

  const finalBalance = session.status === 'won'
    ? (session.virtualBet * session.cumulativeMultiplier) / MULTIPLIER_SCALE
    : 0n
  console.log(`Virtual payout: ${finalBalance}`)

  const gameState: GameState = {
    gameId: BigInt(gameId),
    currentRow: session.currentRowIndex,
    virtualBalance: finalBalance,
    multiplier: session.cumulativeMultiplier,
    status: session.status,
  }
  const encodedState = encodeGameState(gameState)
  console.log(`\nEncoded state: ${encodedState.slice(0, 40)}...`)
}

// main
async function main() {
  try {
    // check balance
    const balance = await publicClient.getBalance({ address: account.address })
    console.log(`Sepolia balance: ${(Number(balance) / 1e18).toFixed(6)} ETH\n`)

    // connect to Yellow sandbox
    await connect()

    // try creating a session (using a dummy partner for demo)
    const dummyPartner = '0x0000000000000000000000000000000000000001'
    await createGameSession(dummyPartner)

    // wait a bit for session response
    await new Promise(r => setTimeout(r, 2000))

    // run game
    await runGame()

    // close connection
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close()
    }

    console.log('\n✓ Done!')

  } catch (err) {
    console.error('Error:', (err as Error).message)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close()
    }
    process.exit(1)
  }
}

main()
