// reveal-tiles primitive: Death game
// grid of rows, each row has N tiles, 1 bomb
// player picks tiles bottom to top, multiplier compounds
// can cash out between rows

import { keccak256, toHex, hexToBytes } from 'viem';
import type { GamePrimitive } from './primitive.ts';
import type {
  PlayerChoice,
  RevealTilesChoice,
  RoundOutcome,
  GameSessionState,
  GameConfig,
  BuilderParamBounds,
} from './types.ts';
import { HOUSE_EDGE_BPS, BPS_BASE } from './types.ts';

// derive bomb position from combined nonces, same logic as explorations/game-logic.ts
function deriveBombPosition(playerNonce: string, houseNonce: string, tilesInRow: number): number {
  const combined = keccak256(
    toHex(
      new Uint8Array([
        ...hexToBytes(playerNonce as `0x${string}`),
        ...hexToBytes(houseNonce as `0x${string}`),
      ])
    )
  );
  const firstByte = parseInt(combined.slice(2, 4), 16);
  return firstByte % tilesInRow;
}

function getRowMultiplier(tilesInRow: number): number {
  return tilesInRow / (tilesInRow - 1);
}

export const revealTilesPrimitive: GamePrimitive = {
  gameType: 'reveal-tiles',

  deriveOutcome(
    playerNonce: string,
    houseNonce: string,
    choice: PlayerChoice,
    state: GameSessionState,
    config: GameConfig,
  ): RoundOutcome {
    const c = choice as RevealTilesChoice;
    const tileCounts = state.primitiveState.tileCounts as number[];
    const currentRow = state.currentRound;
    const tilesInRow = tileCounts[currentRow];

    const bombPosition = deriveBombPosition(playerNonce, houseNonce, tilesInRow);
    const playerWon = c.tileIndex !== bombPosition;

    if (!playerWon) {
      return {
        rawValue: bombPosition,
        playerWon: false,
        payout: 0n,
        gameOver: true,
        canCashOut: false,
        metadata: { bombPosition, tileIndex: c.tileIndex, tilesInRow },
      };
    }

    const rowMult = getRowMultiplier(tilesInRow);
    const newMultiplier = state.cumulativeMultiplier * rowMult;
    const maxRows = (config.builderParams.options.rows as number) || 5;
    const isLastRow = currentRow + 1 >= maxRows;

    if (isLastRow) {
      // survived all rows, forced cashout
      const grossPayout = (state.betAmount * BigInt(Math.floor(newMultiplier * 10000))) / 10000n;
      const netPayout = (grossPayout * BigInt(BPS_BASE - HOUSE_EDGE_BPS)) / BigInt(BPS_BASE);
      return {
        rawValue: bombPosition,
        playerWon: true,
        payout: netPayout,
        gameOver: true,
        canCashOut: false,
        metadata: { bombPosition, tileIndex: c.tileIndex, tilesInRow, multiplier: newMultiplier, survived: true },
      };
    }

    return {
      rawValue: bombPosition,
      playerWon: true,
      payout: 0n, // not cashed out yet
      gameOver: false,
      canCashOut: true,
      metadata: { bombPosition, tileIndex: c.tileIndex, tilesInRow, multiplier: newMultiplier },
    };
  },

  validateChoice(
    choice: PlayerChoice,
    state: GameSessionState,
    _config: GameConfig,
  ) {
    const c = choice as RevealTilesChoice;
    const tileCounts = state.primitiveState.tileCounts as number[];
    const currentRow = state.currentRound;

    if (typeof c.tileIndex !== 'number' || !Number.isInteger(c.tileIndex)) {
      return { valid: false, error: 'tileIndex must be an integer' };
    }
    if (currentRow >= tileCounts.length) {
      return { valid: false, error: 'All rows completed' };
    }
    if (c.tileIndex < 0 || c.tileIndex >= tileCounts[currentRow]) {
      return { valid: false, error: `tileIndex must be 0 to ${tileCounts[currentRow] - 1}` };
    }
    if (!state.isActive) {
      return { valid: false, error: 'Game is not active' };
    }
    return { valid: true };
  },

  calculateMaxPayout(bet: bigint, config: GameConfig): bigint {
    const rows = (config.builderParams.options.rows as number) || 5;
    const minTiles = (config.builderParams.options.minTiles as number) || 2;
    // worst case: every row has minTiles (highest multiplier per row)
    // max multiplier per row with 2 tiles = 2x, so max total = 2^rows
    const maxMultiplier = Math.pow(minTiles / (minTiles - 1), rows);
    const maxMultiplierScaled = BigInt(Math.floor(maxMultiplier * 10000));
    const payout = (bet * maxMultiplierScaled * BigInt(BPS_BASE - HOUSE_EDGE_BPS)) / (10000n * BigInt(BPS_BASE));
    return payout;
  },

  calculateMaxBet(custodyBalance: bigint): bigint {
    return custodyBalance / 100n;
  },

  initializeState(config: GameConfig, bet: bigint): GameSessionState {
    const rows = (config.builderParams.options.rows as number) || 5;
    const minTiles = (config.builderParams.options.minTiles as number) || 2;
    const maxTiles = (config.builderParams.options.maxTiles as number) || 6;

    // generate random tile counts per row
    const tileCounts: number[] = [];
    for (let i = 0; i < rows; i++) {
      tileCounts.push(Math.floor(Math.random() * (maxTiles - minTiles + 1)) + minTiles);
    }

    return {
      gameType: 'reveal-tiles',
      currentRound: 0,
      maxRounds: rows,
      betAmount: bet,
      cumulativeMultiplier: 1,
      playerBalance: 0n,
      houseBalance: 0n,
      isActive: true,
      primitiveState: { tileCounts },
    };
  },

  getBuilderParamBounds(): BuilderParamBounds {
    return {
      rows: { min: 3, max: 10 },
      minTiles: { min: 2, max: 4 },
      maxTiles: { min: 3, max: 6 },
    };
  },
};
