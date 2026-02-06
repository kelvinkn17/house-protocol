// protocol fixed configs for our 3 demo games
// these are the configs used by the House Protocol frontend
// builders would create their own via the Builder Dashboard

import type { GameConfig } from './types.ts';

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

export function getGameConfig(slug: string): GameConfig | null {
  return DEMO_GAMES[slug] || null;
}

export function getAllGameConfigs(): GameConfig[] {
  return Object.values(DEMO_GAMES);
}
