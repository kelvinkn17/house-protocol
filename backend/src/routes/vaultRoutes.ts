import type { FastifyInstance, FastifyPluginCallback, FastifyRequest, FastifyReply } from 'fastify';
import { prismaQuery } from '../lib/prisma.ts';
import { getVaultState, getUserPosition, settleForWithdrawal, USDH_ADDRESS } from '../services/vault.service.ts';
import { handleError, handleServerError } from '../utils/errorHandler.ts';
import { formatUnits, type Address } from 'viem';

export const vaultRoutes: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  /**
   * GET /vault/info
   * Current vault stats. Always reads live from chain + unsettled PnL.
   * Snapshots are only used for chart history, not for live price.
   */
  app.get('/info', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const state = await getVaultState();

      return reply.status(200).send({
        success: true,
        error: null,
        data: {
          tvl: state.tvl.toString(),
          totalSupply: state.totalSupply.toString(),
          sharePrice: state.sharePrice,
          custodyBalance: state.custodyBalance.toString(),
          usdhAddress: USDH_ADDRESS,
          tvlFormatted: Number(formatUnits(state.tvl, 6)),
          totalSupplyFormatted: Number(formatUnits(state.totalSupply, 9)),
          custodyFormatted: Number(formatUnits(state.custodyBalance, 6)),
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      return handleServerError(reply, error as Error);
    }
  });

  /**
   * GET /vault/activity?limit=20
   * Recent vault events
   */
  app.get('/activity', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { limit = '20' } = request.query as { limit?: string };
      const take = Math.min(Number(limit) || 20, 100);

      const events = await (prismaQuery as any).vaultEvent.findMany({
        orderBy: { timestamp: 'desc' },
        take,
      });

      const formatted = events.map((e: any) => ({
        id: e.id,
        type: e.eventType,
        sender: e.sender,
        owner: e.owner,
        assets: e.assets,
        shares: e.shares,
        assetsFormatted: Number(formatUnits(BigInt(e.assets), 6)),
        sharesFormatted: Number(formatUnits(BigInt(e.shares), 9)),
        txHash: e.txHash,
        blockNumber: Number(e.blockNumber),
        timestamp: e.timestamp,
      }));

      return reply.status(200).send({
        success: true,
        error: null,
        data: formatted,
      });
    } catch (error) {
      return handleServerError(reply, error as Error);
    }
  });

  /**
   * GET /vault/history?period=7d
   * Vault snapshots for chart, downsampled
   */
  app.get('/history', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { period = '7d' } = request.query as { period?: string };

      // parse period
      let hours = 168; // 7d default
      if (period === '1d') hours = 24;
      else if (period === '30d') hours = 720;

      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const snapshots = await (prismaQuery as any).vaultSnapshot.findMany({
        where: { timestamp: { gte: since } },
        orderBy: { timestamp: 'asc' },
        select: {
          sharePrice: true,
          totalAssets: true,
          timestamp: true,
        },
      });

      // downsample to ~168 points max
      const maxPoints = 168;
      let data = snapshots;
      if (snapshots.length > maxPoints) {
        const step = Math.floor(snapshots.length / maxPoints);
        data = snapshots.filter((_: any, i: number) => i % step === 0);
      }

      const formatted = data.map((s: any) => ({
        sharePrice: s.sharePrice,
        tvl: Number(formatUnits(BigInt(s.totalAssets), 6)),
        timestamp: s.timestamp,
      }));

      return reply.status(200).send({
        success: true,
        error: null,
        data: formatted,
      });
    } catch (error) {
      return handleServerError(reply, error as Error);
    }
  });

  /**
   * GET /vault/user/:address
   * User position data, reads on-chain
   */
  app.get('/user/:address', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { address } = request.params as { address: string };

      if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return handleError(reply, 400, 'Invalid address', 'INVALID_ADDRESS');
      }

      const position = await getUserPosition(address as Address);

      return reply.status(200).send({
        success: true,
        error: null,
        data: {
          shares: position.shares.toString(),
          sharesFormatted: Number(formatUnits(position.shares, 9)),
          assetsValue: position.assetsValue.toString(),
          assetsValueFormatted: Number(formatUnits(position.assetsValue, 6)),
          usdhBalance: position.usdhBalance.toString(),
          usdhBalanceFormatted: Number(formatUnits(position.usdhBalance, 6)),
          allowance: position.allowance.toString(),
        },
      });
    } catch (error) {
      return handleServerError(reply, error as Error);
    }
  });

  /**
   * POST /vault/prepare-withdraw
   * Move funds from custody to vault so staker can redeem.
   * Call this before vault.redeem() on-chain.
   */
  app.post('/prepare-withdraw', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { amount, userAddress } = request.body as { amount?: string; userAddress?: string };

      if (!amount || !userAddress) {
        return handleError(reply, 400, 'Missing amount or userAddress', 'MISSING_FIELDS');
      }

      if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
        return handleError(reply, 400, 'Invalid address', 'INVALID_ADDRESS');
      }

      const amountBigInt = BigInt(amount);
      if (amountBigInt <= 0n) {
        return handleError(reply, 400, 'Amount must be greater than zero', 'INVALID_AMOUNT');
      }

      const txHash = await settleForWithdrawal(amountBigInt);

      return reply.status(200).send({
        success: true,
        error: null,
        data: { txHash },
      });
    } catch (error) {
      return handleServerError(reply, error as Error);
    }
  });

  done();
};
