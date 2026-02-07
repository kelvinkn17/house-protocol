// bet amount selector for games, shows presets + custom input + half/2x/max
// each game embeds this in their controls area

import { cnm } from '@/utils/style'
import { useSound } from '@/providers/SoundProvider'
import { formatUnits } from 'viem'

interface BetInputProps {
  value: string
  onChange: (value: string) => void
  maxBet: string // raw units (6 decimals)
  disabled?: boolean
  accentColor?: string
}

export default function BetInput({ value, onChange, maxBet, disabled, accentColor = '#CDFF57' }: BetInputProps) {
  const { play } = useSound()
  const maxFormatted = parseFloat(formatUnits(BigInt(maxBet || '0'), 6))

  // dynamic presets based on max bet
  const allPresets = [1, 5, 10, 25, 50, 100, 250, 500]
  const presets = allPresets.filter(v => v <= maxFormatted).slice(0, 5)

  const clamp = (v: number) => Math.max(0.01, Math.min(maxFormatted, v))

  const handlePreset = (amt: number) => {
    play('click')
    onChange(String(amt))
  }

  const handleHalf = () => {
    play('click')
    const half = clamp(parseFloat(value) / 2)
    onChange(half % 1 === 0 ? String(half) : half.toFixed(2))
  }

  const handleDouble = () => {
    play('click')
    const doubled = clamp(parseFloat(value) * 2)
    onChange(doubled % 1 === 0 ? String(doubled) : doubled.toFixed(2))
  }

  const handleMax = () => {
    play('click')
    onChange(maxFormatted % 1 === 0 ? String(maxFormatted) : maxFormatted.toFixed(2))
  }

  return (
    <div className={cnm('flex flex-wrap items-center gap-2', disabled && 'opacity-40 pointer-events-none')}>
      <span className="text-[10px] font-mono text-black/40 uppercase shrink-0">Bet</span>

      {/* presets */}
      <div className="flex gap-1">
        {presets.map(amt => (
          <button
            key={amt}
            onClick={() => handlePreset(amt)}
            className={cnm(
              'px-2 py-1 text-[11px] font-black border-2 border-black rounded-lg transition-all',
              value === String(amt)
                ? 'text-black'
                : 'bg-white text-black/50 hover:text-black',
            )}
            style={value === String(amt) ? { backgroundColor: `${accentColor}40`, boxShadow: `2px 2px 0px ${accentColor}` } : undefined}
          >
            {amt}
          </button>
        ))}
      </div>

      {/* custom input */}
      <div className="flex items-center border-2 border-black rounded-lg overflow-hidden">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-16 px-2 py-1 text-[11px] font-black text-black bg-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          min="0.01"
          max={maxFormatted}
          step="0.01"
        />
        <span className="px-1.5 py-1 text-[9px] font-mono text-black/40 bg-black/5 border-l-2 border-black flex items-center gap-0.5">
          <img src="/assets/images/usdh.png" alt="" className="w-3.5 h-3.5 rounded-full" />
          USDH
        </span>
      </div>

      {/* half / 2x / max */}
      <div className="flex gap-1 ml-auto">
        <button
          onClick={handleHalf}
          className="px-2 py-1 text-[10px] font-black text-black/40 bg-black/5 border border-black/15 rounded-md hover:text-black hover:bg-black/10 transition-colors"
        >
          &frac12;
        </button>
        <button
          onClick={handleDouble}
          className="px-2 py-1 text-[10px] font-black text-black/40 bg-black/5 border border-black/15 rounded-md hover:text-black hover:bg-black/10 transition-colors"
        >
          2x
        </button>
        <button
          onClick={handleMax}
          className="px-2 py-1 text-[10px] font-black text-black/40 bg-black/5 border border-black/15 rounded-md hover:text-black hover:bg-black/10 transition-colors"
        >
          MAX
        </button>
      </div>
    </div>
  )
}
