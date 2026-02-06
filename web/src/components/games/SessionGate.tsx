// shared pre-game flow wrapper for all 3 games
// handles: wallet check, deposit input, session creation, session summary

import { useState } from 'react'
import { cnm } from '@/utils/style'
import { useAuthContext } from '@/providers/AuthProvider'
import { useSound } from '@/providers/SoundProvider'
import type { SessionPhase, SessionStats } from '@/hooks/useGameSession'
import { parseUnits, formatUnits } from 'viem'

interface SessionGateProps {
  phase: SessionPhase
  error: string | null
  stats: SessionStats
  playerBalance: string
  cumulativeMultiplier: number
  sessionId?: string | null
  onOpenSession: (depositAmount: string) => void
  onReset: () => void
  accentColor?: string // game-specific accent
  children: React.ReactNode
}

export default function SessionGate({
  phase,
  error,
  stats,
  playerBalance,
  cumulativeMultiplier,
  sessionId,
  onOpenSession,
  onReset,
  accentColor = '#CDFF57',
  children,
}: SessionGateProps) {
  const { login, walletAddress } = useAuthContext()
  const { play } = useSound()
  const [betInput, setBetInput] = useState('100')

  const balanceFormatted = playerBalance !== '0'
    ? parseFloat(formatUnits(BigInt(playerBalance), 6)).toFixed(2)
    : '0.00'

  // no wallet connected
  if (phase === 'no_wallet') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm text-black/50 font-mono mb-4">Connect wallet to play</p>
        <button
          onClick={() => login()}
          className="px-8 py-3 text-sm font-black uppercase bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1"
          style={{ boxShadow: `4px 4px 0px ${accentColor}` }}
        >
          Connect Wallet
        </button>
      </div>
    )
  }

  // idle: choose bet amount
  if (phase === 'idle') {
    return (
      <div className="py-8">
        <div className="flex flex-col items-center mb-6">
          <p className="text-xs font-mono text-black/40 uppercase mb-1">Bet Amount (USDH)</p>
          <div className="flex gap-2 mb-4">
            {[10, 50, 100, 500].map((amt) => (
              <button
                key={amt}
                onClick={() => { play('click'); setBetInput(String(amt)) }}
                className={cnm(
                  'px-4 py-2 text-xs font-black border-2 border-black rounded-lg transition-transform hover:translate-x-0.5 hover:translate-y-0.5',
                  betInput === String(amt) ? 'bg-black text-white' : 'bg-white text-black',
                )}
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => {
            play('action')
            const amount = parseUnits(betInput, 6).toString()
            onOpenSession(amount)
          }}
          className="w-full py-4 text-sm font-black uppercase bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1"
          style={{ boxShadow: `4px 4px 0px ${accentColor}` }}
        >
          Open Session (${betInput})
        </button>
        {walletAddress && (
          <p className="text-[10px] font-mono text-black/30 text-center mt-3">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </p>
        )}
      </div>
    )
  }

  // connecting / creating
  if (phase === 'connecting' || phase === 'creating') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-mono text-black/50">
          {phase === 'connecting' ? 'Connecting...' : 'Creating session...'}
        </p>
      </div>
    )
  }

  // error
  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm font-black text-[#FF6B9D] mb-4">{error || 'Something went wrong'}</p>
        <button
          onClick={onReset}
          className="px-8 py-3 text-sm font-black uppercase bg-black text-white border-2 border-black rounded-xl"
        >
          Try Again
        </button>
      </div>
    )
  }

  // closed: show summary
  if (phase === 'closed') {
    // balanceFormatted is already in USDH (human readable), betInput is also in USDH
    const netResult = parseFloat(balanceFormatted) - parseFloat(betInput || '0')
    const isProfit = netResult > 0

    return (
      <div className="py-8">
        <div className="text-center mb-6">
          <p className="text-xs font-mono text-black/40 uppercase mb-2">Session Complete</p>
          <p className={cnm(
            'text-3xl font-black',
            isProfit ? 'text-[#7BA318]' : 'text-[#FF6B9D]',
          )}>
            {isProfit ? '+' : ''}${netResult.toFixed(2)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6 p-4 rounded-xl bg-black/5 border-2 border-black/10">
          <div className="text-center">
            <p className="text-[10px] font-mono text-black/40 uppercase">Rounds</p>
            <p className="text-lg font-black text-black">{stats.totalRounds}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-mono text-black/40 uppercase">Wins</p>
            <p className="text-lg font-black text-[#7BA318]">{stats.wins}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-mono text-black/40 uppercase">Losses</p>
            <p className="text-lg font-black text-[#FF6B9D]">{stats.losses}</p>
          </div>
        </div>

        <button
          onClick={() => { play('action'); onReset() }}
          className="w-full py-4 text-sm font-black uppercase bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1"
          style={{ boxShadow: `4px 4px 0px ${accentColor}` }}
        >
          Play Again
        </button>

        {/* provably fair verification */}
        {sessionId && (
          <div className="mt-4 p-3 rounded-lg bg-black/5 border border-black/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-black/40 uppercase">Provably Fair</span>
              <span className="text-[10px] font-mono text-black/30">
                {sessionId.slice(0, 8)}...{sessionId.slice(-4)}
              </span>
            </div>
            <p className="text-[10px] font-mono text-black/30 mt-1">
              Each round used commit-reveal with on-chain verifiable nonces. Session outcomes can be verified via HouseSession contract.
            </p>
          </div>
        )}
      </div>
    )
  }

  // active / playing_round: render game content with session info bar
  return (
    <div>
      {/* session info bar */}
      <div className="flex items-center justify-between px-1 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-black/40">
            Balance: <span className="text-black font-black">${balanceFormatted}</span>
          </span>
          {cumulativeMultiplier > 1 && (
            <span className="text-[10px] font-mono text-black/40">
              Mult: <span className="text-black font-black">{cumulativeMultiplier.toFixed(2)}x</span>
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono text-black/30">
          R{stats.totalRounds} | W{stats.wins} L{stats.losses}
        </span>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-[#FF6B9D]/10 border border-[#FF6B9D]/30">
          <p className="text-xs font-mono text-[#FF6B9D]">{error}</p>
        </div>
      )}

      {children}
    </div>
  )
}
