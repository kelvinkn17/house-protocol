// session-first provider: one deposit, play any game
// wraps the play layout so all game components share the same session

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from 'react'
import { GameSocket } from '@/hooks/useGameSocket'
import { generateNonce, createCommitment } from '@/lib/game'
import { useAuthContext } from '@/providers/AuthProvider'

// session lifecycle
export type SessionPhase =
  | 'no_wallet'
  | 'idle'
  | 'connecting'
  | 'creating'
  | 'active'
  | 'closing'
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

interface SessionContextValue {
  // session level
  sessionPhase: SessionPhase
  sessionId: string | null
  playerBalance: string
  houseBalance: string
  depositAmount: string
  sessionError: string | null

  // game level
  activeGame: ActiveGame | null
  gamePhase: GamePhase
  lastResult: RoundResult | null
  stats: SessionStats

  // methods
  openSession: (deposit: string) => Promise<void>
  startGame: (slug: string) => Promise<void>
  endGame: () => Promise<void>
  playRound: (choice: Record<string, unknown>, betAmount?: string) => Promise<RoundResult | null>
  cashOut: () => Promise<void>
  closeSession: () => Promise<void>
  reset: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { walletAddress } = useAuthContext()

  // session state
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>(walletAddress ? 'idle' : 'no_wallet')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [playerBalance, setPlayerBalance] = useState('0')
  const [houseBalance, setHouseBalance] = useState('0')
  const [depositAmount, setDepositAmount] = useState('0')
  const [sessionError, setSessionError] = useState<string | null>(null)

  // game state
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null)
  const [gamePhase, setGamePhase] = useState<GamePhase>('none')
  const [lastResult, setLastResult] = useState<RoundResult | null>(null)
  const [stats, setStats] = useState<SessionStats>({ wins: 0, losses: 0, totalRounds: 0 })

  // ephemeral round data
  const roundRef = useRef<{ nonce: string; choiceData: string; roundId: string | null }>({
    nonce: '', choiceData: '', roundId: null,
  })
  const errorUnsub = useRef<(() => void) | null>(null)

  const openSession = useCallback(async (deposit: string) => {
    if (!walletAddress) {
      setSessionPhase('no_wallet')
      return
    }

    setSessionError(null)
    setSessionPhase('connecting')

    try {
      await GameSocket.connect(walletAddress)

      if (errorUnsub.current) errorUnsub.current()
      errorUnsub.current = GameSocket.subscribe('error', (payload: unknown) => {
        const p = payload as { error: string }
        setSessionError(p.error)
      })

      setSessionPhase('creating')

      GameSocket.send('create_session', { depositAmount: deposit })

      const result = await GameSocket.waitForOrError<{
        sessionId: string
        playerDeposit: string
        houseDeposit: string
      }>('session_created')

      setSessionId(result.sessionId)
      setPlayerBalance(result.playerDeposit)
      setHouseBalance(result.houseDeposit)
      setDepositAmount(result.playerDeposit)
      setStats({ wins: 0, losses: 0, totalRounds: 0 })
      setLastResult(null)
      setActiveGame(null)
      setGamePhase('none')
      setSessionPhase('active')
    } catch (err) {
      setSessionError((err as Error).message)
      setSessionPhase('error')
    }
  }, [walletAddress])

  const startGame = useCallback(async (slug: string) => {
    if (!sessionId || sessionPhase !== 'active') return

    setSessionError(null)
    setGamePhase('starting')

    try {
      GameSocket.send('start_game', { sessionId, gameSlug: slug })

      const result = await GameSocket.waitForOrError<{
        gameSlug: string
        gameType: string
        maxRounds: number
        primitiveState: Record<string, unknown>
      }>('game_started')

      setActiveGame({
        slug,
        gameType: result.gameType,
        maxRounds: result.maxRounds,
        primitiveState: result.primitiveState || {},
        currentRound: 0,
        cumulativeMultiplier: 1,
      })
      setLastResult(null)
      // keep session stats across games (cumulative for the session)
      setGamePhase('active')
    } catch (err) {
      setSessionError((err as Error).message)
      setGamePhase('none')
    }
  }, [sessionId, sessionPhase])

  const endGame = useCallback(async () => {
    if (!sessionId) return

    try {
      GameSocket.send('end_game', { sessionId })
      await GameSocket.waitForOrError('game_ended')
    } catch {
      // best effort
    }

    setActiveGame(null)
    setGamePhase('none')
    setLastResult(null)
  }, [sessionId])

  const playRound = useCallback(async (choice: Record<string, unknown>, betAmount?: string) => {
    if (!sessionId || gamePhase !== 'active') return null

    setGamePhase('playing_round')
    setSessionError(null)

    try {
      const choiceData = JSON.stringify(choice)
      const nonce = generateNonce()
      const commitment = createCommitment(choiceData, nonce)

      roundRef.current = { nonce, choiceData, roundId: null }

      // commit
      GameSocket.send('place_bet', {
        sessionId,
        amount: betAmount || playerBalance,
        choiceData,
        commitment,
      })

      const betResult = await GameSocket.waitForOrError<{
        roundId: string
        roundNumber: number
        houseCommitment: string
      }>('bet_accepted')

      roundRef.current.roundId = betResult.roundId

      // reveal
      GameSocket.send('reveal', {
        sessionId,
        roundId: betResult.roundId,
        choiceData,
        nonce,
      })

      const roundResult = await GameSocket.waitForOrError<{
        roundId: string
        outcome: {
          rawValue: number
          playerWon: boolean
          payout: string
          gameOver: boolean
          canCashOut: boolean
          metadata: Record<string, unknown>
        }
        newPlayerBalance: string
        newHouseBalance: string
        houseNonce: string
        currentRound: number
        cumulativeMultiplier: number
        isActive: boolean
      }>('round_result')

      const result: RoundResult = {
        roundId: roundResult.roundId,
        playerWon: roundResult.outcome.playerWon,
        payout: roundResult.outcome.payout,
        gameOver: roundResult.outcome.gameOver,
        canCashOut: roundResult.outcome.canCashOut,
        metadata: roundResult.outcome.metadata,
        houseNonce: roundResult.houseNonce,
      }

      setLastResult(result)
      setPlayerBalance(roundResult.newPlayerBalance)
      setHouseBalance(roundResult.newHouseBalance)
      setActiveGame(prev => prev ? {
        ...prev,
        currentRound: roundResult.currentRound,
        cumulativeMultiplier: roundResult.cumulativeMultiplier,
      } : null)
      setStats(prev => ({
        wins: prev.wins + (result.playerWon ? 1 : 0),
        losses: prev.losses + (result.playerWon ? 0 : 1),
        totalRounds: prev.totalRounds + 1,
      }))

      // if game ended (player lost or completed all rounds), clear active game
      if (!roundResult.isActive) {
        setGamePhase('none')
        // keep activeGame around briefly so components can show the final result
        // they'll call endGame or startGame again when ready
      } else {
        setGamePhase('active')
      }

      return result
    } catch (err) {
      setSessionError((err as Error).message)
      setGamePhase('active')
      return null
    }
  }, [sessionId, playerBalance, gamePhase])

  const cashOut = useCallback(async () => {
    if (!sessionId) return

    setSessionError(null)

    try {
      GameSocket.send('cashout', { sessionId })

      const result = await GameSocket.waitForOrError<{
        sessionId: string
        payout: string
        multiplier: number
        newPlayerBalance: string
        newHouseBalance: string
      }>('cashout_result')

      setPlayerBalance(result.newPlayerBalance)
      setHouseBalance(result.newHouseBalance)

      // game ended, session stays active
      setActiveGame(null)
      setGamePhase('none')
    } catch (err) {
      setSessionError((err as Error).message)
    }
  }, [sessionId])

  const closeSession = useCallback(async () => {
    if (!sessionId) return

    setSessionPhase('closing')
    try {
      GameSocket.send('close_session', { sessionId })
      const result = await GameSocket.waitForOrError<{
        sessionId: string
        finalPlayerBalance: string
        finalHouseBalance: string
      }>('session_closed')

      setPlayerBalance(result.finalPlayerBalance)
      setHouseBalance(result.finalHouseBalance)
      setActiveGame(null)
      setGamePhase('none')
      setSessionPhase('closed')
    } catch (err) {
      setSessionError((err as Error).message)
      setSessionPhase('error')
    }
  }, [sessionId])

  const reset = useCallback(() => {
    setSessionPhase(walletAddress ? 'idle' : 'no_wallet')
    setSessionError(null)
    setSessionId(null)
    setPlayerBalance('0')
    setHouseBalance('0')
    setDepositAmount('0')
    setActiveGame(null)
    setGamePhase('none')
    setLastResult(null)
    setStats({ wins: 0, losses: 0, totalRounds: 0 })
  }, [walletAddress])

  return (
    <SessionContext.Provider value={{
      sessionPhase,
      sessionId,
      playerBalance,
      houseBalance,
      depositAmount,
      sessionError,
      activeGame,
      gamePhase,
      lastResult,
      stats,
      openSession,
      startGame,
      endGame,
      playRound,
      cashOut,
      closeSession,
      reset,
    }}>
      {children}
    </SessionContext.Provider>
  )
}
