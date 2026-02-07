import {
  createPublicClient,
  http,
  parseAbi,
  parseAbiItem,
  formatUnits,
  type PublicClient,
  type Address,
} from 'viem';
import { sepolia } from 'viem/chains';

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

// read vault state in one go, all from the vault contract
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

  // standard ERC-4626: totalAssets = vault USDH + operator custody balance
  // assets are 6 decimals (USDH), shares are 9 decimals (sUSDH, 3-decimal offset)
  const sharePrice = totalSupply > 0n
    ? Number(formatUnits(totalAssets, 6)) / Number(formatUnits(totalSupply, 9))
    : 1.0;

  return {
    totalAssets,
    totalSupply,
    custodyBalance,
    sharePrice,
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
