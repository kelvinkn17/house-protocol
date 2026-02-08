// RangeRoll game component (from Range)
// simplified: no AnimateComponent, no SdkPanel, no SoundProvider

import { useState, useRef, useCallback, useEffect } from 'react'
import { cnm } from '../utils'
import { useGame } from '../hooks/useGame'
import SessionGate from './SessionGate'
import BetInput from './BetInput'
import { parseUnits } from 'viem'
import type { GameComponentProps } from '../types'

type Mode = 'over' | 'under' | 'range'
type AnimPhase = 'idle' | 'rolling' | 'result'

export default function RangeRoll({
  gameSlug = 'range',
  accentColor = '#dcb865',
  className,
  onSound,
}: GameComponentProps) {
  const game = useGame(gameSlug)
  const [mode, setMode] = useState<Mode>('over')
  const [target, setTarget] = useState(50)
  const [rangeStart, setRangeStart] = useState(30)
  const [rangeEnd, setRangeEnd] = useState(70)
  const [animPhase, setAnimPhase] = useState<AnimPhase>('idle')
  const [displayResult, setDisplayResult] = useState<number | null>(null)
  const [won, setWon] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { phase: gamePhase, playerBalance } = game
  const isActive = gamePhase === 'active' || gamePhase === 'playing_round'

  const [betInput, setBetInput] = useState('10')
  const betRaw = parseUnits(betInput || '0', 6).toString()

  const barRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<'target' | 'start' | 'end' | null>(null)

  const winProbability = (() => {
    switch (mode) {
      case 'over': return (100 - target) / 100
      case 'under': return (target - 1) / 100
      case 'range': return Math.max(0, rangeEnd - rangeStart + 1) / 100
    }
  })()

  const payout = winProbability > 0 ? (1 / winProbability) * 0.98 : 0

  const getValueFromPosition = useCallback((clientX: number) => {
    if (!barRef.current) return null
    const rect = barRef.current.getBoundingClientRect()
    const pct = ((clientX - rect.left) / rect.width) * 100
    return Math.round(Math.max(1, Math.min(99, pct)))
  }, [])

  useEffect(() => {
    if (!dragging) return

    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const value = getValueFromPosition(clientX)
      if (value === null) return

      if (dragging === 'target') {
        setTarget(Math.max(2, Math.min(98, value)))
      } else if (dragging === 'start') {
        setRangeStart(Math.max(1, Math.min(rangeEnd - 2, value)))
      } else if (dragging === 'end') {
        setRangeEnd(Math.max(rangeStart + 2, Math.min(99, value)))
      }
    }

    const handleUp = () => setDragging(null)

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleUp)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [dragging, rangeStart, rangeEnd, getValueFromPosition])

  const handleBarInteraction = useCallback(
    (clientX: number) => {
      const value = getValueFromPosition(clientX)
      if (value === null) return

      if (mode === 'range') {
        const distStart = Math.abs(value - rangeStart)
        const distEnd = Math.abs(value - rangeEnd)
        if (distStart <= distEnd) {
          setRangeStart(Math.max(1, Math.min(rangeEnd - 2, value)))
          setDragging('start')
        } else {
          setRangeEnd(Math.max(rangeStart + 2, Math.min(99, value)))
          setDragging('end')
        }
      } else {
        setTarget(Math.max(2, Math.min(98, value)))
        setDragging('target')
      }
    },
    [mode, rangeStart, rangeEnd, getValueFromPosition],
  )

  const roll = useCallback(async () => {
    onSound?.('action')
    setAnimPhase('rolling')
    setDisplayResult(null)

    let count = 0
    intervalRef.current = setInterval(() => {
      setDisplayResult(Math.floor(Math.random() * 100) + 1)
      onSound?.('tick')
      count++
      if (count >= 30) {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }, 50)

    const choice: Record<string, unknown> = { mode, target }
    if (mode === 'range') {
      choice.rangeStart = rangeStart
      choice.rangeEnd = rangeEnd
    }

    const result = await game.playRound(choice, betRaw)

    if (intervalRef.current) clearInterval(intervalRef.current)

    if (result) {
      const rollValue = (result.metadata.roll as number) || 50
      setDisplayResult(rollValue)
      setWon(result.playerWon)
      setAnimPhase('result')
      onSound?.(result.playerWon ? 'win' : 'lose')
    } else {
      setAnimPhase('idle')
    }
  }, [mode, target, rangeStart, rangeEnd, onSound, game, betRaw])

  return (
    <div className={cnm('bg-white border-2 border-black rounded-2xl p-6', className)} style={{ boxShadow: '6px 6px 0px black' }}>
      <SessionGate accentColor={accentColor}>
        {/* result number */}
        <div className="flex flex-col items-center justify-center py-6">
          <div
            className={cnm(
              'w-28 h-28 rounded-2xl border-4 border-black flex items-center justify-center mb-4 transition-all duration-200',
              animPhase === 'result' && won && 'bg-[#CDFF57]',
              animPhase === 'result' && !won && 'bg-[#FF6B9D]',
              animPhase === 'rolling' && 'bg-black/10',
              animPhase === 'idle' && 'bg-black/5',
            )}
            style={{ boxShadow: '4px 4px 0px black' }}
          >
            <span className={cnm('text-4xl font-black', animPhase === 'rolling' ? 'text-black/30' : 'text-black')}>
              {displayResult ?? '?'}
            </span>
          </div>

          {animPhase === 'result' && (
            <p className={cnm('text-sm font-black', won ? 'text-[#7BA318]' : 'text-[#FF6B9D]')}>
              {won ? `WIN ${payout.toFixed(2)}x` : 'MISS'}
            </p>
          )}
        </div>

        {/* range slider */}
        <div className="mb-5 select-none" style={{ touchAction: 'none' }}>
          <div
            ref={barRef}
            className="relative h-10 flex items-center cursor-pointer"
            onMouseDown={(e) => handleBarInteraction(e.clientX)}
            onTouchStart={(e) => { e.preventDefault(); handleBarInteraction(e.touches[0].clientX) }}
          >
            <div className="absolute left-0 right-0 h-3.5 rounded-full overflow-hidden border-2 border-black">
              <div className="absolute inset-0 bg-[#FF6B9D]" />
              {mode === 'over' && (
                <div className="absolute top-0 bottom-0 bg-[#CDFF57]" style={{ left: `${target}%`, right: 0 }} />
              )}
              {mode === 'under' && (
                <div className="absolute top-0 bottom-0 bg-[#CDFF57]" style={{ left: 0, width: `${target}%` }} />
              )}
              {mode === 'range' && (
                <div className="absolute top-0 bottom-0 bg-[#CDFF57]" style={{ left: `${rangeStart}%`, width: `${rangeEnd - rangeStart}%` }} />
              )}
              {displayResult !== null && animPhase === 'result' && (
                <div
                  className={cnm('absolute top-0 bottom-0 w-1 -ml-0.5', won ? 'bg-black' : 'bg-white')}
                  style={{ left: `${displayResult}%` }}
                />
              )}
            </div>

            {mode !== 'range' ? (
              <div
                className="absolute w-6 h-6 bg-black rounded-full border-2 border-white shadow-md z-10 cursor-grab active:cursor-grabbing"
                style={{ left: `${target}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
                onMouseDown={(e) => { e.stopPropagation(); setDragging('target') }}
                onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); setDragging('target') }}
              />
            ) : (
              <>
                <div
                  className="absolute w-6 h-6 bg-black rounded-full border-2 border-white shadow-md z-10 cursor-grab active:cursor-grabbing"
                  style={{ left: `${rangeStart}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
                  onMouseDown={(e) => { e.stopPropagation(); setDragging('start') }}
                  onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); setDragging('start') }}
                />
                <div
                  className="absolute w-6 h-6 bg-black rounded-full border-2 border-white shadow-md z-10 cursor-grab active:cursor-grabbing"
                  style={{ left: `${rangeEnd}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
                  onMouseDown={(e) => { e.stopPropagation(); setDragging('end') }}
                  onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); setDragging('end') }}
                />
              </>
            )}
          </div>

          <div className="flex justify-between mt-1 text-[10px] font-mono text-black/30">
            {[0, 25, 50, 75, 100].map((v) => <span key={v}>{v}</span>)}
          </div>

          <div className="text-center mt-2">
            <span className="text-xs font-mono text-black/50">
              {mode === 'over' && `Roll > ${target}`}
              {mode === 'under' && `Roll < ${target}`}
              {mode === 'range' && `Roll between ${rangeStart} and ${rangeEnd}`}
            </span>
          </div>
        </div>

        {/* mode selector */}
        <div className="flex gap-2 mb-5">
          {(['over', 'under', 'range'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                onSound?.('click')
                setMode(m)
                setAnimPhase('idle')
                setDisplayResult(null)
              }}
              className={cnm(
                'flex-1 py-3 text-xs font-black uppercase border-2 border-black rounded-xl transition-all',
                mode === m ? 'bg-black text-white' : 'bg-white text-black/40 hover:text-black',
              )}
              style={mode === m ? { boxShadow: `3px 3px 0px ${accentColor}` } : undefined}
            >
              {m}
            </button>
          ))}
        </div>

        {/* stats */}
        <div className="grid grid-cols-2 gap-3 mb-5 p-4 rounded-xl bg-black/5 border-2 border-black/10">
          <div>
            <p className="text-[10px] font-mono text-black/50 uppercase">Win Chance</p>
            <p className="text-lg font-black text-black">{(winProbability * 100).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-[10px] font-mono text-black/50 uppercase">Payout</p>
            <p className="text-lg font-black text-black">{payout.toFixed(2)}x</p>
          </div>
        </div>

        {/* controls */}
        <div className="border-t-2 border-black/10 pt-5">
          {animPhase === 'idle' && isActive && (
            <div className="space-y-3">
              <BetInput value={betInput} onChange={setBetInput} maxBet={playerBalance} accentColor={accentColor} onSound={onSound} />
              <button
                onClick={roll}
                disabled={gamePhase === 'playing_round' || !betInput || parseFloat(betInput) <= 0}
                className="w-full py-4 text-sm font-black uppercase bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1 disabled:opacity-50"
                style={{ boxShadow: `4px 4px 0px ${accentColor}` }}
              >
                Roll {betInput} USDH for {payout.toFixed(2)}x
              </button>
            </div>
          )}

          {animPhase === 'rolling' && (
            <div className="w-full py-4 text-sm font-black uppercase text-center text-black/40">
              Rolling...
            </div>
          )}

          {animPhase === 'result' && isActive && (
            <div className="space-y-3">
              <BetInput value={betInput} onChange={setBetInput} maxBet={playerBalance} accentColor={accentColor} onSound={onSound} />
              <button
                onClick={roll}
                disabled={gamePhase === 'playing_round' || !betInput || parseFloat(betInput) <= 0}
                className={cnm(
                  'w-full py-4 text-sm font-black uppercase border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1 disabled:opacity-50',
                  won ? 'bg-[#CDFF57] text-black' : 'bg-black text-white',
                )}
                style={{ boxShadow: `4px 4px 0px ${won ? 'black' : accentColor}` }}
              >
                Roll Again {betInput} USDH
              </button>
            </div>
          )}
        </div>
      </SessionGate>
    </div>
  )
}
