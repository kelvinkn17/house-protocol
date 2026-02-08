// @house-protocol/sdk
// everyone can be the house

// provider + context
export { HouseProvider, useHouseClient } from './provider'
export type { HouseProviderProps } from './provider'

// hooks
export { useSession } from './hooks/useSession'
export { useGame } from './hooks/useGame'
export { useBalance } from './hooks/useBalance'

// components
export {
  BetInput,
  SessionGate,
  SessionBar,
  CoinFlip,
  TileReveal,
  RangeRoll,
} from './components'

// core client (for non-React usage)
export { HouseClient } from './client'

// types
export type {
  SessionPhase,
  GamePhase,
  RoundResult,
  ActiveGame,
  SessionStats,
  HouseConfig,
  PlayerChoice,
  GameType,
  GameComponentProps,
  CloseSessionResult,
  CashOutResult,
  HouseClientState,
} from './types'

// utils
export { cnm, formatUsdh } from './utils'

// lib (advanced usage)
export { GameSocket } from './lib/socket'
export { playerSignAppSession, disconnectClearnode } from './lib/clearnode'
export {
  generateNonce,
  createCommitment,
  deriveHouseNonce,
  verifyRound,
  computeSessionHash,
} from './lib/crypto'
export {
  CUSTODY_ABI,
  VAULT_ABI,
  ERC20_ABI,
  HOUSE_SESSION_ABI,
  USDH_MINT_ABI,
  SEPOLIA_CHAIN_ID,
  getPublicClient,
} from './lib/contracts'
