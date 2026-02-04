import AnimateComponent from '@/components/elements/AnimateComponent'
import AnimatedText from '@/components/elements/AnimatedText'

function DiagonalMarquee({ label, direction = 'left' }: { label: string; direction?: 'left' | 'right' }) {
  const items = Array.from({ length: 30 }).map((_, i) => (
    <span
      key={i}
      className="shrink-0 mx-10 text-lg font-black uppercase tracking-widest text-[#CDFF57] whitespace-nowrap"
    >
      {label}
      <span className="ml-10 text-[#FF6B9D]">✦</span>
    </span>
  ))

  return (
    <div className="py-4 bg-black">
      <div className={`flex ${direction === 'left' ? 'animate-marquee' : 'animate-marquee-reverse'}`}>
        {items}
      </div>
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
          <div className="mb-16">
            <AnimateComponent onScroll variant="fadeInUp">
              <span className="text-xs font-black uppercase tracking-widest text-black/50 block mb-4">
                [006] Infrastructure
              </span>
            </AnimateComponent>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-black overflow-hidden">
              <AnimatedText text="THE TECH UNDER THE HOOD" delay={100} stagger={20} onScroll />
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {infra.map((item, i) => (
              <AnimateComponent key={item.name} onScroll delay={200 + i * 70}>
                <div
                  className="bg-white p-6 rounded-2xl border-2 border-black flex items-center justify-between hover:translate-x-1 hover:translate-y-1 transition-transform duration-200"
                  style={{ boxShadow: '5px 5px 0px black' }}
                >
                  <span className="text-lg font-black text-black tracking-tight">{item.name}</span>
                  <span className="text-xs font-mono text-black/60 px-3 py-1.5 border-2 border-black rounded-full bg-[#EDEBE6]">
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

      {/* diagonal cream-to-dark transition with marquee */}
      <div className="relative h-52 md:h-60">
        {/* cream background */}
        <div className="absolute inset-0 bg-[#EDEBE6]" />
        {/* diagonal dark background */}
        <div
          className="absolute inset-0 bg-[#1A1A1A]"
          style={{
            clipPath: 'polygon(0 100%, 100% 0%, 100% 100%, 0% 100%)',
          }}
        />
        {/* diagonal marquee strip */}
        <div className="absolute inset-0 flex items-center pointer-events-none">
          <div
            className="w-[200vw] -ml-[50vw]"
            style={{
              transform: 'skewY(-6deg)',
            }}
          >
            <DiagonalMarquee label="THE PITCH" direction="right" />
          </div>
        </div>
      </div>
    </>
  )
}
