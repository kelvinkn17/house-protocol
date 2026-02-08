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
  parseUnits,
} from 'viem'
import { sepolia } from 'viem/chains'
import {
  createECDSAMessageSigner,
  createAuthRequestMessage,
  createAuthVerifyMessageFromChallenge,
  createEIP712AuthMessageSigner,
  createGetLedgerBalancesMessage,
  createCreateChannelMessage,
  createCloseChannelMessage,
  createResizeChannelMessage,
  createGetChannelsMessageV2,
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

const DEPOSIT_AMOUNT = 100n // 100 USDH in ledger units
const TRANSFER_AMOUNT = 50n // Transfer 50 from player to broker

if (!PRIVATE_KEY || !BROKER_PRIVATE_KEY) {
  console.error('ERROR: Missing PRIVATE_KEY or BROKER_PRIVATE_KEY')
  process.exit(1)
}

// =============================================================================
// SETUP
// =============================================================================

const playerAccount = privateKeyToAccount(PRIVATE_KEY)
const brokerAccount = privateKeyToAccount(BROKER_PRIVATE_KEY)

const playerSessionKey = generatePrivateKey()
const playerSessionAccount = privateKeyToAccount(playerSessionKey)
const playerSessionSigner = createECDSAMessageSigner(playerSessionKey)

const brokerSessionKey = generatePrivateKey()
const brokerSessionAccount = privateKeyToAccount(brokerSessionKey)
const brokerSessionSigner = createECDSAMessageSigner(brokerSessionKey)

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

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
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

async function getWalletBalance(account: Address): Promise<bigint> {
  return publicClient.readContract({
    address: USDH_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account],
  })
}

async function depositToCustody(
  walletClient: typeof playerWalletClient,
  account: Address,
  amount: bigint
): Promise<void> {
  const amountOnChain = amount * 1000000n // Convert to 6 decimals

  // Check allowance
  const allowance = await publicClient.readContract({
    address: USDH_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account, CUSTODY_ADDRESS],
  })

  if (allowance < amountOnChain) {
    console.log(`    Approving USDH...`)
    const approveHash = await walletClient.writeContract({
      address: USDH_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CUSTODY_ADDRESS, amountOnChain * 10n],
    })
    await publicClient.waitForTransactionReceipt({ hash: approveHash })
  }

  console.log(`    Depositing ${amount} USDH...`)
  const hash = await walletClient.writeContract({
    address: CUSTODY_ADDRESS,
    abi: CUSTODY_ABI,
    functionName: 'deposit',
    args: [account, USDH_ADDRESS, amountOnChain],
  })
  console.log(`    Tx: https://sepolia.etherscan.io/tx/${hash}`)

  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status === 'success') {
    console.log(`    ✓ Deposited`)
  } else {
    throw new Error('Deposit failed')
  }
}

// =============================================================================
// LEDGER BALANCE (via WebSocket)
// =============================================================================

async function getLedgerBalance(
  account: typeof playerAccount,
  walletClient: typeof playerWalletClient,
  sessionAccount: typeof playerSessionAccount,
  sessionSigner: ReturnType<typeof createECDSAMessageSigner>,
  label: string
): Promise<bigint> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(CLEARNODE_URL)
    let ledgerBalance = 0n

    const authParams = {
      address: account.address,
      session_key: sessionAccount.address,
      application: 'test-channel',
      scope: 'test-channel',
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
// CHANNEL OPERATIONS (via WebSocket)
// =============================================================================

async function getChannels(
  account: typeof playerAccount,
  walletClient: typeof playerWalletClient,
  sessionSigner: ReturnType<typeof createECDSAMessageSigner>,
  label: string
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(CLEARNODE_URL)
    const sessionKey = generatePrivateKey()
    const sessionAccount = privateKeyToAccount(sessionKey)

    const authParams = {
      address: account.address,
      session_key: sessionAccount.address,
      application: 'test-channel',
      scope: 'test-channel',
      expires_at: BigInt(Math.floor(Date.now() / 1000) + 300),
      allowances: [{ asset: ASSET_SYMBOL, amount: '1000000' }],
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
            // Get channels
            const msg = createGetChannelsMessageV2(account.address)
            ws.send(msg)
          }

          if (method === 'get_channels') {
            const channels = params?.channels || []
            ws.close()
            resolve(channels)
          }
        }
      } catch (e) {
        // ignore
      }
    })

    ws.on('error', (err) => reject(err))

    setTimeout(() => {
      ws.close()
      reject(new Error(`Timeout getting ${label} channels`))
    }, 15000)
  })
}

interface ChannelResult {
  channelId?: string
  error?: string
  channel?: any
}

// Full channel flow in one session: create -> resize -> close
async function fullChannelFlow(
  amount: bigint,
  transferToAddress: Address
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(CLEARNODE_URL)
    const sessionKey = generatePrivateKey()
    const sessionAccount = privateKeyToAccount(sessionKey)
    const sessionSigner = createECDSAMessageSigner(sessionKey)

    let channelId: string | null = null
    let step = 'auth'

    const authParams = {
      address: playerAccount.address,
      session_key: sessionAccount.address,
      application: 'test-channel',
      scope: 'test-channel',
      expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600),
      allowances: [{ asset: ASSET_SYMBOL, amount: '1000000' }],
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
        const method = parsed.res?.[1]
        const params = parsed.res?.[2]

        console.log(`    [${step}] ${method}:`, JSON.stringify(params).slice(0, 150))

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
          console.log('    ✓ Authenticated')
          step = 'create'

          // Step 1: Create channel
          const channelParams = {
            chain_id: 11155111,
            token: USDH_ADDRESS,
          }
          const msg = await createCreateChannelMessage(sessionSigner, channelParams)
          ws.send(msg)
        }

        if (method === 'create_channel' && step === 'create') {
          if (params?.channel_id) {
            channelId = params.channel_id
            console.log(`    ✓ Channel created: ${channelId}`)
            step = 'resize'

            // // Step 2: Resize (add funds) - wait a moment
            // await new Promise(r => setTimeout(r, 1000))

            // const resizeParams = {
            //   channel_id: channelId,
            //   allocate_amount: amount,
            //   funds_destination: playerAccount.address,
            // }
            // const msg = await createResizeChannelMessage(sessionSigner, resizeParams)
            // console.log('    Sending resize_channel...')
            // ws.send(msg)
          } else {
            ws.close()
            resolve({ success: false, error: params?.error || 'No channel_id' })
          }
        }

        if (method === 'resize_channel' && step === 'resize') {
          console.log('    ✓ Channel resized')
          step = 'close'

          // Step 3: Close channel
          await new Promise(r => setTimeout(r, 1000))

          const closeMsg = await createCloseChannelMessage(
            sessionSigner,
            channelId!,
            transferToAddress
          )
          console.log('    Sending close_channel...')
          ws.send(closeMsg)
        }

        if (method === 'close_channel' && step === 'close') {
          console.log('    ✓ Channel closed')
          ws.close()
          resolve({ success: true })
        }

        if (method === 'error') {
          console.log(`    ✗ Error at step ${step}:`, params?.error || params?.message)
          ws.close()
          resolve({ success: false, error: `${step}: ${params?.error || params?.message}` })
        }
      } catch (e) {
        console.log('    Parse error:', e)
      }
    })

    ws.on('error', (err) => reject(err))

    setTimeout(() => {
      ws.close()
      reject(new Error(`Timeout at step: ${step}`))
    }, 60000)
  })
}

async function createChannel(): Promise<ChannelResult> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(CLEARNODE_URL)
    const sessionKey = generatePrivateKey()
    const sessionAccount = privateKeyToAccount(sessionKey)
    const sessionSigner = createECDSAMessageSigner(sessionKey)

    const authParams = {
      address: playerAccount.address,
      session_key: sessionAccount.address,
      application: 'test-channel',
      scope: 'test-channel',
      expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600),
      allowances: [{ asset: ASSET_SYMBOL, amount: '1000000' }],
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
        console.log('    [WS]', JSON.stringify(parsed).slice(0, 200))

        if (parsed.res) {
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
            console.log('    Authenticated, creating channel...')

            // Create channel - just needs chain_id and token
            const channelParams = {
              chain_id: 11155111, // Sepolia
              token: USDH_ADDRESS,
            }

            const msg = await createCreateChannelMessage(sessionSigner, channelParams)
            console.log('    Sending create_channel:', msg.slice(0, 150))
            ws.send(msg)
          }

          if (method === 'create_channel') {
            console.log('    create_channel response:', JSON.stringify(params))
            ws.close()
            if (params?.channel_id) {
              resolve({ channelId: params.channel_id })
            } else if (params?.error) {
              resolve({ error: params.error })
            } else {
              resolve({ channelId: params?.channel_id, error: params ? undefined : 'Empty response' })
            }
          }

          if (method === 'error') {
            console.log('    Error:', params?.message || params?.error)
            ws.close()
            resolve({ error: params?.message || params?.error || 'Unknown error' })
          }
        }
      } catch (e) {
        console.log('    Parse error:', e)
      }
    })

    ws.on('error', (err) => {
      console.log('    WS error:', err.message)
      reject(err)
    })

    setTimeout(() => {
      ws.close()
      reject(new Error('Timeout creating channel'))
    }, 30000)
  })
}

async function closeChannel(channelId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(CLEARNODE_URL)
    const sessionKey = generatePrivateKey()
    const sessionAccount = privateKeyToAccount(sessionKey)
    const sessionSigner = createECDSAMessageSigner(sessionKey)

    const authParams = {
      address: playerAccount.address,
      session_key: sessionAccount.address,
      application: 'test-channel',
      scope: 'test-channel',
      expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600),
      allowances: [{ asset: ASSET_SYMBOL, amount: '1000000' }],
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
        console.log('    [WS]', JSON.stringify(parsed).slice(0, 200))

        if (parsed.res) {
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
            console.log('    Authenticated, closing channel...')

            // Close channel - funds go to broker
            const msg = await createCloseChannelMessage(
              sessionSigner,
              channelId,
              brokerAccount.address // funds destination
            )
            console.log('    Sending close_channel')
            ws.send(msg)
          }

          if (method === 'close_channel') {
            console.log('    close_channel response:', JSON.stringify(params))
            ws.close()
            resolve(params)
          }

          if (method === 'error') {
            console.log('    Error:', params?.message || params?.error)
            ws.close()
            resolve({ error: params?.message || params?.error })
          }
        }
      } catch (e) {
        console.log('    Parse error:', e)
      }
    })

    ws.on('error', (err) => reject(err))

    setTimeout(() => {
      ws.close()
      reject(new Error('Timeout closing channel'))
    }, 30000)
  })
}

// =============================================================================
// PRINT BALANCES
// =============================================================================

async function printBalances(label: string): Promise<void> {
  console.log(`\n=== ${label} ===`)

  // Custody (on-chain)
  const playerCustody = await getCustodyBalance(playerAccount.address)
  const brokerCustody = await getCustodyBalance(brokerAccount.address)

  console.log('  Custody (on-chain):')
  console.log(`    Player: ${formatUnits(playerCustody, 6)} USDH`)
  console.log(`    Broker: ${formatUnits(brokerCustody, 6)} USDH`)

  // Ledger (off-chain)
  console.log('  Ledger (off-chain):')
  try {
    const playerLedger = await getLedgerBalance(
      playerAccount,
      playerWalletClient,
      playerSessionAccount,
      playerSessionSigner,
      'player'
    )
    console.log(`    Player: ${playerLedger} ${ASSET_SYMBOL}`)
  } catch (e: any) {
    console.log(`    Player: error - ${e.message}`)
  }

  try {
    const brokerLedger = await getLedgerBalance(
      brokerAccount,
      brokerWalletClient,
      brokerSessionAccount,
      brokerSessionSigner,
      'broker'
    )
    console.log(`    Broker: ${brokerLedger} ${ASSET_SYMBOL}`)
  } catch (e: any) {
    console.log(`    Broker: error - ${e.message}`)
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('=== Nitrolite Channel Test ===')
  console.log('')
  console.log('This script tests the proper channel flow:')
  console.log('  1. Deposit to custody (on-chain)')
  console.log('  2. Check balances')
  console.log('  3. Open virtual channel via clearnode')
  console.log('  4. Close channel (transfer to broker)')
  console.log('  5. Check final balances')
  console.log('')
  console.log(`Player: ${playerAccount.address}`)
  console.log(`Broker: ${brokerAccount.address}`)

  // Step 1: Check initial balances
  await printBalances('Initial Balances')

  // Step 2: Deposit to custody
  console.log('\n=== Step 1: Deposit to Custody ===')

  const playerWallet = await getWalletBalance(playerAccount.address)
  const brokerWallet = await getWalletBalance(brokerAccount.address)
  const depositOnChain = DEPOSIT_AMOUNT * 1000000n

  console.log(`  Player wallet: ${formatUnits(playerWallet, 6)} USDH`)
  console.log(`  Broker wallet: ${formatUnits(brokerWallet, 6)} USDH`)

  if (playerWallet >= depositOnChain) {
    console.log('\n  Depositing for Player:')
    await depositToCustody(playerWalletClient, playerAccount.address, DEPOSIT_AMOUNT)
  } else {
    console.log(`  Player has insufficient USDH for deposit`)
  }

  if (brokerWallet >= depositOnChain) {
    console.log('\n  Depositing for Broker:')
    await depositToCustody(brokerWalletClient, brokerAccount.address, DEPOSIT_AMOUNT)
  } else {
    console.log(`  Broker has insufficient USDH for deposit`)
  }

  // Wait for sync
  console.log('\n  Waiting for ledger sync (10s)...')
  await new Promise(r => setTimeout(r, 10000))

  // Step 3: Check balances after deposit
  await printBalances('After Deposit')

  // Step 4: Check existing channels
  console.log('\n=== Step 2: Check Existing Channels ===')
  try {
    const channels = await getChannels(playerAccount, playerWalletClient, playerSessionSigner, 'player')
    console.log(`  Player channels: ${channels.length}`)
    if (channels.length > 0) {
      console.log('  Channels:', JSON.stringify(channels, null, 2))
    }
  } catch (e: any) {
    console.log(`  Error getting channels: ${e.message}`)
  }

  // Step 5: Full channel flow - create, resize (add funds), close
  console.log('\n=== Step 3: Full Channel Flow ===')
  console.log(`  Creating channel, adding ${TRANSFER_AMOUNT} USDH, transferring to broker`)
  console.log(`  Amount: ${TRANSFER_AMOUNT} ${ASSET_SYMBOL} (${TRANSFER_AMOUNT * 1000000n} on-chain)`)

  const flowResult = await fullChannelFlow(
    TRANSFER_AMOUNT * 1000000n, // Convert to on-chain units (6 decimals)
    brokerAccount.address
  )

  if (flowResult.success) {
    console.log(`  ✓ Channel flow completed successfully!`)
  } else {
    console.log(`  ✗ Channel flow failed: ${flowResult.error}`)
  }

  // Step 7: Final balances
  await new Promise(r => setTimeout(r, 5000))
  await printBalances('Final Balances')

  console.log('\n=== Summary ===')
  console.log('If channel creation failed, the clearnode may:')
  console.log('  - Not support direct channel creation via RPC')
  console.log('  - Require specific permissions or setup')
  console.log('  - Only support app sessions (virtual channels)')
  console.log('')
  console.log('The key insight is:')
  console.log('  - App sessions update LEDGER only (off-chain)')
  console.log('  - True channels update CUSTODY (on-chain)')
}

main().catch((err) => {
  console.error('\nFATAL:', err.message)
  process.exit(1)
})
