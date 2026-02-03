import { Link } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function FinalCTA() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.cta-card',
        { y: 100, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
          },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="py-24 px-4 md:px-8 bg-[#1A1A1A] -mt-px">
      <div className="mx-auto max-w-5xl">
        {/* main cta card */}
        <div
          className="cta-card p-8 md:p-16 rounded-3xl border-4 border-[#CDFF57] opacity-0"
          style={{ backgroundColor: '#1A1A1A' }}
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6">
            THE PITCH IN ONE BREATH
          </h2>
          <p className="text-lg md:text-xl text-white/70 leading-relaxed mb-10 max-w-3xl">
            House Protocol is a shared liquidity layer for on-chain gambling. Stakers deposit USDC or ETH and earn yield from house edge. Builders create games in minutes with a dead-simple SDK. Players get gasless, instant betting. Everyone can be the house.
          </p>
          <Link
            to="/app/stake"
            className="inline-flex px-10 py-5 bg-[#CDFF57] text-black text-sm font-black uppercase tracking-wide rounded-full border-2 border-black hover:translate-x-1 hover:translate-y-1 transition-transform duration-200"
            style={{ boxShadow: '4px 4px 0px black' }}
          >
            Launch App
          </Link>
        </div>

        {/* footer with polkadot pattern */}
        <div className="mt-16 py-12 md:py-16 px-6 md:px-10 border-t border-white/10 relative rounded-2xl overflow-hidden">
          {/* polkadot pattern overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle, #CDFF57 3px, transparent 3px), radial-gradient(circle, #FF6B9D 3px, transparent 3px)`,
              backgroundSize: '32px 32px',
              backgroundPosition: '0 0, 16px 16px',
              opacity: 0.15,
            }}
          />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-block px-4 py-2 bg-[#EDEBE6] text-black font-black text-lg tracking-tight mb-4">
                HOUSE PROTOCOL
              </div>
              <p className="text-xs font-mono text-white/40">
                Built with Yellow Network & Circle CCTP.
                <br />
                ETHGlobal 2025.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-black text-white underline hover:no-underline"
              >
                Twitter
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-black text-white underline hover:no-underline"
              >
                GitHub
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-black text-white underline hover:no-underline"
              >
                Discord
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
