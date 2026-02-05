import { useState, useCallback } from 'react'
import { cnm } from '@/utils/style'
import SdkPanel from './SdkPanel'

const ROWS = 5
const TILES_PER_ROW = 3

type Phase = 'idle' | 'playing' | 'dead' | 'survived'

interface RowResult {
  picked: number
  bomb: number
}

const SDK_TABS = [
  {
    label: 'Config',
    code: `import { HouseSDK } from '@house-protocol/sdk'

const game = HouseSDK.createGame({
  type: 'reveal-tiles',
  name: 'Death',
  houseEdge: 200, // 2% in bps
  options: {
    rows: 5,
    tilesPerRow: 3,
    bombsPerRow: 1,
  },
})`,
  },
  {
    label: 'Session',
    code: `const session = await house.openSession({
  gameId: game.id,
  bet: parseUnits('50', 6),
  maxPayout: parseUnits('370', 6),
})

// each row = 1 state channel round
for (let row = 0; row < 5; row++) {
  const result = await session.play({
    action: 'pick',
    tile: selectedTile, // 0, 1, or 2
  })

  if (!result.survived) break

  // can cash out between rows
  if (wantsToCashOut) {
    await session.cashOut()
    break
  }
}`,
  },
  {
    label: 'Math',
    code: `// 3 tiles, 1 bomb per row
// winProbability per row = 2/3
// survivalProbability(n) = (2/3)^n

// row multipliers (with 2% edge):
// row 1: 1.47x
// row 2: 2.16x
// row 3: 3.17x
// row 4: 4.66x
// row 5: 6.85x

// formula: ((3/2)^n) * (1 - 0.02)^n`,
  },
]

function getMultiplier(rows: number) {
  return Math.pow(3 / 2, rows) * Math.pow(0.98, rows)
}

export default function Death() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [currentRow, setCurrentRow] = useState(0)
  const [results, setResults] = useState<RowResult[]>([])
  const [betAmount, setBetAmount] = useState('50')
  const [revealingRow, setRevealingRow] = useState(-1)

  const multiplier = results.length === 0 ? 1 : getMultiplier(results.length)
  const cashoutValue = parseFloat(betAmount || '0') * multiplier

  const startGame = () => {
    setPhase('playing')
    setCurrentRow(0)
    setResults([])
    setRevealingRow(-1)
  }

  const pickTile = useCallback(
    (tile: number) => {
      if (phase !== 'playing' || revealingRow >= 0) return

      const bomb = Math.floor(Math.random() * TILES_PER_ROW)
      setRevealingRow(currentRow)

      setTimeout(() => {
        const newResult: RowResult = { picked: tile, bomb }
        const newResults = [...results, newResult]
        setResults(newResults)
        setRevealingRow(-1)

        if (tile === bomb) {
          setPhase('dead')
        } else if (currentRow >= ROWS - 1) {
          setPhase('survived')
        } else {
          setCurrentRow((r) => r + 1)
        }
      }, 400)
    },
    [phase, currentRow, results, revealingRow],
  )

  const cashOut = () => {
    setPhase('idle')
    setCurrentRow(0)
    setResults([])
  }

  const reset = () => {
    setPhase('idle')
    setCurrentRow(0)
    setResults([])
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3">
        <div
          className="bg-white border-2 border-black rounded-2xl p-6"
          style={{ boxShadow: '6px 6px 0px black' }}
        >
          {/* tile grid */}
          <div className="space-y-2.5 mb-6">
            {Array.from({ length: ROWS }).map((_, rowIdx) => {
              const isCompleted = rowIdx < results.length
              const isCurrent = rowIdx === currentRow && phase === 'playing'
              const isRevealing = rowIdx === revealingRow
              const result = results[rowIdx]

              return (
                <div key={rowIdx} className="flex items-center gap-3">
                  {/* row number */}
                  <div className="w-6 text-right">
                    <span
                      className={cnm(
                        'text-xs font-black',
                        isCurrent ? 'text-black' : 'text-black/25',
                      )}
                    >
                      {rowIdx + 1}
                    </span>
                  </div>

                  {/* tiles */}
                  <div className="flex-1 flex gap-2">
                    {Array.from({ length: TILES_PER_ROW }).map((_, tileIdx) => {
                      const isPicked = isCompleted && result?.picked === tileIdx
                      const isBomb = isCompleted && result?.bomb === tileIdx
                      const pickedBomb = isPicked && isBomb

                      return (
                        <button
                          key={tileIdx}
                          onClick={() => isCurrent && !isRevealing && pickTile(tileIdx)}
                          disabled={!isCurrent || isRevealing}
                          className={cnm(
                            'flex-1 h-14 rounded-xl border-2 font-black text-sm transition-all',
                            // picked the bomb
                            pickedBomb && 'bg-[#FF6B9D] border-black text-black',
                            // picked safe
                            isPicked && !isBomb && 'bg-[#CDFF57] border-black text-black',
                            // bomb revealed (not picked)
                            !isPicked && isBomb && isCompleted && 'bg-[#FF6B9D]/20 border-black/15 text-black/30',
                            // safe not picked
                            !isPicked && !isBomb && isCompleted && 'bg-black/5 border-black/10 text-transparent',
                            // current row tiles
                            isCurrent &&
                              !isRevealing &&
                              'bg-white border-black cursor-pointer hover:bg-black/5 hover:translate-x-0.5 hover:translate-y-0.5',
                            isCurrent && isRevealing && 'bg-black/5 border-black/20',
                            // future rows
                            !isCompleted && !isCurrent && 'bg-black/[0.03] border-black/10',
                          )}
                          style={
                            isCurrent && !isRevealing
                              ? { boxShadow: '3px 3px 0px black' }
                              : undefined
                          }
                        >
                          {pickedBomb && '✕'}
                          {isPicked && !isBomb && '✓'}
                          {!isPicked && isBomb && isCompleted && '✕'}
                          {isCurrent && !isRevealing && '?'}
                        </button>
                      )
                    })}
                  </div>

                  {/* row multiplier */}
                  <div className="w-14 text-right">
                    <span
                      className={cnm(
                        'text-xs font-mono',
                        isCompleted && result?.picked !== result?.bomb
                          ? 'text-black font-black'
                          : 'text-black/25',
                      )}
                    >
                      {getMultiplier(rowIdx + 1).toFixed(2)}x
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* current multiplier banner */}
          {phase === 'playing' && results.length > 0 && (
            <div className="text-center mb-4 py-3 bg-[#CDFF57]/20 rounded-xl border-2 border-[#CDFF57]/50">
              <p className="text-[10px] font-mono text-black/50 uppercase">Current</p>
              <p className="text-2xl font-black text-black">{multiplier.toFixed(2)}x</p>
              <p className="text-xs font-mono text-black/50">${cashoutValue.toFixed(2)}</p>
            </div>
          )}

          {/* result banners */}
          {phase === 'survived' && (
            <div className="text-center mb-4 py-3 bg-[#CDFF57] rounded-xl border-2 border-black">
              <p className="text-sm font-black text-black">
                SURVIVED ALL ROWS! Won ${cashoutValue.toFixed(2)}
              </p>
            </div>
          )}
          {phase === 'dead' && (
            <div className="text-center mb-4 py-3 bg-[#FF6B9D] rounded-xl border-2 border-black">
              <p className="text-sm font-black text-black">DEAD</p>
            </div>
          )}

          {/* controls */}
          <div className="border-t-2 border-black/10 pt-5">
            {phase === 'idle' && (
              <>
                <div className="flex gap-2 mb-4">
                  {[10, 50, 100, 500].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setBetAmount(String(amt))}
                      className={cnm(
                        'flex-1 py-2 text-xs font-black border-2 border-black rounded-lg transition-transform hover:translate-x-0.5 hover:translate-y-0.5',
                        betAmount === String(amt)
                          ? 'bg-black text-white'
                          : 'bg-white text-black',
                      )}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
                <button
                  onClick={startGame}
                  className="w-full py-4 text-sm font-black uppercase bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1"
                  style={{ boxShadow: '4px 4px 0px #FF6B9D' }}
                >
                  Start Game
                </button>
              </>
            )}

            {phase === 'playing' && results.length > 0 && (
              <button
                onClick={cashOut}
                className="w-full py-4 text-sm font-black uppercase bg-[#CDFF57] text-black border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1"
                style={{ boxShadow: '4px 4px 0px black' }}
              >
                Cash Out ${cashoutValue.toFixed(0)}
              </button>
            )}

            {(phase === 'dead' || phase === 'survived') && (
              <button
                onClick={reset}
                className="w-full py-4 text-sm font-black uppercase bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1"
                style={{ boxShadow: '4px 4px 0px #FF6B9D' }}
              >
                Play Again
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <SdkPanel
          gameType="reveal-tiles"
          description="Death uses the reveal-tiles primitive. Player picks one tile per row, avoiding the hidden bomb. Multiplier grows with each survived row. Can cash out between rows. Each pick is a gasless state channel round."
          tabs={SDK_TABS}
        />
      </div>
    </div>
  )
}
