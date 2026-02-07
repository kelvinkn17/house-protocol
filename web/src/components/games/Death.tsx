import { useState, useCallback, useEffect, useRef } from 'react'
import { cnm } from '@/utils/style'
import { useSound } from '@/providers/SoundProvider'
import AnimateComponent from '@/components/elements/AnimateComponent'
import SdkPanel from './SdkPanel'
import SessionGate from './SessionGate'
import BetInput from './BetInput'
import { useSession } from '@/providers/SessionProvider'
import { parseUnits } from 'viem'

const ROWS = 5
const MIN_TILES = 2
const MAX_TILES = 6

type AnimPhase = 'idle' | 'playing' | 'dead' | 'survived'

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

// fallback tile counts if game hasn't started yet
function generateTileCounts(): number[] {
  return Array.from(
    { length: ROWS },
    () => Math.floor(Math.random() * (MAX_TILES - MIN_TILES + 1)) + MIN_TILES,
  )
}

export default function Death() {
  const { play } = useSound()
  const session = useSession()
  const [animPhase, setAnimPhase] = useState<AnimPhase>('idle')
  const [currentRow, setCurrentRow] = useState(0)
  const [results, setResults] = useState<RowResult[]>([])
  const [revealingRow, setRevealingRow] = useState(-1)
  const [betInput, setBetInput] = useState('10')
  const gameStarted = useRef(false)

  const { sessionPhase, activeGame, gamePhase, stats, playerBalance } = session

  const betRaw = parseUnits(betInput || '0', 6).toString()

  // tile counts come from server (primitiveState) after game start
  const tileCounts = (activeGame?.primitiveState?.tileCounts as number[]) || generateTileCounts()
  const multiplier = activeGame?.cumulativeMultiplier && activeGame.cumulativeMultiplier > 1
    ? activeGame.cumulativeMultiplier
    : getCumulativeMultiplier(tileCounts, results.length)

  const isActive = gamePhase === 'active' || gamePhase === 'playing_round'

  // auto-start game when session becomes active
  useEffect(() => {
    if (sessionPhase !== 'active' || gameStarted.current) return

    if (activeGame && activeGame.slug !== 'death') {
      gameStarted.current = true
      session.endGame().then(() => session.startGame('death'))
      return
    }

    if (gamePhase === 'none' && !activeGame) {
      gameStarted.current = true
      session.startGame('death')
    }
  }, [sessionPhase, gamePhase, activeGame, session])

  useEffect(() => {
    if (sessionPhase !== 'active') {
      gameStarted.current = false
    }
  }, [sessionPhase])

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

      play('reveal')
      setRevealingRow(currentRow)

      const result = await session.playRound({ tileIndex: tile }, betRaw)

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
          play('lose')
          setAnimPhase('dead')
        } else if (result.gameOver) {
          play('win')
          setAnimPhase('survived')
        } else {
          play('win')
          setCurrentRow((r) => r + 1)
        }
      }, 400)
    },
    [animPhase, currentRow, results, revealingRow, gamePhase, play, session, betRaw],
  )

  const handleCashOut = async () => {
    play('cashout')
    await session.cashOut()
    setAnimPhase('idle')
  }

  const handlePlayAgain = async () => {
    setAnimPhase('idle')
    setCurrentRow(0)
    setResults([])
    if (activeGame) {
      await session.endGame()
    }
    await session.startGame('death')
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <AnimateComponent delay={50} className="lg:col-span-3">
        <div
          className="bg-white border-2 border-black rounded-2xl p-6"
          style={{ boxShadow: '6px 6px 0px black' }}
        >
          <SessionGate accentColor="#FF6B9D">
            {/* tile grid, top = highest row, bottom = first row */}
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
                            disabled={!isCurrent || isRevealing || gamePhase === 'playing_round'}
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

            {/* bet selector, shown before first pick */}
            {animPhase === 'playing' && results.length === 0 && isActive && (
              <div className="mb-4">
                <BetInput
                  value={betInput}
                  onChange={setBetInput}
                  maxBet={playerBalance}
                  accentColor="#FF6B9D"
                />
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

            {/* result banners */}
            {animPhase === 'survived' && (
              <div className="text-center mb-4 py-3 bg-[#CDFF57] rounded-xl border-2 border-black">
                <p className="text-sm font-black text-black">
                  SURVIVED ALL ROWS! {multiplier.toFixed(2)}x
                </p>
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
                  <BetInput
                    value={betInput}
                    onChange={setBetInput}
                    maxBet={playerBalance}
                    accentColor="#FF6B9D"
                  />
                  <button
                    onClick={handlePlayAgain}
                    className="w-full py-4 text-sm font-black uppercase bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1"
                    style={{ boxShadow: '4px 4px 0px #FF6B9D' }}
                  >
                    Play Again
                  </button>
                </div>
              )}
            </div>
          </SessionGate>
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
