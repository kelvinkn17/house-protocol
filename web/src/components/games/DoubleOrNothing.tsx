import { useState } from 'react'
import { cnm } from '@/utils/style'
import SdkPanel from './SdkPanel'

type Phase = 'idle' | 'flipping' | 'won' | 'lost'

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
  const [phase, setPhase] = useState<Phase>('idle')
  const [streak, setStreak] = useState(0)
  const [betAmount, setBetAmount] = useState('100')

  const multiplier = Math.pow(2, streak)
  const cashoutValue = parseFloat(betAmount || '0') * multiplier * 2

  const flip = () => {
    setPhase('flipping')
    setTimeout(() => {
      if (Math.random() < 0.49) {
        setStreak((s) => s + 1)
        setPhase('won')
      } else {
        setPhase('lost')
      }
    }, 600)
  }

  const cashOut = () => {
    setPhase('idle')
    setStreak(0)
  }

  const reset = () => {
    setPhase('idle')
    setStreak(0)
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3">
        <div
          className="bg-white border-2 border-black rounded-2xl p-6"
          style={{ boxShadow: '6px 6px 0px black' }}
        >
          {/* multiplier display */}
          <div className="flex flex-col items-center justify-center py-8">
            <div
              className={cnm(
                'w-32 h-32 rounded-full border-4 border-black flex items-center justify-center mb-6 transition-all duration-300',
                phase === 'flipping' && 'bg-black/10 scale-95',
                phase === 'won' && 'bg-[#CDFF57]',
                phase === 'lost' && 'bg-[#FF6B9D]',
                phase === 'idle' && 'bg-black/5',
              )}
              style={{ boxShadow: '4px 4px 0px black' }}
            >
              <span className="text-3xl font-black text-black">
                {phase === 'flipping'
                  ? '...'
                  : phase === 'lost'
                    ? '0x'
                    : phase === 'won'
                      ? `${multiplier * 2}x`
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

            {phase === 'won' && (
              <p className="text-sm font-mono text-black/60">
                Cash out:{' '}
                <span className="font-black text-black">${cashoutValue.toFixed(2)}</span>
              </p>
            )}

            {phase === 'lost' && (
              <p className="text-sm font-black text-[#FF6B9D]">BUSTED</p>
            )}
          </div>

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
                  onClick={flip}
                  className="w-full py-4 text-sm font-black uppercase bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1"
                  style={{ boxShadow: '4px 4px 0px #CDFF57' }}
                >
                  Flip for 2x
                </button>
              </>
            )}

            {phase === 'won' && (
              <div className="flex gap-3">
                <button
                  onClick={cashOut}
                  className="flex-1 py-4 text-sm font-black uppercase bg-[#CDFF57] text-black border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1"
                  style={{ boxShadow: '4px 4px 0px black' }}
                >
                  Cash Out ${cashoutValue.toFixed(0)}
                </button>
                <button
                  onClick={flip}
                  className="flex-1 py-4 text-sm font-black uppercase bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1"
                  style={{ boxShadow: '4px 4px 0px #FF6B9D' }}
                >
                  Double Again
                </button>
              </div>
            )}

            {phase === 'lost' && (
              <button
                onClick={reset}
                className="w-full py-4 text-sm font-black uppercase bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1"
                style={{ boxShadow: '4px 4px 0px #FF6B9D' }}
              >
                Play Again
              </button>
            )}

            {phase === 'flipping' && (
              <div className="w-full py-4 text-sm font-black uppercase text-center text-black/40">
                Flipping...
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <SdkPanel
          gameType="cash-out"
          description="Double or Nothing uses the cash-out primitive. Player bets, wins 2x, and chooses to keep doubling or cash out. House edge applied per round. Session stays open via state channels, zero gas per flip."
          tabs={SDK_TABS}
        />
      </div>
    </div>
  )
}
