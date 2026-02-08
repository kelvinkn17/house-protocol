import AnimateComponent from '@/components/elements/AnimateComponent'
import AnimatedText from '@/components/elements/AnimatedText'

export default function GamePrimitivesSection() {

  const primitives = [
    { type: 'CASH OUT', example: 'Crash, Double or Nothing', desc: 'Bail before crash', live: true },
    { type: 'PICK NUMBER', example: 'Dice, Range', desc: 'Over/under target', live: true },
    { type: 'REVEAL TILES', example: 'Mines, Tower', desc: 'Avoid the bombs', live: true },
  ]

  return (
    <section className="py-32 px-4 md:px-8 relative bg-[#EDEBE6] -mt-px">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
          <div>
            <AnimateComponent onScroll variant="fadeInUp">
              <span className="text-xs font-black uppercase tracking-widest text-black/50 block mb-4">
                [004] Game Primitives
              </span>
            </AnimateComponent>
            <h2 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight text-black overflow-hidden">
              <AnimatedText text="Pre-built mechanics." delay={100} stagger={25} onScroll />
            </h2>
          </div>
          <AnimateComponent onScroll variant="fadeInUp" delay={350}>
            <p className="max-w-sm text-black/60 font-mono text-sm leading-relaxed lg:text-right">
              Builders configure, not code. Protocol enforces payout math. No custom logic allowed.
            </p>
          </AnimateComponent>
        </div>

        {/* grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {primitives.map((p, i) => (
            <AnimateComponent key={p.type} onScroll delay={400 + i * 80}>
              <div
                className="group bg-white p-6 md:p-8 rounded-2xl border-2 border-black cursor-pointer relative overflow-hidden shadow-[6px_6px_0px_black] hover:translate-x-[6px] hover:translate-y-[6px] hover:shadow-none transition-all duration-150"
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

                {/* hover right bar */}
                <div className="absolute top-0 right-0 bottom-0 w-12 flex items-center justify-center translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out bg-[#CDFF57] border-l-2 border-black">
                  <span className="text-xs font-black uppercase tracking-wider -rotate-90 whitespace-nowrap text-black">
                    Use this →
                  </span>
                </div>
              </div>
            </AnimateComponent>
          ))}
        </div>

        <AnimateComponent onScroll variant="fadeInUp" delay={800}>
          <div
            className="mt-10 p-6 bg-white rounded-2xl border-2 border-black"
            style={{ boxShadow: '6px 6px 0px black' }}
          >
            <p className="text-sm font-mono text-black/80">
              <span className="text-[#FF6B9D] font-black">Payout formula:</span> (1 / winProbability) × (1 - houseEdge)
            </p>
            <p className="text-xs font-mono text-black/50 mt-2">Always enforced. No exceptions.</p>
          </div>
        </AnimateComponent>
      </div>
    </section>
  )
}
