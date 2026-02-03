import { Link } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import StakerModel from './models/StakerModel'
import PlayerModel from './models/PlayerModel'
import BuilderModel from './models/BuilderModel'

gsap.registerPlugin(ScrollTrigger)

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'power4.out' },
        delay: 0.3,
      })

      // title lines stagger reveal
      const titleLines = leftRef.current?.querySelectorAll('.title-line')
      if (titleLines) {
        gsap.set(titleLines, { y: 120, opacity: 0, rotationX: 50 })
        tl.to(titleLines, {
          y: 0,
          opacity: 1,
          rotationX: 0,
          duration: 1.4,
          stagger: 0.1,
          ease: 'power4.out',
        })
      }

      gsap.set('.hero-sub', { y: 50, opacity: 0 })
      gsap.set('.hero-cta', { y: 40, opacity: 0 })

      tl.to('.hero-sub', { y: 0, opacity: 1, duration: 1 }, '-=0.8').to(
        '.hero-cta',
        { y: 0, opacity: 1, duration: 0.8 },
        '-=0.6'
      )

      // role cards cascade in
      gsap.set('.hero-role-card', { x: 80, opacity: 0, scale: 0.9 })
      tl.to(
        '.hero-role-card',
        {
          x: 0,
          opacity: 1,
          scale: 1,
          duration: 1,
          stagger: 0.12,
          ease: 'power3.out',
        },
        '-=1'
      )

      // parallax grid
      gsap.to(gridRef.current, {
        y: 150,
        ease: 'none',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1.5,
        },
      })
    }, containerRef)

    return () => ctx.revert()
  }, [])

  const heroRoles = [
    {
      title: 'STAKERS',
      tagline: 'be the house',
      desc: 'Deposit USDC/ETH, earn yield',
      to: '/app/stake',
      icon: '◆',
      num: '01',
      Model: StakerModel,
    },
    {
      title: 'PLAYERS',
      tagline: 'beat the house',
      desc: 'Play gasless, instant settlement',
      to: '/app/play',
      icon: '◇',
      num: '02',
      Model: PlayerModel,
    },
    {
      title: 'BUILDERS',
      tagline: 'become the house',
      desc: 'Deploy games, earn 25%',
      to: '/build',
      icon: '○',
      num: '03',
      Model: BuilderModel,
    },
  ]

  return (
    <section ref={containerRef} className="relative min-h-screen flex flex-col px-4 md:px-8 pt-24 pb-8 overflow-hidden">
      {/* grid bg */}
      <div ref={gridRef} className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, white 1px, transparent 1px),
              linear-gradient(to bottom, white 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      <FloatingBlocks />
      <SpinningGeo />

      <div className="mx-auto max-w-7xl w-full relative">
        {/* top bar decoration */}
        <div className="flex justify-between items-center text-[10px] font-mono text-neutral-600 tracking-[0.3em] mb-8">
          <span>[001]</span>
          <span className="hidden md:block">HOUSE//PROTOCOL</span>
          <span>2025</span>
        </div>

        {/* main hero content */}
        <div ref={leftRef} className="relative mb-10">
          {/* staggered artistic title */}
          <h1
            className="font-black tracking-[-0.05em] text-neutral-100 leading-[0.85] mb-6"
            style={{ fontSize: 'clamp(2.5rem, 8vw, 7rem)', perspective: '1000px' }}
          >
            <span className="title-line block overflow-hidden opacity-0">
              <span className="inline-block">EVERYONE</span>
            </span>
            <span
              className="title-line block overflow-hidden opacity-0"
              style={{ paddingLeft: 'clamp(1rem, 4vw, 4rem)' }}
            >
              <span className="inline-block">CAN BE</span>
            </span>
            <span
              className="title-line block overflow-hidden italic opacity-0"
              style={{ paddingLeft: 'clamp(2rem, 8vw, 8rem)', color: '#dcb865' }}
            >
              <span className="inline-block">THE HOUSE.</span>
            </span>
          </h1>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 lg:gap-12">
            <p className="hero-sub max-w-sm text-base md:text-lg text-neutral-400 font-mono leading-relaxed opacity-0">
              Shared liquidity for on-chain gambling.
              <br />
              <span className="text-neutral-100">Stake. Play. Build.</span>
              <span className="text-xs text-neutral-500 ml-2">(yes, really)</span>
            </p>

            <div className="hero-cta flex flex-col sm:flex-row gap-3 opacity-0">
              <Link
                to="/app/stake"
                className="group relative px-8 py-4 text-sm font-black uppercase tracking-[0.15em] overflow-hidden"
                style={{ backgroundColor: '#dcb865', color: '#0b0d0b' }}
              >
                <span className="relative z-10 group-hover:text-neutral-100 transition-colors duration-300">
                  Start Staking
                </span>
                <div
                  className="absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"
                  style={{ backgroundColor: '#0b0d0b' }}
                />
              </Link>
              <Link
                to="/build"
                className="group px-8 py-4 border text-neutral-100 text-sm font-black uppercase tracking-[0.15em] transition-colors duration-300 relative overflow-hidden border-neutral-700 hover:border-neutral-500"
              >
                <span className="relative z-10">Build a Game</span>
                <div
                  className="absolute bottom-0 left-0 w-full h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
                  style={{ backgroundColor: '#dcb865' }}
                />
              </Link>
            </div>
          </div>
        </div>

        {/* role cards */}
        <div>
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-4">
            <span>CHOOSE YOUR PATH</span>
            <div className="flex-1 h-px bg-neutral-700" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {heroRoles.map((role) => (
              <Link
                key={role.title}
                to={role.to}
                className="hero-role-card group relative border border-neutral-800 p-4 lg:p-5 hover:border-neutral-600 transition-all duration-300 bg-neutral-900/50 opacity-0 overflow-hidden"
              >
                <div className="flex items-start gap-4 relative z-10">
                  <div className="flex flex-col items-center shrink-0">
                    <span className="text-2xl text-neutral-700 group-hover:text-[#dcb865] transition-colors duration-300">
                      {role.icon}
                    </span>
                    <span className="text-[9px] font-mono text-neutral-700 mt-1">{role.num}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black tracking-tight text-neutral-100 mb-0.5 group-hover:text-white transition-colors">
                      {role.title}
                    </h3>
                    <p className="text-[10px] font-mono italic text-neutral-400 mb-1">{role.tagline}</p>
                    <p className="text-sm text-neutral-300 group-hover:text-neutral-200 transition-colors">
                      {role.desc}
                    </p>
                  </div>
                  <div className="flex items-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 shrink-0">
                    <span className="text-lg text-[#dcb865]">→</span>
                  </div>
                </div>
                {/* 3d model accent, more visible and less cropped */}
                <div className="absolute -bottom-4 -right-4 opacity-70 group-hover:opacity-90 transition-opacity duration-500 pointer-events-none">
                  <role.Model />
                </div>
                <div
                  className="absolute bottom-0 left-0 w-0 h-0.5 group-hover:w-full transition-all duration-500"
                  style={{ backgroundColor: '#dcb865' }}
                />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* scroll indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
        <span className="text-[8px] font-mono text-neutral-600 uppercase tracking-[0.4em]">scroll</span>
        <div className="relative w-px h-8">
          <div className="absolute inset-0 bg-linear-to-b from-neutral-500 to-transparent" />
          <div className="absolute top-0 w-full h-2 animate-scroll-down" style={{ backgroundColor: '#dcb865' }} />
        </div>
      </div>
    </section>
  )
}

// floating blocks decoration
function FloatingBlocks() {
  const blocksRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!blocksRef.current) return

    const blocks = blocksRef.current.querySelectorAll('.float-block')
    blocks.forEach((block, i) => {
      gsap.to(block, {
        y: `random(-25, 25)`,
        x: `random(-15, 15)`,
        rotation: `random(-8, 8)`,
        duration: `random(4, 7)`,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: i * 0.3,
      })
    })
  }, [])

  return (
    <div ref={blocksRef} className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="float-block absolute top-[12%] left-[8%] w-16 h-16 border border-neutral-800/50 opacity-20" />
      <div className="float-block absolute top-[22%] right-[12%] w-10 h-10 bg-neutral-800/30 opacity-15" />
      <div className="float-block absolute bottom-[35%] left-[15%] w-8 h-8 border border-neutral-700/50 opacity-20 rotate-45" />
      <div className="float-block absolute bottom-[25%] right-[8%] w-20 h-20 border border-neutral-800/30 opacity-10" />
      <div className="float-block absolute top-[45%] left-[3%] w-6 h-6 bg-neutral-700/30 opacity-25" />
    </div>
  )
}

// spinning geometric element
function SpinningGeo() {
  const geoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!geoRef.current) return

    gsap.to(geoRef.current, {
      rotation: 360,
      duration: 30,
      repeat: -1,
      ease: 'none',
    })

    gsap.to('.geo-inner', {
      rotation: -360,
      duration: 20,
      repeat: -1,
      ease: 'none',
    })
  }, [])

  return (
    <div
      ref={geoRef}
      className="absolute right-[5%] top-1/2 -translate-y-1/2 w-[280px] h-[280px] lg:w-[380px] lg:h-[380px] opacity-10 pointer-events-none hidden lg:block"
    >
      <div
        className="absolute inset-0 border border-neutral-700"
        style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
      />
      <div
        className="geo-inner absolute inset-8 border border-neutral-600"
        style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
      />
      <div
        className="absolute inset-16 border border-neutral-500"
        style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#dcb865' }} />
      </div>
    </div>
  )
}
