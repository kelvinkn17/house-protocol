import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
// @ts-expect-error gsap types missing
import { gsap } from 'gsap'
// @ts-expect-error gsap types missing
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export const Route = createFileRoute('/explore/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden selection:bg-[#dcb865] selection:text-[#0b0d0b]" style={{ backgroundColor: '#0b0d0b' }}>
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
    },
    {
      title: 'PLAYERS',
      tagline: 'beat the house',
      desc: 'Play gasless, instant settlement',
      to: '/explore/app/play',
      icon: '◇',
      num: '02',
    },
    {
      title: 'BUILDERS',
      tagline: 'become the house',
      desc: 'Deploy games, earn 25%',
      to: '/explore/build',
      icon: '○',
      num: '03',
    },
  ]

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex flex-col justify-center px-4 md:px-8 pt-20 pb-8 overflow-hidden"
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
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-[0.02]">
          <svg className="w-full h-full" preserveAspectRatio="none">
            <line x1="0" y1="100%" x2="100%" y2="0" stroke="white" strokeWidth="1" />
          </svg>
        </div>
      </div>

      <FloatingBlocks />

      <div className="mx-auto max-w-7xl w-full relative flex-1 flex flex-col justify-center">
        {/* top bar decoration */}
        <div className="absolute top-0 left-0 right-0 flex justify-between items-center text-[10px] font-mono text-neutral-700 tracking-[0.3em]">
          <span>[001]</span>
          <span className="hidden md:block">HOUSE//PROTOCOL</span>
          <span>2025</span>
        </div>

        {/* main hero content */}
        <div className="mb-8 lg:mb-12">
          <div ref={leftRef} className="relative">
            {/* staggered artistic title */}
            <h1
              className="font-black tracking-[-0.05em] text-neutral-100 leading-[0.85] mb-6"
              style={{ fontSize: 'clamp(2.5rem, 8vw, 7rem)', perspective: '1000px' }}
            >
              <span className="title-line block overflow-hidden">
                <span className="inline-block">EVERYONE</span>
              </span>
              <span className="title-line block overflow-hidden" style={{ paddingLeft: 'clamp(1rem, 4vw, 4rem)' }}>
                <span className="inline-block">CAN BE</span>
              </span>
              <span className="title-line block overflow-hidden italic" style={{ paddingLeft: 'clamp(2rem, 8vw, 8rem)', color: '#dcb865' }}>
                <span className="inline-block">THE HOUSE.</span>
              </span>
            </h1>

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 lg:gap-12">
              <p className="hero-sub max-w-sm text-base md:text-lg text-neutral-500 font-mono leading-relaxed">
                Shared liquidity for on-chain gambling.
                <br />
                <span className="text-neutral-200">Stake. Play. Build.</span>
                <span className="text-xs text-neutral-600 ml-2">(yes, really)</span>
              </p>

              <div className="hero-cta flex flex-col sm:flex-row gap-3">
                <Link
                  to="/explore/app/stake"
                  className="group relative px-8 py-4 text-sm font-black uppercase tracking-[0.15em] overflow-hidden"
                  style={{ backgroundColor: '#dcb865', color: '#0b0d0b' }}
                >
                  <span className="relative z-10 group-hover:text-neutral-100 transition-colors duration-300">
                    Start Staking
                  </span>
                  <div className="absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" style={{ backgroundColor: '#1a3d30' }} />
                </Link>
                <Link
                  to="/explore/build"
                  className="group px-8 py-4 border-2 text-neutral-100 text-sm font-black uppercase tracking-[0.15em] transition-colors duration-300 relative overflow-hidden"
                  style={{ borderColor: '#1a3d30' }}
                >
                  <span className="relative z-10">Build a Game</span>
                  <div className="absolute bottom-0 left-0 w-full h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" style={{ backgroundColor: '#dcb865' }} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* role cards - horizontal on desktop */}
        <div className="mt-auto">
          <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-[0.3em] mb-4 flex items-center gap-4">
            <span>CHOOSE YOUR PATH</span>
            <div className="flex-1 h-px bg-neutral-800" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {heroRoles.map((role) => (
              <Link
                key={role.title}
                to={role.to}
                className="hero-role-card group relative border p-4 lg:p-5 hover:border-neutral-500 transition-all duration-500 backdrop-blur-xs"
                style={{ backgroundColor: 'rgba(26, 61, 48, 0.15)', borderColor: '#1a3d30' }}
              >
                <div className="flex items-start gap-4">
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
                    <p className="text-[10px] font-mono italic text-neutral-500 mb-1">
                      {role.tagline}
                    </p>
                    <p className="text-xs text-neutral-400 group-hover:text-neutral-300 transition-colors">
                      {role.desc}
                    </p>
                  </div>
                  <div className="flex items-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 shrink-0">
                    <span className="text-lg text-[#dcb865]">→</span>
                  </div>
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
    <div className="relative border-y border-neutral-800 bg-neutral-900/50 overflow-hidden backdrop-blur-xs">
      <div className="py-5 overflow-hidden">
        <div className="flex animate-marquee">
          {[...items, ...items, ...items, ...items].map((item, i) => (
            <span
              key={`top-${i}`}
              className="shrink-0 mx-10 text-sm font-mono font-bold uppercase tracking-[0.25em] text-neutral-600 whitespace-nowrap"
            >
              {item}
              <span className="ml-10 text-neutral-800">•</span>
            </span>
          ))}
        </div>
      </div>
      <div className="py-5 overflow-hidden border-t border-neutral-800/50">
        <div className="flex animate-marquee-reverse">
          {[...items, ...items, ...items, ...items].map((item, i) => (
            <span
              key={`btm-${i}`}
              className="shrink-0 mx-10 text-sm font-mono font-bold uppercase tracking-[0.25em] text-neutral-700 whitespace-nowrap"
            >
              {item}
              <span className="ml-10 text-neutral-800">•</span>
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
    <section ref={sectionRef} className="py-28 px-4 md:px-8" style={{ backgroundColor: '#0b0d0b' }}>
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-neutral-800">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="stat-item bg-neutral-950 p-8 md:p-10 flex flex-col group hover:bg-neutral-900/50 transition-colors duration-500"
            >
              <span className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4 tabular-nums" style={{ color: '#dcb865' }}>
                {stat.prefix}
                <CountUp
                  end={stat.value}
                  decimals={stat.suffix === 'M' ? 1 : 0}
                  shouldAnimate={hasAnimated}
                />
                {stat.suffix}
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-neutral-400 mb-2">
                {stat.label}
              </span>
              <span className="text-xs text-neutral-600 font-mono">{stat.note}</span>
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
          { y: 120, opacity: 0 },
          {
            y: 0,
            opacity: 1,
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
    },
  ]

  return (
    <section ref={sectionRef} className="py-32 px-4 md:px-8" style={{ backgroundColor: 'rgba(26, 61, 48, 0.12)' }}>
      <div className="mx-auto max-w-6xl">
        <div className="roles-title mb-20">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-neutral-600 block mb-4">
            [002] Three ways in
          </span>
          <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-[-0.03em] text-neutral-100">
            Pick your side.
          </h2>
          <p className="mt-6 text-neutral-500 font-mono text-sm max-w-md">
            Or play all three. We do not judge.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {roles.map((role) => (
            <div
              key={role.number}
              className="role-card group relative bg-neutral-950 border border-neutral-800 p-8 hover:border-neutral-500 transition-all duration-500"
            >
              {/* watermark number */}
              <span className="absolute -top-6 -right-2 text-[9rem] font-black leading-none pointer-events-none select-none transition-colors duration-500" style={{ color: 'rgba(26, 61, 48, 0.4)' }}>
                {role.number}
              </span>

              <div className="relative">
                <h3 className="text-2xl md:text-3xl font-black tracking-tight text-neutral-100 mb-1">
                  {role.title}
                </h3>
                <p className="text-sm font-mono italic text-neutral-500 mb-8">
                  {role.tagline}
                </p>

                <p className="text-neutral-400 text-sm leading-relaxed mb-8">
                  {role.description}
                </p>

                <ul className="space-y-3 mb-10">
                  {role.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-3 text-sm text-neutral-500">
                      <span className="w-1.5 h-1.5 bg-neutral-700 group-hover:bg-neutral-400 transition-colors duration-300" />
                      {perk}
                    </li>
                  ))}
                </ul>

                <Link
                  to={role.to}
                  className="block w-full py-4 text-center border text-sm font-black uppercase tracking-[0.15em] text-neutral-100 transition-all duration-300 hover:text-[#0b0d0b] hover:bg-[#dcb865] hover:border-[#dcb865]"
                  style={{ borderColor: '#1a3d30' }}
                >
                  {role.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
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
    <section ref={sectionRef} className="py-32 px-4 md:px-8 border-t border-neutral-800" style={{ backgroundColor: '#0b0d0b' }}>
      <div className="mx-auto max-w-6xl">
        <div className="how-title mb-20 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-neutral-600 block mb-4">
              [003] How it works
            </span>
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-[-0.03em] text-neutral-100">
              4 steps.
            </h2>
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-[-0.03em] text-neutral-500">
              That is it.
            </h2>
          </div>
          <p className="max-w-sm text-sm text-neutral-500 font-mono leading-relaxed">
            State channels let you play unlimited rounds with just 2 on-chain transactions.
          </p>
        </div>

        <div className="steps-container relative">
          <div className="step-line absolute top-[72px] left-[10%] right-[10%] h-px bg-neutral-700/50 origin-left hidden md:block" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-6">
            {steps.map((step) => (
              <div key={step.num} className="step-item relative group">
                <div className="w-36 h-36 border flex flex-col items-center justify-center mb-8 relative z-10 transition-all duration-300" style={{ backgroundColor: 'rgba(26, 61, 48, 0.2)', borderColor: '#1a3d30' }}>
                  <span className="text-2xl text-neutral-600 mb-2 group-hover:text-neutral-400 transition-colors">
                    {step.icon}
                  </span>
                  <span className="text-4xl font-black" style={{ color: '#dcb865' }}>{step.num}</span>
                </div>
                <h3 className="text-xl font-black text-neutral-100 mb-2 tracking-tight">
                  {step.title}
                </h3>
                <p className="text-sm text-neutral-500 font-mono">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// game primitives
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
    <section ref={sectionRef} className="py-32 px-4 md:px-8" style={{ backgroundColor: 'rgba(26, 61, 48, 0.12)' }}>
      <div className="mx-auto max-w-6xl">
        <div className="primitives-title mb-20 text-center">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-neutral-600 block mb-4">
            [004] Game Primitives
          </span>
          <h2 className="text-5xl md:text-7xl font-black tracking-[-0.03em] text-neutral-100 mb-6">
            Pre-built mechanics.
          </h2>
          <p className="max-w-xl mx-auto text-neutral-500 font-mono text-sm leading-relaxed">
            Builders configure, not code. Protocol enforces payout math.
          </p>
        </div>

        <div className="primitives-grid grid grid-cols-2 md:grid-cols-3 gap-4">
          {primitives.map((p) => (
            <div
              key={p.type}
              className="primitive-card group relative bg-neutral-950 border border-neutral-800 p-6 md:p-8 hover:border-neutral-500 transition-all duration-300 cursor-pointer overflow-hidden"
            >
              <span className="text-5xl mb-6 block text-neutral-700 group-hover:text-neutral-400 transition-colors duration-300">
                {p.icon}
              </span>
              <h3 className="text-lg md:text-xl font-black tracking-tight text-neutral-100 mb-2">
                {p.type}
              </h3>
              <p className="text-xs text-neutral-500 font-mono mb-1">{p.desc}</p>
              <p className="text-[10px] text-neutral-700 font-mono">e.g. {p.example}</p>

              <div className="absolute inset-0 flex items-center justify-center translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" style={{ backgroundColor: '#dcb865' }}>
                <span className="text-sm font-black uppercase tracking-[0.15em]" style={{ color: '#0b0d0b' }}>
                  Use this →
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-14 text-center text-xs font-mono text-neutral-600">
          Payout: (1 / winProbability) × (1 - houseEdge). Always enforced.
        </p>
      </div>
    </section>
  )
}

// testimonials / social proof
function TestimonialsSection() {
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
    },
    {
      quote: 'Launched my coinflip game in 20 minutes. Already making passive income.',
      author: 'builder_chad',
      role: 'Builder',
      apy: '+$4.2k',
    },
    {
      quote: 'Zero gas between bets? State channels are actually magic.',
      author: 'gambler_69',
      role: 'Player',
      apy: '-$200',
    },
  ]

  return (
    <section ref={sectionRef} className="py-32 px-4 md:px-8 border-t border-neutral-800" style={{ backgroundColor: '#0b0d0b' }}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-16">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-neutral-600 block mb-4">
            [005] What they say
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-[-0.03em] text-neutral-100">
            Real feedback.
          </h2>
        </div>

        <div className="testimonials-grid grid md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="testimonial-card bg-neutral-900/50 border border-neutral-800 p-8 flex flex-col"
            >
              <p className="text-neutral-300 text-sm leading-relaxed mb-8 flex-1">
                "{t.quote}"
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-neutral-100 font-bold text-sm">{t.author}</p>
                  <p className="text-neutral-600 font-mono text-xs">{t.role}</p>
                </div>
                <span
                  className="font-mono text-sm font-bold"
                  style={{ color: t.apy.startsWith('-') ? '#b45555' : '#dcb865' }}
                >
                  {t.apy}
                </span>
              </div>
            </div>
          ))}
        </div>
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
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
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
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  const infra = [
    { name: 'Yellow Network', desc: 'State channels for gasless bets', tag: 'L2' },
    { name: 'Chainlink VRF', desc: 'Verifiable random outcomes', tag: 'RNG' },
    { name: 'Circle CCTP', desc: 'Cross-chain USDC deposits', tag: 'BRIDGE' },
    { name: 'ERC-4626', desc: 'Standard yield vault', tag: 'VAULT' },
  ]

  return (
    <section ref={sectionRef} className="py-32 px-4 md:px-8" style={{ backgroundColor: 'rgba(26, 61, 48, 0.12)' }}>
      <div className="mx-auto max-w-6xl">
        <div className="infra-title mb-16">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-neutral-600 block mb-4">
            [006] Infrastructure
          </span>
          <h2 className="text-4xl md:text-6xl font-black tracking-[-0.03em] text-neutral-100">
            Built on giants.
          </h2>
        </div>

        <div className="infra-grid grid grid-cols-2 md:grid-cols-4 gap-4">
          {infra.map((i) => (
            <div
              key={i.name}
              className="infra-item bg-neutral-950 border border-neutral-800 p-6 hover:border-neutral-700 transition-colors group"
            >
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] px-3 py-1.5 inline-block mb-5 transition-colors" style={{ backgroundColor: '#1a3d30', color: '#dcb865' }}>
                {i.tag}
              </span>
              <h3 className="text-lg font-black text-neutral-100 mb-2 tracking-tight">
                {i.name}
              </h3>
              <p className="text-xs text-neutral-500 font-mono">{i.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// final CTA
function FinalCTA() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.cta-content',
        { y: 100, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.4,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 85%',
          },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="py-40 px-4 md:px-8 border-t border-neutral-800 relative overflow-hidden"
      style={{ backgroundColor: '#0b0d0b' }}
    >
      <div className="absolute inset-0 opacity-[0.02]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, white 1px, transparent 1px),
              linear-gradient(to bottom, white 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="cta-content mx-auto max-w-4xl text-center relative">
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-neutral-600 block mb-8">
          [007] Ready?
        </span>

        <h2
          className="font-black tracking-[-0.04em] text-neutral-100 mb-10 leading-[0.85]"
          style={{ fontSize: 'clamp(2.5rem, 10vw, 8rem)' }}
        >
          READY TO BE
          <br />
          <span className="italic" style={{ color: '#dcb865' }}>THE HOUSE?</span>
        </h2>

        <p className="max-w-md mx-auto text-neutral-500 font-mono text-sm mb-14 leading-relaxed">
          Earn yield. Play games. Build casinos.
          <br />
          Pick one. Or all three.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/explore/app/stake"
            className="group relative px-14 py-6 text-sm font-black uppercase tracking-[0.2em] overflow-hidden"
            style={{ backgroundColor: '#dcb865', color: '#0b0d0b' }}
          >
            <span className="relative z-10 group-hover:text-neutral-100 transition-colors duration-300">
              Launch App
            </span>
            <div className="absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" style={{ backgroundColor: '#1a3d30' }} />
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-14 py-6 border-2 text-neutral-100 text-sm font-black uppercase tracking-[0.2em] transition-colors"
            style={{ borderColor: '#1a3d30' }}
          >
            View Docs
          </a>
        </div>

        <p className="mt-20 text-[10px] font-mono text-neutral-700 tracking-[0.3em]">
          HOUSE//PROTOCOL — EVERYONE CAN BE THE HOUSE
        </p>
      </div>
    </section>
  )
}
