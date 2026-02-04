import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  type PublicClient,
  type WalletClient,
  type Address,
  type Hash,
  type Account,
} from 'viem';
import { sepolia, mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const HOUSE_VAULT_ABI = parseAbi([
  'function asset() view returns (address)',
  'function totalAssets() view returns (uint256)',
  'function availableLiquidity() view returns (uint256)',
  'function totalAllocated() view returns (uint256)',
  'function channelAllocations(bytes32) view returns (uint256)',
  'function maxAllocationPercent() view returns (uint256)',
  'function maxPerChannel() view returns (uint256)',
  'function operator() view returns (address)',
  'function allocateToChannel(bytes32 channelId, uint256 amount)',
  'function settleChannel(bytes32 channelId, uint256 returnAmount)',
  'event ChannelAllocated(bytes32 indexed channelId, uint256 amount)',
  'event ChannelSettled(bytes32 indexed channelId, uint256 returned, int256 pnl)',
]);

const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]);

const VAULT_ADDRESS = process.env.HOUSE_VAULT_ADDRESS as Address;
const OPERATOR_PK = process.env.OPERATOR_PK as `0x${string}`;
const NETWORK = process.env.NETWORK || 'sepolia';

function getChain() {
  if (NETWORK === 'mainnet') return mainnet;
  return sepolia;
}

function getRpcUrl() {
  if (NETWORK === 'mainnet') return process.env.MAINNET_RPC_URL;
  return process.env.SEPOLIA_RPC_URL;
}

let publicClient: PublicClient | null = null;
let walletClient: WalletClient | null = null;
let operatorAccount: Account | null = null;

function getPublicClient(): PublicClient {
  if (!publicClient) {
    publicClient = createPublicClient({
      chain: getChain(),
      transport: http(getRpcUrl()),
    });
  }
  return publicClient;
}

function getAccount(): Account {
  if (!operatorAccount) {
    if (!OPERATOR_PK) {
      throw new Error('OPERATOR_PK not configured');
    }
    operatorAccount = privateKeyToAccount(OPERATOR_PK);
  }
  return operatorAccount;
}

function getWalletClient(): WalletClient {
  if (!walletClient) {
    const account = getAccount();
    walletClient = createWalletClient({
      account,
      chain: getChain(),
      transport: http(getRpcUrl()),
    });
  }
  return walletClient;
}

export async function getVaultInfo() {
  const client = getPublicClient();

  const [totalAssets, availableLiquidity, totalAllocated, maxAllocationPercent, maxPerChannel, operator, asset] =
    await Promise.all([
      client.readContract({
        address: VAULT_ADDRESS,
        abi: HOUSE_VAULT_ABI,
        functionName: 'totalAssets',
      }),
      client.readContract({
        address: VAULT_ADDRESS,
        abi: HOUSE_VAULT_ABI,
        functionName: 'availableLiquidity',
      }),
      client.readContract({
        address: VAULT_ADDRESS,
        abi: HOUSE_VAULT_ABI,
        functionName: 'totalAllocated',
      }),
      client.readContract({
        address: VAULT_ADDRESS,
        abi: HOUSE_VAULT_ABI,
        functionName: 'maxAllocationPercent',
      }),
      client.readContract({
        address: VAULT_ADDRESS,
        abi: HOUSE_VAULT_ABI,
        functionName: 'maxPerChannel',
      }),
      client.readContract({
        address: VAULT_ADDRESS,
        abi: HOUSE_VAULT_ABI,
        functionName: 'operator',
      }),
      client.readContract({
        address: VAULT_ADDRESS,
        abi: HOUSE_VAULT_ABI,
        functionName: 'asset',
      }),
    ]);

  return {
    totalAssets: totalAssets as bigint,
    availableLiquidity: availableLiquidity as bigint,
    totalAllocated: totalAllocated as bigint,
    maxAllocationPercent: maxAllocationPercent as bigint,
    maxPerChannel: maxPerChannel as bigint,
    operator: operator as Address,
    asset: asset as Address,
  };
}

export async function getChannelAllocation(channelId: `0x${string}`): Promise<bigint> {
  const client = getPublicClient();
  const allocation = await client.readContract({
    address: VAULT_ADDRESS,
    abi: HOUSE_VAULT_ABI,
    functionName: 'channelAllocations',
    args: [channelId],
  });
  return allocation as bigint;
}

export async function getAssetInfo() {
  const client = getPublicClient();
  const vaultInfo = await getVaultInfo();

  const [decimals, symbol] = await Promise.all([
    client.readContract({
      address: vaultInfo.asset,
      abi: ERC20_ABI,
      functionName: 'decimals',
    }),
    client.readContract({
      address: vaultInfo.asset,
      abi: ERC20_ABI,
      functionName: 'symbol',
    }),
  ]);

  return {
    address: vaultInfo.asset,
    decimals: decimals as number,
    symbol: symbol as string,
  };
}

export async function getOperatorAssetBalance(): Promise<bigint> {
  const client = getPublicClient();
  const vaultInfo = await getVaultInfo();

  const balance = await client.readContract({
    address: vaultInfo.asset,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [vaultInfo.operator],
  });

  return balance as bigint;
}

export async function getOperatorAllowance(): Promise<bigint> {
  const client = getPublicClient();
  const vaultInfo = await getVaultInfo();

  const allowance = await client.readContract({
    address: vaultInfo.asset,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [vaultInfo.operator, VAULT_ADDRESS],
  });

  return allowance as bigint;
}

export async function allocateToChannel(channelId: `0x${string}`, amount: bigint): Promise<Hash> {
  const wallet = getWalletClient();
  const client = getPublicClient();

  const available = await client.readContract({
    address: VAULT_ADDRESS,
    abi: HOUSE_VAULT_ABI,
    functionName: 'availableLiquidity',
  });

  if ((available as bigint) < amount) {
    throw new Error(`Insufficient liquidity: ${available} < ${amount}`);
  }

  const hash = await wallet.writeContract({
    address: VAULT_ADDRESS,
    abi: HOUSE_VAULT_ABI,
    functionName: 'allocateToChannel',
    args: [channelId, amount],
    chain: getChain(),
    account: getAccount(),
  });

  return hash;
}

export async function settleChannel(channelId: `0x${string}`, returnAmount: bigint): Promise<Hash> {
  const wallet = getWalletClient();
  const client = getPublicClient();

  const allocation = await client.readContract({
    address: VAULT_ADDRESS,
    abi: HOUSE_VAULT_ABI,
    functionName: 'channelAllocations',
    args: [channelId],
  });

  if ((allocation as bigint) === 0n) {
    throw new Error(`Channel not found: ${channelId}`);
  }

  if (returnAmount > 0n) {
    const vaultInfo = await getVaultInfo();
    const allowance = await getOperatorAllowance();

    if (allowance < returnAmount) {
      const approveHash = await wallet.writeContract({
        address: vaultInfo.asset,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [VAULT_ADDRESS, returnAmount],
        chain: getChain(),
        account: getAccount(),
      });
      await client.waitForTransactionReceipt({ hash: approveHash });
    }
  }

  const hash = await wallet.writeContract({
    address: VAULT_ADDRESS,
    abi: HOUSE_VAULT_ABI,
    functionName: 'settleChannel',
    args: [channelId, returnAmount],
    chain: getChain(),
    account: getAccount(),
  });

  return hash;
}

export function sessionIdToChannelId(sessionId: string): `0x${string}` {
  const buffer = Buffer.alloc(32);
  const idBuffer = Buffer.from(sessionId, 'utf8');
  idBuffer.copy(buffer, 0, 0, Math.min(32, idBuffer.length));
  return `0x${buffer.toString('hex')}`;
}

export const VaultService = {
  getVaultInfo,
  getChannelAllocation,
  getAssetInfo,
  getOperatorAssetBalance,
  getOperatorAllowance,
  allocateToChannel,
  settleChannel,
  sessionIdToChannelId,
};
