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
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
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
    <section ref={sectionRef} className="py-32 px-4 md:px-8 relative bg-[#EDEBE6]">
      <div className="mx-auto max-w-6xl relative">
        <div className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-black/50 block mb-4">
              [005] What they say
            </span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-black">Real feedback.</h2>
          </div>
          <p className="text-xs font-mono text-black/50">(actual quotes, names changed)</p>
        </div>

        <div className="testimonials-grid grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.num}
              className={`testimonial-card ${t.color} p-8 flex flex-col rounded-2xl border-2 border-black opacity-0 hover:translate-x-1 hover:translate-y-1 transition-transform duration-200`}
              style={{ boxShadow: '6px 6px 0px black' }}
            >
              {/* index */}
              <span className="text-xs font-mono text-black/40 mb-4">{t.num}</span>
              {/* giant quote */}
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
          ))}
        </div>

        {/* bottom note */}
        <p className="mt-8 text-center text-xs font-mono text-black/50">
          Past performance does not guarantee future results. This is gambling, folks.
        </p>
      </div>
    </section>
  )
}
