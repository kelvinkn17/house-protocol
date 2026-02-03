import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
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
    <div className="min-h-screen bg-neutral-950 overflow-x-hidden">
      <HeroSection />
      <MarqueeStrip />
      <StatsSection />
      <RolesSection />
      <HowItWorksSection />
      <GamePrimitivesSection />
      <InfraSection />
      <FinalCTA />
    </div>
  )
}

// hero, big statement
function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } })

      tl.fromTo(
        titleRef.current,
        { y: 120, opacity: 0, skewY: 8 },
        { y: 0, opacity: 1, skewY: 0, duration: 1.2 }
      )
        .fromTo(
          subRef.current,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8 },
          '-=0.6'
        )
        .fromTo(
          ctaRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
          '-=0.4'
        )
    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={containerRef}
      className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 pt-20"
    >
      {/* grid background */}
      <div className="absolute inset-0 overflow-hidden">
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

      <h1
        ref={titleRef}
        className="relative text-center font-bold tracking-tighter text-neutral-100 leading-[0.9] mb-6"
        style={{ fontSize: 'clamp(3rem, 12vw, 10rem)' }}
      >
        <span className="block">EVERYONE</span>
        <span className="block">CAN BE</span>
        <span className="block italic text-neutral-400">THE HOUSE.</span>
      </h1>

      <p
        ref={subRef}
        className="relative max-w-md text-center text-lg text-neutral-500 mb-12 font-mono"
      >
        shared liquidity for on-chain gambling.
        <br />
        <span className="text-neutral-300">stake. play. build.</span>
      </p>

      <div ref={ctaRef} className="relative flex gap-4">
        <Link
          to="/explore/app/stake"
          className="group relative px-8 py-4 bg-neutral-100 text-neutral-900 text-sm font-bold uppercase tracking-widest overflow-hidden"
        >
          <span className="relative z-10">Start Staking</span>
          <div className="absolute inset-0 bg-neutral-900 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <span className="absolute inset-0 flex items-center justify-center text-neutral-100 translate-y-full group-hover:translate-y-0 transition-transform duration-300 font-bold uppercase tracking-widest">
            Start Staking
          </span>
        </Link>
        <Link
          to="/explore/build"
          className="px-8 py-4 border-2 border-neutral-700 text-neutral-100 text-sm font-bold uppercase tracking-widest hover:border-neutral-400 transition-colors"
        >
          Build a Game
        </Link>
      </div>

      {/* scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-xs font-mono text-neutral-600 uppercase tracking-widest">
          scroll
        </span>
        <div className="w-px h-12 bg-gradient-to-b from-neutral-600 to-transparent animate-pulse" />
      </div>
    </section>
  )
}

// infinite marquee
function MarqueeStrip() {
  const items = [
    'ZERO GAS BETTING',
    'PROVABLY FAIR',
    'YIELD BEARING',
    'CROSS-CHAIN',
    'STATE CHANNELS',
    'ERC-4626',
    'CHAINLINK VRF',
  ]

  return (
    <div className="border-y-2 border-neutral-800 bg-neutral-900 py-4 overflow-hidden">
      <div className="flex animate-marquee">
        {[...items, ...items, ...items].map((item, i) => (
          <span
            key={i}
            className="flex-shrink-0 mx-8 text-sm font-mono font-bold uppercase tracking-widest text-neutral-500"
          >
            {item}
            <span className="ml-8 text-neutral-700">/</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// stats with counter animation
function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.stat-item',
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.15,
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
    { value: '$2.4M', label: 'TVL', note: 'locked up, earning' },
    { value: '$18.7M', label: 'VOLUME', note: 'wagered total' },
    { value: '342', label: 'SESSIONS', note: 'gasless rounds' },
    { value: '27', label: 'GAMES', note: 'live on protocol' },
  ]

  return (
    <section ref={sectionRef} className="py-24 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-neutral-800">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="stat-item bg-neutral-950 p-8 flex flex-col"
            >
              <span className="text-4xl md:text-5xl font-bold tracking-tight text-neutral-100 mb-2">
                {stat.value}
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-400 mb-1">
                {stat.label}
              </span>
              <span className="text-xs text-neutral-600 font-mono">
                {stat.note}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// three roles, staggered cards
function RolesSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.role-card',
        { y: 100, opacity: 0, rotateX: 15 },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: 1,
          stagger: 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
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
        'Deposit USDC or ETH into the House Vault. Get yield-bearing tokens. When players lose, you earn. Simple.',
      perks: ['Passive yield from house edge', 'Withdraw anytime', 'hUSDC / hETH tokens'],
      cta: 'Stake',
      to: '/explore/app/stake',
    },
    {
      number: '02',
      title: 'PLAYERS',
      tagline: 'beat the house',
      description:
        'Open a session with one transaction. Play unlimited rounds. Zero gas. Close when done.',
      perks: ['2 transactions total', 'Unlimited rounds', 'State channel magic'],
      cta: 'Play',
      to: '/explore/app/play',
    },
    {
      number: '03',
      title: 'BUILDERS',
      tagline: 'become the house',
      description:
        'Pick a game primitive. Configure it. Deploy to your domain. Earn 25% of the house edge.',
      perks: ['No code required', 'Your branding', '25% revenue share'],
      cta: 'Build',
      to: '/explore/build',
    },
  ]

  return (
    <section ref={sectionRef} className="py-32 px-4 bg-neutral-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-20">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-500 block mb-4">
            Three ways in
          </span>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-neutral-100">
            Pick your side.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div
              key={role.number}
              className="role-card group relative bg-neutral-950 border-2 border-neutral-800 p-8 hover:border-neutral-600 transition-colors"
            >
              <span className="text-7xl font-bold text-neutral-800 absolute top-4 right-4">
                {role.number}
              </span>

              <div className="relative">
                <h3 className="text-2xl font-bold tracking-tight text-neutral-100 mb-1">
                  {role.title}
                </h3>
                <p className="text-sm font-mono italic text-neutral-500 mb-6">
                  {role.tagline}
                </p>

                <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                  {role.description}
                </p>

                <ul className="space-y-2 mb-8">
                  {role.perks.map((perk) => (
                    <li
                      key={perk}
                      className="flex items-center gap-2 text-sm text-neutral-500"
                    >
                      <span className="w-1 h-1 bg-neutral-500" />
                      {perk}
                    </li>
                  ))}
                </ul>

                <Link
                  to={role.to}
                  className="block w-full py-3 text-center border-2 border-neutral-700 text-sm font-bold uppercase tracking-widest text-neutral-100 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
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

// how it works, horizontal scroll feel
function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.step-item',
        { x: 60, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
          },
        }
      )

      // animate the connecting line
      gsap.fromTo(
        '.step-line',
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.5,
          ease: 'power2.inOut',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 60%',
          },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  const steps = [
    { num: '1', title: 'Connect', desc: 'Link your wallet' },
    { num: '2', title: 'Open Session', desc: 'One transaction' },
    { num: '3', title: 'Play', desc: 'Zero gas, unlimited' },
    { num: '4', title: 'Close', desc: 'Settle and withdraw' },
  ]

  return (
    <section ref={sectionRef} className="py-32 px-4 border-t border-neutral-800">
      <div className="mx-auto max-w-6xl">
        <div className="mb-20 flex items-end justify-between">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-500 block mb-4">
              How it works
            </span>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-neutral-100">
              4 steps.
              <br />
              <span className="text-neutral-500">That's it.</span>
            </h2>
          </div>
          <p className="hidden md:block max-w-xs text-sm text-neutral-500 font-mono">
            State channels let you play unlimited rounds with just 2 on-chain transactions.
          </p>
        </div>

        <div className="relative">
          {/* connecting line */}
          <div className="step-line absolute top-12 left-0 right-0 h-px bg-neutral-700 origin-left hidden md:block" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {steps.map((step) => (
              <div key={step.num} className="step-item relative">
                <div className="w-24 h-24 bg-neutral-900 border-2 border-neutral-700 flex items-center justify-center mb-6 relative z-10">
                  <span className="text-3xl font-bold text-neutral-100">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-neutral-100 mb-2">
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

// game primitives with hover states
function GamePrimitivesSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.primitive-card',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
          },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  const primitives = [
    { type: 'PICK ONE', example: 'Coinflip, Color Picker', icon: '◐' },
    { type: 'PICK NUMBER', example: 'Dice, Limbo', icon: '▣' },
    { type: 'SPIN WHEEL', example: 'Roulette', icon: '◎' },
    { type: 'REVEAL TILES', example: 'Mines, Tower', icon: '▦' },
    { type: 'CASH OUT', example: 'Crash, Rocket', icon: '△' },
    { type: 'DEAL CARDS', example: 'Blackjack', icon: '◇' },
  ]

  return (
    <section ref={sectionRef} className="py-32 px-4 bg-neutral-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-20 text-center">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-500 block mb-4">
            Game Primitives
          </span>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-neutral-100 mb-4">
            Pre-built mechanics.
          </h2>
          <p className="max-w-lg mx-auto text-neutral-500 font-mono text-sm">
            Builders configure, not code. Protocol enforces fair payout math. Pool stays protected.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {primitives.map((p) => (
            <div
              key={p.type}
              className="primitive-card group relative bg-neutral-950 border-2 border-neutral-800 p-6 hover:border-neutral-600 transition-all duration-300 cursor-pointer overflow-hidden"
            >
              <span className="text-4xl mb-4 block opacity-20 group-hover:opacity-40 transition-opacity">
                {p.icon}
              </span>
              <h3 className="text-lg font-bold tracking-tight text-neutral-100 mb-1">
                {p.type}
              </h3>
              <p className="text-xs text-neutral-600 font-mono">{p.example}</p>

              {/* hover reveal */}
              <div className="absolute inset-0 bg-neutral-100 flex items-center justify-center translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <span className="text-sm font-bold uppercase tracking-widest text-neutral-900">
                  Use this →
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-xs font-mono text-neutral-600">
          Payout formula: (1 / winProbability) × (1 - houseEdge). Always enforced.
        </p>
      </div>
    </section>
  )
}

// infra logos
function InfraSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.infra-item',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
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

  const infra = [
    { name: 'Yellow Network', desc: 'Gasless state channels', tag: 'L2' },
    { name: 'Chainlink VRF', desc: 'Verifiable randomness', tag: 'RNG' },
    { name: 'Circle CCTP', desc: 'Cross-chain deposits', tag: 'BRIDGE' },
    { name: 'ERC-4626', desc: 'Yield bearing vault', tag: 'VAULT' },
  ]

  return (
    <section ref={sectionRef} className="py-32 px-4 border-t border-neutral-800">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-500 block mb-4">
            Infrastructure
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-neutral-100">
            Built on giants.
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {infra.map((i) => (
            <div
              key={i.name}
              className="infra-item bg-neutral-900 border border-neutral-800 p-6"
            >
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-600 bg-neutral-800 px-2 py-1 inline-block mb-4">
                {i.tag}
              </span>
              <h3 className="text-lg font-bold text-neutral-100 mb-1">
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

// final cta
function FinalCTA() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.cta-content',
        { y: 60, opacity: 0 },
        {
          y: 0,
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

  return (
    <section
      ref={sectionRef}
      className="py-32 px-4 border-t border-neutral-800 bg-neutral-950"
    >
      <div className="cta-content mx-auto max-w-3xl text-center">
        <h2
          className="font-bold tracking-tighter text-neutral-100 mb-6"
          style={{ fontSize: 'clamp(2rem, 8vw, 5rem)' }}
        >
          READY TO
          <br />
          <span className="italic text-neutral-400">BE THE HOUSE?</span>
        </h2>

        <p className="max-w-md mx-auto text-neutral-500 font-mono text-sm mb-12">
          Earn yield. Play games. Build casinos.
          <br />
          Pick one. Or all three.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/explore/app/stake"
            className="px-10 py-5 bg-neutral-100 text-neutral-900 text-sm font-bold uppercase tracking-widest hover:bg-neutral-300 transition-colors"
          >
            Launch App
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-10 py-5 border-2 border-neutral-700 text-neutral-100 text-sm font-bold uppercase tracking-widest hover:border-neutral-500 transition-colors"
          >
            View Docs
          </a>
        </div>
      </div>
    </section>
  )
}
