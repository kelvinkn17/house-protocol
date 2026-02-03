import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SectionDivider from './SectionDivider'

gsap.registerPlugin(ScrollTrigger)

export default function GamePrimitivesSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.primitive-card',
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.06,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.primitives-grid',
            start: 'top 80%',
          },
        }
      )

      gsap.fromTo(
        '.primitives-title',
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

  const primitives = [
    { type: 'PICK ONE', example: 'Coinflip', icon: '◐', desc: 'Pick option, one wins' },
    { type: 'PICK NUMBER', example: 'Dice', icon: '▣', desc: 'Over/under target' },
    { type: 'SPIN WHEEL', example: 'Roulette', icon: '◎', desc: 'Land on segment' },
    { type: 'REVEAL TILES', example: 'Mines', icon: '▦', desc: 'Avoid the bombs' },
    { type: 'CASH OUT', example: 'Crash', icon: '△', desc: 'Bail before crash' },
    { type: 'DEAL CARDS', example: 'Blackjack', icon: '◇', desc: 'Beat the dealer' },
  ]

  return (
    <>
      <SectionDivider label="GAME PRIMITIVES" />
      <section
        ref={sectionRef}
        className="py-32 px-4 md:px-8 relative"
        style={{ backgroundColor: 'rgba(26, 61, 48, 0.03)' }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="primitives-title mb-20 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 opacity-0">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-neutral-500 block mb-4">
                [004] Game Primitives
              </span>
              <h2 className="text-5xl md:text-7xl font-black tracking-[-0.03em] text-neutral-100 mb-4">Pre-built</h2>
              <h2 className="text-5xl md:text-7xl font-black tracking-[-0.03em] italic" style={{ color: '#1a3d30' }}>
                mechanics.
              </h2>
            </div>
            <p className="max-w-sm text-neutral-400 font-mono text-sm leading-relaxed lg:text-right">
              Builders configure, not code. Protocol enforces payout math. No custom logic allowed.
            </p>
          </div>

          {/* grid */}
          <div className="primitives-grid grid grid-cols-2 md:grid-cols-3 gap-4">
            {primitives.map((p, i) => (
              <div
                key={p.type}
                className="primitive-card group relative bg-neutral-950 p-6 md:p-8 transition-all duration-300 cursor-pointer overflow-hidden opacity-0 border border-neutral-800 hover:border-neutral-700"
              >
                <div className="h-full flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-4xl md:text-5xl text-neutral-700 group-hover:text-[#dcb865] transition-colors duration-300">
                      {p.icon}
                    </span>
                    <span className="text-[9px] font-mono text-neutral-700">0{i + 1}</span>
                  </div>
                  <div className="mt-auto">
                    <h3 className="text-lg md:text-xl font-black tracking-tight text-neutral-100 mb-2">{p.type}</h3>
                    <p className="text-xs text-neutral-400 font-mono mb-1">{p.desc}</p>
                    <p className="text-[10px] text-neutral-600 font-mono">e.g. {p.example}</p>
                  </div>
                </div>

                {/* hover right bar */}
                <div
                  className="absolute top-0 right-0 bottom-0 w-10 flex items-center justify-center translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out"
                  style={{ backgroundColor: '#dcb865' }}
                >
                  <span className="text-xs font-black uppercase tracking-[0.15em] -rotate-90 whitespace-nowrap" style={{ color: '#0b0d0b' }}>
                    Use this →
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-14 flex flex-col md:flex-row items-center justify-between gap-4 p-6 border"
            style={{ borderColor: '#1a3d30', backgroundColor: 'rgba(11, 13, 11, 0.8)' }}
          >
            <p className="text-xs font-mono text-neutral-400">
              <span style={{ color: '#dcb865' }}>Payout formula:</span> (1 / winProbability) × (1 - houseEdge)
            </p>
            <p className="text-xs font-mono text-neutral-600">Always enforced. No exceptions.</p>
          </div>
        </div>
      </section>
    </>
  )
}
