// primitive registry: lookup by game type, validate builder params

import type { GamePrimitive } from './primitive.ts';
import type { GameType, BuilderParams } from './types.ts';
import { cashOutPrimitive } from './cashOut.ts';
import { revealTilesPrimitive } from './revealTiles.ts';
import { pickNumberPrimitive } from './pickNumber.ts';

const primitives = new Map<GameType, GamePrimitive>();
primitives.set('cash-out', cashOutPrimitive);
primitives.set('reveal-tiles', revealTilesPrimitive);
primitives.set('pick-number', pickNumberPrimitive);

export function getPrimitive(gameType: GameType): GamePrimitive {
  const p = primitives.get(gameType);
  if (!p) throw new Error(`Unknown game type: ${gameType}`);
  return p;
}

// validate builder params against protocol bounds
export function validateBuilderParams(gameType: GameType, params: BuilderParams): { valid: boolean; errors: string[] } {
  const primitive = getPrimitive(gameType);
  const bounds = primitive.getBuilderParamBounds();
  const errors: string[] = [];

  for (const [key, bound] of Object.entries(bounds)) {
    const value = params.options[key] as number | undefined;
    if (value === undefined) continue;

    if (typeof value !== 'number') {
      errors.push(`${key} must be a number`);
      continue;
    }
    if (bound.min !== undefined && value < bound.min) {
      errors.push(`${key} must be >= ${bound.min}`);
    }
    if (bound.max !== undefined && value > bound.max) {
      errors.push(`${key} must be <= ${bound.max}`);
    }
    if (bound.allowed && !bound.allowed.includes(value)) {
      errors.push(`${key} must be one of: ${bound.allowed.join(', ')}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function getAllGameTypes(): GameType[] {
  return Array.from(primitives.keys());
}
