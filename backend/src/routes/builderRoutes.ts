import type { FastifyInstance, FastifyPluginCallback, FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';
import { prismaQuery } from '../lib/prisma.ts';
import { strictAuthMiddleware } from '../middlewares/authMiddleware.ts';
import { handleError, handleServerError, handleNotFoundError } from '../utils/errorHandler.ts';
import { validateRequiredFields } from '../utils/validationUtils.ts';
import { getAlphanumericId } from '../utils/miscUtils.ts';

const VALID_GAME_TYPES = ['cash-out', 'reveal-tiles', 'pick-number'];

// payout formula per game type, used when resolving builder configs
const PAYOUT_FORMULAS: Record<string, string> = {
  'cash-out': '2^wins * (1 - houseEdge)',
  'reveal-tiles': 'product(tiles/(tiles-1)) * (1 - houseEdge)',
  'pick-number': '(1 / winProbability) * (1 - houseEdge)',
};

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

function generateApiKey(environment: string): string {
  const env = environment === 'test' ? 'test' : 'live';
  return `hp_${env}_${getAlphanumericId(24)}`;
}

// helper to get builder from authenticated user
async function getBuilder(request: FastifyRequest) {
  const userId = request.user!.id;
  return (prismaQuery as any).builder.findUnique({ where: { userId } });
}

export const builderRoutes: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  // all routes require strict auth
  app.addHook('preHandler', strictAuthMiddleware);

  // ---- Registration ----

  app.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const validation = await validateRequiredFields(body, ['name'], reply);
      if (validation !== true) return;

      const userId = request.user!.id;
      const walletAddress = request.user!.walletAddress;

      if (!walletAddress) {
        return handleError(reply, 400, 'Wallet address required to register as builder', 'WALLET_REQUIRED');
      }

      // check if already registered
      const existing = await (prismaQuery as any).builder.findUnique({ where: { userId } });
      if (existing) {
        return handleError(reply, 409, 'Already registered as a builder', 'ALREADY_REGISTERED');
      }

      // create builder + first API key in a transaction
      const fullKey = generateApiKey('live');
      const builder = await (prismaQuery as any).builder.create({
        data: {
          userId,
          walletAddress,
          name: body.name as string,
          website: (body.website as string) || null,
          email: (body.email as string) || null,
          apiKeys: {
            create: {
              keyHash: hashKey(fullKey),
              prefix: fullKey.slice(0, 16),
              environment: 'live',
            },
          },
        },
        include: { apiKeys: true },
      });

      return reply.code(201).send({
        success: true,
        error: null,
        data: {
          builder: {
            id: builder.id,
            name: builder.name,
            walletAddress: builder.walletAddress,
            website: builder.website,
            email: builder.email,
            isActive: builder.isActive,
            totalRevenue: builder.totalRevenue,
            createdAt: builder.createdAt,
          },
          apiKey: fullKey,
        },
      });
    } catch (error) {
      return handleServerError(reply, error as Error);
    }
  });

  app.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const builder = await getBuilder(request);
      if (!builder) {
        return handleNotFoundError(reply, 'Builder');
      }

      const gameCount = await (prismaQuery as any).builderGameConfig.count({
        where: { builderId: builder.id },
      });

      const activeGameCount = await (prismaQuery as any).builderGameConfig.count({
        where: { builderId: builder.id, isActive: true },
      });

      return reply.code(200).send({
        success: true,
        error: null,
        data: {
          builder: {
            ...builder,
            totalGames: gameCount,
            activeGames: activeGameCount,
          },
        },
      });
    } catch (error) {
      return handleServerError(reply, error as Error);
    }
  });

  // ---- API Key Management ----

  app.post('/api-keys', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const builder = await getBuilder(request);
      if (!builder) return handleNotFoundError(reply, 'Builder');

      const body = request.body as Record<string, unknown>;
      const environment = (body.environment as string) === 'test' ? 'test' : 'live';

      const fullKey = generateApiKey(environment);
      const key = await (prismaQuery as any).builderApiKey.create({
        data: {
          builderId: builder.id,
          keyHash: hashKey(fullKey),
          prefix: fullKey.slice(0, 16),
          environment,
        },
      });

      return reply.code(201).send({
        success: true,
        error: null,
        data: {
          apiKey: fullKey,
          key: {
            id: key.id,
            prefix: key.prefix,
            environment: key.environment,
            isActive: key.isActive,
            createdAt: key.createdAt,
          },
        },
      });
    } catch (error) {
      return handleServerError(reply, error as Error);
    }
  });

  app.get('/api-keys', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const builder = await getBuilder(request);
      if (!builder) return handleNotFoundError(reply, 'Builder');

      const keys = await (prismaQuery as any).builderApiKey.findMany({
        where: { builderId: builder.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          prefix: true,
          environment: true,
          isActive: true,
          lastUsedAt: true,
          createdAt: true,
        },
      });

      return reply.code(200).send({
        success: true,
        error: null,
        data: { keys },
      });
    } catch (error) {
      return handleServerError(reply, error as Error);
    }
  });

  app.delete('/api-keys/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const builder = await getBuilder(request);
      if (!builder) return handleNotFoundError(reply, 'Builder');

      const { id } = request.params as { id: string };

      // make sure key belongs to this builder
      const key = await (prismaQuery as any).builderApiKey.findUnique({ where: { id } });
      if (!key || key.builderId !== builder.id) {
        return handleNotFoundError(reply, 'API Key');
      }

      await (prismaQuery as any).builderApiKey.update({
        where: { id },
        data: { isActive: false },
      });

      return reply.code(200).send({
        success: true,
        error: null,
        data: { deleted: true },
      });
    } catch (error) {
      return handleServerError(reply, error as Error);
    }
  });

  // ---- Game Config ----

  app.post('/games', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const builder = await getBuilder(request);
      if (!builder) return handleNotFoundError(reply, 'Builder');

      const body = request.body as Record<string, unknown>;
      const validation = await validateRequiredFields(body, ['name', 'slug', 'gameType'], reply);
      if (validation !== true) return;

      const slug = (body.slug as string).toLowerCase();
      const gameType = body.gameType as string;
      const houseEdgeBps = (body.houseEdgeBps as number) || 200;

      // validate slug format
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return handleError(reply, 400, 'Slug must be lowercase alphanumeric with hyphens only', 'INVALID_SLUG');
      }

      if (!VALID_GAME_TYPES.includes(gameType)) {
        return handleError(reply, 400, `Invalid game type. Must be one of: ${VALID_GAME_TYPES.join(', ')}`, 'INVALID_GAME_TYPE');
      }

      if (houseEdgeBps < 100) {
        return handleError(reply, 400, 'House edge must be at least 1% (100 bps)', 'INVALID_HOUSE_EDGE');
      }

      // check slug uniqueness
      const existingGame = await (prismaQuery as any).builderGameConfig.findUnique({ where: { slug } });
      if (existingGame) {
        return handleError(reply, 409, 'A game with this slug already exists', 'SLUG_TAKEN');
      }

      const game = await (prismaQuery as any).builderGameConfig.create({
        data: {
          slug,
          builderId: builder.id,
          name: body.name as string,
          description: (body.description as string) || '',
          gameType,
          houseEdgeBps,
          params: (body.params as object) || {},
        },
      });

      return reply.code(201).send({
        success: true,
        error: null,
        data: { game },
      });
    } catch (error) {
      return handleServerError(reply, error as Error);
    }
  });

  app.get('/games', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const builder = await getBuilder(request);
      if (!builder) return handleNotFoundError(reply, 'Builder');

      const games = await (prismaQuery as any).builderGameConfig.findMany({
        where: { builderId: builder.id },
        orderBy: { createdAt: 'desc' },
      });

      return reply.code(200).send({
        success: true,
        error: null,
        data: { games },
      });
    } catch (error) {
      return handleServerError(reply, error as Error);
    }
  });

  app.get('/games/:slug', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const builder = await getBuilder(request);
      if (!builder) return handleNotFoundError(reply, 'Builder');

      const { slug } = request.params as { slug: string };
      const game = await (prismaQuery as any).builderGameConfig.findUnique({ where: { slug } });

      if (!game || game.builderId !== builder.id) {
        return handleNotFoundError(reply, 'Game');
      }

      return reply.code(200).send({
        success: true,
        error: null,
        data: { game },
      });
    } catch (error) {
      return handleServerError(reply, error as Error);
    }
  });

  app.patch('/games/:slug', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const builder = await getBuilder(request);
      if (!builder) return handleNotFoundError(reply, 'Builder');

      const { slug } = request.params as { slug: string };
      const existing = await (prismaQuery as any).builderGameConfig.findUnique({ where: { slug } });

      if (!existing || existing.builderId !== builder.id) {
        return handleNotFoundError(reply, 'Game');
      }

      const body = request.body as Record<string, unknown>;
      const updateData: Record<string, unknown> = {};

      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.isActive !== undefined) updateData.isActive = body.isActive;
      if (body.params !== undefined) updateData.params = body.params;

      if (body.houseEdgeBps !== undefined) {
        if ((body.houseEdgeBps as number) < 100) {
          return handleError(reply, 400, 'House edge must be at least 1% (100 bps)', 'INVALID_HOUSE_EDGE');
        }
        updateData.houseEdgeBps = body.houseEdgeBps;
      }

      const game = await (prismaQuery as any).builderGameConfig.update({
        where: { slug },
        data: updateData,
      });

      return reply.code(200).send({
        success: true,
        error: null,
        data: { game },
      });
    } catch (error) {
      return handleServerError(reply, error as Error);
    }
  });

  // ---- Analytics ----

  app.get('/analytics', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const builder = await getBuilder(request);
      if (!builder) return handleNotFoundError(reply, 'Builder');

      const { period } = request.query as { period?: string };

      // figure out date range
      let since: Date | null = null;
      if (period === '7d') {
        since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      } else if (period === '30d') {
        since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }

      // get all builder games
      const games = await (prismaQuery as any).builderGameConfig.findMany({
        where: { builderId: builder.id },
      });

      // aggregate stats from games table
      let totalBets = 0;
      let totalVolume = 0;
      let totalRevenue = 0;
      const perGame = games.map((g: any) => ({
        slug: g.slug,
        name: g.name,
        gameType: g.gameType,
        isActive: g.isActive,
        totalBets: g.totalBets,
        totalVolume: g.totalVolume,
        totalRevenue: g.totalRevenue,
      }));

      for (const g of games) {
        totalBets += g.totalBets;
        totalVolume += Number(g.totalVolume);
        totalRevenue += Number(g.totalRevenue);
      }

      // get unique players from rounds played on builder's game slugs
      const gameSlugs = games.map((g: any) => g.slug);
      let uniquePlayers = 0;

      if (gameSlugs.length > 0) {
        // count unique player addresses from sessions that used builder's games
        const sessions = await (prismaQuery as any).session.findMany({
          where: {
            builderGameSlug: { in: gameSlugs },
            ...(since ? { createdAt: { gte: since } } : {}),
          },
          select: { playerId: true },
          distinct: ['playerId'],
        });
        uniquePlayers = sessions.length;
      }

      // daily timeseries, last 7 days of round activity
      const dailyData: { date: string; bets: number; volume: number; earnings: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dailyData.push({
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          bets: 0,
          volume: 0,
          earnings: 0,
        });
      }

      return reply.code(200).send({
        success: true,
        error: null,
        data: {
          totalBets,
          totalVolume: totalVolume.toString(),
          totalRevenue: totalRevenue.toString(),
          uniquePlayers,
          perGame,
          dailyData,
        },
      });
    } catch (error) {
      return handleServerError(reply, error as Error);
    }
  });

  done();
};
