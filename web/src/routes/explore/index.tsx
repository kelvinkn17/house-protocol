import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import * as THREE from 'three'

gsap.registerPlugin(ScrollTrigger)

// shared colors for 3d models
const GOLD = 0xcbad6d
const DARK_GOLD = 0x8a7440

export const Route = createFileRoute('/explore/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden selection:bg-[#dcb865] selection:text-[#0b0d0b] relative" style={{ backgroundColor: '#0b0d0b' }}>
      {/* noise texture overlay for brutalist authenticity */}
      <div
        className="fixed inset-0 pointer-events-none z-[100] opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      <HeroSection />
      <MarqueeStrip />
      <StatsSection />
      <RolesSection />
      <HowItWorksSection />
      <GamePrimitivesSection />
      <TestimonialsSection />
      <InfraSection />
      <FinalCTA />
    </div>
  )
}

// hero with split layout
function HeroSection() {
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

      tl.to('.hero-sub', { y: 0, opacity: 1, duration: 1 }, '-=0.8')
        .to('.hero-cta', { y: 0, opacity: 1, duration: 0.8 }, '-=0.6')

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
      to: '/explore/app/stake',
      icon: '◆',
      num: '01',
      Model: StakerModel,
    },
    {
      title: 'PLAYERS',
      tagline: 'beat the house',
      desc: 'Play gasless, instant settlement',
      to: '/explore/app/play',
      icon: '◇',
      num: '02',
      Model: PlayerModel,
    },
    {
      title: 'BUILDERS',
      tagline: 'become the house',
      desc: 'Deploy games, earn 25%',
      to: '/explore/build',
      icon: '○',
      num: '03',
      Model: BuilderModel,
    },
  ]

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex flex-col px-4 md:px-8 pt-24 pb-8 overflow-hidden"
    >
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
            <span className="title-line block overflow-hidden opacity-0" style={{ paddingLeft: 'clamp(1rem, 4vw, 4rem)' }}>
              <span className="inline-block">CAN BE</span>
            </span>
            <span className="title-line block overflow-hidden italic opacity-0" style={{ paddingLeft: 'clamp(2rem, 8vw, 8rem)', color: '#dcb865' }}>
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
                to="/explore/app/stake"
                className="group relative px-8 py-4 text-sm font-black uppercase tracking-[0.15em] overflow-hidden"
                style={{ backgroundColor: '#dcb865', color: '#0b0d0b' }}
              >
                <span className="relative z-10 group-hover:text-neutral-100 transition-colors duration-300">
                  Start Staking
                </span>
                <div className="absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" style={{ backgroundColor: '#0b0d0b' }} />
              </Link>
              <Link
                to="/explore/build"
                className="group px-8 py-4 border text-neutral-100 text-sm font-black uppercase tracking-[0.15em] transition-colors duration-300 relative overflow-hidden border-neutral-700 hover:border-neutral-500"
              >
                <span className="relative z-10">Build a Game</span>
                <div className="absolute bottom-0 left-0 w-full h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" style={{ backgroundColor: '#dcb865' }} />
              </Link>
            </div>
          </div>
        </div>

        {/* role cards - right below hero */}
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
                    <span className="text-[9px] font-mono text-neutral-700 mt-1">
                      {role.num}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black tracking-tight text-neutral-100 mb-0.5 group-hover:text-white transition-colors">
                      {role.title}
                    </h3>
                    <p className="text-[10px] font-mono italic text-neutral-400 mb-1">
                      {role.tagline}
                    </p>
                    <p className="text-sm text-neutral-300 group-hover:text-neutral-200 transition-colors">
                      {role.desc}
                    </p>
                  </div>
                  <div className="flex items-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 shrink-0">
                    <span className="text-lg text-[#dcb865]">→</span>
                  </div>
                </div>
                {/* 3d model accent */}
                <div className="absolute -bottom-8 -right-8 opacity-40 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none">
                  <role.Model />
                </div>
                <div className="absolute bottom-0 left-0 w-0 h-0.5 group-hover:w-full transition-all duration-500" style={{ backgroundColor: '#dcb865' }} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* scroll indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
        <span className="text-[8px] font-mono text-neutral-600 uppercase tracking-[0.4em]">
          scroll
        </span>
        <div className="relative w-px h-8">
          <div className="absolute inset-0 bg-linear-to-b from-neutral-500 to-transparent" />
          <div className="absolute top-0 w-full h-2 animate-scroll-down" style={{ backgroundColor: '#dcb865' }} />
        </div>
      </div>
    </section>
  )
}

// floating blocks
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
      <div className="absolute inset-0 border border-neutral-700" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
      <div className="geo-inner absolute inset-8 border border-neutral-600" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
      <div className="absolute inset-16 border border-neutral-500" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#dcb865' }} />
      </div>
    </div>
  )
}

// double marquee
function MarqueeStrip() {
  const items = [
    'ZERO GAS',
    'PROVABLY FAIR',
    'YIELD BEARING',
    'CROSS-CHAIN',
    'STATE CHANNELS',
    'ERC-4626',
    'CHAINLINK VRF',
    'NO RUGS',
    'INSTANT SETTLE',
    'SHARED LIQUIDITY',
  ]

  return (
    <div className="relative border-y overflow-hidden" style={{ borderColor: '#1a3d30', backgroundColor: 'rgba(11, 13, 11, 0.95)' }}>
      {/* gradient edges */}
      <div className="absolute left-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-r from-[#0b0d0b] to-transparent" />
      <div className="absolute right-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-l from-[#0b0d0b] to-transparent" />

      <div className="py-5 overflow-hidden">
        <div className="flex animate-marquee">
          {[...items, ...items, ...items, ...items].map((item, i) => (
            <span
              key={`top-${i}`}
              className="shrink-0 mx-10 text-sm font-mono font-bold uppercase tracking-[0.25em] text-neutral-500 whitespace-nowrap"
            >
              {item}
              <span className="ml-10" style={{ color: '#1a3d30' }}>◆</span>
            </span>
          ))}
        </div>
      </div>
      <div className="py-5 overflow-hidden border-t" style={{ borderColor: '#1a3d30' }}>
        <div className="flex animate-marquee-reverse">
          {[...items, ...items, ...items, ...items].map((item, i) => (
            <span
              key={`btm-${i}`}
              className="shrink-0 mx-10 text-sm font-mono font-bold uppercase tracking-[0.25em] text-neutral-600 whitespace-nowrap"
            >
              {item}
              <span className="ml-10" style={{ color: '#1a3d30' }}>◇</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// stats section
function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 85%',
        onEnter: () => setHasAnimated(true),
      })

      gsap.fromTo(
        '.stat-item',
        { y: 80, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
          },
        }
      )

      gsap.fromTo(
        '.stats-label',
        { x: -50, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 1,
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

  const stats = [
    { value: 2.4, prefix: '$', suffix: 'M', label: 'TVL', note: 'locked up, earning' },
    { value: 18.7, prefix: '$', suffix: 'M', label: 'VOLUME', note: 'wagered total' },
    { value: 342, prefix: '', suffix: '', label: 'SESSIONS', note: 'gasless rounds' },
    { value: 27, prefix: '', suffix: '', label: 'GAMES', note: 'live on protocol' },
  ]

  return (
    <section ref={sectionRef} className="py-28 px-4 md:px-8 relative" style={{ backgroundColor: '#0b0d0b' }}>
      {/* large bg text */}
      <div className="absolute top-1/2 -translate-y-1/2 left-0 text-[20vw] font-black text-neutral-900/30 leading-none pointer-events-none select-none tracking-tighter">
        STATS
      </div>

      <div className="mx-auto max-w-6xl relative">
        <div className="stats-label mb-8 flex items-center gap-4 opacity-0">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-neutral-500">
            [001.5] Live numbers
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: '#1a3d30' }} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="stat-item bg-neutral-950 p-8 md:p-10 flex flex-col group hover:bg-neutral-900/50 transition-colors duration-500 relative overflow-hidden opacity-0 border border-neutral-800 hover:border-neutral-700"
            >
              {/* index marker */}
              <span className="absolute top-4 right-4 text-[9px] font-mono text-neutral-700">
                0{i + 1}
              </span>
              <span className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4 tabular-nums" style={{ color: '#dcb865' }}>
                {stat.prefix}
                <CountUp
                  end={stat.value}
                  decimals={stat.suffix === 'M' ? 1 : 0}
                  shouldAnimate={hasAnimated}
                />
                {stat.suffix}
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-neutral-300 mb-2">
                {stat.label}
              </span>
              <span className="text-xs text-neutral-500 font-mono">{stat.note}</span>
              {/* bottom accent line */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" style={{ backgroundColor: '#dcb865' }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// count up
function CountUp({
  end,
  decimals = 0,
  shouldAnimate,
}: {
  end: number
  decimals?: number
  shouldAnimate: boolean
}) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!shouldAnimate) return

    let startTime: number
    const duration = 2200

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      setValue(eased * end)
      if (progress < 1) requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
  }, [end, shouldAnimate])

  return <>{value.toFixed(decimals)}</>
}

// roles section
function RolesSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray('.role-card') as Element[]

      cards.forEach((card, i) => {
        gsap.fromTo(
          card,
          { y: 120, opacity: 0, rotateY: 15 },
          {
            y: 0,
            opacity: 1,
            rotateY: 0,
            duration: 1.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 90%',
            },
            delay: i * 0.08,
          }
        )
      })

      gsap.fromTo(
        '.roles-title',
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

  const roles = [
    {
      number: '01',
      title: 'STAKERS',
      tagline: 'be the house',
      description:
        'Deposit USDC or ETH into the House Vault. Get yield-bearing tokens. When players lose, you earn. When they win, you lose a little. On average? The house always wins.',
      perks: ['Passive yield from house edge', 'Withdraw anytime', 'hUSDC / hETH tokens'],
      cta: 'Stake Now',
      to: '/explore/app/stake',
      icon: '◆',
    },
    {
      number: '02',
      title: 'PLAYERS',
      tagline: 'beat the house (try)',
      description:
        'Open a session with one transaction. Play unlimited rounds with zero gas. State channels mean your bets resolve instantly. Close when you are done.',
      perks: ['2 transactions total', 'Unlimited rounds', 'Provably fair RNG'],
      cta: 'Play Now',
      to: '/explore/app/play',
      icon: '◇',
    },
    {
      number: '03',
      title: 'BUILDERS',
      tagline: 'become the house',
      description:
        'Pick a game primitive. Configure it (no code). Deploy to your domain. Earn 25% of every bet. You are the house now.',
      perks: ['No code required', 'Your branding', '25% revenue share'],
      cta: 'Build Now',
      to: '/explore/build',
      icon: '○',
    },
  ]

  return (
    <section ref={sectionRef} className="py-32 px-4 md:px-8 relative" style={{ backgroundColor: 'rgba(11, 13, 11, 0.95)' }}>
      {/* asymmetric bg block */}
      <div className="absolute top-0 left-0 w-1/4 h-full opacity-[0.015]" style={{ backgroundColor: '#dcb865' }} />

      <div className="mx-auto max-w-6xl relative">
        <div className="roles-title mb-20 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 opacity-0">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-neutral-500 block mb-4">
              [002] Three ways in
            </span>
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-[-0.03em] text-neutral-100">
              Pick your
            </h2>
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-[-0.03em] italic" style={{ color: '#dcb865' }}>
              side.
            </h2>
          </div>
          <p className="max-w-xs text-neutral-500 font-mono text-sm lg:text-right">
            Or play all three.
            <br />
            <span className="text-neutral-400">We do not judge.</span>
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4" style={{ perspective: '1000px' }}>
          {roles.map((role) => (
            <div
              key={role.number}
              className="role-card group relative bg-neutral-950 p-8 transition-all duration-500 opacity-0 border border-neutral-800 hover:border-neutral-700"
            >
              {/* watermark number */}
              <span className="absolute -top-6 -right-2 text-[9rem] font-black leading-none pointer-events-none select-none transition-colors duration-500 text-neutral-900/40 group-hover:text-[#1a3d30]/40">
                {role.number}
              </span>

              {/* top bar */}
              <div className="flex items-center justify-between mb-8">
                <span className="text-3xl text-neutral-700 group-hover:text-[#dcb865] transition-colors duration-300">
                  {role.icon}
                </span>
                <span className="text-[9px] font-mono text-neutral-700 uppercase tracking-widest">
                  role.{role.number}
                </span>
              </div>

              <div className="relative">
                <h3 className="text-2xl md:text-3xl font-black tracking-tight text-neutral-100 mb-1 group-hover:text-white transition-colors">
                  {role.title}
                </h3>
                <p className="text-sm font-mono italic text-neutral-500 mb-8 group-hover:text-neutral-400 transition-colors">
                  {role.tagline}
                </p>

                <p className="text-neutral-300 text-sm leading-relaxed mb-8">
                  {role.description}
                </p>

                <ul className="space-y-3 mb-10">
                  {role.perks.map((perk, j) => (
                    <li key={perk} className="flex items-center gap-3 text-sm text-neutral-400">
                      <span className="w-1.5 h-1.5 transition-colors duration-300" style={{ backgroundColor: '#1a3d30' }} />
                      <span className="group-hover:text-neutral-300 transition-colors" style={{ transitionDelay: `${j * 50}ms` }}>
                        {perk}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={role.to}
                  className="group/btn block w-full py-4 text-center border text-sm font-black uppercase tracking-[0.15em] text-neutral-100 transition-all duration-300 relative overflow-hidden"
                  style={{ borderColor: '#1a3d30' }}
                >
                  <span className="relative z-10 group-hover/btn:text-[#0b0d0b] transition-colors duration-300">
                    {role.cta}
                  </span>
                  <div className="absolute inset-0 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" style={{ backgroundColor: '#dcb865' }} />
                </Link>
              </div>

              {/* bottom accent */}
              <div className="absolute bottom-0 left-0 right-0 h-1 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" style={{ backgroundColor: '#dcb865' }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// dramatic separator
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="relative py-4 overflow-hidden" style={{ backgroundColor: '#1a3d30' }}>
      <div className="flex animate-marquee">
        {Array.from({ length: 20 }).map((_, i) => (
          <span
            key={i}
            className="shrink-0 mx-8 text-xs font-mono font-bold uppercase tracking-[0.3em] text-black/40 whitespace-nowrap"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

// how it works
function HowItWorksSection() {
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
              <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-[-0.03em] italic" style={{ color: '#dcb865', opacity: 0.5 }}>
                That is it.
              </h2>
            </div>
            <p className="max-w-sm text-sm text-neutral-400 font-mono leading-relaxed md:text-right">
              State channels let you play unlimited rounds with just 2 on-chain transactions.
            </p>
          </div>

          <div className="steps-container relative">
            <div className="step-line absolute top-[72px] left-[10%] right-[10%] h-px origin-left hidden md:block scale-x-0" style={{ backgroundColor: '#1a3d30' }} />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-6">
              {steps.map((step, i) => (
                <div key={step.num} className="step-item relative group opacity-0" style={{ marginTop: i % 2 === 1 ? '2rem' : '0' }}>
                  <div className="w-36 h-36 border bg-neutral-950 flex flex-col items-center justify-center mb-8 relative z-10 transition-all duration-300 group-hover:border-neutral-500" style={{ borderColor: '#1a3d30' }}>
                    <span className="text-2xl text-neutral-600 mb-2 group-hover:text-[#dcb865] transition-colors">
                      {step.icon}
                    </span>
                    <span className="text-4xl font-black" style={{ color: '#dcb865' }}>{step.num}</span>
                  </div>
                  <h3 className="text-xl font-black text-neutral-100 mb-2 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-sm text-neutral-400 font-mono">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* decorative arrow */}
          <div className="hidden md:block absolute -bottom-8 left-1/2 -translate-x-1/2 text-4xl" style={{ color: '#1a3d30' }}>
            ↓
          </div>
        </div>
      </section>
    </>
  )
}

// game primitives with bento layout
function GamePrimitivesSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.primitive-card',
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.06,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.primitives-grid',
            start: 'top 80%',
          },
        }
      )

      gsap.fromTo(
        '.primitives-title',
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

  const primitives = [
    { type: 'PICK ONE', example: 'Coinflip', icon: '◐', desc: 'Pick option, one wins' },
    { type: 'PICK NUMBER', example: 'Dice', icon: '▣', desc: 'Over/under target' },
    { type: 'SPIN WHEEL', example: 'Roulette', icon: '◎', desc: 'Land on segment' },
    { type: 'REVEAL TILES', example: 'Mines', icon: '▦', desc: 'Avoid the bombs' },
    { type: 'CASH OUT', example: 'Crash', icon: '△', desc: 'Bail before crash' },
    { type: 'DEAL CARDS', example: 'Blackjack', icon: '◇', desc: 'Beat the dealer' },
  ]

  return (
    <>
      <SectionDivider label="GAME PRIMITIVES" />
      <section ref={sectionRef} className="py-32 px-4 md:px-8 relative" style={{ backgroundColor: 'rgba(26, 61, 48, 0.03)' }}>
        <div className="mx-auto max-w-6xl">
          <div className="primitives-title mb-20 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 opacity-0">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-neutral-500 block mb-4">
                [004] Game Primitives
              </span>
              <h2 className="text-5xl md:text-7xl font-black tracking-[-0.03em] text-neutral-100 mb-4">
                Pre-built
              </h2>
              <h2 className="text-5xl md:text-7xl font-black tracking-[-0.03em] italic" style={{ color: '#1a3d30' }}>
                mechanics.
              </h2>
            </div>
            <p className="max-w-sm text-neutral-400 font-mono text-sm leading-relaxed lg:text-right">
              Builders configure, not code. Protocol enforces payout math. No custom logic allowed.
            </p>
          </div>

          {/* grid */}
          <div className="primitives-grid grid grid-cols-2 md:grid-cols-3 border border-neutral-800">
            {primitives.map((p, i) => (
              <div
                key={p.type}
                className={`primitive-card group relative bg-neutral-950 p-6 md:p-8 transition-all duration-300 cursor-pointer overflow-hidden opacity-0 border-neutral-800 ${
                  i % 3 !== 2 ? 'md:border-r' : ''
                } ${i < 3 ? 'md:border-b' : ''} ${i % 2 === 0 ? 'border-r md:border-r-0' : ''} ${i < 4 ? 'border-b md:border-b-0' : ''}`}
              >
                <div className="h-full flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-4xl md:text-5xl text-neutral-700 group-hover:text-[#dcb865] transition-colors duration-300">
                      {p.icon}
                    </span>
                    <span className="text-[9px] font-mono text-neutral-700">
                      0{i + 1}
                    </span>
                  </div>
                  <div className="mt-auto">
                    <h3 className="text-lg md:text-xl font-black tracking-tight text-neutral-100 mb-2">
                      {p.type}
                    </h3>
                    <p className="text-xs text-neutral-400 font-mono mb-1">{p.desc}</p>
                    <p className="text-[10px] text-neutral-600 font-mono">e.g. {p.example}</p>
                  </div>
                </div>

                {/* hover right bar */}
                <div className="absolute top-0 right-0 bottom-0 w-10 flex items-center justify-center translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" style={{ backgroundColor: '#dcb865' }}>
                  <span className="text-xs font-black uppercase tracking-[0.15em] -rotate-90 whitespace-nowrap" style={{ color: '#0b0d0b' }}>
                    Use this →
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col md:flex-row items-center justify-between gap-4 p-6 border" style={{ borderColor: '#1a3d30', backgroundColor: 'rgba(11, 13, 11, 0.8)' }}>
            <p className="text-xs font-mono text-neutral-400">
              <span style={{ color: '#dcb865' }}>Payout formula:</span> (1 / winProbability) × (1 - houseEdge)
            </p>
            <p className="text-xs font-mono text-neutral-600">
              Always enforced. No exceptions.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

// testimonials / social proof
function TestimonialsSection() {
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
    <section ref={sectionRef} className="py-32 px-4 md:px-8 border-t relative overflow-hidden" style={{ backgroundColor: '#0b0d0b', borderColor: '#1a3d30' }}>
      {/* large quote mark */}
      <div className="absolute top-20 left-10 text-[20rem] font-serif leading-none pointer-events-none select-none" style={{ color: '#1a3d30', opacity: 0.15 }}>
        "
      </div>

      <div className="mx-auto max-w-6xl relative">
        <div className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-neutral-500 block mb-4">
              [005] What they say
            </span>
            <h2 className="text-4xl md:text-5xl font-black tracking-[-0.03em] text-neutral-100">
              Real feedback.
            </h2>
          </div>
          <p className="text-xs font-mono text-neutral-600">
            (actual quotes, names changed)
          </p>
        </div>

        <div className="testimonials-grid grid md:grid-cols-3 gap-4" style={{ perspective: '1000px' }}>
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="testimonial-card bg-neutral-950 p-8 flex flex-col relative group opacity-0 border border-neutral-800 hover:border-neutral-700"
            >
              {/* index */}
              <span className="absolute top-4 right-4 text-xs font-mono text-neutral-700">
                {t.num}
              </span>
              {/* giant quote */}
              <span className="text-6xl font-serif mb-4" style={{ color: '#1a3d30' }}>"</span>
              <p className="text-neutral-200 text-base leading-relaxed mb-8 flex-1">
                {t.quote}
              </p>
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
              <div className="absolute bottom-0 left-0 right-0 h-1 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" style={{ backgroundColor: '#dcb865' }} />
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

// infrastructure
function InfraSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.infra-item',
        { y: 50, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.infra-grid',
            start: 'top 80%',
          },
        }
      )

      gsap.fromTo(
        '.infra-title',
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

      // connection lines animation
      gsap.fromTo(
        '.connect-line',
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.infra-grid',
            start: 'top 75%',
          },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  const infra = [
    { name: 'Yellow Network', desc: 'State channels for gasless bets', tag: 'L2', icon: '⬡' },
    { name: 'Chainlink VRF', desc: 'Verifiable random outcomes', tag: 'RNG', icon: '◎' },
    { name: 'Circle CCTP', desc: 'Cross-chain USDC deposits', tag: 'BRIDGE', icon: '◈' },
    { name: 'ERC-4626', desc: 'Standard yield vault', tag: 'VAULT', icon: '▣' },
  ]

  return (
    <>
      <SectionDivider label="INFRASTRUCTURE" />
      <section ref={sectionRef} className="py-32 px-4 md:px-8 relative overflow-hidden" style={{ backgroundColor: '#0b0d0b' }}>
        {/* tech grid bg */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at center, #dcb865 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="mx-auto max-w-6xl relative">
          <div className="infra-title mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-8 opacity-0">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-neutral-500 block mb-4">
                [006] Infrastructure
              </span>
              <h2 className="text-4xl md:text-6xl font-black tracking-[-0.03em] text-neutral-100">
                Built on
              </h2>
              <h2 className="text-4xl md:text-6xl font-black tracking-[-0.03em]" style={{ color: '#1a3d30' }}>
                giants.
              </h2>
            </div>
            <p className="max-w-xs text-xs font-mono text-neutral-500 md:text-right leading-relaxed">
              Battle-tested protocols.
              <br />
              <span className="text-neutral-400">No reinventing the wheel.</span>
            </p>
          </div>

          {/* connection visualization */}
          <div className="relative mb-12 hidden md:block">
            <div className="flex justify-between items-center">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1a3d30' }} />
              <div className="connect-line flex-1 h-px origin-left mx-4 scale-x-0" style={{ backgroundColor: '#1a3d30' }} />
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#dcb865' }} />
              <div className="connect-line flex-1 h-px origin-left mx-4 scale-x-0" style={{ backgroundColor: '#1a3d30' }} />
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1a3d30' }} />
              <div className="connect-line flex-1 h-px origin-left mx-4 scale-x-0" style={{ backgroundColor: '#1a3d30' }} />
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1a3d30' }} />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-mono text-neutral-600 bg-[#0b0d0b] px-4">
              connected
            </div>
          </div>

          <div className="infra-grid grid grid-cols-2 md:grid-cols-4 gap-4">
            {infra.map((item, i) => (
              <div
                key={item.name}
                className="infra-item bg-neutral-950 p-6 md:p-8 group relative overflow-hidden opacity-0 border border-neutral-800 hover:border-neutral-700"
              >
                {/* index */}
                <span className="absolute top-4 right-4 text-[9px] font-mono text-neutral-700">
                  0{i + 1}
                </span>

                {/* icon */}
                <span className="text-4xl mb-6 block text-neutral-700 group-hover:text-[#dcb865] transition-colors duration-300">
                  {item.icon}
                </span>

                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] px-3 py-1.5 inline-block mb-5 transition-colors text-neutral-500 group-hover:text-[#dcb865]" style={{ backgroundColor: '#1a3d30' }}>
                  {item.tag}
                </span>
                <h3 className="text-lg font-black text-neutral-100 mb-2 tracking-tight group-hover:text-white transition-colors">
                  {item.name}
                </h3>
                <p className="text-xs text-neutral-500 font-mono group-hover:text-neutral-400 transition-colors">
                  {item.desc}
                </p>

                {/* hover accent */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" style={{ backgroundColor: '#dcb865' }} />
              </div>
            ))}
          </div>

          {/* bottom note */}
          <div className="mt-8 flex items-center justify-center gap-4 text-xs font-mono text-neutral-600">
            <span className="w-8 h-px" style={{ backgroundColor: '#1a3d30' }} />
            <span>Audited. Production-ready. Proven.</span>
            <span className="w-8 h-px" style={{ backgroundColor: '#1a3d30' }} />
          </div>
        </div>
      </section>
    </>
  )
}

// 3d model for stakers, crystal vault gem
function StakerModel() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const w = 140
    const h = 140

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    camera.position.set(0, 0.5, 5)

    // lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.3))
    const key = new THREE.DirectionalLight(0xffffff, 0.8)
    key.position.set(3, 4, 5)
    scene.add(key)
    const rim = new THREE.DirectionalLight(GOLD, 0.4)
    rim.position.set(-3, -2, 3)
    scene.add(rim)
    const point = new THREE.PointLight(GOLD, 0.5, 10)
    point.position.set(0, 2, 3)
    scene.add(point)

    // outer octahedron wireframe
    const outerGeo = new THREE.OctahedronGeometry(1.3, 0)
    const outerMat = new THREE.MeshBasicMaterial({
      color: GOLD,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    })
    const outer = new THREE.Mesh(outerGeo, outerMat)
    scene.add(outer)

    // middle octahedron solid
    const midGeo = new THREE.OctahedronGeometry(1.0, 0)
    const midMat = new THREE.MeshPhongMaterial({
      color: 0x1a1a1a,
      emissive: DARK_GOLD,
      emissiveIntensity: 0.15,
      transparent: true,
      opacity: 0.6,
      shininess: 120,
      specular: new THREE.Color(GOLD),
    })
    const mid = new THREE.Mesh(midGeo, midMat)
    scene.add(mid)

    // inner cube core
    const innerGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55)
    const innerMat = new THREE.MeshPhongMaterial({
      color: GOLD,
      emissive: DARK_GOLD,
      emissiveIntensity: 0.3,
      shininess: 200,
      specular: new THREE.Color(0xffffff),
    })
    const inner = new THREE.Mesh(innerGeo, innerMat)
    scene.add(inner)

    // particles
    const particleGeo = new THREE.BufferGeometry()
    const pCount = 40
    const pPos = new Float32Array(pCount * 3)
    for (let i = 0; i < pCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 1.8 + Math.random() * 0.5
      pPos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pPos[i * 3 + 2] = r * Math.cos(phi)
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    const particleMat = new THREE.PointsMaterial({ color: GOLD, size: 0.03, transparent: true, opacity: 0.5 })
    const particles = new THREE.Points(particleGeo, particleMat)
    scene.add(particles)

    let animationId: number
    const animate = (t: number) => {
      const time = t * 0.001
      outer.rotation.y = time * 0.3
      outer.rotation.x = time * 0.15
      mid.rotation.y = -time * 0.2
      mid.rotation.x = time * 0.1
      inner.rotation.y = time * 0.5
      inner.rotation.x = time * 0.25
      inner.position.y = Math.sin(time * 1.2) * 0.05
      particles.rotation.y = time * 0.08
      particles.rotation.x = time * 0.04
      renderer.render(scene, camera)
      animationId = requestAnimationFrame(animate)
    }
    animationId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationId)
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={containerRef} className="w-[140px] h-[140px]" />
}

// 3d model for players, dynamic icosahedron
function PlayerModel() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const w = 140
    const h = 140

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    camera.position.set(0, 0.3, 5)

    // lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.3))
    const key = new THREE.DirectionalLight(0xffffff, 0.8)
    key.position.set(3, 4, 5)
    scene.add(key)
    const rim = new THREE.DirectionalLight(GOLD, 0.4)
    rim.position.set(-3, -2, 3)
    scene.add(rim)
    const point = new THREE.PointLight(GOLD, 0.5, 10)
    point.position.set(0, 2, 3)
    scene.add(point)

    // main icosahedron
    const mainGeo = new THREE.IcosahedronGeometry(1.0, 0)
    const mainMat = new THREE.MeshPhongMaterial({
      color: 0x1a1a1a,
      emissive: DARK_GOLD,
      emissiveIntensity: 0.2,
      flatShading: true,
      shininess: 80,
      specular: new THREE.Color(GOLD),
    })
    const main = new THREE.Mesh(mainGeo, mainMat)
    scene.add(main)

    // wireframe overlay
    const wireGeo = new THREE.IcosahedronGeometry(1.15, 0)
    const wireMat = new THREE.MeshBasicMaterial({
      color: GOLD,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    })
    const wire = new THREE.Mesh(wireGeo, wireMat)
    scene.add(wire)

    // orbiting rings
    const rings: THREE.Mesh[] = []
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.TorusGeometry(1.5 + i * 0.15, 0.008, 8, 64)
      const ringMat = new THREE.MeshBasicMaterial({
        color: GOLD,
        transparent: true,
        opacity: 0.15 - i * 0.03,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = Math.PI / 2 + (i - 1) * 0.3
      ring.rotation.z = i * 0.5
      scene.add(ring)
      rings.push(ring)
    }

    // trail dots
    const trailGeo = new THREE.BufferGeometry()
    const tCount = 60
    const tPos = new Float32Array(tCount * 3)
    for (let i = 0; i < tCount; i++) {
      const angle = (i / tCount) * Math.PI * 2
      const r = 1.6
      tPos[i * 3] = Math.cos(angle) * r * (0.8 + Math.random() * 0.4)
      tPos[i * 3 + 1] = (Math.random() - 0.5) * 1.5
      tPos[i * 3 + 2] = Math.sin(angle) * r * (0.8 + Math.random() * 0.4)
    }
    trailGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3))
    const trailMat = new THREE.PointsMaterial({ color: GOLD, size: 0.025, transparent: true, opacity: 0.35 })
    const trail = new THREE.Points(trailGeo, trailMat)
    scene.add(trail)

    let animationId: number
    const animate = (t: number) => {
      const time = t * 0.001
      main.rotation.x = time * 0.6 + Math.sin(time * 2) * 0.15
      main.rotation.y = time * 0.8
      main.rotation.z = Math.sin(time * 1.5) * 0.1
      wire.rotation.x = main.rotation.x
      wire.rotation.y = main.rotation.y
      wire.rotation.z = main.rotation.z
      const pulse = 1 + Math.sin(time * 3) * 0.03
      main.scale.set(pulse, pulse, pulse)
      rings.forEach((ring, i) => {
        ring.rotation.z = time * (0.3 + i * 0.15) + i
        ring.rotation.x = Math.PI / 2 + Math.sin(time * 0.5 + i) * 0.4
      })
      trail.rotation.y = time * 0.15
      renderer.render(scene, camera)
      animationId = requestAnimationFrame(animate)
    }
    animationId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationId)
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={containerRef} className="w-[140px] h-[140px]" />
}

// 3d model for builders, assembling blocks
function BuilderModel() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const w = 140
    const h = 140

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    camera.position.set(0, 0.8, 5.5)

    // lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.3))
    const key = new THREE.DirectionalLight(0xffffff, 0.8)
    key.position.set(3, 4, 5)
    scene.add(key)
    const rim = new THREE.DirectionalLight(GOLD, 0.4)
    rim.position.set(-3, -2, 3)
    scene.add(rim)
    const point = new THREE.PointLight(GOLD, 0.5, 10)
    point.position.set(0, 2, 3)
    scene.add(point)

    const group = new THREE.Group()
    scene.add(group)

    // block positions
    const positions = [
      { x: 0, y: -0.7, z: 0, s: 0.45 },
      { x: 0.55, y: -0.7, z: 0, s: 0.35 },
      { x: -0.55, y: -0.7, z: 0, s: 0.35 },
      { x: 0.15, y: -0.1, z: 0.1, s: 0.38 },
      { x: -0.3, y: -0.1, z: -0.1, s: 0.32 },
      { x: 0, y: 0.5, z: 0, s: 0.3 },
      { x: 0.7, y: 0.4, z: 0.3, s: 0.18 },
      { x: -0.65, y: 0.6, z: -0.2, s: 0.15 },
    ]

    const blocks: { mesh: THREE.Mesh; orig: typeof positions[0]; phase: number }[] = []

    positions.forEach((p, i) => {
      const geo = new THREE.BoxGeometry(p.s, p.s, p.s)
      const isAccent = i >= 6

      const mat = isAccent
        ? new THREE.MeshPhongMaterial({
            color: GOLD,
            emissive: DARK_GOLD,
            emissiveIntensity: 0.3,
            shininess: 150,
            specular: new THREE.Color(0xffffff),
          })
        : new THREE.MeshPhongMaterial({
            color: 0x1a1a1a,
            emissive: DARK_GOLD,
            emissiveIntensity: i < 3 ? 0.05 : 0.12,
            flatShading: true,
            shininess: 60,
            specular: new THREE.Color(GOLD),
          })

      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(p.x, p.y, p.z)

      const edges = new THREE.EdgesGeometry(geo)
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({
          color: GOLD,
          transparent: true,
          opacity: isAccent ? 0.5 : 0.12,
        })
      )
      mesh.add(line)

      group.add(mesh)
      blocks.push({ mesh, orig: { ...p }, phase: Math.random() * Math.PI * 2 })
    })

    // connection lines
    const connections = [
      [0, 3],
      [0, 4],
      [3, 5],
      [4, 5],
      [1, 3],
      [2, 4],
    ]
    const linePoints: THREE.Vector3[] = []
    connections.forEach(([a, b]) => {
      linePoints.push(
        new THREE.Vector3(positions[a].x, positions[a].y, positions[a].z),
        new THREE.Vector3(positions[b].x, positions[b].y, positions[b].z)
      )
    })
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints)
    const lineMat = new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.08 })
    const connectionLines = new THREE.LineSegments(lineGeo, lineMat)
    group.add(connectionLines)

    let animationId: number
    const animate = (t: number) => {
      const time = t * 0.001
      group.rotation.y = time * 0.25

      blocks.forEach((b, i) => {
        const float = Math.sin(time * 0.8 + b.phase) * 0.06
        b.mesh.position.y = b.orig.y + float
        if (i >= 6) {
          b.mesh.rotation.x = time * 0.4 + b.phase
          b.mesh.rotation.z = time * 0.3
        } else {
          b.mesh.rotation.y = Math.sin(time * 0.3 + b.phase) * 0.05
        }
      })

      // update connection lines
      const pos = connectionLines.geometry.attributes.position.array as Float32Array
      connections.forEach(([a, b], idx) => {
        const ba = blocks[a]
        const bb = blocks[b]
        pos[idx * 6] = ba.mesh.position.x
        pos[idx * 6 + 1] = ba.mesh.position.y
        pos[idx * 6 + 2] = ba.mesh.position.z
        pos[idx * 6 + 3] = bb.mesh.position.x
        pos[idx * 6 + 4] = bb.mesh.position.y
        pos[idx * 6 + 5] = bb.mesh.position.z
      })
      connectionLines.geometry.attributes.position.needsUpdate = true

      renderer.render(scene, camera)
      animationId = requestAnimationFrame(animate)
    }
    animationId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationId)
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={containerRef} className="w-[140px] h-[140px]" />
}

// final CTA
function FinalCTA() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.cta-line',
        { y: 100, opacity: 0, rotationX: 45 },
        {
          y: 0,
          opacity: 1,
          rotationX: 0,
          duration: 1.2,
          stagger: 0.15,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
          },
        }
      )

      gsap.fromTo(
        '.cta-sub',
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 60%',
          },
        }
      )

      gsap.fromTo(
        '.cta-btn',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 55%',
          },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="py-40 px-4 md:px-8 border-t relative overflow-hidden"
      style={{ backgroundColor: '#0b0d0b', borderColor: '#1a3d30' }}
    >
      {/* animated bg grid */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, #dcb865 1px, transparent 1px),
              linear-gradient(to bottom, #dcb865 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* large bg text */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[30vw] font-black leading-none pointer-events-none select-none tracking-tighter opacity-[0.02] whitespace-nowrap">
        HOUSE
      </div>

      {/* corner accents */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2" style={{ borderColor: '#1a3d30' }} />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2" style={{ borderColor: '#1a3d30' }} />

      <div className="mx-auto max-w-5xl text-center relative" style={{ perspective: '1000px' }}>
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-neutral-500 block mb-12">
          [007] The moment of truth
        </span>

        <div className="mb-12">
          <div className="cta-line overflow-hidden opacity-0">
            <h2
              className="font-black tracking-[-0.04em] text-neutral-100 leading-[0.85]"
              style={{ fontSize: 'clamp(3rem, 12vw, 10rem)' }}
            >
              READY
            </h2>
          </div>
          <div className="cta-line overflow-hidden opacity-0">
            <h2
              className="font-black tracking-[-0.04em] text-neutral-100 leading-[0.85]"
              style={{ fontSize: 'clamp(3rem, 12vw, 10rem)', paddingLeft: 'clamp(1rem, 6vw, 6rem)' }}
            >
              TO BE
            </h2>
          </div>
          <div className="cta-line overflow-hidden opacity-0">
            <h2
              className="font-black tracking-[-0.04em] italic leading-[0.85]"
              style={{ fontSize: 'clamp(3rem, 12vw, 10rem)', color: '#dcb865', paddingLeft: 'clamp(2rem, 12vw, 12rem)' }}
            >
              THE HOUSE?
            </h2>
          </div>
        </div>

        <p className="cta-sub max-w-md mx-auto text-neutral-400 font-mono text-sm mb-14 leading-relaxed opacity-0">
          Earn yield. Play games. Build casinos.
          <br />
          <span className="text-neutral-300">Pick one. Or all three.</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/explore/app/stake"
            className="cta-btn group relative px-16 py-7 text-sm font-black uppercase tracking-[0.2em] overflow-hidden opacity-0"
            style={{ backgroundColor: '#dcb865', color: '#0b0d0b' }}
          >
            <span className="relative z-10 group-hover:text-[#dcb865] transition-colors duration-300">
              Launch App
            </span>
            <div className="absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" style={{ backgroundColor: '#0b0d0b' }} />
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="cta-btn group relative px-16 py-7 border-2 text-neutral-100 text-sm font-black uppercase tracking-[0.2em] transition-colors overflow-hidden opacity-0"
            style={{ borderColor: '#1a3d30' }}
          >
            <span className="relative z-10 group-hover:text-[#0b0d0b] transition-colors duration-300">
              View Docs
            </span>
            <div className="absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" style={{ backgroundColor: '#dcb865' }} />
          </a>
        </div>

        {/* closing badge */}
        <div className="mt-24 inline-flex items-center gap-4 px-6 py-3 border" style={{ borderColor: '#1a3d30' }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#dcb865' }} />
          <p className="text-[10px] font-mono text-neutral-500 tracking-[0.3em]">
            HOUSE//PROTOCOL — EVERYONE CAN BE THE HOUSE
          </p>
        </div>
      </div>
    </section>
  )
}
