// pick-number primitive: Range game
// player picks over/under/range on a 1-100 roll
// payout = (1 / winProbability) * (1 - houseEdge)

import { keccak256, toHex, hexToBytes } from 'viem';
import type { GamePrimitive } from './primitive.ts';
import type {
  PlayerChoice,
  PickNumberChoice,
  RoundOutcome,
  GameSessionState,
  GameConfig,
  BuilderParamBounds,
} from './types.ts';
import { HOUSE_EDGE_BPS, BPS_BASE } from './types.ts';

function deriveRoll(playerNonce: string, houseNonce: string): number {
  const combined = keccak256(
    toHex(
      new Uint8Array([
        ...hexToBytes(playerNonce as `0x${string}`),
        ...hexToBytes(houseNonce as `0x${string}`),
      ])
    )
  );
  // use last 4 hex chars for better distribution over 100
  const value = parseInt(combined.slice(-4), 16);
  return (value % 100) + 1; // 1 to 100
}

function getWinProbability(choice: PickNumberChoice): number {
  switch (choice.mode) {
    case 'over':
      return (100 - choice.target) / 100;
    case 'under':
      return (choice.target - 1) / 100;
    case 'range':
      return Math.max(0, (choice.rangeEnd! - choice.rangeStart! + 1)) / 100;
  }
}

function checkWin(roll: number, choice: PickNumberChoice): boolean {
  switch (choice.mode) {
    case 'over':
      return roll > choice.target;
    case 'under':
      return roll < choice.target;
    case 'range':
      return roll >= choice.rangeStart! && roll <= choice.rangeEnd!;
  }
}

export const pickNumberPrimitive: GamePrimitive = {
  gameType: 'pick-number',

  deriveOutcome(
    playerNonce: string,
    houseNonce: string,
    choice: PlayerChoice,
    state: GameSessionState,
    _config: GameConfig,
  ): RoundOutcome {
    const c = choice as PickNumberChoice;
    const roll = deriveRoll(playerNonce, houseNonce);
    const playerWon = checkWin(roll, c);

    if (!playerWon) {
      return {
        rawValue: roll,
        playerWon: false,
        payout: 0n,
        gameOver: false, // range keeps session open for multiple rolls
        canCashOut: false,
        metadata: { roll, mode: c.mode, target: c.target, rangeStart: c.rangeStart, rangeEnd: c.rangeEnd },
      };
    }

    // payout = bet * (1 / winProb) * (1 - houseEdge)
    const winProb = getWinProbability(c);
    const rawMultiplier = 1 / winProb;
    const netMultiplier = rawMultiplier * (1 - HOUSE_EDGE_BPS / BPS_BASE);
    const payout = (state.betAmount * BigInt(Math.floor(netMultiplier * 10000))) / 10000n;

    return {
      rawValue: roll,
      playerWon: true,
      payout,
      gameOver: false, // session stays open
      canCashOut: false,
      metadata: { roll, mode: c.mode, target: c.target, rangeStart: c.rangeStart, rangeEnd: c.rangeEnd, multiplier: netMultiplier },
    };
  },

  validateChoice(
    choice: PlayerChoice,
    state: GameSessionState,
    _config: GameConfig,
  ) {
    const c = choice as PickNumberChoice;
    if (!['over', 'under', 'range'].includes(c.mode)) {
      return { valid: false, error: 'Invalid mode, must be over, under, or range' };
    }
    if (c.mode === 'over' || c.mode === 'under') {
      if (typeof c.target !== 'number' || c.target < 2 || c.target > 98) {
        return { valid: false, error: 'Target must be between 2 and 98' };
      }
    }
    if (c.mode === 'range') {
      if (typeof c.rangeStart !== 'number' || typeof c.rangeEnd !== 'number') {
        return { valid: false, error: 'Range mode requires rangeStart and rangeEnd' };
      }
      if (c.rangeStart < 1 || c.rangeEnd > 100 || c.rangeStart >= c.rangeEnd) {
        return { valid: false, error: 'Invalid range bounds' };
      }
      if ((c.rangeEnd - c.rangeStart + 1) > 95) {
        return { valid: false, error: 'Range too wide, max 95% win probability' };
      }
    }
    if (!state.isActive) {
      return { valid: false, error: 'Game is not active' };
    }
    return { valid: true };
  },

  calculateMaxPayout(bet: bigint, _config: GameConfig): bigint {
    // worst case: over 98, win prob = 2%, payout = 50x * 0.98 = 49x
    const maxMultiplier = 49n;
    return bet * maxMultiplier;
  },

  calculateMaxBet(custodyBalance: bigint): bigint {
    return custodyBalance / 100n;
  },

  initializeState(_config: GameConfig, bet: bigint): GameSessionState {
    return {
      gameType: 'pick-number',
      currentRound: 0,
      maxRounds: 100, // session stays open for many rolls
      betAmount: bet,
      cumulativeMultiplier: 1,
      playerBalance: 0n,
      houseBalance: 0n,
      isActive: true,
      primitiveState: {},
    };
  },

  getBuilderParamBounds(): BuilderParamBounds {
    return {
      min: { min: 1, max: 1 },
      max: { min: 100, max: 100 },
    };
  },
};
