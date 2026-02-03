import { Link } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'power2.out' },
        delay: 0.15,
      })

      // title lines stagger reveal
      const titleLines = leftRef.current?.querySelectorAll('.title-line')
      if (titleLines) {
        gsap.set(titleLines, { y: 60, opacity: 0, rotationX: 20 })
        tl.to(titleLines, {
          y: 0,
          opacity: 1,
          rotationX: 0,
          duration: 1,
          stagger: 0.04,
          ease: 'power2.out',
        })
      }

      gsap.set('.hero-sub', { y: 25, opacity: 0 })
      gsap.set('.hero-cta', { y: 20, opacity: 0 })
      gsap.set('.hero-badge', { scale: 0, rotation: -15 })

      tl.to('.hero-sub', { y: 0, opacity: 1, duration: 0.8 }, '-=0.6')
        .to('.hero-cta', { y: 0, opacity: 1, duration: 0.7 }, '-=0.5')
        .to('.hero-badge', { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(1.7)' }, '-=0.3')

      // choose your path label, line, and cards together
      gsap.set('.path-label', { x: -20, opacity: 0 })
      gsap.set('.path-line', { scaleX: 0, transformOrigin: 'left' })
      gsap.set('.hero-role-card', { y: 40, opacity: 0 })

      const cardsStart = tl.duration() - 0.4
      tl.to('.path-label', { x: 0, opacity: 1, duration: 0.5 }, cardsStart)
        .to('.path-line', { scaleX: 1, duration: 0.6, ease: 'power1.out' }, cardsStart)
        .to(
          '.hero-role-card',
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.1,
            ease: 'power2.out',
          },
          cardsStart + 0.1
        )
    }, containerRef)

    return () => ctx.revert()
  }, [])

  const heroRoles = [
    {
      title: 'STAKERS',
      tagline: 'be the house',
      desc: 'Deposit USDC/ETH, earn yield from every bet placed on the protocol',
      to: '/app/stake',
      num: '01',
      color: 'bg-[#CDFF57]',
      textColor: 'text-black',
    },
    {
      title: 'PLAYERS',
      tagline: 'beat the house',
      desc: 'Play gasless with instant settlement via state channels',
      to: '/app/play',
      num: '02',
      color: 'bg-[#FF6B9D]',
      textColor: 'text-black',
    },
    {
      title: 'BUILDERS',
      tagline: 'become the house',
      desc: 'Deploy games with no code, earn 25% of house edge',
      to: '/build',
      num: '03',
      color: 'bg-white',
      textColor: 'text-black',
    },
  ]

  return (
    <section ref={containerRef} className="relative min-h-screen flex flex-col px-4 md:px-8 pt-20 pb-16 overflow-hidden bg-[#EDEBE6]">
      {/* pink starburst badge */}
      <div className="hero-badge absolute top-24 right-8 md:right-16 lg:right-24 opacity-0">
        <div className="relative">
          <svg viewBox="0 0 100 100" className="w-24 h-24 md:w-32 md:h-32">
            <polygon
              points="50,0 61,35 97,35 68,57 79,91 50,70 21,91 32,57 3,35 39,35"
              fill="#FF6B9D"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] md:text-xs font-black text-black leading-tight text-center">
            HOUSE<br />ALWAYS<br />WINS
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl w-full relative">
        {/* main hero content */}
        <div ref={leftRef} className="relative mb-16">
          {/* staggered artistic title */}
          <h1
            className="font-black tracking-[-0.04em] text-black leading-[0.9] mb-8"
            style={{ fontSize: 'clamp(3rem, 10vw, 9rem)', perspective: '1000px' }}
          >
            <span className="title-line block overflow-hidden opacity-0">
              <span className="inline-block">EVERYONE</span>
            </span>
            <span className="title-line block overflow-hidden opacity-0">
              <span className="inline-block">CAN BE THE</span>
            </span>
            <span className="title-line block overflow-hidden opacity-0">
              {/* white text with comic shadow effect */}
              <span
                className="inline-block relative"
                style={{
                  color: 'white',
                  WebkitTextStroke: '3px black',
                  textShadow: '6px 6px 0px black',
                }}
              >
                HOUSE.
              </span>
            </span>
          </h1>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 lg:gap-12">
            <div className="flex flex-col gap-4">
              <p className="hero-sub max-w-md text-base md:text-lg text-black/70 font-mono leading-relaxed opacity-0">
                ** Yield from real probability, not inflation.
              </p>
              <div className="hero-cta opacity-0">
                {/* tilted pill with shadow */}
                <Link
                  to="/app/stake"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#CDFF57] text-black text-sm font-black uppercase tracking-wide rounded-full hover:scale-105 transition-transform duration-200 border-2 border-black"
                  style={{
                    transform: 'rotate(-2deg)',
                    boxShadow: '4px 4px 0px black',
                  }}
                >
                  ETHGlobal 2025
                  <span className="w-2 h-2 rounded-full bg-black" />
                </Link>
              </div>
            </div>

            <div className="hero-cta flex flex-col sm:flex-row gap-3 opacity-0">
              <Link
                to="/app/stake"
                className="group px-8 py-4 bg-black text-white text-sm font-black uppercase tracking-wide rounded-full hover:translate-x-1 hover:translate-y-1 transition-transform duration-200"
                style={{ boxShadow: '4px 4px 0px #FF6B9D' }}
              >
                Start Staking
              </Link>
              <Link
                to="/build"
                className="group px-8 py-4 border-2 border-black bg-white text-black text-sm font-black uppercase tracking-wide rounded-full hover:translate-x-1 hover:translate-y-1 transition-transform duration-200"
                style={{ boxShadow: '4px 4px 0px black' }}
              >
                Build a Game
              </Link>
            </div>
          </div>
        </div>

        {/* role cards */}
        <div>
          <div className="text-xs font-mono text-black/50 uppercase tracking-widest mb-6 flex items-center gap-4">
            <span className="path-label opacity-0">CHOOSE YOUR PATH</span>
            <div className="path-line flex-1 h-px bg-black/20 scale-x-0" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {heroRoles.map((role) => (
              <Link
                key={role.title}
                to={role.to}
                className={`hero-role-card group relative ${role.color} ${role.textColor} p-6 lg:p-8 rounded-2xl border-2 border-black hover:translate-x-1 hover:translate-y-1 transition-transform duration-200 opacity-0 min-h-[180px] md:min-h-[200px]`}
                style={{ boxShadow: '6px 6px 0px black' }}
              >
                <div className="flex flex-col h-full relative">
                  {/* header row */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="text-xs font-mono opacity-60">{role.num}</span>
                      <h3 className="text-2xl lg:text-3xl font-black tracking-tight">
                        {role.title}
                      </h3>
                      <p className="text-sm font-mono opacity-70">{role.tagline}</p>
                    </div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <span className="text-2xl">→</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm opacity-80 leading-relaxed">
                      {role.desc}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

    </section>
  )
}
