import type { WalletClient } from 'viem'

// session lifecycle phases
export type SessionPhase =
  | 'no_wallet'
  | 'idle'
  | 'approving'
  | 'depositing'
  | 'connecting'
  | 'creating'
  | 'signing'
  | 'resuming'
  | 'active'
  | 'closing'
  | 'withdrawing'
  | 'closed'
  | 'error'

// game lifecycle within a session
export type GamePhase =
  | 'none'
  | 'starting'
  | 'active'
  | 'playing_round'

export interface RoundResult {
  roundId: string
  playerWon: boolean
  payout: string
  gameOver: boolean
  canCashOut: boolean
  metadata: Record<string, unknown>
  houseNonce: string
}

export interface ActiveGame {
  slug: string
  gameType: string
  maxRounds: number
  primitiveState: Record<string, unknown>
  currentRound: number
  cumulativeMultiplier: number
}

export interface SessionStats {
  wins: number
  losses: number
  totalRounds: number
}

// sdk config passed to HouseProvider / HouseClient
export interface HouseConfig {
  apiUrl: string
  apiKey?: string
  clearnodeUrl?: string
  custodyAddress?: string
  usdhAddress?: string
  chainId?: number
  rpcUrl?: string
}

export type PlayerChoice = Record<string, unknown>

export type GameType = 'cash-out' | 'reveal-tiles' | 'pick-number' | 'spin-wheel' | 'deal-cards'

// props that all game components accept
export interface GameComponentProps {
  walletClient?: WalletClient
  gameSlug?: string
  accentColor?: string
  className?: string
  onSound?: (sound: string) => void
}

export interface CloseSessionResult {
  sessionId: string
  finalPlayerBalance: string
  finalHouseBalance: string
  sessionSeed?: string
}

export interface CashOutResult {
  sessionId: string
  payout: string
  multiplier: number
  newPlayerBalance: string
  newHouseBalance: string
}

// full client state shape
export interface HouseClientState {
  sessionPhase: SessionPhase
  sessionId: string | null
  channelId: string | null
  playerBalance: string
  houseBalance: string
  depositAmount: string
  sessionError: string | null
  sessionSeedHash: string | null
  sessionSeed: string | null
  roundHistory: Array<RoundResult & { roundNumber: number }>
  activeGame: ActiveGame | null
  gamePhase: GamePhase
  lastResult: RoundResult | null
  stats: SessionStats
}
