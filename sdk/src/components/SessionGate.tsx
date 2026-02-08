// game-level gate: handles game start/end within an active session

import { useSession } from '../hooks/useSession'

interface SessionGateProps {
  accentColor?: string
  children: React.ReactNode
}

export default function SessionGate({
  accentColor = '#CDFF57',
  children,
}: SessionGateProps) {
  const { sessionPhase, activeGame, gamePhase, sessionError, stats } = useSession()

  if (sessionPhase !== 'active') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm font-mono text-black/40">Open a session above to play</p>
      </div>
    )
  }

  if (gamePhase === 'starting') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-mono text-black/50">Starting game...</p>
      </div>
    )
  }

  if (gamePhase === 'none' && !activeGame) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-mono text-black/50">Loading game...</p>
      </div>
    )
  }

  return (
    <div>
      {activeGame && (
        <div className="flex items-center justify-between px-1 mb-4">
          <div className="flex items-center gap-3">
            {activeGame.cumulativeMultiplier > 1 && (
              <span className="text-[10px] font-mono text-black/40">
                Mult: <span className="text-black font-black">{activeGame.cumulativeMultiplier.toFixed(2)}x</span>
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-black/30">
            R{stats.totalRounds} | W{stats.wins} L{stats.losses}
          </span>
        </div>
      )}

      {sessionError && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-[#FF6B9D]/10 border border-[#FF6B9D]/30">
          <p className="text-xs font-mono text-[#FF6B9D]">{sessionError}</p>
        </div>
      )}

      {children}
    </div>
  )
}
