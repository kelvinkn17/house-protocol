// game lifecycle hook, wraps HouseClient game methods
// auto-starts game when session becomes active (same logic as web components)

import { useEffect, useRef, useCallback } from 'react'
import { useSession } from './useSession'

export function useGame(gameSlug: string) {
  const session = useSession()
  const gameStarted = useRef(false)

  const { sessionPhase, activeGame, gamePhase } = session

  // auto-start game when session becomes active
  useEffect(() => {
    if (sessionPhase !== 'active' || gameStarted.current) return

    if (activeGame && activeGame.slug !== gameSlug) {
      gameStarted.current = true
      session.endGame().then(() => session.startGame(gameSlug))
      return
    }

    if (gamePhase === 'none' && !activeGame) {
      gameStarted.current = true
      session.startGame(gameSlug)
    }
  }, [sessionPhase, gamePhase, activeGame, session, gameSlug])

  // reset ref when session drops
  useEffect(() => {
    if (sessionPhase !== 'active') {
      gameStarted.current = false
    }
  }, [sessionPhase])

  const startGame = useCallback(
    () => session.startGame(gameSlug),
    [session, gameSlug],
  )

  const endGame = useCallback(
    () => session.endGame(),
    [session],
  )

  const playRound = useCallback(
    (choice: Record<string, unknown>, betAmount?: string) =>
      session.playRound(choice, betAmount),
    [session],
  )

  const cashOut = useCallback(
    () => session.cashOut(),
    [session],
  )

  return {
    startGame,
    endGame,
    playRound,
    cashOut,
    phase: gamePhase,
    lastResult: session.lastResult,
    activeGame,
    stats: session.stats,
    playerBalance: session.playerBalance,
    sessionPhase,
    sessionError: session.sessionError,
  }
}
