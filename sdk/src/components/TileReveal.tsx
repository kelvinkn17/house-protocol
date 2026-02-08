// TileReveal game component (from Death)
// simplified: no AnimateComponent, no SdkPanel, no SoundProvider

import { useState, useCallback, useEffect } from 'react'
import { cnm } from '../utils'
import { useGame } from '../hooks/useGame'
import SessionGate from './SessionGate'
import BetInput from './BetInput'
import { parseUnits } from 'viem'
import type { GameComponentProps } from '../types'

const ROWS = 5
const MIN_TILES = 2
const MAX_TILES = 6

type AnimPhase = 'idle' | 'playing' | 'dead' | 'survived'

interface RowResult {
  picked: number
  bomb: number
}

function getRowMultiplier(tileCount: number): number {
  return tileCount / (tileCount - 1)
}

function getCumulativeMultiplier(tileCounts: number[], completedRows: number): number {
  let m = 1
  for (let i = 0; i < completedRows; i++) {
    m *= getRowMultiplier(tileCounts[i])
  }
  return m
}

function generateTileCounts(): number[] {
  return Array.from(
    { length: ROWS },
    () => Math.floor(Math.random() * (MAX_TILES - MIN_TILES + 1)) + MIN_TILES,
  )
}

export default function TileReveal({
  gameSlug = 'death',
  accentColor = '#FF6B9D',
  className,
  onSound,
}: GameComponentProps) {
  const game = useGame(gameSlug)
  const [animPhase, setAnimPhase] = useState<AnimPhase>('idle')
  const [currentRow, setCurrentRow] = useState(0)
  const [results, setResults] = useState<RowResult[]>([])
  const [revealingRow, setRevealingRow] = useState(-1)
  const [betInput, setBetInput] = useState('10')

  const { activeGame, phase: gamePhase, playerBalance } = game

  const betRaw = parseUnits(betInput || '0', 6).toString()

  const tileCounts = (activeGame?.primitiveState?.tileCounts as number[]) || generateTileCounts()
  const multiplier = activeGame?.cumulativeMultiplier && activeGame.cumulativeMultiplier > 1
    ? activeGame.cumulativeMultiplier
    : getCumulativeMultiplier(tileCounts, results.length)

  const isActive = gamePhase === 'active' || gamePhase === 'playing_round'

  // when game becomes active, switch to playing
  useEffect(() => {
    if (gamePhase === 'active' && animPhase === 'idle' && activeGame) {
      setAnimPhase('playing')
      setCurrentRow(0)
      setResults([])
      setRevealingRow(-1)
    }
  }, [gamePhase, animPhase, activeGame])

  const pickTile = useCallback(
    async (tile: number) => {
      if (animPhase !== 'playing' || revealingRow >= 0 || gamePhase === 'playing_round') return

      onSound?.('reveal')
      setRevealingRow(currentRow)

      const result = await game.playRound({ tileIndex: tile }, betRaw)

      setTimeout(() => {
        if (!result) {
          setRevealingRow(-1)
          return
        }

        const bombPosition = (result.metadata.bombPosition as number) ?? tile
        const newResult: RowResult = { picked: tile, bomb: bombPosition }
        const newResults = [...results, newResult]
        setResults(newResults)
        setRevealingRow(-1)

        if (!result.playerWon) {
          onSound?.('lose')
          setAnimPhase('dead')
        } else if (result.gameOver) {
          onSound?.('win')
          setAnimPhase('survived')
        } else {
          onSound?.('win')
          setCurrentRow((r) => r + 1)
        }
      }, 400)
    },
    [animPhase, currentRow, results, revealingRow, gamePhase, onSound, game, betRaw],
  )

  const handleCashOut = async () => {
    onSound?.('cashout')
    await game.cashOut()
    setAnimPhase('idle')
  }

  const handlePlayAgain = async () => {
    setAnimPhase('idle')
    setCurrentRow(0)
    setResults([])
    if (activeGame) {
      await game.endGame()
    }
    await game.startGame()
  }

  return (
    <div className={cnm('bg-white border-2 border-black rounded-2xl p-6', className)} style={{ boxShadow: '6px 6px 0px black' }}>
      <SessionGate accentColor={accentColor}>
        {/* tile grid */}
        <div className="space-y-2.5 mb-6">
          {Array.from({ length: ROWS }).map((_, i) => {
            const rowIdx = ROWS - 1 - i
            const tileCount = tileCounts[rowIdx] || 3
            const isCompleted = rowIdx < results.length
            const isCurrent = rowIdx === currentRow && animPhase === 'playing'
            const isRevealing = rowIdx === revealingRow
            const result = results[rowIdx]
            const cumulativeMult = getCumulativeMultiplier(tileCounts, rowIdx + 1)

            return (
              <div key={rowIdx} className="flex items-center gap-3">
                <div className="w-14 text-right">
                  <span
                    className={cnm(
                      'text-xs font-mono',
                      isCompleted && result?.picked !== result?.bomb
                        ? 'text-black font-black'
                        : isCurrent
                          ? 'text-black/60'
                          : 'text-black/25',
                    )}
                  >
                    {cumulativeMult.toFixed(2)}x
                  </span>
                </div>

                <div
                  className={cnm(
                    'flex-1 flex gap-2 p-2 rounded-xl border-2 transition-all',
                    isCurrent && !isRevealing
                      ? 'border-black/40 bg-black/[0.03]'
                      : isCompleted
                        ? 'border-black/10 bg-transparent'
                        : 'border-black/5 bg-transparent',
                  )}
                >
                  {Array.from({ length: tileCount }).map((_, tileIdx) => {
                    const isPicked = isCompleted && result?.picked === tileIdx
                    const isBomb = isCompleted && result?.bomb === tileIdx
                    const pickedBomb = isPicked && isBomb

                    return (
                      <button
                        key={tileIdx}
                        onClick={() => isCurrent && !isRevealing && pickTile(tileIdx)}
                        disabled={!isCurrent || isRevealing || gamePhase === 'playing_round'}
                        className={cnm(
                          'flex-1 h-14 rounded-xl border-2 font-black text-sm transition-all',
                          pickedBomb && 'bg-[#FF6B9D] border-black text-black',
                          isPicked && !isBomb && 'bg-[#CDFF57] border-black text-black',
                          !isPicked && isBomb && isCompleted && 'bg-[#FF6B9D]/20 border-black/15 text-black/30',
                          !isPicked && !isBomb && isCompleted && 'bg-black/5 border-black/10 text-transparent',
                          isCurrent && !isRevealing && 'bg-white border-black cursor-pointer hover:bg-black/5 hover:translate-x-0.5 hover:translate-y-0.5',
                          isCurrent && isRevealing && 'bg-black/5 border-black/20',
                          !isCompleted && !isCurrent && 'bg-black/[0.03] border-black/10',
                        )}
                        style={isCurrent && !isRevealing ? { boxShadow: '3px 3px 0px black' } : undefined}
                      >
                        {pickedBomb && '\u2715'}
                        {isPicked && !isBomb && '\u2713'}
                        {!isPicked && isBomb && isCompleted && '\u2715'}
                        {isCurrent && !isRevealing && '?'}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* bet selector before first pick */}
        {animPhase === 'playing' && results.length === 0 && isActive && (
          <div className="mb-4">
            <BetInput value={betInput} onChange={setBetInput} maxBet={playerBalance} accentColor={accentColor} onSound={onSound} />
            <p className="text-[10px] font-mono text-black/30 mt-2 text-center">Pick a tile to start</p>
          </div>
        )}

        {/* current multiplier banner */}
        {animPhase === 'playing' && results.length > 0 && (
          <div className="text-center mb-4 py-3 bg-[#CDFF57]/20 rounded-xl border-2 border-[#CDFF57]/50">
            <p className="text-[10px] font-mono text-black/50 uppercase">Current ({betInput} USDH bet)</p>
            <p className="text-2xl font-black text-black">{multiplier.toFixed(2)}x</p>
          </div>
        )}

        {animPhase === 'survived' && (
          <div className="text-center mb-4 py-3 bg-[#CDFF57] rounded-xl border-2 border-black">
            <p className="text-sm font-black text-black">SURVIVED ALL ROWS! {multiplier.toFixed(2)}x</p>
          </div>
        )}
        {animPhase === 'dead' && (
          <div className="text-center mb-4 py-3 bg-[#FF6B9D] rounded-xl border-2 border-black">
            <p className="text-sm font-black text-black">DEAD ({betInput} USDH lost)</p>
          </div>
        )}

        {/* controls */}
        <div className="border-t-2 border-black/10 pt-5">
          {animPhase === 'playing' && results.length > 0 && isActive && (
            <button
              onClick={handleCashOut}
              disabled={gamePhase === 'playing_round'}
              className="w-full py-4 text-sm font-black uppercase bg-[#CDFF57] text-black border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1 disabled:opacity-50"
              style={{ boxShadow: '4px 4px 0px black' }}
            >
              Cash Out {multiplier.toFixed(2)}x
            </button>
          )}

          {(animPhase === 'dead' || animPhase === 'survived') && (
            <div className="space-y-3">
              <BetInput value={betInput} onChange={setBetInput} maxBet={playerBalance} accentColor={accentColor} onSound={onSound} />
              <button
                onClick={handlePlayAgain}
                className="w-full py-4 text-sm font-black uppercase bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1"
                style={{ boxShadow: `4px 4px 0px ${accentColor}` }}
              >
                Play Again
              </button>
            </div>
          )}
        </div>
      </SessionGate>
    </div>
  )
}
