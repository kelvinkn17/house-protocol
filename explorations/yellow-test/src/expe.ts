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
} from 'viem'
import { sepolia } from 'viem/chains'
import {
    createECDSAMessageSigner,
    createAuthRequestMessage,
    createAuthVerifyMessageFromChallenge,
    createEIP712AuthMessageSigner,
    createAppSessionMessage,
    createCloseAppSessionMessage,
    createGetLedgerBalancesMessage,
    RPCProtocolVersion,
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

const APP_NAME = 'full-flow-test'

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

// Broker signer must use broker's actual private key (not a random session key)
// because the clearnode verifies the signature against the broker's address
const brokerSigner = createECDSAMessageSigner(BROKER_PRIVATE_KEY)

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
        name: 'withdraw',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
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

async function getLedgerBalance(
    account: typeof playerAccount,
    walletClient: typeof playerWalletClient,
    sessionAccount: typeof playerSessionAccount,
    sessionSigner: ReturnType<typeof createECDSAMessageSigner>
): Promise<bigint> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(CLEARNODE_URL)
        let ledgerBalance = 0n

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
                // ignore
            }
        })

        ws.on('error', (err) => reject(err))
        setTimeout(() => {
            ws.close()
            reject(new Error('Timeout'))
        }, 15000)
    })
}

async function printBalances(step: string): Promise<void> {
    console.log(`\n--- ${step} ---`)

    const playerCustody = await getCustodyBalance(playerAccount.address)
    const brokerCustody = await getCustodyBalance(brokerAccount.address)

    console.log(`  Custody:  Player=${(Number(playerCustody) / 1_000_000).toFixed(2)} | Broker=${(Number(brokerCustody) / 1_000_000).toFixed(2)} USDH`)

    try {
        const pKey = generatePrivateKey()
        const pAcc = privateKeyToAccount(pKey)
        const pSign = createECDSAMessageSigner(pKey)
        const playerLedger = await getLedgerBalance(playerAccount, playerWalletClient, pAcc, pSign)

        const bKey = generatePrivateKey()
        const bAcc = privateKeyToAccount(bKey)
        const bSign = createECDSAMessageSigner(bKey)
        const brokerLedger = await getLedgerBalance(brokerAccount, brokerWalletClient, bAcc, bSign)

        console.log(`  Ledger:   Player=${playerLedger} | Broker=${brokerLedger} ${ASSET_SYMBOL}`)
    } catch (e: any) {
        console.log(`  Ledger:   error - ${e.message}`)
    }
}

// =============================================================================
// ON-CHAIN OPERATIONS
// =============================================================================

async function depositToCustody(
    walletClient: typeof playerWalletClient,
    account: Address,
    amount: bigint,
    label: string
): Promise<void> {
    const amountOnChain = amount * 1000000n // Convert to 6 decimals
    console.log(`  ${label} depositing ${amount} USDH to custody...`)

    // Check allowance
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
    console.log(`    ✓ Deposited (tx: ${hash.slice(0, 18)}...)`)
}

async function withdrawFromCustody(
    walletClient: typeof playerWalletClient,
    amount: bigint,
    label: string
): Promise<void> {
    const amountOnChain = amount * 1000000n
    console.log(`  ${label} withdrawing ${amount} USDH from custody...`)

    const hash = await walletClient.writeContract({
        address: CUSTODY_ADDRESS,
        abi: CUSTODY_ABI,
        functionName: 'withdraw',
        args: [USDH_ADDRESS, amountOnChain],
    })
    await publicClient.waitForTransactionReceipt({ hash })
    console.log(`    ✓ Withdrawn (tx: ${hash.slice(0, 18)}...)`)
}

// =============================================================================
// APP SESSION (Off-Chain Transfer)
// =============================================================================

interface SessionState {
    ws: WebSocket
    sessionId: Hex | null
    authenticated: boolean
}

async function openSession(
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
            allowances: [{ asset: ASSET_SYMBOL, amount: (brokerAmount + playerAmount).toString() }],
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
                        console.log('    ✓ Authenticated')

                        // Create app session
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
                        const parsed = JSON.parse(playerMsg)

                        const brokerMsg = await createAppSessionMessage(brokerSigner, { definition, allocations }, requestId, timestamp)
                        const brokerParsed = JSON.parse(brokerMsg)

                        parsed.sig = [...parsed.sig, ...brokerParsed.sig]
                        ws.send(JSON.stringify(parsed))
                    }

                    if (method === 'create_app_session') {
                        if (params?.app_session_id) {
                            state.sessionId = params.app_session_id
                            console.log(`    ✓ Session created: ${state.sessionId?.slice(0, 18)}...`)
                            resolve(state)
                        } else {
                            reject(new Error(params?.error || 'Failed to create session'))
                        }
                    }

                    if (method === 'error') {
                        reject(new Error(params?.error || params?.message))
                    }
                }
            } catch (e) {
                // ignore
            }
        })

        ws.on('error', (err) => reject(err))
        setTimeout(() => reject(new Error('Timeout opening session')), 30000)
    })
}

async function closeSession(
    state: SessionState,
    playerAmount: number,
    brokerAmount: number
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
                if (parsed.res) {
                    const method = parsed.res[1]
                    const params = parsed.res[2]

                    if (method === 'close_app_session') {
                        state.ws.off('message', handleMessage)
                        if (params?.status === 'closed' || params?.app_session_id) {
                            console.log(`    ✓ Session closed`)
                            resolve()
                        } else {
                            reject(new Error(params?.error || 'Failed to close'))
                        }
                    }

                    if (method === 'error') {
                        state.ws.off('message', handleMessage)
                        reject(new Error(params?.error || params?.message))
                    }
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
    console.log('=== Full Flow Test ===')
    console.log('')
    console.log('Flow:')
    console.log('  1. Deposit USDH to custody (player=20, broker=200)')
    console.log('  2. Open session: player=20, broker=200')
    console.log('  3. Close session: player=20.5, broker=199.5')
    console.log('  4. Each withdraws 2 USDH from custody')
    console.log('')
    console.log(`Player: ${playerAccount.address}`)
    console.log(`Broker: ${brokerAccount.address}`)

    // Initial balances
    await printBalances('INITIAL')

    // // Step 1: Deposit USDH to custody
    // console.log('\n=== STEP 1: Deposit USDH to custody (player=20, broker=200) ===')
    // await depositToCustody(playerWalletClient, playerAccount.address, 20n, 'Player')
    // await depositToCustody(brokerWalletClient, brokerAccount.address, 200n, 'Broker')

    // console.log('  Waiting for ledger sync (5s)...')
    // await new Promise(r => setTimeout(r, 5000))
    // await printBalances('After Deposit')

    // Step 2: Open session with initial allocations
    // Player puts 20, broker puts 200 = total pool of 220
    console.log('\n=== STEP 2: Open Session (player=20, broker=200) ===')
    const session = await openSession(20n, 200n)
    await printBalances('After Session Open')

    // Step 3: Close session with final allocations
    // Player gets 20.5 (+0.5), broker gets 199.5 (-0.5)
    console.log('\n=== STEP 3: Close Session (player=20.5, broker=199.5) ===')
    await closeSession(session, 20.5, 199.5)
    session.ws.close()
    await new Promise(r => setTimeout(r, 3000))
    await printBalances('After Session Close')

    // Step 4: Each withdraws 2 USDH
    console.log('\n=== STEP 4: Each withdraws 2 USDH ===')
    await withdrawFromCustody(playerWalletClient, 2n, 'Player')
    await withdrawFromCustody(brokerWalletClient, 2n, 'Broker')
    await printBalances('After Withdraw')

    console.log('\n=== DONE ===')
    console.log('')
    console.log('Summary:')
    console.log('  - App sessions track off-chain allocations')
    console.log('  - Session close distributes funds based on final allocations')
    console.log('  - Custody deposits/withdraws are on-chain')
    console.log('  - Ledger syncs from custody but session changes are instant')
}

main().catch((err) => {
    console.error('\nFATAL:', err.message)
    process.exit(1)
})
