// cash-out primitive: Double or Nothing
// player flips a coin, wins 2x, can keep doubling or cash out
// house edge applied at payout time

import { keccak256, toHex, hexToBytes } from 'viem';
import type { GamePrimitive } from './primitive.ts';
import type {
  PlayerChoice,
  CashOutChoice,
  RoundOutcome,
  GameSessionState,
  GameConfig,
  BuilderParamBounds,
} from './types.ts';
import { HOUSE_EDGE_BPS, BPS_BASE } from './types.ts';

function deriveFlipResult(playerNonce: string, houseNonce: string): number {
  const combined = keccak256(
    toHex(
      new Uint8Array([
        ...hexToBytes(playerNonce as `0x${string}`),
        ...hexToBytes(houseNonce as `0x${string}`),
      ])
    )
  );
  return parseInt(combined.slice(-2), 16) % 2; // 0 or 1
}

export const cashOutPrimitive: GamePrimitive = {
  gameType: 'cash-out',

  deriveOutcome(
    playerNonce: string,
    houseNonce: string,
    choice: PlayerChoice,
    state: GameSessionState,
    _config: GameConfig,
  ): RoundOutcome {
    const c = choice as CashOutChoice;

    // if player wants to cash out, no flip happens
    if (c.action === 'cashout') {
      // apply house edge to cumulative winnings
      const grossPayout = (state.betAmount * BigInt(Math.floor(state.cumulativeMultiplier * 10000))) / 10000n;
      const netPayout = (grossPayout * BigInt(BPS_BASE - HOUSE_EDGE_BPS)) / BigInt(BPS_BASE);
      return {
        rawValue: -1,
        playerWon: true,
        payout: netPayout,
        gameOver: true,
        canCashOut: false,
        metadata: { action: 'cashout', multiplier: state.cumulativeMultiplier },
      };
    }

    // flip the coin
    const flipResult = deriveFlipResult(playerNonce, houseNonce);
    const playerWon = flipResult === 0; // 0 = win, 1 = lose

    if (playerWon) {
      const newMultiplier = state.cumulativeMultiplier * 2;
      const isMaxRound = state.currentRound + 1 >= state.maxRounds;

      if (isMaxRound) {
        // forced cashout at max rounds
        const grossPayout = (state.betAmount * BigInt(Math.floor(newMultiplier * 10000))) / 10000n;
        const netPayout = (grossPayout * BigInt(BPS_BASE - HOUSE_EDGE_BPS)) / BigInt(BPS_BASE);
        return {
          rawValue: flipResult,
          playerWon: true,
          payout: netPayout,
          gameOver: true,
          canCashOut: false,
          metadata: { flipResult: 'win', multiplier: newMultiplier, forcedCashout: true },
        };
      }

      return {
        rawValue: flipResult,
        playerWon: true,
        payout: 0n, // not cashed out yet
        gameOver: false,
        canCashOut: true,
        metadata: { flipResult: 'win', multiplier: newMultiplier },
      };
    }

    // lost, bust
    return {
      rawValue: flipResult,
      playerWon: false,
      payout: 0n,
      gameOver: true,
      canCashOut: false,
      metadata: { flipResult: 'lose', multiplier: 0 },
    };
  },

  validateChoice(
    choice: PlayerChoice,
    state: GameSessionState,
    _config: GameConfig,
  ) {
    const c = choice as CashOutChoice;
    if (c.action !== 'continue' && c.action !== 'cashout') {
      return { valid: false, error: 'Invalid action, must be continue or cashout' };
    }
    if (c.action === 'cashout' && state.currentRound === 0) {
      return { valid: false, error: 'Cannot cash out before playing a round' };
    }
    if (!state.isActive) {
      return { valid: false, error: 'Game is not active' };
    }
    return { valid: true };
  },

  calculateMaxPayout(bet: bigint, config: GameConfig): bigint {
    const maxRounds = (config.builderParams.options.maxRounds as number) || 10;
    // max multiplier = 2^maxRounds
    const maxMultiplier = 2n ** BigInt(maxRounds);
    // with house edge
    const payout = (bet * maxMultiplier * BigInt(BPS_BASE - HOUSE_EDGE_BPS)) / BigInt(BPS_BASE);
    return payout;
  },

  calculateMaxBet(custodyBalance: bigint): bigint {
    // 1% of custody balance
    return custodyBalance / 100n;
  },

  initializeState(config: GameConfig, bet: bigint): GameSessionState {
    const maxRounds = (config.builderParams.options.maxRounds as number) || 10;
    return {
      gameType: 'cash-out',
      currentRound: 0,
      maxRounds,
      betAmount: bet,
      cumulativeMultiplier: 1,
      playerBalance: 0n, // managed externally via channel
      houseBalance: 0n,
      isActive: true,
      primitiveState: {},
    };
  },

  getBuilderParamBounds(): BuilderParamBounds {
    return {
      maxRounds: { min: 1, max: 10 },
    };
  },
};
