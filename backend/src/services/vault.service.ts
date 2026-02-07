import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  parseAbiItem,
  formatUnits,
  type PublicClient,
  type Address,
} from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { prismaQuery } from '../lib/prisma.ts';
import { OPERATOR_PRIVATE_KEY } from '../config/main-config.ts';

// contract addresses from env
const VAULT_ADDRESS = (process.env.HOUSE_VAULT_ADDRESS || '') as Address;
const USDH_ADDRESS = (process.env.USDH_TOKEN_ADDRESS || '') as Address;
const CUSTODY_ADDRESS = (process.env.NITROLITE_CUSTODY_ADDRESS || '') as Address;

// ERC-4626 vault ABI, only what we actually use
const VAULT_ABI = parseAbi([
  'function asset() view returns (address)',
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function convertToAssets(uint256 shares) view returns (uint256)',
  'function convertToShares(uint256 assets) view returns (uint256)',
  'function previewDeposit(uint256 assets) view returns (uint256)',
  'function previewRedeem(uint256 shares) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function getCustodyBalance() view returns (uint256)',
  'event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)',
  'event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)',
]);

// extracted event ABIs so we don't rely on fragile array indices
const DEPOSIT_EVENT = parseAbiItem(
  'event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)'
);
const WITHDRAW_EVENT = parseAbiItem(
  'event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)'
);

const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
]);

const CUSTODY_ABI = parseAbi([
  'function withdraw(address token, uint256 amount)',
]);

// lazy singleton
let publicClient: PublicClient | null = null;

function getPublicClient(): PublicClient {
  if (!publicClient) {
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    publicClient = createPublicClient({
      chain: sepolia,
      transport: http(rpcUrl),
    });
  }
  return publicClient;
}

// sum up house P&L from all closed sessions
// positive = house won, negative = house lost
export async function getSessionPnL(): Promise<bigint> {
  const closedSessions = await (prismaQuery as any).session.findMany({
    where: { status: 'CLOSED', finalHouseBalance: { not: null } },
    select: { houseDeposit: true, finalHouseBalance: true },
  });

  let pnl = 0n;
  for (const s of closedSessions) {
    const deposit = BigInt(s.houseDeposit);
    const final = BigInt(s.finalHouseBalance);
    pnl += final - deposit;
  }

  return pnl;
}

// read vault state, adjusted for off-chain session P&L
// on-chain totalAssets doesn't reflect session wins/losses since those
// happen in state channels. we add the cumulative house P&L from closed
// sessions to get an accurate TVL and share price.
export async function getVaultState() {
  const client = getPublicClient();

  const [totalAssets, totalSupply, custodyBalance] = await Promise.all([
    client.readContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: 'totalAssets',
    }) as Promise<bigint>,
    client.readContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: 'totalSupply',
    }) as Promise<bigint>,
    client.readContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: 'getCustodyBalance',
    }) as Promise<bigint>,
  ]);

  // off-chain P&L from closed game sessions
  const sessionPnL = await getSessionPnL();

  // adjusted total = on-chain total + cumulative house wins/losses
  const adjustedTotalAssets = totalAssets + sessionPnL;

  // assets are 6 decimals (USDH), shares are 9 decimals (sUSDH, 3-decimal offset)
  const sharePrice = totalSupply > 0n
    ? Number(formatUnits(adjustedTotalAssets, 6)) / Number(formatUnits(totalSupply, 9))
    : 1.0;

  return {
    totalAssets: adjustedTotalAssets,
    totalSupply,
    custodyBalance,
    sharePrice,
    // raw on-chain value, useful for debugging
    onChainTotalAssets: totalAssets,
    sessionPnL,
  };
}

// get user position data from chain
export async function getUserPosition(userAddress: Address) {
  const client = getPublicClient();

  const shares = await client.readContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'balanceOf',
    args: [userAddress],
  }) as bigint;

  // batch the rest
  const [assetsValue, usdhBalance, allowance] = await Promise.all([
    shares > 0n
      ? client.readContract({
          address: VAULT_ADDRESS,
          abi: VAULT_ABI,
          functionName: 'convertToAssets',
          args: [shares],
        }) as Promise<bigint>
      : Promise.resolve(0n),
    client.readContract({
      address: USDH_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    }) as Promise<bigint>,
    client.readContract({
      address: USDH_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [userAddress, VAULT_ADDRESS],
    }) as Promise<bigint>,
  ]);

  return {
    shares,
    assetsValue,
    usdhBalance,
    allowance,
  };
}

// fetch vault event logs in a block range
export async function getVaultLogs(fromBlock: bigint, toBlock: bigint) {
  const client = getPublicClient();

  const [depositLogs, withdrawLogs] = await Promise.all([
    client.getLogs({
      address: VAULT_ADDRESS,
      event: DEPOSIT_EVENT,
      fromBlock,
      toBlock,
    }),
    client.getLogs({
      address: VAULT_ADDRESS,
      event: WITHDRAW_EVENT,
      fromBlock,
      toBlock,
    }),
  ]);

  return { depositLogs, withdrawLogs };
}

// get current block number
export async function getBlockNumber(): Promise<bigint> {
  const client = getPublicClient();
  return client.getBlockNumber();
}

// get block timestamp
export async function getBlockTimestamp(blockNumber: bigint): Promise<bigint> {
  const client = getPublicClient();
  const block = await client.getBlock({ blockNumber });
  return block.timestamp;
}

// move funds from custody to vault so stakers can redeem
// operator calls custody.withdraw() then transfers USDH to vault contract
export async function settleForWithdrawal(amount: bigint): Promise<string> {
  if (!OPERATOR_PRIVATE_KEY) throw new Error('OPERATOR_PRIVATE_KEY not configured');

  const account = privateKeyToAccount(OPERATOR_PRIVATE_KEY as `0x${string}`);
  const client = getPublicClient();
  const rpcUrl = process.env.SEPOLIA_RPC_URL;

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpcUrl),
  });

  // step 1: withdraw USDH from nitrolite custody to operator wallet
  console.log(`[settlement] withdrawing ${amount} from custody...`);
  const withdrawHash = await walletClient.writeContract({
    address: CUSTODY_ADDRESS,
    abi: CUSTODY_ABI,
    functionName: 'withdraw',
    args: [USDH_ADDRESS, amount],
  });
  await client.waitForTransactionReceipt({ hash: withdrawHash });
  console.log(`[settlement] custody withdraw tx: ${withdrawHash}`);

  // step 2: transfer USDH from operator wallet to vault contract
  console.log(`[settlement] transferring ${amount} to vault...`);
  const transferHash = await walletClient.writeContract({
    address: USDH_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [VAULT_ADDRESS, amount],
  });
  await client.waitForTransactionReceipt({ hash: transferHash });
  console.log(`[settlement] vault transfer tx: ${transferHash}`);

  return transferHash;
}

export {
  VAULT_ADDRESS,
  USDH_ADDRESS,
  CUSTODY_ADDRESS,
  VAULT_ABI,
  ERC20_ABI,
  DEPOSIT_EVENT,
  WITHDRAW_EVENT,
  getPublicClient,
};
