import AnimateComponent from '@/components/elements/AnimateComponent'

const DIAGONAL_ANGLE = -7

// polkadot pattern for section dividers
function PolkaDots({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: `radial-gradient(circle, currentColor 2px, transparent 2px)`,
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  )
}

export default function InfraSection() {
  const infra = [
    { name: 'VAULTS', tech: 'ERC-4626' },
    { name: 'RANDOMNESS', tech: 'Chainlink VRF' },
    { name: 'STATE CHANNELS', tech: 'Yellow Network' },
    { name: 'BRIDGE', tech: 'Circle CCTP v2' },
    { name: 'FRONTEND', tech: 'TanStack Start' },
    { name: 'DATABASE', tech: 'Prisma + PG' },
  ]

  return (
    <>
      <section className="py-32 px-4 md:px-8 relative bg-[#EDEBE6]">
        <div className="mx-auto max-w-6xl relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {infra.map((item, i) => (
              <AnimateComponent key={item.name} onScroll delay={200 + i * 70}>
                <div
                  className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-black flex items-center justify-between gap-3 hover:translate-x-1 hover:translate-y-1 transition-transform duration-200"
                  style={{ boxShadow: '5px 5px 0px black' }}
                >
                  <span className="text-base sm:text-lg font-black text-black tracking-tight">{item.name}</span>
                  <span className="text-xs font-mono text-black/60 px-3 py-1.5 border-2 border-black rounded-full bg-[#EDEBE6] shrink-0">
                    {item.tech}
                  </span>
                </div>
              </AnimateComponent>
            ))}
          </div>

          <AnimateComponent onScroll variant="fadeIn" delay={600}>
            <div className="mt-8 flex items-center justify-center gap-4 text-xs font-mono text-black/50">
              <span className="w-8 h-px bg-black/20" />
              <span>Audited. Production-ready. Proven.</span>
              <span className="w-8 h-px bg-black/20" />
            </div>
          </AnimateComponent>
        </div>
      </section>

      {/* diagonal cream-to-dark transition */}
      <div className="relative h-40 md:h-52 overflow-hidden">
        {/* cream background */}
        <div className="absolute inset-0 bg-[#EDEBE6]" />
        {/* diagonal dark background */}
        <div
          className="absolute bg-[#1A1A1A]"
          style={{
            left: '-25%',
            right: '-25%',
            top: '50%',
            height: '150%',
            transformOrigin: 'center top',
            transform: `rotate(${DIAGONAL_ANGLE}deg)`,
          }}
        />
        {/* polkadots on the diagonal strip */}
        <div
          className="absolute"
          style={{
            left: '-25%',
            right: '-25%',
            top: '50%',
            height: '60px',
            transformOrigin: 'center top',
            transform: `rotate(${DIAGONAL_ANGLE}deg) translateY(-50%)`,
          }}
        >
          <PolkaDots className="text-white" />
        </div>
        {/* centered title badge */}
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimateComponent onScroll variant="fadeInUp">
            <div
              className="bg-white text-black px-8 sm:px-12 md:px-16 py-4 sm:py-5 md:py-6 rounded-full border-3 border-black font-black text-xl sm:text-2xl md:text-4xl uppercase tracking-tight"
              style={{
                boxShadow: '6px 6px 0px rgba(0,0,0,0.4)',
                transform: `rotate(${DIAGONAL_ANGLE}deg)`,
              }}
            >
              The Pitch
            </div>
          </AnimateComponent>
        </div>
      </div>
    </>
  )
}
