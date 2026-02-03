import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

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
    { type: 'PICK ONE', example: 'Coinflip', desc: 'Pick option, one wins' },
    { type: 'PICK NUMBER', example: 'Dice', desc: 'Over/under target' },
    { type: 'SPIN WHEEL', example: 'Roulette', desc: 'Land on segment' },
    { type: 'REVEAL TILES', example: 'Mines', desc: 'Avoid the bombs' },
    { type: 'CASH OUT', example: 'Crash', desc: 'Bail before crash' },
    { type: 'DEAL CARDS', example: 'Blackjack', desc: 'Beat the dealer' },
  ]

  return (
    <section ref={sectionRef} className="py-32 px-4 md:px-8 relative bg-[#EDEBE6] -mt-px">
        <div className="mx-auto max-w-6xl">
          <div className="primitives-title mb-16 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 opacity-0">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-black/50 block mb-4">
                [004] Game Primitives
              </span>
              <h2 className="text-5xl md:text-7xl font-black tracking-tight text-black mb-2">Pre-built</h2>
              <h2
                className="text-5xl md:text-7xl font-black tracking-tight"
                style={{
                  color: '#EDEBE6',
                  WebkitTextStroke: '2px black',
                  textShadow: '4px 4px 0px black',
                }}
              >
                mechanics.
              </h2>
            </div>
            <p className="max-w-sm text-black/60 font-mono text-sm leading-relaxed lg:text-right">
              Builders configure, not code. Protocol enforces payout math. No custom logic allowed.
            </p>
          </div>

          {/* grid */}
          <div className="primitives-grid grid grid-cols-2 md:grid-cols-3 gap-6">
            {primitives.map((p, i) => (
              <div
                key={p.type}
                className="primitive-card group bg-white p-6 md:p-8 rounded-2xl border-2 border-black cursor-pointer opacity-0 relative overflow-hidden hover:translate-x-1 hover:translate-y-1 transition-transform duration-200"
                style={{ boxShadow: '6px 6px 0px black' }}
              >
                <div className="h-full flex flex-col relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-xs font-mono text-black/40">0{i + 1}</span>
                  </div>
                  <div className="mt-auto">
                    <h3 className="text-xl md:text-2xl font-black tracking-tight text-black mb-2">{p.type}</h3>
                    <p className="text-sm text-black/60 font-mono mb-1">{p.desc}</p>
                    <p className="text-xs text-black/40 font-mono">e.g. {p.example}</p>
                  </div>
                </div>

                {/* hover right bar - "use this" overlay */}
                <div
                  className="absolute top-0 right-0 bottom-0 w-12 flex items-center justify-center translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out bg-[#CDFF57] border-l-2 border-black"
                >
                  <span className="text-xs font-black uppercase tracking-wider -rotate-90 whitespace-nowrap text-black">
                    Use this →
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-10 p-6 bg-white rounded-2xl border-2 border-black"
            style={{ boxShadow: '6px 6px 0px black' }}
          >
            <p className="text-sm font-mono text-black/80">
              <span className="text-[#FF6B9D] font-black">Payout formula:</span> (1 / winProbability) × (1 - houseEdge)
            </p>
            <p className="text-xs font-mono text-black/50 mt-2">Always enforced. No exceptions.</p>
          </div>
        </div>
      </section>
  )
}
