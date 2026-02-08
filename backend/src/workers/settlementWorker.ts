// safety net: retries settlement for CLOSED sessions where the async settlement
// in closeClearnodeAndFinalize failed or didn't complete.
// all settlement is backend/operator side, player never touches the vault.
// runs every 5 min, processes ONE session per tick, 5 min grace period to avoid
// racing with the async handler in closeClearnodeAndFinalize.

import cron from 'node-cron';
import { prismaQuery } from '../lib/prisma.ts';
import { settleHouseWinnings, settlePlayerWinnings } from '../services/vault.service.ts';
import type { Address } from 'viem';

let isRunning = false;

// 5 min grace before retrying (async handler in closeClearnodeAndFinalize gets first shot)
const SETTLE_DELAY_MS = 5 * 60 * 1000;

const checkSettlements = async (): Promise<void> => {
  if (isRunning) return;

  isRunning = true;
  try {
    const cutoff = new Date(Date.now() - SETTLE_DELAY_MS);
    // only grab ONE session per tick to avoid nonce conflicts and rate limits
    const unsettled = await prismaQuery.session.findFirst({
      where: {
        status: 'CLOSED',
        closedAt: { lt: cutoff },
      },
      select: {
        id: true,
        playerId: true,
        playerDeposit: true,
        finalPlayerBalance: true,
        houseDeposit: true,
      },
      orderBy: { closedAt: 'asc' },
    });

    if (!unsettled) return;

    const finalPlayer = BigInt(unsettled.finalPlayerBalance || '0');
    const playerDeposit = BigInt(unsettled.playerDeposit || '0');
    const playerPnL = finalPlayer - playerDeposit;

    if (playerPnL < 0n) {
      const houseProfit = -playerPnL;
      console.log(`[settlement-worker] retrying house settlement for ${unsettled.id}, profit=${houseProfit}`);
      await settleHouseWinnings(houseProfit);
      await prismaQuery.session.update({ where: { id: unsettled.id }, data: { status: 'SETTLED' } });
      console.log(`[settlement-worker] ${unsettled.id} settled (house won ${houseProfit})`);
    } else if (playerPnL > 0n) {
      console.log(`[settlement-worker] retrying player settlement for ${unsettled.id}, winnings=${playerPnL}`);
      await settlePlayerWinnings(unsettled.playerId as Address, playerPnL);
      await prismaQuery.session.update({ where: { id: unsettled.id }, data: { status: 'SETTLED' } });
      console.log(`[settlement-worker] ${unsettled.id} settled (player won ${playerPnL})`);
    } else {
      await prismaQuery.session.update({ where: { id: unsettled.id }, data: { status: 'SETTLED' } });
      console.log(`[settlement-worker] ${unsettled.id} settled (break even)`);
    }
  } catch (err) {
    console.error(`[settlement-worker] failed:`, (err as Error).message);
  } finally {
    isRunning = false;
  }
};

export const startSettlementWorker = (): void => {
  console.log('[settlement-worker] scheduled (every 5 min)');
  cron.schedule('*/5 * * * *', checkSettlements);
};
