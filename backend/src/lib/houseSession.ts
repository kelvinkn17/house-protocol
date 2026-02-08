// on-chain HouseSession interaction helpers
// pattern follows vault.service.ts: operator wallet, lazy clients, graceful degradation

import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  keccak256,
  encodePacked,
  type Address,
} from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { OPERATOR_PRIVATE_KEY, HOUSE_SESSION_ADDRESS } from '../config/main-config.ts';

const SESSION_ABI = parseAbi([
  'function openSession(bytes32 sessionHash, address player) external',
  'function verifySession(uint256 seed, address player) external',
  'function sessionExists(address player) view returns (bool)',
  'function getSessionHash(address player) view returns (bytes32)',
]);

// lazy clients
let _publicClient: ReturnType<typeof createPublicClient> | null = null;
let _walletClient: ReturnType<typeof createWalletClient> | null = null;

function getPublicClient() {
  if (!_publicClient) {
    _publicClient = createPublicClient({
      chain: sepolia,
      transport: http(process.env.SEPOLIA_RPC_URL),
    });
  }
  return _publicClient;
}

function getWalletClient() {
  if (!_walletClient) {
    if (!OPERATOR_PRIVATE_KEY) throw new Error('OPERATOR_PRIVATE_KEY not configured');
    const account = privateKeyToAccount(OPERATOR_PRIVATE_KEY as `0x${string}`);
    _walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(process.env.SEPOLIA_RPC_URL),
    });
  }
  return _walletClient;
}

// keccak256(abi.encodePacked(uint256 seed, address player))
export function computeSessionHash(seed: bigint, player: Address): `0x${string}` {
  return keccak256(encodePacked(['uint256', 'address'], [seed, player]));
}

// keccak256(abi.encodePacked(uint256 seed, uint256 roundNumber))
// returns hex string matching houseNonce format
export function deriveHouseNonce(sessionSeed: bigint, roundNumber: number): string {
  return keccak256(encodePacked(['uint256', 'uint256'], [sessionSeed, BigInt(roundNumber)]));
}

// commit session hash on-chain. returns tx hash or null on failure.
export async function anchorSessionOnChain(
  sessionHash: `0x${string}`,
  player: Address,
): Promise<string | null> {
  if (!HOUSE_SESSION_ADDRESS) {
    console.log('[provably-fair] HOUSE_SESSION_ADDRESS not set, skipping anchor');
    return null;
  }

  try {
    const walletClient = getWalletClient();
    const publicClient = getPublicClient();

    const txHash = await walletClient.writeContract({
      address: HOUSE_SESSION_ADDRESS as Address,
      abi: SESSION_ABI,
      functionName: 'openSession',
      args: [sessionHash, player],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`[provably-fair] session anchored: ${txHash}`);
    return txHash;
  } catch (err) {
    console.error('[provably-fair] anchor failed:', (err as Error).message);
    return null;
  }
}

// reveal seed on-chain. returns tx hash or null on failure.
export async function revealSessionOnChain(
  seed: bigint,
  player: Address,
): Promise<string | null> {
  if (!HOUSE_SESSION_ADDRESS) {
    console.log('[provably-fair] HOUSE_SESSION_ADDRESS not set, skipping reveal');
    return null;
  }

  try {
    const walletClient = getWalletClient();
    const publicClient = getPublicClient();

    const txHash = await walletClient.writeContract({
      address: HOUSE_SESSION_ADDRESS as Address,
      abi: SESSION_ABI,
      functionName: 'verifySession',
      args: [seed, player],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`[provably-fair] session revealed: ${txHash}`);
    return txHash;
  } catch (err) {
    console.error('[provably-fair] reveal failed:', (err as Error).message);
    return null;
  }
}
