import 'dotenv/config'
import { WebSocket } from 'ws'
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'
import { createPublicClient, createWalletClient, http, type Hex, formatEther } from 'viem'
import { sepolia } from 'viem/chains'
import {
  NitroliteClient,
  WalletStateSigner,
  createECDSAMessageSigner,
  createAuthRequestMessage,
  createAuthVerifyMessageFromChallenge,
  createEIP712AuthMessageSigner,
  createCreateChannelMessage,
  createResizeChannelMessage,
  createGetChannelsMessage,
  parseAnyRPCResponse,
  getMethod,
  getParams,
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

// =============================================================================
// CONFIG
// =============================================================================

const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex
const RPC_URL = process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'
const CLEARNODE_URL = 'wss://clearnet-sandbox.yellow.com/ws'
const FAUCET_URL = 'https://clearnet-sandbox.yellow.com/faucet/requestTokens'
const SKIP_FAUCET = process.env.SKIP_FAUCET === 'true'

// optional: reuse session key and channel for faster startup
const SAVED_SESSION_KEY = process.env.SESSION_KEY as Hex | undefined
const SAVED_CHANNEL_ID = process.env.CHANNEL_ID as string | undefined

// Yellow Network contract addresses on Sepolia
const CUSTODY_ADDRESS = '0x019B65A265EB3363822f2752141b3dF16131B262' as Hex
const ADJUDICATOR_ADDRESS = '0x7c7ccbc98469190849BCC6c926307794fDfB11F2' as Hex
const YTEST_USD_TOKEN = '0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb' as Hex

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

// nitrolite client
const nitroliteClient = new NitroliteClient({
  publicClient,
  walletClient,
  stateSigner: new WalletStateSigner(walletClient),
  addresses: {
    custody: CUSTODY_ADDRESS,
    adjudicator: ADJUDICATOR_ADDRESS,
  },
  chainId: sepolia.id,
  challengeDuration: 3600n,
})

// =============================================================================
// HELPERS
// =============================================================================

function sepoliaEtherscanTx(hash: string): string {
  return `https://sepolia.etherscan.io/tx/${hash}`
}

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

// =============================================================================
// WEBSOCKET & AUTH
// =============================================================================

let ws: WebSocket
let isAuthenticated = false
let jwtToken: string | null = null
let channelId: string | null = SAVED_CHANNEL_ID || null
let supportedTokens: Map<string, { address: Hex; chainId: number }> = new Map()

// auth params for EIP-712
const authParams = {
  address: mainAccount.address,
  session_key: sessionAccount.address,
  application: APP_NAME,
  scope: APP_NAME,
  expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600),
  allowances: [{ asset: 'ytest.usd', amount: '1000000000' }],
}

function connectAndAuth(): Promise<void> {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(CLEARNODE_URL)

    ws.on('open', async () => {
      console.log('✓ Connected to Yellow Network (sandbox)')

      try {
        // send auth request
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
        console.error('  Auth request failed:', (err as Error).message)
        reject(err)
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
                // sign with EIP-712 using MAIN wallet
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
                console.error('  EIP-712 signing failed:', (err as Error).message)
                resolve() // continue anyway
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
              console.log('  Auth response:', JSON.stringify(params))
              resolve()
            }
          }

          // channels list (response comes as 'channels' not 'get_channels')
          if (method === 'get_channels' || method === 'channels') {
            const channelsList = params?.channels || params || []
            if (Array.isArray(channelsList) && channelsList.length > 0) {
              channelId = channelsList[0].channel_id
              console.log(`  Found existing channel: ${channelId}`)
            }
            // don't log "no channels found" here, we'll handle it in main
          }

          // channel created
          if (method === 'create_channel') {
            channelId = params?.channel_id
            console.log(`✓ Channel created: ${channelId}`)
          }

          // error
          if (method === 'error') {
            const error = params?.error || 'Unknown'
            console.log(`  Error: ${error}`)
            if (!isAuthenticated) {
              resolve() // continue for debugging
            }
          }

          // assets config broadcast
          if (method === 'assets') {
            const assets = params?.assets || params || []
            if (Array.isArray(assets)) {
              console.log('  Supported assets:')
              for (const asset of assets) {
                // fields are: token, chain_id, symbol, decimals
                const symbol = asset.symbol || asset.name
                const chainId = asset.chain_id || asset.chainId
                const tokenAddr = asset.token || asset.token_address || asset.address
                if (symbol && chainId && tokenAddr) {
                  supportedTokens.set(symbol, {
                    address: tokenAddr as Hex,
                    chainId: chainId,
                  })
                  console.log(`    ${symbol}: ${tokenAddr} (chain ${chainId})`)
                }
              }
            }
          }
        }
      } catch (e) {
        // non-JSON
      }
    })

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message)
      reject(err)
    })

    ws.on('close', () => {
      console.log('Disconnected from clearnode')
    })

    // timeout
    setTimeout(() => {
      resolve() // don't reject, continue with what we have
    }, 15000)
  })
}

async function getChannels(): Promise<void> {
  if (!isAuthenticated) return

  try {
    const msg = await createGetChannelsMessage(sessionSigner, mainAccount.address)
    ws.send(msg)
    await new Promise(r => setTimeout(r, 2000))
  } catch (err) {
    console.log('  Get channels error:', (err as Error).message)
  }
}

async function createChannel(): Promise<void> {
  if (!isAuthenticated) {
    console.log('  Cannot create channel: not authenticated')
    return
  }

  // use ytest.usd on Sepolia (the token address is same across chains)
  const tokenAddress: Hex = YTEST_USD_TOKEN
  const tokenChainId = SEPOLIA_CHAIN_ID
  console.log(`  Using ytest.usd: ${tokenAddress} (chain ${tokenChainId})`)

  try {
    const msg = await createCreateChannelMessage(sessionSigner, {
      chain_id: tokenChainId,
      token: tokenAddress,
    })
    console.log('  Requesting channel creation...')
    ws.send(msg)
    await new Promise(r => setTimeout(r, 3000))
  } catch (err) {
    console.log('  Create channel error:', (err as Error).message)
  }
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

  const session: GameSession = {
    gameId,
    player: mainAccount.address,
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
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('Death Game - Yellow Network State Channels')
  console.log('==========================================')
  console.log('')
  console.log('CONFIG:')
  console.log(`  Main wallet: ${mainAccount.address}`)
  console.log(`  Session key: ${sessionAccount.address}${isNewSession ? ' (new)' : ' (saved)'}`)
  if (SAVED_CHANNEL_ID) console.log(`  Channel: ${SAVED_CHANNEL_ID}`)
  console.log(`  Chain: Sepolia (${SEPOLIA_CHAIN_ID})`)
  console.log(`  Clearnode: ${CLEARNODE_URL}`)
  console.log('')
  console.log('LINKS:')
  console.log(`  Wallet: ${sepoliaEtherscanAddress(mainAccount.address)}`)
  console.log(`  Custody: ${sepoliaEtherscanAddress(CUSTODY_ADDRESS)}`)
  console.log(`  ytest.usd: ${sepoliaEtherscanAddress(YTEST_USD_TOKEN)}`)
  console.log('')

  // check Sepolia balance
  const balance = await checkSepoliaBalance()
  console.log(`Sepolia ETH: ${formatEther(balance)} ETH`)

  if (balance === 0n) {
    console.error('\nERROR: No Sepolia ETH. Get some from https://sepoliafaucet.com/')
    process.exit(1)
  }
  console.log('')

  // request faucet tokens (for unified balance), skip if SKIP_FAUCET=true
  if (!SKIP_FAUCET) {
    await requestFaucetTokens()
    console.log('')
  }

  // connect and authenticate
  await connectAndAuth()

  if (!isAuthenticated) {
    console.log('\nWARNING: Not authenticated with Yellow Network')
    console.log('The game will run in simulation mode (local state only)')
    console.log('')
  } else {
    // wait for assets and channels broadcasts
    await new Promise(r => setTimeout(r, 1500))

    // create channel if none found
    if (!channelId) {
      await createChannel()
    } else if (SAVED_CHANNEL_ID) {
      console.log(`  Using saved channel: ${channelId}`)
    }

    // print session info for saving (only if new session)
    if (isNewSession && channelId) {
      console.log('')
      console.log('  To reuse this session, add to .env:')
      console.log(`  SESSION_KEY=${sessionPrivateKey}`)
      console.log(`  CHANNEL_ID=${channelId}`)
    }
  }

  // run game
  await runGame()

  // cleanup
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close()
  }

  console.log('\n✓ Done!')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
