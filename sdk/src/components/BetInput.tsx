// bet amount selector, shows presets + custom input + half/2x/max

import { cnm } from '../utils'
import { formatUnits } from 'viem'

interface BetInputProps {
  value: string
  onChange: (value: string) => void
  maxBet: string // raw units (6 decimals)
  disabled?: boolean
  accentColor?: string
  onSound?: (sound: string) => void
}

export default function BetInput({ value, onChange, maxBet, disabled, accentColor = '#CDFF57', onSound }: BetInputProps) {
  const maxFormatted = parseFloat(formatUnits(BigInt(maxBet || '0'), 6))

  const allPresets = [1, 5, 10, 25, 50, 100, 250, 500]
  const presets = allPresets.filter(v => v <= maxFormatted).slice(0, 5)

  const clamp = (v: number) => Math.max(0.01, Math.min(maxFormatted, v))

  const handlePreset = (amt: number) => {
    onSound?.('click')
    onChange(String(amt))
  }

  const handleHalf = () => {
    onSound?.('click')
    const half = clamp(parseFloat(value) / 2)
    onChange(half % 1 === 0 ? String(half) : half.toFixed(2))
  }

  const handleDouble = () => {
    onSound?.('click')
    const doubled = clamp(parseFloat(value) * 2)
    onChange(doubled % 1 === 0 ? String(doubled) : doubled.toFixed(2))
  }

  const handleMax = () => {
    onSound?.('click')
    onChange(maxFormatted % 1 === 0 ? String(maxFormatted) : maxFormatted.toFixed(2))
  }

  return (
    <div className={cnm('flex flex-wrap items-center gap-2', disabled && 'opacity-40 pointer-events-none')}>
      <span className="text-[10px] font-mono text-black/40 uppercase shrink-0">Bet</span>

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
          USDH
        </span>
      </div>

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
