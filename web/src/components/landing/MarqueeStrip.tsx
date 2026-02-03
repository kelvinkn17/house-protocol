export default function MarqueeStrip() {
  const items = [
    'ZERO GAS',
    'PROVABLY FAIR',
    'YIELD BEARING',
    'CROSS-CHAIN',
    'STATE CHANNELS',
    'ERC-4626',
    'CHAINLINK VRF',
    'NO RUGS',
    'INSTANT SETTLE',
    'SHARED LIQUIDITY',
  ]

  return (
    <div
      className="relative border-y overflow-hidden"
      style={{ borderColor: '#1a3d30', backgroundColor: 'rgba(11, 13, 11, 0.95)' }}
    >
      {/* gradient edges */}
      <div className="absolute left-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-r from-[#0b0d0b] to-transparent" />
      <div className="absolute right-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-l from-[#0b0d0b] to-transparent" />

      <div className="py-5 overflow-hidden">
        <div className="flex animate-marquee">
          {[...items, ...items, ...items, ...items].map((item, i) => (
            <span
              key={`top-${i}`}
              className="shrink-0 mx-10 text-sm font-mono font-bold uppercase tracking-[0.25em] text-neutral-500 whitespace-nowrap"
            >
              {item}
              <span className="ml-10" style={{ color: '#1a3d30' }}>
                ◆
              </span>
            </span>
          ))}
        </div>
      </div>
      <div className="py-5 overflow-hidden border-t" style={{ borderColor: '#1a3d30' }}>
        <div className="flex animate-marquee-reverse">
          {[...items, ...items, ...items, ...items].map((item, i) => (
            <span
              key={`btm-${i}`}
              className="shrink-0 mx-10 text-sm font-mono font-bold uppercase tracking-[0.25em] text-neutral-600 whitespace-nowrap"
            >
              {item}
              <span className="ml-10" style={{ color: '#1a3d30' }}>
                ◇
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
