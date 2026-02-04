import AnimateComponent from '@/components/elements/AnimateComponent'
import AnimatedText from '@/components/elements/AnimatedText'

export default function TestimonialsSection() {
  const testimonials = [
    {
      quote: 'Finally, a gambling protocol where the math is actually verifiable. No more trust issues.',
      author: 'anon_degen',
      role: 'Staker',
      apy: '+12.4%',
      num: '01',
      color: 'bg-white',
    },
    {
      quote: 'Launched my coinflip game in 20 minutes. Already making passive income.',
      author: 'builder_chad',
      role: 'Builder',
      apy: '+$4.2k',
      num: '02',
      color: 'bg-[#CDFF57]',
    },
    {
      quote: 'Zero gas between bets? State channels are actually magic.',
      author: 'gambler_69',
      role: 'Player',
      apy: '-$200',
      num: '03',
      color: 'bg-[#FF6B9D]',
    },
  ]

  return (
    <section className="py-32 px-4 md:px-8 relative bg-[#EDEBE6]">
      <div className="mx-auto max-w-6xl relative">
        <div className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <AnimateComponent onScroll variant="fadeInUp">
              <span className="text-xs font-black uppercase tracking-widest text-black/50 block mb-4">
                [005] What they say
              </span>
            </AnimateComponent>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-black overflow-hidden">
              <AnimatedText text="Real feedback." delay={100} stagger={25} onScroll />
            </h2>
          </div>
          <AnimateComponent onScroll variant="fadeIn" delay={300}>
            <p className="text-xs font-mono text-black/50">(actual quotes, names changed)</p>
          </AnimateComponent>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <AnimateComponent key={t.num} onScroll delay={200 + i * 100}>
              <div
                className={`${t.color} p-8 flex flex-col rounded-2xl border-2 border-black hover:translate-x-1 hover:translate-y-1 transition-transform duration-200`}
                style={{ boxShadow: '6px 6px 0px black' }}
              >
                <span className="text-xs font-mono text-black/40 mb-4">{t.num}</span>
                <span className="text-6xl font-serif mb-4 text-black/30">"</span>
                <p className="text-black/80 text-base leading-relaxed mb-8 flex-1">{t.quote}</p>
                <div className="flex items-center justify-between pt-6 border-t border-black/20">
                  <div>
                    <p className="text-black font-black text-sm">{t.author}</p>
                    <p className="text-black/50 font-mono text-xs">{t.role}</p>
                  </div>
                  <span
                    className="font-mono text-lg font-black tabular-nums"
                    style={{ color: t.apy.startsWith('-') ? '#DC2626' : '#16A34A' }}
                  >
                    {t.apy}
                  </span>
                </div>
              </div>
            </AnimateComponent>
          ))}
        </div>

        <AnimateComponent onScroll variant="fadeIn" delay={600}>
          <p className="mt-8 text-center text-xs font-mono text-black/50">
            Past performance does not guarantee future results. This is gambling, folks.
          </p>
        </AnimateComponent>
      </div>
    </section>
  )
}
