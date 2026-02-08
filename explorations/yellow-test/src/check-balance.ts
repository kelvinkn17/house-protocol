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
  formatEther,
} from 'viem'
import { sepolia } from 'viem/chains'
import {
  createECDSAMessageSigner,
  createAuthRequestMessage,
  createAuthVerifyMessageFromChallenge,
  createEIP712AuthMessageSigner,
  createGetLedgerBalancesMessage,
} from '@erc7824/nitrolite'
import { USDH_ADDRESS, CUSTODY_ADDRESS, BROKER_ADDRESS, CLEARNODE_URL, ASSET_SYMBOL } from './types'

const RPC_URL = process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'

const PLAYER = '0x8d74843D6f308ab6D509b2C67f7d82720e98B640';
const OPERATOR = '0x7952a3087B0f48F427CcA652fe0EEf1a2d516A62';

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

async function getLedgerBalance(address: Address): Promise<bigint> {
  const sessionKey = generatePrivateKey()
  const sessionAccount = privateKeyToAccount(sessionKey)
  const sessionSigner = createECDSAMessageSigner(sessionKey)

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(RPC_URL),
  })

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
        const authRequestMsg = await createAuthRequestMessage({
          address: authParams.address,
          application: authParams.application,
          session_key: authParams.session_key,
          allowances: authParams.allowances,
          expires_at: authParams.expires_at,
          scope: authParams.scope,
        })
        ws.send(authRequestMsg)
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

    ws.on('error', (err) => {
      reject(err)
    })

    setTimeout(() => {
      ws.close()
      reject(new Error('Timeout getting ledger balance'))
    }, 15000)
  })
}

async function main() {
  console.log('=== Balance Check ===\n')

  console.log('Contracts:')
  console.log(`  USDH Token: ${USDH_ADDRESS}`)
  console.log(`  Custody:    ${CUSTODY_ADDRESS}`)
  console.log('')

  // Player balances
  console.log('PLAYER:')
  console.log(`  Address: ${PLAYER}`)
  const playerETH = await getETHBalance(PLAYER)
  const playerUSDH = await getUSDHBalance(PLAYER)
  const playerCustody = await getCustodyBalance(PLAYER)
  console.log(`  ETH (wallet):   ${formatEther(playerETH)} ETH`)
  console.log(`  USDH (wallet):  ${formatUnits(playerUSDH, 6)} USDH`)
  console.log(`  USDH (custody): ${formatUnits(playerCustody, 6)} USDH`)
  console.log('')

  console.log('OPERATOR:')
  console.log(`  Address: ${OPERATOR}`)
  const operatorETH = await getETHBalance(OPERATOR)
  const operatorUSDH = await getUSDHBalance(OPERATOR)
  const operatorCustody = await getCustodyBalance(OPERATOR)
  console.log(`  ETH (wallet):   ${formatEther(operatorETH)} ETH`)
  console.log(`  USDH (wallet):  ${formatUnits(operatorUSDH, 6)} USDH`)
  console.log(`  USDH (custody): ${formatUnits(operatorCustody, 6)} USDH`)

  // // Ledger balance (off-chain)
  // console.log('LEDGER (off-chain):')
  // console.log('  Fetching ledger balance...')
  // try {
  //   const playerLedger = await getLedgerBalance(addie as Address)
  //   console.log(`  USDH (ledger):  ${playerLedger} ${ASSET_SYMBOL}`)
  //   console.log('')
  //   console.log('TOTAL:')
  //   console.log(`  Wallet + Custody: ${formatUnits(playerCustody + playerUSDH, 6)} USDH`)
  //   console.log(`  Ledger:           ${playerLedger} ${ASSET_SYMBOL}`)
  // } catch (err) {
  //   console.log(`  Failed to fetch ledger: ${err}`)
  // }
  // console.log('')
}

main().catch(console.error)
