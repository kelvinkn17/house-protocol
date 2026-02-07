import cron from 'node-cron';
import { prismaQuery } from '../lib/prisma.ts';
import {
  getVaultState,
  getVaultLogs,
  getBlockNumber,
  getBlockTimestamp,
  VAULT_ADDRESS,
} from '../services/vault.service.ts';
import { ETHERSCAN_API_KEY } from '../config/main-config.ts';

let isRunning = false;
let lastIndexedBlock: bigint | null = null;
let lastSnapshotPrice: number | null = null;
let lastSnapshotTvl: string | null = null;
let lastSnapshotTime = 0;

// 5 min minimum between snapshots unless price changes
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
// price change threshold to force a snapshot (0.01%)
const PRICE_CHANGE_THRESHOLD = 0.0001;
// rpc max block range for getLogs
const MAX_BLOCK_RANGE = 1000n;

// fetch deployment block from etherscan v2 api
async function getDeploymentBlock(contractAddress: string): Promise<bigint | null> {
  if (!ETHERSCAN_API_KEY) {
    console.warn('[VaultIndexer] No ETHERSCAN_API_KEY, cannot fetch deployment block');
    return null;
  }

  try {
    const url = `https://api.etherscan.io/v2/api?chainid=11155111&module=contract&action=getcontractcreation&contractaddresses=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json() as any;

    if (data.status === '1' && data.result?.length > 0) {
      const txHash = data.result[0].txHash;
      // now get the tx receipt to find the block number
      const txUrl = `https://api.etherscan.io/v2/api?chainid=11155111&module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`;
      const txRes = await fetch(txUrl);
      const txData = await txRes.json() as any;

      if (txData.result?.blockNumber) {
        const block = BigInt(txData.result.blockNumber);
        console.log(`[VaultIndexer] Vault deployed at block ${block}`);
        return block;
      }
    }

    console.warn('[VaultIndexer] Could not parse deployment block from etherscan response');
    return null;
  } catch (err) {
    console.error('[VaultIndexer] Failed to fetch deployment block:', err);
    return null;
  }
}

async function initLastBlock() {
  if (lastIndexedBlock !== null) return;

  // try to pick up from last indexed event
  const latest = await (prismaQuery as any).vaultEvent.findFirst({
    orderBy: { blockNumber: 'desc' },
    select: { blockNumber: true },
  });

  if (latest) {
    lastIndexedBlock = BigInt(latest.blockNumber) + 1n;
    console.log(`[VaultIndexer] Resuming from block ${lastIndexedBlock}`);
  } else {
    // fetch the actual deployment block from etherscan
    const deployBlock = await getDeploymentBlock(VAULT_ADDRESS);
    if (deployBlock) {
      lastIndexedBlock = deployBlock;
    } else {
      // fallback: start from recent
      const current = await getBlockNumber();
      lastIndexedBlock = current - 500n;
    }
    console.log(`[VaultIndexer] Starting fresh from block ${lastIndexedBlock}`);
  }
}

async function indexEvents() {
  await initLastBlock();

  const currentBlock = await getBlockNumber();
  if (lastIndexedBlock! >= currentBlock) return;

  // cap range to stay within rpc limits
  const toBlock = lastIndexedBlock! + MAX_BLOCK_RANGE < currentBlock
    ? lastIndexedBlock! + MAX_BLOCK_RANGE
    : currentBlock;

  const { depositLogs, withdrawLogs } = await getVaultLogs(lastIndexedBlock!, toBlock);

  // collect unique block numbers across all logs, fetch timestamps in one pass
  const allLogs = [...depositLogs, ...withdrawLogs];
  const uniqueBlocks = [...new Set(allLogs.map(l => l.blockNumber!))];
  const tsCache = new Map<bigint, bigint>();
  for (const bn of uniqueBlocks) {
    tsCache.set(bn, await getBlockTimestamp(bn));
  }

  const events: any[] = [];

  for (const log of depositLogs) {
    const args = log.args as any;
    const ts = tsCache.get(log.blockNumber!)!;
    events.push({
      txHash: log.transactionHash!,
      logIndex: log.logIndex!,
      blockNumber: log.blockNumber!,
      eventType: 'deposit',
      sender: args.sender?.toLowerCase() || '',
      owner: args.owner?.toLowerCase() || '',
      assets: (args.assets || 0n).toString(),
      shares: (args.shares || 0n).toString(),
      timestamp: new Date(Number(ts) * 1000),
    });
  }

  for (const log of withdrawLogs) {
    const args = log.args as any;
    const ts = tsCache.get(log.blockNumber!)!;
    events.push({
      txHash: log.transactionHash!,
      logIndex: log.logIndex!,
      blockNumber: log.blockNumber!,
      eventType: 'withdraw',
      sender: args.sender?.toLowerCase() || '',
      owner: args.owner?.toLowerCase() || '',
      assets: (args.assets || 0n).toString(),
      shares: (args.shares || 0n).toString(),
      timestamp: new Date(Number(ts) * 1000),
    });
  }

  // upsert to avoid dupes on restart
  for (const evt of events) {
    try {
      await (prismaQuery as any).vaultEvent.upsert({
        where: {
          txHash_logIndex: {
            txHash: evt.txHash,
            logIndex: evt.logIndex,
          },
        },
        create: evt,
        update: {},
      });
    } catch (err: any) {
      // skip duplicate key errors silently
      if (!err.message?.includes('Unique constraint')) {
        console.error('[VaultIndexer] Failed to insert event:', err);
      }
    }
  }

  if (events.length > 0) {
    console.log(`[VaultIndexer] Indexed ${events.length} events (blocks ${lastIndexedBlock} to ${toBlock})`);
  }

  lastIndexedBlock = toBlock + 1n;
}

async function takeSnapshot() {
  const state = await getVaultState();
  const now = Date.now();

  // skip if nothing changed and we snapshotted recently
  const tvlStr = state.totalAssets.toString();
  const priceChanged = lastSnapshotPrice !== null
    ? Math.abs(state.sharePrice - lastSnapshotPrice) / lastSnapshotPrice > PRICE_CHANGE_THRESHOLD
    : true;
  const tvlChanged = lastSnapshotTvl !== null ? tvlStr !== lastSnapshotTvl : true;
  const timeElapsed = now - lastSnapshotTime > SNAPSHOT_INTERVAL_MS;

  if (!priceChanged && !tvlChanged && !timeElapsed) return;

  const blockNumber = await getBlockNumber();

  await (prismaQuery as any).vaultSnapshot.create({
    data: {
      totalAssets: state.totalAssets.toString(),
      totalSupply: state.totalSupply.toString(),
      sharePrice: state.sharePrice,
      custodyBalance: state.custodyBalance.toString(),
      blockNumber,
      timestamp: new Date(),
    },
  });

  lastSnapshotPrice = state.sharePrice;
  lastSnapshotTvl = tvlStr;
  lastSnapshotTime = now;

  console.log(`[VaultIndexer] Snapshot: TVL=${state.totalAssets}, price=${state.sharePrice.toFixed(6)}`);
}

const runIndexer = async (): Promise<void> => {
  if (isRunning) {
    console.log('[VaultIndexer] Previous run still active, skipping...');
    return;
  }

  isRunning = true;
  try {
    await indexEvents();
    await takeSnapshot();
  } catch (error) {
    console.error('[VaultIndexer] Error:', error);
  } finally {
    isRunning = false;
  }
};

export const startVaultIndexer = (): void => {
  console.log('[VaultIndexer] Worker scheduled (every 15s)');
  // every 15 seconds
  cron.schedule('*/15 * * * * *', runIndexer);
  // run immediately on startup
  runIndexer();
};
