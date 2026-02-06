// game session hook: manages full lifecycle from connect to close
// commit-reveal flow happens per round, gasless via state channels

import { useState, useRef, useCallback } from 'react'
import { GameSocket } from './useGameSocket'
import { generateNonce, createCommitment } from '@/lib/game'
import { useAuthContext } from '@/providers/AuthProvider'

export type SessionPhase =
  | 'no_wallet'
  | 'idle'
  | 'connecting'
  | 'creating'
  | 'active'
  | 'playing_round' // mid commit-reveal
  | 'closing'
  | 'closed'
  | 'error'

export interface RoundResult {
  roundId: string
  playerWon: boolean
  payout: string
  gameOver: boolean
  canCashOut: boolean
  metadata: Record<string, unknown>
  houseNonce: string
}

export interface SessionState {
  sessionId: string | null
  gameSlug: string | null
  gameType: string | null
  playerBalance: string
  houseBalance: string
  currentRound: number
  cumulativeMultiplier: number
  maxRounds: number
  primitiveState: Record<string, unknown>
}

export interface SessionStats {
  wins: number
  losses: number
  totalRounds: number
}

export function useGameSession() {
  const { walletAddress } = useAuthContext()

  const [phase, setPhase] = useState<SessionPhase>(walletAddress ? 'idle' : 'no_wallet')
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<RoundResult | null>(null)
  const [session, setSession] = useState<SessionState>({
    sessionId: null,
    gameSlug: null,
    gameType: null,
    playerBalance: '0',
    houseBalance: '0',
    currentRound: 0,
    cumulativeMultiplier: 1,
    maxRounds: 0,
    primitiveState: {},
  })
  const [stats, setStats] = useState<SessionStats>({ wins: 0, losses: 0, totalRounds: 0 })

  // ephemeral round data, stored in ref so it doesn't trigger renders
  const roundRef = useRef<{
    nonce: string
    choiceData: string
    roundId: string | null
  }>({ nonce: '', choiceData: '', roundId: null })

  // error handler subscribed to WS errors
  const errorUnsub = useRef<(() => void) | null>(null)

  const openSession = useCallback(async (gameSlug: string, depositAmount: string) => {
    if (!walletAddress) {
      setPhase('no_wallet')
      return
    }

    setError(null)
    setPhase('connecting')

    try {
      await GameSocket.connect(walletAddress)

      // listen for errors globally
      if (errorUnsub.current) errorUnsub.current()
      errorUnsub.current = GameSocket.subscribe('error', (payload: unknown) => {
        const p = payload as { error: string }
        setError(p.error)
        // don't change phase on error during active game, just show error
      })

      setPhase('creating')

      GameSocket.send('create_session', {
        depositAmount,
        gameSlug,
      })

      const result = await GameSocket.waitFor<{
        sessionId: string
        gameType: string
        gameSlug: string
        playerDeposit: string
        houseDeposit: string
        maxRounds: number
        primitiveState: Record<string, unknown>
      }>('session_created')

      setSession({
        sessionId: result.sessionId,
        gameSlug: result.gameSlug,
        gameType: result.gameType,
        playerBalance: result.playerDeposit,
        houseBalance: result.houseDeposit,
        currentRound: 0,
        cumulativeMultiplier: 1,
        maxRounds: result.maxRounds,
        primitiveState: result.primitiveState || {},
      })
      setStats({ wins: 0, losses: 0, totalRounds: 0 })
      setLastResult(null)
      setPhase('active')
    } catch (err) {
      setError((err as Error).message)
      setPhase('error')
    }
  }, [walletAddress])

  // play a single round using commit-reveal
  const playRound = useCallback(async (choice: Record<string, unknown>, betAmount?: string) => {
    if (!session.sessionId || phase !== 'active') return

    setPhase('playing_round')
    setError(null)

    try {
      const choiceData = JSON.stringify(choice)
      const nonce = generateNonce()
      const commitment = createCommitment(choiceData, nonce)

      // store in ref for reveal phase
      roundRef.current = { nonce, choiceData, roundId: null }

      // step 1: place bet (commit)
      GameSocket.send('place_bet', {
        sessionId: session.sessionId,
        amount: betAmount || session.playerBalance,
        choiceData,
        commitment,
      })

      const betResult = await GameSocket.waitFor<{
        roundId: string
        roundNumber: number
        houseCommitment: string
      }>('bet_accepted')

      roundRef.current.roundId = betResult.roundId

      // step 2: reveal
      GameSocket.send('reveal', {
        sessionId: session.sessionId,
        roundId: betResult.roundId,
        choiceData,
        nonce,
      })

      const roundResult = await GameSocket.waitFor<{
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
      setSession(prev => ({
        ...prev,
        playerBalance: roundResult.newPlayerBalance,
        houseBalance: roundResult.newHouseBalance,
        currentRound: roundResult.currentRound,
        cumulativeMultiplier: roundResult.cumulativeMultiplier,
      }))
      setStats(prev => ({
        wins: prev.wins + (result.playerWon ? 1 : 0),
        losses: prev.losses + (result.playerWon ? 0 : 1),
        totalRounds: prev.totalRounds + 1,
      }))

      if (roundResult.isActive) {
        setPhase('active')
      } else {
        setPhase('closed')
      }

      return result
    } catch (err) {
      setError((err as Error).message)
      setPhase('active') // stay active so player can retry
      return null
    }
  }, [session.sessionId, session.playerBalance, phase])

  const cashOut = useCallback(async () => {
    if (!session.sessionId) return

    setPhase('closing')
    setError(null)

    try {
      GameSocket.send('cashout', { sessionId: session.sessionId })

      const result = await GameSocket.waitFor<{
        sessionId: string
        payout: string
        multiplier: number
        newPlayerBalance: string
        newHouseBalance: string
      }>('cashout_result')

      setSession(prev => ({
        ...prev,
        playerBalance: result.newPlayerBalance,
        houseBalance: result.newHouseBalance,
        cumulativeMultiplier: result.multiplier,
      }))
      setPhase('closed')
    } catch (err) {
      setError((err as Error).message)
      setPhase('error')
    }
  }, [session.sessionId])

  const closeSession = useCallback(async () => {
    if (!session.sessionId) return

    setPhase('closing')
    try {
      GameSocket.send('close_session', { sessionId: session.sessionId })
      await GameSocket.waitFor('session_closed')
      setPhase('closed')
    } catch (err) {
      setError((err as Error).message)
      setPhase('error')
    }
  }, [session.sessionId])

  const reset = useCallback(() => {
    setPhase(walletAddress ? 'idle' : 'no_wallet')
    setError(null)
    setLastResult(null)
    setSession({
      sessionId: null,
      gameSlug: null,
      gameType: null,
      playerBalance: '0',
      houseBalance: '0',
      currentRound: 0,
      cumulativeMultiplier: 1,
      maxRounds: 0,
      primitiveState: {},
    })
    setStats({ wins: 0, losses: 0, totalRounds: 0 })
  }, [walletAddress])

  return {
    phase,
    error,
    session,
    stats,
    lastResult,
    openSession,
    playRound,
    cashOut,
    closeSession,
    reset,
  }
}
