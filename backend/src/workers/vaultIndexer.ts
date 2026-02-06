import cron from 'node-cron';
import { prismaQuery } from '../lib/prisma.ts';
import {
  getVaultState,
  getVaultLogs,
  getBlockNumber,
  getBlockTimestamp,
} from '../services/vault.service.ts';

let isRunning = false;
let lastIndexedBlock: bigint | null = null;
let lastSnapshotPrice: number | null = null;
let lastSnapshotTime = 0;

// 5 min minimum between snapshots unless price changes
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
// price change threshold to force a snapshot (0.01%)
const PRICE_CHANGE_THRESHOLD = 0.0001;

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
    // start from a recent block, don't scan the entire chain
    const current = await getBlockNumber();
    lastIndexedBlock = current - 10000n; // ~1.5 days of sepolia blocks
    console.log(`[VaultIndexer] Starting fresh from block ${lastIndexedBlock}`);
  }
}

async function indexEvents() {
  await initLastBlock();

  const currentBlock = await getBlockNumber();
  if (lastIndexedBlock! >= currentBlock) return;

  // cap range to avoid huge queries
  const toBlock = lastIndexedBlock! + 2000n < currentBlock
    ? lastIndexedBlock! + 2000n
    : currentBlock;

  const { depositLogs, withdrawLogs } = await getVaultLogs(lastIndexedBlock!, toBlock);

  const events: any[] = [];

  for (const log of depositLogs) {
    const args = log.args as any;
    const ts = await getBlockTimestamp(log.blockNumber!);
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
    const ts = await getBlockTimestamp(log.blockNumber!);
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

  // skip if price hasn't changed and we snapshotted recently
  const priceChanged = lastSnapshotPrice !== null
    ? Math.abs(state.sharePrice - lastSnapshotPrice) / lastSnapshotPrice > PRICE_CHANGE_THRESHOLD
    : true;
  const timeElapsed = now - lastSnapshotTime > SNAPSHOT_INTERVAL_MS;

  if (!priceChanged && !timeElapsed) return;

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
