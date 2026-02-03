import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function TestimonialsSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.testimonial-card',
        { y: 60, opacity: 0, rotateX: 15 },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.testimonials-grid',
            start: 'top 80%',
          },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  const testimonials = [
    {
      quote: 'Finally, a gambling protocol where the math is actually verifiable. No more trust issues.',
      author: 'anon_degen',
      role: 'Staker',
      apy: '+12.4%',
      num: '01',
    },
    {
      quote: 'Launched my coinflip game in 20 minutes. Already making passive income.',
      author: 'builder_chad',
      role: 'Builder',
      apy: '+$4.2k',
      num: '02',
    },
    {
      quote: 'Zero gas between bets? State channels are actually magic.',
      author: 'gambler_69',
      role: 'Player',
      apy: '-$200',
      num: '03',
    },
  ]

  return (
    <section
      ref={sectionRef}
      className="py-32 px-4 md:px-8 border-t relative overflow-hidden"
      style={{ backgroundColor: '#0b0d0b', borderColor: '#1a3d30' }}
    >
      {/* large quote mark */}
      <div
        className="absolute top-20 left-10 text-[20rem] font-serif leading-none pointer-events-none select-none"
        style={{ color: '#1a3d30', opacity: 0.15 }}
      >
        "
      </div>

      <div className="mx-auto max-w-6xl relative">
        <div className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-neutral-500 block mb-4">
              [005] What they say
            </span>
            <h2 className="text-4xl md:text-5xl font-black tracking-[-0.03em] text-neutral-100">Real feedback.</h2>
          </div>
          <p className="text-xs font-mono text-neutral-600">(actual quotes, names changed)</p>
        </div>

        <div className="testimonials-grid grid md:grid-cols-3 gap-4" style={{ perspective: '1000px' }}>
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="testimonial-card bg-neutral-950 p-8 flex flex-col relative group opacity-0 border border-neutral-800 hover:border-neutral-700"
            >
              {/* index */}
              <span className="absolute top-4 right-4 text-xs font-mono text-neutral-700">{t.num}</span>
              {/* giant quote */}
              <span className="text-6xl font-serif mb-4" style={{ color: '#1a3d30' }}>
                "
              </span>
              <p className="text-neutral-200 text-base leading-relaxed mb-8 flex-1">{t.quote}</p>
              <div className="flex items-center justify-between pt-6 border-t" style={{ borderColor: '#1a3d30' }}>
                <div>
                  <p className="text-neutral-100 font-bold text-sm">{t.author}</p>
                  <p className="text-neutral-500 font-mono text-xs">{t.role}</p>
                </div>
                <span
                  className="font-mono text-lg font-black tabular-nums"
                  style={{ color: t.apy.startsWith('-') ? '#b45555' : '#dcb865' }}
                >
                  {t.apy}
                </span>
              </div>
              {/* hover line */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                style={{ backgroundColor: '#dcb865' }}
              />
            </div>
          ))}
        </div>

        {/* bottom note */}
        <p className="mt-8 text-center text-xs font-mono text-neutral-600">
          Past performance does not guarantee future results. This is gambling, folks.
        </p>
      </div>
    </section>
  )
}
