import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SectionDivider from './SectionDivider'

gsap.registerPlugin(ScrollTrigger)

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.step-item',
        { y: 80, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.steps-container',
            start: 'top 80%',
          },
        }
      )

      gsap.fromTo(
        '.step-line',
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.steps-container',
            start: 'top 75%',
          },
        }
      )

      gsap.fromTo(
        '.how-title',
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

  const steps = [
    { num: '1', title: 'Connect', desc: 'Link wallet', icon: '○' },
    { num: '2', title: 'Open', desc: '1 transaction', icon: '◇' },
    { num: '3', title: 'Play', desc: 'Zero gas', icon: '△' },
    { num: '4', title: 'Close', desc: 'Withdraw', icon: '□' },
  ]

  return (
    <>
      <SectionDivider label="HOW IT WORKS" />
      <section ref={sectionRef} className="py-32 px-4 md:px-8 relative" style={{ backgroundColor: '#0b0d0b' }}>
        {/* asymmetric bg element */}
        <div className="absolute top-20 right-0 w-1/3 h-[80%] opacity-[0.02]" style={{ backgroundColor: '#dcb865' }} />

        <div className="mx-auto max-w-6xl relative">
          <div className="how-title mb-20 flex flex-col md:flex-row md:items-end md:justify-between gap-8 opacity-0">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-neutral-500 block mb-4">
                [003] How it works
              </span>
              <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-[-0.03em] text-neutral-100">
                4 steps.
              </h2>
              <h2
                className="text-5xl md:text-7xl lg:text-8xl font-black tracking-[-0.03em] italic"
                style={{ color: '#dcb865', opacity: 0.5 }}
              >
                That is it.
              </h2>
            </div>
            <p className="max-w-sm text-sm text-neutral-400 font-mono leading-relaxed md:text-right">
              State channels let you play unlimited rounds with just 2 on-chain transactions.
            </p>
          </div>

          <div className="steps-container relative">
            <div
              className="step-line absolute top-[72px] left-[10%] right-[10%] h-px origin-left hidden md:block scale-x-0"
              style={{ backgroundColor: '#1a3d30' }}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-6">
              {steps.map((step, i) => (
                <div
                  key={step.num}
                  className="step-item relative group opacity-0"
                  style={{ marginTop: i % 2 === 1 ? '2rem' : '0' }}
                >
                  <div
                    className="w-36 h-36 border bg-neutral-950 flex flex-col items-center justify-center mb-8 relative z-10 transition-all duration-300 group-hover:border-neutral-500"
                    style={{ borderColor: '#1a3d30' }}
                  >
                    <span className="text-2xl text-neutral-600 mb-2 group-hover:text-[#dcb865] transition-colors">
                      {step.icon}
                    </span>
                    <span className="text-4xl font-black" style={{ color: '#dcb865' }}>
                      {step.num}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-neutral-100 mb-2 tracking-tight">{step.title}</h3>
                  <p className="text-sm text-neutral-400 font-mono">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* decorative arrow */}
          <div
            className="hidden md:block absolute -bottom-8 left-1/2 -translate-x-1/2 text-4xl"
            style={{ color: '#1a3d30' }}
          >
            ↓
          </div>
        </div>
      </section>
    </>
  )
}
