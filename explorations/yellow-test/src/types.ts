import type { Hex, Address } from 'viem'

// game state tracked in state channel
export interface GameState {
  gameId: bigint
  currentRow: number
  virtualBalance: bigint // starts at 100
  multiplier: bigint // scaled by 1e18 for precision
  status: GameStatus
}

export type GameStatus = 'playing' | 'won' | 'lost'

// single row configuration
export interface RowConfig {
  tilesInRow: number // 2-6
  rowIndex: number
}

// commitment for commit-reveal
export interface Commitment {
  hash: Hex
  value: number
  nonce: Hex
}

// round state during commit-reveal
export interface RoundState {
  row: RowConfig
  playerCommit?: Commitment
  houseCommit?: Commitment
  playerRevealed: boolean
  houseRevealed: boolean
  bombPosition?: number
  playerChoice?: number
  result?: 'safe' | 'boom'
}

// full game session
export interface GameSession {
  gameId: Hex
  player: Address
  virtualBet: bigint
  rows: RowConfig[]
  currentRowIndex: number
  rounds: RoundState[]
  cumulativeMultiplier: bigint // scaled by 1e18
  status: GameStatus
}

// nitrolite channel info
export interface ChannelInfo {
  channelId: Hex
  participants: Address[]
  allocations: bigint[]
}

// multiplier constants
export const MULTIPLIER_SCALE = 1_000_000_000_000_000_000n // 1e18
export const MULTIPLIER_DISPLAY_SCALE = 10000n // 1e4 for events

// default game config
export const DEFAULT_GAME_CONFIG = {
  maxRows: 10,
  minTiles: 2,
  maxTiles: 6,
  initialBalance: 100n,
  houseEdgeBps: 200n, // 2%
} as const
