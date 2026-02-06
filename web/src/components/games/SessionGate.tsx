// game-level gate: handles game start/end within an active session
// session creation, wallet connect, deposit, etc. are in the layout session bar

import { cnm } from '@/utils/style'
import { useSession, type GamePhase } from '@/providers/SessionProvider'

interface SessionGateProps {
  accentColor?: string
  children: React.ReactNode
}

export default function SessionGate({
  accentColor = '#CDFF57',
  children,
}: SessionGateProps) {
  const { sessionPhase, activeGame, gamePhase, sessionError, stats, playerBalance } = useSession()

  // no active session, point user to session bar
  if (sessionPhase !== 'active') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm font-mono text-black/40">Open a session above to play</p>
      </div>
    )
  }

  // game is starting
  if (gamePhase === 'starting') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-mono text-black/50">Starting game...</p>
      </div>
    )
  }

  // no game active, waiting for auto-start or manual start
  if (gamePhase === 'none' && !activeGame) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-mono text-black/50">Loading game...</p>
      </div>
    )
  }

  // game active or playing round, render children with game info bar
  return (
    <div>
      {/* game info bar */}
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
