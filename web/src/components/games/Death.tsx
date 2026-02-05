import { useState, useCallback } from 'react'
import { cnm } from '@/utils/style'
import { useSound } from '@/providers/SoundProvider'
import AnimateComponent from '@/components/elements/AnimateComponent'
import SdkPanel from './SdkPanel'

const ROWS = 5
const MIN_TILES = 2
const MAX_TILES = 6

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
    tilesPerRow: [2, 6], // random 2-6 per row
    bombsPerRow: 1,
  },
})`,
  },
  {
    label: 'Session',
    code: `const session = await house.openSession({
  gameId: game.id,
  bet: parseUnits('50', 6),
  maxPayout: parseUnits('500', 6),
})

// each row = 1 state channel round
// tile count varies per row (2-6)
for (let row = 0; row < 5; row++) {
  const result = await session.play({
    action: 'pick',
    tile: selectedTile, // 0 to tileCount-1
  })

  if (!result.survived) break

  if (wantsToCashOut) {
    await session.cashOut()
    break
  }
}`,
  },
  {
    label: 'Math',
    code: `// variable tiles per row (2-6), 1 bomb each
// row with N tiles: winProb = (N-1)/N
// row multiplier = N/(N-1)
// protocol applies house edge on cashout
//
// 2 tiles -> 2/1 = 2.00x (50% survive)
// 3 tiles -> 3/2 = 1.50x (67% survive)
// 4 tiles -> 4/3 = 1.33x (75% survive)
// 5 tiles -> 5/4 = 1.25x (80% survive)
// 6 tiles -> 6/5 = 1.20x (83% survive)
//
// fewer tiles = higher risk = bigger multiplier
// cumulative = product of all row multipliers`,
  },
]

function generateTileCounts(): number[] {
  return Array.from(
    { length: ROWS },
    () => Math.floor(Math.random() * (MAX_TILES - MIN_TILES + 1)) + MIN_TILES,
  )
}

// N tiles, 1 bomb: survive = (N-1)/N, multiplier = N/(N-1)
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

export default function Death() {
  const { play } = useSound()
  const [tileCounts, setTileCounts] = useState<number[]>(() => generateTileCounts())
  const [phase, setPhase] = useState<Phase>('idle')
  const [currentRow, setCurrentRow] = useState(0)
  const [results, setResults] = useState<RowResult[]>([])
  const [betAmount, setBetAmount] = useState('50')
  const [revealingRow, setRevealingRow] = useState(-1)

  const multiplier = results.length === 0 ? 1 : getCumulativeMultiplier(tileCounts, results.length)
  const cashoutValue = parseFloat(betAmount || '0') * multiplier

  const startGame = () => {
    play('action')
    const newCounts = generateTileCounts()
    setTileCounts(newCounts)
    setPhase('playing')
    setCurrentRow(0)
    setResults([])
    setRevealingRow(-1)
  }

  const pickTile = useCallback(
    (tile: number) => {
      if (phase !== 'playing' || revealingRow >= 0) return

      play('reveal')
      const bomb = Math.floor(Math.random() * tileCounts[currentRow])
      setRevealingRow(currentRow)

      setTimeout(() => {
        const newResult: RowResult = { picked: tile, bomb }
        const newResults = [...results, newResult]
        setResults(newResults)
        setRevealingRow(-1)

        if (tile === bomb) {
          play('lose')
          setPhase('dead')
        } else if (currentRow >= ROWS - 1) {
          play('win')
          setPhase('survived')
        } else {
          play('win')
          setCurrentRow((r) => r + 1)
        }
      }, 400)
    },
    [phase, currentRow, results, revealingRow, tileCounts, play],
  )

  const cashOut = () => {
    play('cashout')
    setPhase('idle')
    setCurrentRow(0)
    setResults([])
  }

  const reset = () => {
    startGame()
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <AnimateComponent delay={50} className="lg:col-span-3">
        <div
          className="bg-white border-2 border-black rounded-2xl p-6"
          style={{ boxShadow: '6px 6px 0px black' }}
        >
          {/* tile grid, top = highest row, bottom = first row */}
          <div className="space-y-2.5 mb-6">
            {Array.from({ length: ROWS }).map((_, i) => {
              const rowIdx = ROWS - 1 - i
              const tileCount = tileCounts[rowIdx]
              const isCompleted = rowIdx < results.length
              const isCurrent = rowIdx === currentRow && phase === 'playing'
              const isRevealing = rowIdx === revealingRow
              const result = results[rowIdx]
              const cumulativeMult = getCumulativeMultiplier(tileCounts, rowIdx + 1)

              return (
                <div key={rowIdx} className="flex items-center gap-3">
                  {/* cumulative multiplier */}
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

                  {/* row container with border */}
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
                          disabled={!isCurrent || isRevealing}
                          className={cnm(
                            'flex-1 h-14 rounded-xl border-2 font-black text-sm transition-all',
                            pickedBomb && 'bg-[#FF6B9D] border-black text-black',
                            isPicked && !isBomb && 'bg-[#CDFF57] border-black text-black',
                            !isPicked &&
                              isBomb &&
                              isCompleted &&
                              'bg-[#FF6B9D]/20 border-black/15 text-black/30',
                            !isPicked &&
                              !isBomb &&
                              isCompleted &&
                              'bg-black/5 border-black/10 text-transparent',
                            isCurrent &&
                              !isRevealing &&
                              'bg-white border-black cursor-pointer hover:bg-black/5 hover:translate-x-0.5 hover:translate-y-0.5',
                            isCurrent && isRevealing && 'bg-black/5 border-black/20',
                            !isCompleted && !isCurrent && 'bg-black/[0.03] border-black/10',
                          )}
                          style={
                            isCurrent && !isRevealing
                              ? { boxShadow: '3px 3px 0px black' }
                              : undefined
                          }
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
                      onClick={() => { play('click'); setBetAmount(String(amt)) }}
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
      </AnimateComponent>

      <AnimateComponent delay={150} className="lg:col-span-2">
        <SdkPanel
          gameType="reveal-tiles"
          description="Death uses the reveal-tiles primitive. Each row has a random number of tiles (2-6), one hiding a bomb. Player picks from bottom up, multiplier compounds. Can cash out between rows. Each pick is a gasless state channel round."
          tabs={SDK_TABS}
        />
      </AnimateComponent>
    </div>
  )
}
