import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  parseAbiItem,
  type PublicClient,
  type Address,
} from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
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
  'function mint(address to, uint256 amount)',
]);

const CUSTODY_ABI = parseAbi([
  'function withdraw(address token, uint256 amount)',
  'function getAccountsBalances(address[] accounts, address[] tokens) view returns (uint256[][])',
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

// read vault state directly from contract. share price and TVL come straight
// from on-chain totalAssets() and totalSupply(), no off-chain adjustments.
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

  // share price: assets per share, adjusted for decimal offset.
  // assets = 6 decimals (USDH), shares = 9 decimals (sUSDH, 3 decimal offset)
  // human price = (totalAssets / 1e6) / (totalSupply / 1e9) = totalAssets * 1e3 / totalSupply
  const sharePrice = totalSupply > 0n
    ? Number((totalAssets * 10n ** 18n) / totalSupply) / 1e15
    : 1.0;

  // TVL = totalAssets (already in USDH raw, 6 decimals)
  const tvl = totalAssets;

  console.log(`[vault] share price: ${sharePrice}, TVL: ${tvl}, totalAssets: ${totalAssets}, totalSupply: ${totalSupply}`);

  return {
    totalAssets,
    tvl,
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

// move funds from custody to vault so stakers can redeem.
// checks vault idle balance first, only moves what's actually needed.
export async function settleForWithdrawal(amount: bigint): Promise<string> {
  if (!OPERATOR_PRIVATE_KEY) throw new Error('OPERATOR_PRIVATE_KEY not configured');

  const client = getPublicClient();

  // check how much idle USDH the vault already has
  const vaultIdle = await client.readContract({
    address: USDH_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [VAULT_ADDRESS],
  }) as bigint;

  console.log(`[settlement] vault idle=${vaultIdle}, needed=${amount}`);

  if (vaultIdle >= amount) {
    console.log(`[settlement] vault already has enough idle USDH, no settlement needed`);
    return 'already_settled';
  }

  // need to move (amount - vaultIdle) from custody to vault
  const shortfall = amount - vaultIdle;

  // check operator's available custody balance
  const operatorAccount = privateKeyToAccount(OPERATOR_PRIVATE_KEY as `0x${string}`);
  const custodyBalances = await client.readContract({
    address: CUSTODY_ADDRESS,
    abi: CUSTODY_ABI,
    functionName: 'getAccountsBalances',
    args: [[operatorAccount.address], [USDH_ADDRESS]],
  }) as bigint[][];
  const operatorCustody = custodyBalances[0]?.[0] ?? 0n;

  console.log(`[settlement] operator custody=${operatorCustody}, shortfall=${shortfall}`);

  if (operatorCustody <= 0n) {
    throw new Error(`No funds available in custody. Vault has ${vaultIdle} idle USDH but needs ${amount}. Custody settlement may still be pending.`);
  }

  // withdraw the lesser of shortfall or available custody balance
  const toWithdraw = operatorCustody < shortfall ? operatorCustody : shortfall;

  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const walletClient = createWalletClient({
    account: operatorAccount,
    chain: sepolia,
    transport: http(rpcUrl),
  });

  // step 1: withdraw from custody to operator wallet
  console.log(`[settlement] withdrawing ${toWithdraw} from custody...`);
  const withdrawHash = await walletClient.writeContract({
    address: CUSTODY_ADDRESS,
    abi: CUSTODY_ABI,
    functionName: 'withdraw',
    args: [USDH_ADDRESS, toWithdraw],
  });
  await client.waitForTransactionReceipt({ hash: withdrawHash });
  console.log(`[settlement] custody withdraw tx: ${withdrawHash}`);

  // step 2: transfer from operator wallet to vault contract
  console.log(`[settlement] transferring ${toWithdraw} to vault...`);
  const transferHash = await walletClient.writeContract({
    address: USDH_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [VAULT_ADDRESS, toWithdraw],
  });
  await client.waitForTransactionReceipt({ hash: transferHash });
  console.log(`[settlement] vault transfer tx: ${transferHash}`);

  return transferHash;
}

// settle house winnings by sending profit directly to vault as idle USDH.
// key: we do NOT withdraw from custody. custody stays the same, idle goes up,
// so on-chain totalAssets() = idle + custody actually increases and share price goes up.
// if operator wallet doesn't have enough USDH, mint it (testnet MintableERC20).
export async function settleHouseWinnings(amount: bigint): Promise<string> {
  if (!OPERATOR_PRIVATE_KEY) throw new Error('OPERATOR_PRIVATE_KEY not configured');

  const client = getPublicClient();
  const operatorAccount = privateKeyToAccount(OPERATOR_PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({
    account: operatorAccount,
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL),
  });

  // check if operator wallet has enough USDH
  const operatorBalance = await client.readContract({
    address: USDH_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [operatorAccount.address],
  }) as bigint;

  if (operatorBalance < amount) {
    // mint the shortfall (testnet MintableERC20 has public mint)
    const shortfall = amount - operatorBalance;
    console.log(`[settlement] operator short ${shortfall} USDH, minting...`);
    const mintHash = await walletClient.writeContract({
      address: USDH_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'mint',
      args: [operatorAccount.address, shortfall],
    });
    await client.waitForTransactionReceipt({ hash: mintHash });
  }

  // transfer directly to vault. no custody withdraw, so totalAssets goes up.
  const transferHash = await walletClient.writeContract({
    address: USDH_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [VAULT_ADDRESS, amount],
  });
  await client.waitForTransactionReceipt({ hash: transferHash });
  console.log(`[settlement] house winnings ${amount} -> vault idle: ${transferHash}`);

  return transferHash;
}

// operator settles player winnings: withdraw from operator custody, transfer to player wallet.
// called when player won (balance > deposit) and session closes.
export async function settlePlayerWinnings(playerAddress: Address, amount: bigint): Promise<string> {
  if (!OPERATOR_PRIVATE_KEY) throw new Error('OPERATOR_PRIVATE_KEY not configured');

  const client = getPublicClient();
  const operatorAccount = privateKeyToAccount(OPERATOR_PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({
    account: operatorAccount,
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL),
  });

  // step 1: withdraw from operator custody to operator wallet
  const withdrawHash = await walletClient.writeContract({
    address: CUSTODY_ADDRESS,
    abi: CUSTODY_ABI,
    functionName: 'withdraw',
    args: [USDH_ADDRESS, amount],
  });
  await client.waitForTransactionReceipt({ hash: withdrawHash });
  console.log(`[settlement] operator custody withdraw: ${withdrawHash}`);

  // step 2: transfer USDH from operator wallet to player
  const transferHash = await walletClient.writeContract({
    address: USDH_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [playerAddress, amount],
  });
  await client.waitForTransactionReceipt({ hash: transferHash });
  console.log(`[settlement] sent ${amount} to player ${playerAddress}: ${transferHash}`);

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
