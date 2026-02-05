import { useState, useRef, useCallback } from 'react'
import { cnm } from '@/utils/style'
import SdkPanel from './SdkPanel'

type Mode = 'over' | 'under' | 'range'
type Phase = 'idle' | 'rolling' | 'result'

const SDK_TABS = [
  {
    label: 'Config',
    code: `import { HouseSDK } from '@house-protocol/sdk'

const game = HouseSDK.createGame({
  type: 'pick-number',
  name: 'Range',
  houseEdge: 200, // 2% in bps
  options: {
    min: 1,
    max: 100,
    modes: ['over', 'under', 'range'],
  },
})`,
  },
  {
    label: 'Session',
    code: `const session = await house.openSession({
  gameId: game.id,
  bet: parseUnits('100', 6),
  maxPayout: parseUnits('9800', 6),
})

// play round via state channel
const result = await session.play({
  mode: 'over',   // 'over' | 'under' | 'range'
  target: 90,     // roll must be > 90
  // or for range mode:
  // rangeStart: 40,
  // rangeEnd: 60,
})

console.log(result.roll)   // 1-100
console.log(result.won)    // true/false
console.log(result.payout) // amount won`,
  },
  {
    label: 'Math',
    code: `// payout = (1 / winProbability) * (1 - houseEdge)

// over 50:  win 50%  -> 1.96x
// over 75:  win 25%  -> 3.92x
// over 90:  win 10%  -> 9.80x
// over 95:  win 5%   -> 19.60x
// over 98:  win 2%   -> 49.00x

// under 25: win 25%  -> 3.92x
// range 40-60: win 21% -> 4.67x

// higher risk = higher multiplier
// protocol enforces the math`,
  },
]

export default function Range() {
  const [mode, setMode] = useState<Mode>('over')
  const [target, setTarget] = useState(50)
  const [rangeStart, setRangeStart] = useState(30)
  const [rangeEnd, setRangeEnd] = useState(70)
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<number | null>(null)
  const [won, setWon] = useState(false)
  const [betAmount, setBetAmount] = useState('100')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const winProbability = (() => {
    switch (mode) {
      case 'over':
        return (100 - target) / 100
      case 'under':
        return target / 100
      case 'range':
        return Math.max(0, rangeEnd - rangeStart + 1) / 100
    }
  })()

  const payout = winProbability > 0 ? (1 / winProbability) * 0.98 : 0

  const roll = useCallback(() => {
    setPhase('rolling')
    setResult(null)

    let count = 0
    intervalRef.current = setInterval(() => {
      setResult(Math.floor(Math.random() * 100) + 1)
      count++
      if (count >= 15) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        const finalResult = Math.floor(Math.random() * 100) + 1
        setResult(finalResult)

        const isWin = (() => {
          switch (mode) {
            case 'over':
              return finalResult > target
            case 'under':
              return finalResult < target
            case 'range':
              return finalResult >= rangeStart && finalResult <= rangeEnd
          }
        })()

        setWon(isWin)
        setPhase('result')
      }
    }, 50)
  }, [mode, target, rangeStart, rangeEnd])

  const reset = () => {
    setPhase('idle')
    setResult(null)
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3">
        <div
          className="bg-white border-2 border-black rounded-2xl p-6"
          style={{ boxShadow: '6px 6px 0px black' }}
        >
          {/* result number */}
          <div className="flex flex-col items-center justify-center py-6">
            <div
              className={cnm(
                'w-28 h-28 rounded-2xl border-4 border-black flex items-center justify-center mb-4 transition-all duration-200',
                phase === 'result' && won && 'bg-[#CDFF57]',
                phase === 'result' && !won && 'bg-[#FF6B9D]',
                phase === 'rolling' && 'bg-black/10',
                phase === 'idle' && 'bg-black/5',
              )}
              style={{ boxShadow: '4px 4px 0px black' }}
            >
              <span
                className={cnm(
                  'text-4xl font-black',
                  phase === 'rolling' ? 'text-black/30' : 'text-black',
                )}
              >
                {result ?? '?'}
              </span>
            </div>

            {phase === 'result' && (
              <p
                className={cnm(
                  'text-sm font-black',
                  won ? 'text-[#7BA318]' : 'text-[#FF6B9D]',
                )}
              >
                {won
                  ? `WIN +$${(parseFloat(betAmount || '0') * (payout - 1)).toFixed(2)}`
                  : 'MISS'}
              </p>
            )}
          </div>

          {/* visual range bar */}
          <div className="relative h-8 bg-black/5 rounded-lg border-2 border-black overflow-hidden mb-5">
            {mode === 'over' && (
              <div
                className="absolute top-0 bottom-0 bg-[#CDFF57]/40"
                style={{ left: `${target}%`, right: 0 }}
              />
            )}
            {mode === 'under' && (
              <div
                className="absolute top-0 bottom-0 bg-[#CDFF57]/40"
                style={{ left: 0, width: `${target}%` }}
              />
            )}
            {mode === 'range' && (
              <div
                className="absolute top-0 bottom-0 bg-[#CDFF57]/40"
                style={{ left: `${rangeStart}%`, width: `${rangeEnd - rangeStart}%` }}
              />
            )}
            {/* result marker */}
            {result !== null && phase === 'result' && (
              <div
                className={cnm(
                  'absolute top-0 bottom-0 w-0.5',
                  won ? 'bg-black' : 'bg-[#FF6B9D]',
                )}
                style={{ left: `${result}%` }}
              />
            )}
            <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-mono text-black/30 pointer-events-none">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          {/* mode selector */}
          <div className="flex gap-2 mb-5">
            {(['over', 'under', 'range'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m)
                  setPhase('idle')
                  setResult(null)
                }}
                className={cnm(
                  'flex-1 py-3 text-xs font-black uppercase border-2 border-black rounded-xl transition-all',
                  mode === m
                    ? 'bg-black text-white'
                    : 'bg-white text-black/40 hover:text-black',
                )}
                style={mode === m ? { boxShadow: '3px 3px 0px #dcb865' } : undefined}
              >
                {m}
              </button>
            ))}
          </div>

          {/* target config */}
          <div className="mb-5">
            {mode === 'range' ? (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-mono text-black/50 mb-1">
                    <span>From</span>
                    <span className="font-black text-black">{rangeStart}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={rangeEnd - 1}
                    value={rangeStart}
                    onChange={(e) => setRangeStart(Number(e.target.value))}
                    className="w-full accent-black h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-mono text-black/50 mb-1">
                    <span>To</span>
                    <span className="font-black text-black">{rangeEnd}</span>
                  </div>
                  <input
                    type="range"
                    min={rangeStart + 1}
                    max={100}
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(Number(e.target.value))}
                    className="w-full accent-black h-2"
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between text-xs font-mono text-black/50 mb-1">
                  <span>{mode === 'over' ? `Roll > ${target}` : `Roll < ${target}`}</span>
                  <span className="font-black text-black">{target}</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={98}
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  className="w-full accent-black h-2"
                />
              </div>
            )}
          </div>

          {/* probability + payout stats */}
          <div className="grid grid-cols-2 gap-3 mb-5 p-4 rounded-xl bg-black/5 border-2 border-black/10">
            <div>
              <p className="text-[10px] font-mono text-black/50 uppercase">Win Chance</p>
              <p className="text-lg font-black text-black">
                {(winProbability * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] font-mono text-black/50 uppercase">Payout</p>
              <p className="text-lg font-black text-black">{payout.toFixed(2)}x</p>
            </div>
          </div>

          {/* controls */}
          <div className="border-t-2 border-black/10 pt-5">
            {phase !== 'rolling' && (
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
            )}

            {phase === 'idle' && (
              <button
                onClick={roll}
                className="w-full py-4 text-sm font-black uppercase bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1"
                style={{ boxShadow: '4px 4px 0px #dcb865' }}
              >
                Roll for {payout.toFixed(2)}x
              </button>
            )}

            {phase === 'rolling' && (
              <div className="w-full py-4 text-sm font-black uppercase text-center text-black/40">
                Rolling...
              </div>
            )}

            {phase === 'result' && (
              <button
                onClick={reset}
                className={cnm(
                  'w-full py-4 text-sm font-black uppercase border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1',
                  won ? 'bg-[#CDFF57] text-black' : 'bg-black text-white',
                )}
                style={{ boxShadow: `4px 4px 0px ${won ? 'black' : '#dcb865'}` }}
              >
                Roll Again
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <SdkPanel
          gameType="pick-number"
          description="Range uses the pick-number primitive. Player sets a target and predicts if the result lands over, under, or within a range. Payout scales inversely with win probability. Protocol enforces the math."
          tabs={SDK_TABS}
        />
      </div>
    </div>
  )
}
