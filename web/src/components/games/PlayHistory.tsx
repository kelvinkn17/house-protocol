import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { cnm } from '@/utils/style'
import { useAuthContext } from '@/providers/AuthProvider'
import { useSession } from '@/providers/SessionProvider'
import { usePlayHistory, type HistorySession, type HistoryRound } from '@/hooks/usePlayHistory'

const GAME_TYPE_COLORS: Record<string, string> = {
  'cash-out': '#CDFF57',
  'reveal-tiles': '#FF6B9D',
  'pick-number': '#dcb865',
}

const GAME_TYPE_LABELS: Record<string, string> = {
  'cash-out': 'Cash Out',
  'reveal-tiles': 'Reveal',
  'pick-number': 'Pick Number',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function GameTypeBadge({ gameType }: { gameType: string }) {
  const color = GAME_TYPE_COLORS[gameType] || '#888'
  const label = GAME_TYPE_LABELS[gameType] || gameType
  return (
    <span
      className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded-md border"
      style={{
        backgroundColor: `${color}20`,
        borderColor: `${color}50`,
        color: '#000',
      }}
    >
      {label}
    </span>
  )
}

// individual round row
function RoundRow({ round }: { round: HistoryRound }) {
  const isWin = round.playerWon === true
  return (
    <div className="flex items-center justify-between py-1.5 px-2">
      <div className="flex items-center gap-2.5">
        <span className="text-[10px] font-mono text-black/30 w-5 text-right">#{round.roundNumber}</span>
        <GameTypeBadge gameType={round.gameType} />
        <span className="text-[10px] font-mono text-black/50">
          {round.betAmountFormatted.toFixed(2)} USDH
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="text-[10px] font-mono text-black/40">
          {round.payoutFormatted.toFixed(2)}
        </span>
        {round.playerWon !== null && (
          <span
            className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded-md text-white"
            style={{ backgroundColor: isWin ? '#7BA318' : '#FF6B9D' }}
          >
            {isWin ? 'WIN' : 'LOSS'}
          </span>
        )}
      </div>
    </div>
  )
}

// expandable session card
function SessionCard({ session }: { session: HistorySession }) {
  const [expanded, setExpanded] = useState(false)
  const isProfit = session.pnlFormatted >= 0

  // unique game types in this session
  const gameTypes = [...new Set(session.rounds.map((r) => r.gameType))]

  return (
    <div className="border-2 border-black/10 rounded-xl overflow-hidden">
      {/* header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-black/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* P&L indicator */}
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: isProfit ? '#7BA318' : '#FF6B9D' }}
          />
          <span
            className={cnm('text-sm font-black', isProfit ? 'text-[#7BA318]' : 'text-[#FF6B9D]')}
          >
            {isProfit ? '+' : ''}{session.pnlFormatted.toFixed(2)} USDH
          </span>

          <div className="h-4 w-px bg-black/10" />

          {/* stats */}
          <span className="text-[10px] font-mono text-black/40">
            R{session.totalRounds}
          </span>
          <span className="text-[10px] font-mono text-[#7BA318]">
            W{session.wins}
          </span>
          <span className="text-[10px] font-mono text-[#FF6B9D]">
            L{session.losses}
          </span>

          <div className="h-4 w-px bg-black/10 hidden sm:block" />

          {/* game type badges */}
          <div className="hidden sm:flex items-center gap-1">
            {gameTypes.map((gt) => (
              <GameTypeBadge key={gt} gameType={gt} />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-mono text-black/25 hidden sm:inline">
            {timeAgo(session.createdAt)}
          </span>
          <ChevronDown
            size={14}
            className={cnm(
              'text-black/30 transition-transform',
              expanded && 'rotate-180',
            )}
          />
        </div>
      </button>

      {/* expanded content */}
      {expanded && (
        <div className="border-t border-black/5">
          {/* deposit/withdrew summary */}
          <div className="flex items-center gap-4 px-4 py-2 text-[10px] font-mono text-black/30 bg-black/[0.02]">
            <span>Deposited: {session.playerDepositFormatted.toFixed(2)} USDH</span>
            <span className="text-black/10">|</span>
            <span>Withdrew: {session.finalPlayerBalanceFormatted.toFixed(2)} USDH</span>
          </div>

          {/* rounds */}
          <div className="divide-y divide-black/5">
            {session.rounds.map((round) => (
              <RoundRow key={round.id} round={round} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// skeleton loader
function HistorySkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border-2 border-black/5 rounded-xl px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-black/10 animate-pulse" />
            <div className="w-24 h-4 bg-black/5 rounded animate-pulse" />
            <div className="w-16 h-3 bg-black/5 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

// main component
export default function PlayHistory() {
  const { walletAddress } = useAuthContext()
  const { sessionPhase } = useSession()
  const queryClient = useQueryClient()

  const { data, isLoading } = usePlayHistory(walletAddress)

  // refetch when a session just closed so the new one shows up
  useEffect(() => {
    if (sessionPhase === 'closed') {
      queryClient.invalidateQueries({ queryKey: ['play', 'history'] })
    }
  }, [sessionPhase, queryClient])

  if (!walletAddress) return null

  const sessions = data?.sessions || []
  const total = data?.total || 0

  return (
    <div
      className="bg-white border-2 border-black rounded-2xl overflow-hidden"
      style={{ boxShadow: '4px 4px 0px black' }}
    >
      {/* header */}
      <div className="px-5 py-3.5 border-b-2 border-black/10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-black uppercase tracking-wider">Play History</h2>
          {total > 0 && (
            <span className="text-[10px] font-mono text-black/30">
              {total} session{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 max-h-[500px] overflow-y-auto">
        {/* loading */}
        {isLoading && <HistorySkeleton />}

        {/* empty state */}
        {!isLoading && sessions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-black/30 font-mono">No play history yet</p>
            <p className="text-[10px] text-black/20 font-mono mt-1">Play some games and they will show up here</p>
          </div>
        )}

        {/* session list */}
        {!isLoading && sessions.length > 0 && (
          <div className="space-y-2">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
