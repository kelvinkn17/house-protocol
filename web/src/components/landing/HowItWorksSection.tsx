import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Link } from '@tanstack/react-router'

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
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.steps-container',
            start: 'top 80%',
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
    {
      num: '1.',
      title: 'STAKE & EARN LIKE THE HOUSE',
      desc: 'Deposit USDC into the House Vault. Your money becomes the casino\'s bankroll. When players lose (and statistically, they do), you earn.',
      cta: 'View Vaults',
      to: '/app/stake',
    },
    {
      num: '2.',
      title: 'BUILD WITHOUT THE BANK',
      desc: 'Connect to House Protocol\'s shared liquidity. No need to fund your own bankroll. Just build the game, plug into the vault, and launch.',
      cta: 'Start Building',
      to: '/build',
    },
  ]

  return (
    <>
      {/* diagonal transition with integrated marquee */}
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
            <DiagonalMarquee label="HOW IT WORKS" direction="left" />
          </div>
        </div>
      </div>

      <section ref={sectionRef} className="py-24 px-4 md:px-8 relative bg-[#1A1A1A] -mt-px">
        <div className="mx-auto max-w-6xl relative">
          <div className="how-title mb-16 opacity-0">
            <span className="text-xs font-black uppercase tracking-widest text-white/40 block mb-4">
              THE SOLUTION: HOUSE PROTOCOL
            </span>
            <p className="text-[#FF6B9D] font-mono text-sm">// FLIP THE SCRIPT</p>
          </div>

          <div className="border-t border-white/20 pt-16">
            <div className="steps-container grid md:grid-cols-2 gap-px bg-white/10">
              {steps.map((step, i) => (
                <div
                  key={step.num}
                  className={`step-item bg-[#1A1A1A] p-8 md:p-12 flex flex-col opacity-0 ${i === 0 ? '' : 'md:border-l border-white/10'}`}
                >
                  <span className="text-[8rem] md:text-[10rem] font-black leading-none text-[#FF6B9D] mb-4">
                    {step.num}
                  </span>
                  <h3 className="text-xl font-black text-white mb-4 tracking-tight uppercase">
                    {step.title}
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed mb-8 flex-1">{step.desc}</p>
                  <Link
                    to={step.to}
                    className="inline-flex self-start px-8 py-4 bg-[#CDFF57] text-black text-sm font-black uppercase tracking-wide rounded-full border-2 border-black hover:translate-x-1 hover:translate-y-1 transition-transform duration-200"
                    style={{ boxShadow: '4px 4px 0px black' }}
                  >
                    {step.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* diagonal dark-to-cream transition at bottom with GAME PRIMITIVES marquee */}
      <div className="relative h-52 md:h-60">
        {/* dark background */}
        <div className="absolute inset-0 bg-[#1A1A1A]" />
        {/* diagonal cream background */}
        <div
          className="absolute inset-0 bg-[#EDEBE6]"
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
            <DiagonalMarquee label="GAME PRIMITIVES" direction="right" />
          </div>
        </div>
      </div>
    </>
  )
}
