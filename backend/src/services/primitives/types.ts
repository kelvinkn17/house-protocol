// game primitive type system
// every game in the protocol maps to one of these primitives

export type GameType = 'cash-out' | 'reveal-tiles' | 'pick-number';

// protocol params are immutable, set per primitive type. builders can't touch these
export interface ProtocolParams {
  houseEdgeBps: number; // fixed 200 = 2%
  payoutFormula: string; // human readable, for display
  maxBetFormula: string; // human readable
}

// builder params are cosmetic + bounded config. safe to let builders change
export interface BuilderParams {
  name: string;
  description: string;
  slug: string;
  // primitive specific options live here as JSON
  options: Record<string, unknown>;
}

// bounds that protocol enforces on builder options
export interface BuilderParamBounds {
  [key: string]: { min?: number; max?: number; allowed?: unknown[] };
}

// full game config = protocol + builder layers
export interface GameConfig {
  gameType: GameType;
  protocolParams: ProtocolParams;
  builderParams: BuilderParams;
}

// player choices per primitive type
export interface CashOutChoice {
  action: 'continue' | 'cashout';
}

export interface RevealTilesChoice {
  tileIndex: number;
}

export interface PickNumberChoice {
  mode: 'over' | 'under' | 'range';
  target: number;
  rangeStart?: number;
  rangeEnd?: number;
}

export type PlayerChoice = CashOutChoice | RevealTilesChoice | PickNumberChoice;

// result of a single round
export interface RoundOutcome {
  rawValue: number; // the derived RNG value
  playerWon: boolean;
  payout: bigint; // 0 if lost, otherwise the amount
  gameOver: boolean; // did the game end (death, final round, etc.)
  canCashOut: boolean; // can the player cash out after this round
  metadata: Record<string, unknown>; // game specific data (bomb position, roll value, etc.)
}

// session state tracked across rounds. stored in memory on the server
export interface GameSessionState {
  gameType: GameType;
  currentRound: number;
  maxRounds: number;
  betAmount: bigint;
  cumulativeMultiplier: number; // scaled as float for simplicity in session tracking
  playerBalance: bigint;
  houseBalance: bigint;
  isActive: boolean;
  // primitive specific state
  primitiveState: Record<string, unknown>;
}

// constants
export const HOUSE_EDGE_BPS = 200; // 2%
export const BPS_BASE = 10000;
export const MULTIPLIER_SCALE = 1_000_000_000_000_000_000n; // 1e18 for bigint math
