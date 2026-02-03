import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

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
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.infra-item',
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.infra-grid',
            start: 'top 80%',
          },
        }
      )

      gsap.fromTo(
        '.infra-title',
        { y: 80, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
          },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

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
      <section ref={sectionRef} className="py-32 px-4 md:px-8 relative bg-[#EDEBE6]">
        <div className="mx-auto max-w-6xl relative">
          <div className="infra-title mb-16 opacity-0">
            <span className="text-xs font-black uppercase tracking-widest text-black/50 block mb-4">
              [006] Infrastructure
            </span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-black">THE TECH UNDER THE HOOD</h2>
          </div>

          <div className="infra-grid grid grid-cols-2 md:grid-cols-3 gap-5">
            {infra.map((item) => (
              <div
                key={item.name}
                className="infra-item bg-white p-6 rounded-2xl border-2 border-black flex items-center justify-between hover:translate-x-1 hover:translate-y-1 transition-transform duration-200 opacity-0"
                style={{ boxShadow: '5px 5px 0px black' }}
              >
                <span className="text-lg font-black text-black tracking-tight">{item.name}</span>
                <span className="text-xs font-mono text-black/60 px-3 py-1.5 border-2 border-black rounded-full bg-[#EDEBE6]">
                  {item.tech}
                </span>
              </div>
            ))}
          </div>

          {/* bottom note */}
          <div className="mt-8 flex items-center justify-center gap-4 text-xs font-mono text-black/50">
            <span className="w-8 h-px bg-black/20" />
            <span>Audited. Production-ready. Proven.</span>
            <span className="w-8 h-px bg-black/20" />
          </div>
        </div>
      </section>

      {/* diagonal cream-to-dark transition with marquee */}
      <div className="relative h-40 md:h-48">
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
        <div className="absolute inset-0 flex items-center pointer-events-none" style={{ transform: 'translateY(-10%)' }}>
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
