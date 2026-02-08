// CoinFlip game component (from DoubleOrNothing)
// simplified: no AnimateComponent, no SdkPanel, no SoundProvider

import { useState, useEffect, useRef } from 'react'
import { cnm } from '../utils'
import { useGame } from '../hooks/useGame'
import SessionGate from './SessionGate'
import BetInput from './BetInput'
import { parseUnits } from 'viem'
import type { GameComponentProps } from '../types'

type AnimPhase = 'idle' | 'flipping' | 'won' | 'lost'

export default function CoinFlip({
  gameSlug = 'double-or-nothing',
  accentColor = '#CDFF57',
  className,
  onSound,
}: GameComponentProps) {
  const game = useGame(gameSlug)
  const [animPhase, setAnimPhase] = useState<AnimPhase>('idle')
  const [betInput, setBetInput] = useState('10')

  const { activeGame, phase: gamePhase, stats, playerBalance } = game

  const multiplier = activeGame?.cumulativeMultiplier ?? 1
  const streak = stats.wins

  const betRaw = parseUnits(betInput || '0', 6).toString()
  const betDisplay = betInput || '0'

  const isActive = gamePhase === 'active' || gamePhase === 'playing_round'

  const flip = async () => {
    onSound?.('action')
    setAnimPhase('flipping')

    const result = await game.playRound({ action: 'continue' }, betRaw)

    setTimeout(() => {
      if (result?.playerWon) {
        setAnimPhase('won')
        onSound?.('win')
      } else {
        setAnimPhase('lost')
        onSound?.('lose')
      }
    }, 600)
  }

  const handleCashOut = async () => {
    onSound?.('cashout')
    await game.cashOut()
    setAnimPhase('idle')
  }

  const handlePlayAgain = async () => {
    setAnimPhase('idle')
    if (activeGame) {
      await game.endGame()
    }
    await game.startGame()
  }

  return (
    <div className={cnm('bg-white border-2 border-black rounded-2xl p-6', className)} style={{ boxShadow: '6px 6px 0px black' }}>
      <SessionGate accentColor={accentColor}>
        {/* multiplier display */}
        <div className="flex flex-col items-center justify-center py-8">
          <div
            className={cnm(
              'w-32 h-32 rounded-full border-4 border-black flex items-center justify-center mb-6 transition-all duration-300',
              animPhase === 'flipping' && 'bg-black/10 scale-95',
              animPhase === 'won' && `bg-[${accentColor}]`,
              animPhase === 'lost' && 'bg-[#FF6B9D]',
              animPhase === 'idle' && 'bg-black/5',
            )}
            style={{
              boxShadow: '4px 4px 0px black',
              ...(animPhase === 'won' ? { backgroundColor: accentColor } : {}),
            }}
          >
            <span className="text-3xl font-black text-black">
              {animPhase === 'flipping'
                ? '...'
                : animPhase === 'lost'
                  ? '0x'
                  : multiplier > 1
                    ? `${multiplier.toFixed(1)}x`
                    : '2x'}
            </span>
          </div>

          {streak > 0 && (
            <div className="flex gap-2 mb-4">
              {Array.from({ length: streak }).map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full border-2 border-black"
                  style={{ backgroundColor: accentColor }}
                />
              ))}
            </div>
          )}

          {animPhase === 'won' && multiplier > 1 && (
            <p className="text-sm font-mono text-black/60">
              Cash out: <span className="font-black text-black">{multiplier.toFixed(2)}x</span>
            </p>
          )}

          {animPhase === 'lost' && (
            <p className="text-sm font-black text-[#FF6B9D]">BUSTED</p>
          )}
        </div>

        {/* controls */}
        <div className="border-t-2 border-black/10 pt-5">
          {animPhase === 'idle' && isActive && (
            <div className="space-y-3">
              <BetInput value={betInput} onChange={setBetInput} maxBet={playerBalance} accentColor={accentColor} onSound={onSound} />
              <button
                onClick={flip}
                disabled={gamePhase === 'playing_round' || !betInput || parseFloat(betInput) <= 0}
                className="w-full py-4 text-sm font-black uppercase bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1 disabled:opacity-50"
                style={{ boxShadow: `4px 4px 0px ${accentColor}` }}
              >
                Flip {betDisplay} USDH for 2x
              </button>
            </div>
          )}

          {animPhase === 'won' && isActive && (
            <div className="flex gap-3">
              <button
                onClick={handleCashOut}
                disabled={gamePhase === 'playing_round'}
                className="flex-1 py-4 text-sm font-black uppercase text-black border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1 disabled:opacity-50"
                style={{ backgroundColor: accentColor, boxShadow: '4px 4px 0px black' }}
              >
                Cash Out {multiplier.toFixed(1)}x
              </button>
              <button
                onClick={flip}
                disabled={gamePhase === 'playing_round'}
                className="flex-1 py-4 text-sm font-black uppercase bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1 disabled:opacity-50"
                style={{ boxShadow: '4px 4px 0px #FF6B9D' }}
              >
                Double Again
              </button>
            </div>
          )}

          {animPhase === 'lost' && (
            <div className="space-y-3">
              <BetInput value={betInput} onChange={setBetInput} maxBet={playerBalance} accentColor={accentColor} onSound={onSound} />
              <button
                onClick={handlePlayAgain}
                className="w-full py-4 text-sm font-black uppercase bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1"
                style={{ boxShadow: '4px 4px 0px #FF6B9D' }}
              >
                Play Again
              </button>
            </div>
          )}

          {animPhase === 'flipping' && (
            <div className="w-full py-4 text-sm font-black uppercase text-center text-black/40">
              Flipping...
            </div>
          )}
        </div>
      </SessionGate>
    </div>
  )
}
