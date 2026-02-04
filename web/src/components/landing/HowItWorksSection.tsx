import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import AnimateComponent from '@/components/elements/AnimateComponent'

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

// calculates the angle for the diagonal based on container dimensions
function useDiagonalAngle(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [angle, setAngle] = useState(-6)

  useEffect(() => {
    const updateAngle = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      // atan(height/width) gives us the angle of the diagonal
      const radians = Math.atan(rect.height / rect.width)
      const degrees = (radians * 180) / Math.PI
      setAngle(-degrees)
    }

    updateAngle()
    window.addEventListener('resize', updateAngle)
    return () => window.removeEventListener('resize', updateAngle)
  }, [containerRef])

  return angle
}

export default function HowItWorksSection() {
  const topTransitionRef = useRef<HTMLDivElement>(null)
  const bottomTransitionRef = useRef<HTMLDivElement>(null)
  const topAngle = useDiagonalAngle(topTransitionRef)
  const bottomAngle = useDiagonalAngle(bottomTransitionRef)

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
      <div ref={topTransitionRef} className="relative h-52 md:h-60" style={{ clipPath: 'inset(0)' }}>
        {/* cream background */}
        <div className="absolute inset-0 bg-[#EDEBE6]" />
        {/* diagonal dark background */}
        <div
          className="absolute inset-0 bg-[#1A1A1A]"
          style={{
            clipPath: 'polygon(0 100%, 100% 0%, 100% 100%, 0% 100%)',
          }}
        />
        {/* diagonal marquee strip, pivot from left, crop right */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: 0,
            bottom: 0,
            width: '200vw',
            transformOrigin: 'bottom left',
            transform: `rotate(${topAngle}deg)`,
          }}
        >
          {/* shift up 50% so marquee center sits on the diagonal line */}
          <div style={{ transform: 'translateY(-50%)' }}>
            <DiagonalMarquee label="HOW IT WORKS" direction="left" />
          </div>
        </div>
      </div>

      <section className="py-24 px-4 md:px-8 relative bg-[#1A1A1A] -mt-px">
        <div className="mx-auto max-w-6xl relative">
          <AnimateComponent onScroll variant="fadeInUp">
            <div className="mb-16">
              <span className="text-xs font-black uppercase tracking-widest text-white/40 block mb-4">
                THE SOLUTION: HOUSE PROTOCOL
              </span>
              <p className="text-[#FF6B9D] font-mono text-sm">// FLIP THE SCRIPT</p>
            </div>
          </AnimateComponent>

          <div className="border-t border-white/20 pt-16">
            <div className="grid md:grid-cols-2 gap-px bg-white/10">
              {steps.map((step, i) => (
                <AnimateComponent key={step.num} onScroll delay={100 + i * 150}>
                  <div
                    className={`bg-[#1A1A1A] p-8 md:p-12 flex flex-col ${i === 0 ? '' : 'md:border-l border-white/10'}`}
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
                </AnimateComponent>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* diagonal dark-to-cream transition at bottom with GAME PRIMITIVES marquee */}
      <div ref={bottomTransitionRef} className="relative h-52 md:h-60" style={{ clipPath: 'inset(0)' }}>
        {/* dark background */}
        <div className="absolute inset-0 bg-[#1A1A1A]" />
        {/* diagonal cream background */}
        <div
          className="absolute inset-0 bg-[#EDEBE6]"
          style={{
            clipPath: 'polygon(0 100%, 100% 0%, 100% 100%, 0% 100%)',
          }}
        />
        {/* diagonal marquee strip, pivot from left, crop right */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: 0,
            bottom: 0,
            width: '200vw',
            transformOrigin: 'bottom left',
            transform: `rotate(${bottomAngle}deg)`,
          }}
        >
          <div style={{ transform: 'translateY(-50%)' }}>
            <DiagonalMarquee label="GAME PRIMITIVES" direction="right" />
          </div>
        </div>
      </div>
    </>
  )
}
