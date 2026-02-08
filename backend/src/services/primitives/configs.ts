// protocol fixed configs for our 3 demo games
// these are the configs used by the House Protocol frontend
// builders create their own via the Builder Dashboard, stored in DB

import type { GameConfig } from './types.ts';
import { prismaQuery } from '../../lib/prisma.ts';

export const DEMO_GAMES: Record<string, GameConfig> = {
  'double-or-nothing': {
    gameType: 'cash-out',
    protocolParams: {
      houseEdgeBps: 200,
      payoutFormula: '2^wins * (1 - 0.02)',
      maxBetFormula: 'custodyBalance / 100',
    },
    builderParams: {
      name: 'Double or Nothing',
      description: 'Flip a coin, double your bet. Keep doubling or cash out.',
      slug: 'double-or-nothing',
      options: {
        maxRounds: 10,
      },
    },
  },

  'death': {
    gameType: 'reveal-tiles',
    protocolParams: {
      houseEdgeBps: 200,
      payoutFormula: 'product(tiles/(tiles-1)) * (1 - 0.02)',
      maxBetFormula: 'custodyBalance / 100',
    },
    builderParams: {
      name: 'Death',
      description: 'Pick tiles to avoid the bomb. Survive all rows to win big.',
      slug: 'death',
      options: {
        rows: 5,
        minTiles: 2,
        maxTiles: 6,
      },
    },
  },

  'range': {
    gameType: 'pick-number',
    protocolParams: {
      houseEdgeBps: 200,
      payoutFormula: '(1 / winProbability) * (1 - 0.02)',
      maxBetFormula: 'custodyBalance / 100',
    },
    builderParams: {
      name: 'Range',
      description: 'Set your target, roll the dice. Higher risk, higher reward.',
      slug: 'range',
      options: {
        min: 1,
        max: 100,
      },
    },
  },
};

const PAYOUT_FORMULAS: Record<string, string> = {
  'cash-out': '2^wins * (1 - houseEdge)',
  'reveal-tiles': 'product(tiles/(tiles-1)) * (1 - houseEdge)',
  'pick-number': '(1 / winProbability) * (1 - houseEdge)',
};

export async function getGameConfig(slug: string): Promise<GameConfig | null> {
  // check hardcoded demos first
  if (DEMO_GAMES[slug]) return DEMO_GAMES[slug];

  // fall through to DB for builder games
  const dbConfig = await (prismaQuery as any).builderGameConfig.findUnique({ where: { slug } });
  if (!dbConfig || !dbConfig.isActive) return null;

  return {
    gameType: dbConfig.gameType,
    protocolParams: {
      houseEdgeBps: dbConfig.houseEdgeBps,
      payoutFormula: PAYOUT_FORMULAS[dbConfig.gameType] || '',
      maxBetFormula: 'custodyBalance / 100',
    },
    builderParams: {
      name: dbConfig.name,
      description: dbConfig.description,
      slug: dbConfig.slug,
      options: dbConfig.params as Record<string, unknown>,
    },
  };
}

export function getAllGameConfigs(): GameConfig[] {
  return Object.values(DEMO_GAMES);
}
