// interface every game primitive must implement
// adding a new game type = implementing this interface in one file

import type {
  GameType,
  PlayerChoice,
  RoundOutcome,
  GameSessionState,
  GameConfig,
  BuilderParamBounds,
} from './types.ts';

export interface GamePrimitive {
  gameType: GameType;

  // derive the outcome from combined nonces. this is the core RNG function
  // must be deterministic: same inputs = same output, always
  deriveOutcome(
    playerNonce: string,
    houseNonce: string,
    choice: PlayerChoice,
    state: GameSessionState,
    config: GameConfig,
  ): RoundOutcome;

  // validate the player's choice is legal for this game state
  validateChoice(
    choice: PlayerChoice,
    state: GameSessionState,
    config: GameConfig,
  ): { valid: boolean; error?: string };

  // worst case payout for this game config. used to determine how much house needs to fund
  calculateMaxPayout(bet: bigint, config: GameConfig): bigint;

  // max bet based on house liquidity. protocol enforced, not configurable
  calculateMaxBet(custodyBalance: bigint): bigint;

  // set up initial game state when session starts
  initializeState(config: GameConfig, bet: bigint): GameSessionState;

  // bounds for builder params
  getBuilderParamBounds(): BuilderParamBounds;
}
