import type { FastifyInstance, FastifyPluginCallback, FastifyRequest, FastifyReply } from 'fastify';
import { prismaQuery } from '../lib/prisma.ts';
import { handleError, handleServerError } from '../utils/errorHandler.ts';
import { formatUnits } from 'viem';

export const gameRoutes: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  /**
   * GET /game/history/:address
   * All play history for a player, sessions with rounds
   */
  app.get('/history/:address', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { address } = request.params as { address: string };

      if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return handleError(reply, 400, 'Invalid address', 'INVALID_ADDRESS');
      }

      // match case-insensitively since addresses might be stored checksummed or lowercased
      const addressVariants = [address, address.toLowerCase(), address.toUpperCase()];

      const sessions = await (prismaQuery as any).session.findMany({
        where: {
          playerId: { in: addressVariants },
          status: { in: ['CLOSED', 'EXPIRED', 'SETTLED'] },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          rounds: {
            orderBy: { roundNumber: 'asc' },
          },
        },
      });

      const formatted = sessions.map((s: any) => {
        const wins = s.rounds.filter((r: any) => r.playerWon === true).length;
        const losses = s.rounds.filter((r: any) => r.playerWon === false).length;

        const playerDeposit = BigInt(s.playerDeposit);
        const finalBalance = s.finalPlayerBalance ? BigInt(s.finalPlayerBalance) : playerDeposit;
        const pnl = finalBalance - playerDeposit;

        return {
          id: s.id,
          status: s.status,
          playerDeposit: s.playerDeposit,
          playerDepositFormatted: Number(formatUnits(playerDeposit, 6)),
          finalPlayerBalance: s.finalPlayerBalance || s.playerDeposit,
          finalPlayerBalanceFormatted: Number(formatUnits(finalBalance, 6)),
          pnl: pnl.toString(),
          pnlFormatted: Number(formatUnits(pnl, 6)),
          totalRounds: s.rounds.length,
          wins,
          losses,
          createdAt: s.createdAt,
          closedAt: s.closedAt,
          rounds: s.rounds.map((r: any) => ({
            id: r.id,
            roundNumber: r.roundNumber,
            gameType: r.gameType,
            betAmount: r.betAmount,
            betAmountFormatted: Number(formatUnits(BigInt(r.betAmount), 6)),
            payout: r.payout || '0',
            payoutFormatted: Number(formatUnits(BigInt(r.payout || '0'), 6)),
            playerWon: r.playerWon,
            createdAt: r.createdAt,
          })),
        };
      });

      return reply.status(200).send({
        success: true,
        error: null,
        data: {
          sessions: formatted,
          total: formatted.length,
        },
      });
    } catch (error) {
      return handleServerError(reply, error as Error);
    }
  });

  done();
};
