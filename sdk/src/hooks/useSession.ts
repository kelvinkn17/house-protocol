// session lifecycle hook wrapping HouseClient
// uses useSyncExternalStore for tear-free reads

import { useSyncExternalStore, useCallback } from 'react'
import { useHouseClient } from '../provider'

export function useSession() {
  const client = useHouseClient()

  const state = useSyncExternalStore(
    client.subscribe,
    client.getState,
    client.getState,
  )

  const openSession = useCallback(
    (deposit: string) => client.openSession(deposit),
    [client],
  )

  const closeSession = useCallback(
    () => client.closeSession(),
    [client],
  )

  const startGame = useCallback(
    (slug: string) => client.startGame(slug),
    [client],
  )

  const endGame = useCallback(
    () => client.endGame(),
    [client],
  )

  const playRound = useCallback(
    (choice: Record<string, unknown>, betAmount?: string) =>
      client.playRound(choice, betAmount),
    [client],
  )

  const cashOut = useCallback(
    () => client.cashOut(),
    [client],
  )

  const reset = useCallback(
    () => client.reset(),
    [client],
  )

  return {
    // session state
    sessionPhase: state.sessionPhase,
    sessionId: state.sessionId,
    channelId: state.channelId,
    playerBalance: state.playerBalance,
    houseBalance: state.houseBalance,
    depositAmount: state.depositAmount,
    sessionError: state.sessionError,
    sessionSeedHash: state.sessionSeedHash,
    sessionSeed: state.sessionSeed,
    roundHistory: state.roundHistory,

    // game state
    activeGame: state.activeGame,
    gamePhase: state.gamePhase,
    lastResult: state.lastResult,
    stats: state.stats,

    // methods
    openSession,
    closeSession,
    startGame,
    endGame,
    playRound,
    cashOut,
    reset,
  }
}
