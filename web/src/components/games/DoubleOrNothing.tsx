import { useState, useEffect, useRef } from 'react'
import { cnm } from '@/utils/style'
import { useSound } from '@/providers/SoundProvider'
import AnimateComponent from '@/components/elements/AnimateComponent'
import SdkPanel from './SdkPanel'
import SessionGate from './SessionGate'
import { useSession } from '@/providers/SessionProvider'
import { formatUnits } from 'viem'

type AnimPhase = 'idle' | 'flipping' | 'won' | 'lost'

const SDK_TABS = [
  {
    label: 'Config',
    code: `import { HouseSDK } from '@house-protocol/sdk'

const game = HouseSDK.createGame({
  type: 'cash-out',
  name: 'Double or Nothing',
  houseEdge: 200, // 2% in bps
  options: {
    multiplier: 2,
    maxRounds: 10,
  },
})`,
  },
  {
    label: 'Session',
    code: `// open session (1 tx, then gasless)
const session = await house.openSession({
  gameId: game.id,
  bet: parseUnits('100', 6), // 100 USDC
  maxPayout: parseUnits('102400', 6),
})

// play round via state channel
const round = await session.play({
  action: 'continue', // or 'cashout'
})

// cash out (closes session, 1 tx)
await session.cashOut()`,
  },
  {
    label: 'Math',
    code: `// payout formula
// winProbability = 0.50 (fair coin)
// payout = (1 / 0.50) * (1 - 0.02) = 1.96x
// effective multiplier per round: 1.96x

// streak payouts:
// 1 win:  bet * 1.96x
// 2 wins: bet * 3.84x
// 3 wins: bet * 7.53x
// 4 wins: bet * 14.76x
// n wins: bet * 1.96^n`,
  },
]

export default function DoubleOrNothing() {
  const { play } = useSound()
  const session = useSession()
  const [animPhase, setAnimPhase] = useState<AnimPhase>('idle')
  const gameStarted = useRef(false)

  const { sessionPhase, activeGame, gamePhase, stats, playerBalance } = session

  const multiplier = activeGame?.cumulativeMultiplier ?? 1
  const streak = stats.wins

  // auto-start game when session becomes active
  useEffect(() => {
    if (sessionPhase === 'active' && gamePhase === 'none' && !activeGame && !gameStarted.current) {
      gameStarted.current = true
      session.startGame('double-or-nothing')
    }
  }, [sessionPhase, gamePhase, activeGame, session])

  // reset the ref when session changes
  useEffect(() => {
    if (sessionPhase !== 'active') {
      gameStarted.current = false
    }
  }, [sessionPhase])

  // when game starts, switch to playing
  useEffect(() => {
    if (gamePhase === 'active' && animPhase === 'idle' && activeGame) {
      // game just started, ready to play
    }
  }, [gamePhase, animPhase, activeGame])

  const isActive = gamePhase === 'active' || gamePhase === 'playing_round'

  const flip = async () => {
    play('action')
    setAnimPhase('flipping')

    const result = await session.playRound({ action: 'continue' })

    setTimeout(() => {
      if (result?.playerWon) {
        setAnimPhase('won')
        play('win')
      } else {
        setAnimPhase('lost')
        play('lose')
      }
    }, 600)
  }

  const handleCashOut = async () => {
    play('cashout')
    await session.cashOut()
    setAnimPhase('idle')
  }

  const handlePlayAgain = async () => {
    setAnimPhase('idle')
    // end current game if still tracked, start fresh
    if (activeGame) {
      await session.endGame()
    }
    await session.startGame('double-or-nothing')
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <AnimateComponent delay={50} className="lg:col-span-3">
        <div
          className="bg-white border-2 border-black rounded-2xl p-6"
          style={{ boxShadow: '6px 6px 0px black' }}
        >
          <SessionGate accentColor="#CDFF57">
            {/* multiplier display */}
            <div className="flex flex-col items-center justify-center py-8">
              <div
                className={cnm(
                  'w-32 h-32 rounded-full border-4 border-black flex items-center justify-center mb-6 transition-all duration-300',
                  animPhase === 'flipping' && 'bg-black/10 scale-95',
                  animPhase === 'won' && 'bg-[#CDFF57]',
                  animPhase === 'lost' && 'bg-[#FF6B9D]',
                  animPhase === 'idle' && 'bg-black/5',
                )}
                style={{ boxShadow: '4px 4px 0px black' }}
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

              {/* streak dots */}
              {streak > 0 && (
                <div className="flex gap-2 mb-4">
                  {Array.from({ length: streak }).map((_, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-full bg-[#CDFF57] border-2 border-black"
                    />
                  ))}
                </div>
              )}

              {animPhase === 'won' && multiplier > 1 && (
                <p className="text-sm font-mono text-black/60">
                  Cash out:{' '}
                  <span className="font-black text-black">
                    {multiplier.toFixed(2)}x
                  </span>
                </p>
              )}

              {animPhase === 'lost' && (
                <p className="text-sm font-black text-[#FF6B9D]">BUSTED</p>
              )}
            </div>

            {/* controls */}
            <div className="border-t-2 border-black/10 pt-5">
              {animPhase === 'idle' && isActive && (
                <button
                  onClick={flip}
                  disabled={gamePhase === 'playing_round'}
                  className="w-full py-4 text-sm font-black uppercase bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1 disabled:opacity-50"
                  style={{ boxShadow: '4px 4px 0px #CDFF57' }}
                >
                  Flip for 2x
                </button>
              )}

              {animPhase === 'won' && isActive && (
                <div className="flex gap-3">
                  <button
                    onClick={handleCashOut}
                    disabled={gamePhase === 'playing_round'}
                    className="flex-1 py-4 text-sm font-black uppercase bg-[#CDFF57] text-black border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1 disabled:opacity-50"
                    style={{ boxShadow: '4px 4px 0px black' }}
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
                <button
                  onClick={handlePlayAgain}
                  className="w-full py-4 text-sm font-black uppercase bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1"
                  style={{ boxShadow: '4px 4px 0px #FF6B9D' }}
                >
                  Play Again
                </button>
              )}

              {animPhase === 'flipping' && (
                <div className="w-full py-4 text-sm font-black uppercase text-center text-black/40">
                  Flipping...
                </div>
              )}
            </div>
          </SessionGate>
        </div>
      </AnimateComponent>

      <AnimateComponent delay={150} className="lg:col-span-2">
        <SdkPanel
          gameType="cash-out"
          description="Double or Nothing uses the cash-out primitive. Player bets, wins 2x, and chooses to keep doubling or cash out. House edge applied per round. Session stays open via state channels, zero gas per flip."
          tabs={SDK_TABS}
        />
      </AnimateComponent>
    </div>
  )
}
