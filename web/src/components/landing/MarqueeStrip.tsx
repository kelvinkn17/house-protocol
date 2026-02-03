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
    <div className="relative bg-black overflow-hidden border-y-4 border-black">
      <div className="py-4 overflow-hidden">
        <div className="flex animate-marquee">
          {[...items, ...items, ...items, ...items].map((item, i) => (
            <span
              key={`top-${i}`}
              className="shrink-0 mx-8 text-sm font-black uppercase tracking-widest text-[#CDFF57] whitespace-nowrap"
            >
              {item}
              <span className="ml-8 text-[#FF6B9D]">✦</span>
            </span>
          ))}
        </div>
      </div>
      <div className="py-4 overflow-hidden border-t-2 border-[#333]">
        <div className="flex animate-marquee-reverse">
          {[...items, ...items, ...items, ...items].map((item, i) => (
            <span
              key={`btm-${i}`}
              className="shrink-0 mx-8 text-sm font-black uppercase tracking-widest text-[#FF6B9D] whitespace-nowrap"
            >
              {item}
              <span className="ml-8 text-[#CDFF57]">✦</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
