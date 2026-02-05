import { Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import AnimateComponent from '@/components/elements/AnimateComponent'
import AnimatedText from '@/components/elements/AnimatedText'
import AnimatedMascot from '@/components/elements/AnimatedMascot'

const mascotQuotes = [
  'The House always wins!',
  'Stake it, build it, play it, own it',
  'Real Yield, Real Bets',
  'Everyone eats here',
  'No rug, just rugs',
  'Provably fair, actually fun',
]

export default function HeroSection() {
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      // scale down
      setIsVisible(false)
      // after scale down, change text and pop back up
      setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % mascotQuotes.length)
        setIsVisible(true)
      }, 300)
    }, 3500)
    return () => clearInterval(interval)
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
      hoverCta: "Let's Earn",
    },
    {
      title: 'PLAYERS',
      tagline: 'beat the house',
      desc: 'Play gasless with instant settlement via state channels',
      to: '/app/play',
      num: '02',
      color: 'bg-[#FF6B9D]',
      textColor: 'text-black',
      hoverCta: "Let's get rekt",
    },
    {
      title: 'BUILDERS',
      tagline: 'become the house',
      desc: 'Deploy games with no code, earn 25% of house edge',
      to: '/build',
      num: '03',
      color: 'bg-white',
      textColor: 'text-black',
      hoverCta: "Let's Buidl!",
    },
  ]

  return (
    <section className="relative min-h-screen flex flex-col px-4 md:px-8 pt-20 pb-16 overflow-hidden bg-[#EDEBE6]">
      <div className="mx-auto max-w-7xl w-full relative">
        {/* main hero content */}
        <div className="relative mb-16">
          {/* hackathon badge */}
          <AnimateComponent delay={0}>
            <div
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#CDFF57] text-black text-xs font-black uppercase tracking-wide rounded-full border-2 border-black mb-6"
              style={{ boxShadow: '3px 3px 0px black' }}
            >
              <span className="w-2 h-2 rounded-full bg-black" />
              ETHGlobal HackMoney 2026 Submission
            </div>
          </AnimateComponent>

          {/* staggered artistic title */}
          <h1
            className="font-black tracking-[-0.04em] text-black leading-[0.9] mb-8"
            style={{ fontSize: 'clamp(3rem, 10vw, 9rem)' }}
          >
            <span className="block overflow-hidden">
              <AnimatedText text="EVERYONE" delay={50} stagger={30} />
            </span>
            <span className="block overflow-hidden">
              <AnimatedText text="CAN BE THE" delay={200} stagger={30} />
            </span>
            <span className="block overflow-hidden">
              <AnimatedText
                text="HOUSE."
                delay={420}
                stagger={35}
                style={{
                  color: 'white',
                  WebkitTextStroke: '3px black',
                  textShadow: '6px 6px 0px black',
                }}
              />
            </span>
          </h1>

          {/* mascot with speech bubble */}
          <div className="absolute -right-8 xl:right-4 top-12 hidden lg:flex flex-col items-center">
            {/* speech bubble - pops in/out */}
            <AnimateComponent variant="fadeInUp" delay={750}>
              <div
                className={`relative bg-[#CDFF57] px-5 py-4 rounded-2xl border-3 border-black w-[220px] xl:w-[240px] mb-3 ml-8 transition-all duration-300 ease-out origin-bottom ${
                  isVisible ? 'scale-100 opacity-100 rotate-[5deg]' : 'scale-75 opacity-0 rotate-0'
                }`}
                style={{ boxShadow: '5px 5px 0px black' }}
              >
                <p className="text-sm xl:text-base font-black text-black text-center">
                  "{mascotQuotes[quoteIndex]}"
                </p>
                {/* speech bubble tail pointing down */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-12 border-l-transparent border-r-12 border-r-transparent border-t-14 border-t-black" />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-10 border-l-transparent border-r-10 border-r-transparent border-t-12 border-t-[#CDFF57]" />
              </div>
            </AnimateComponent>
            {/* mascot face */}
            <AnimateComponent variant="fadeInUp" delay={600}>
              <AnimatedMascot className="w-44 h-44 xl:w-64 xl:h-64 animate-mascot-sway drop-shadow-[6px_6px_0px_rgba(0,0,0,0.3)]" />
            </AnimateComponent>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 lg:gap-12">
            <div className="flex flex-col gap-4">
              <AnimateComponent variant="fadeInUp" delay={650}>
                <p className="max-w-md text-base md:text-lg text-black/70 font-mono leading-relaxed">
                  ** Yield from real probability, not inflation.
                </p>
              </AnimateComponent>
              <AnimateComponent delay={720}>
                <div className="inline-flex flex-col items-start gap-1 px-4 py-3 bg-white text-black rounded-2xl border-2 border-black" style={{ boxShadow: '4px 4px 0px black' }}>
                  <span className="text-[10px] font-mono opacity-60 uppercase tracking-wider mb-2">Powered by</span>
                  <div className="flex items-center gap-3">
                    <img src="/assets/images/erc7824.png" alt="Yellow Nitrolite" className="h-10 w-auto" />
                    <div className="w-px h-6 bg-black/30" />
                    <span className="text-xs font-bold opacity-70">Gasless & Instant</span>
                  </div>
                </div>
              </AnimateComponent>
            </div>

            <AnimateComponent variant="fadeInUp" delay={780} className="flex flex-col sm:flex-row gap-3">
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
            </AnimateComponent>
          </div>
        </div>

        {/* role cards */}
        <div>
          <AnimateComponent variant="fadeInUp" delay={850} className="text-xs font-mono text-black/50 uppercase tracking-widest mb-6 flex items-center gap-4">
            <span>CHOOSE YOUR PATH</span>
            <div className="flex-1 h-px bg-black/20" />
          </AnimateComponent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {heroRoles.map((role, i) => (
              <AnimateComponent key={role.title} delay={920 + i * 100}>
                <Link
                  to={role.to}
                  className={`group relative ${role.color} ${role.textColor} p-6 lg:p-8 rounded-2xl border-2 border-black hover:translate-x-1 hover:translate-y-1 transition-transform duration-200 min-h-[180px] md:min-h-[200px] block overflow-hidden`}
                  style={{ boxShadow: '6px 6px 0px black' }}
                >
                  <div className="flex flex-col h-full relative z-10">
                    {/* header row */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <span className="text-xs font-mono opacity-60">{role.num}</span>
                        <h3 className="text-2xl lg:text-3xl font-black tracking-tight">
                          {role.title}
                        </h3>
                        <p className="text-sm font-mono opacity-70">{role.tagline}</p>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm opacity-80 leading-relaxed">
                        {role.desc}
                      </p>
                    </div>
                  </div>

                  {/* hover right bar */}
                  <div className="absolute top-0 right-0 bottom-0 w-14 flex items-center justify-center translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out bg-white border-l-2 border-black">
                    <span className="text-xs font-black uppercase tracking-wider -rotate-90 whitespace-nowrap text-black">
                      {role.hoverCta} →
                    </span>
                  </div>
                </Link>
              </AnimateComponent>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
