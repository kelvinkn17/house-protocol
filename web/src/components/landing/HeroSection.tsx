import { Link } from '@tanstack/react-router'
import AnimateComponent from '@/components/elements/AnimateComponent'
import AnimatedText from '@/components/elements/AnimatedText'
import { cssTransition } from '@/lib/styling'

export default function HeroSection() {
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
    <section className="relative min-h-screen flex flex-col px-4 md:px-8 pt-20 pb-16 overflow-hidden bg-[#EDEBE6]">
      <div className="mx-auto max-w-7xl w-full relative">
        {/* main hero content */}
        <div className="relative mb-16">
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

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 lg:gap-12">
            <div className="flex flex-col gap-4">
              <AnimateComponent variant="fadeInUp" delay={650}>
                <p className="max-w-md text-base md:text-lg text-black/70 font-mono leading-relaxed">
                  ** Yield from real probability, not inflation.
                </p>
              </AnimateComponent>
              <AnimateComponent delay={720}>
                {/* tilted pill with shadow */}
                <Link
                  to="/app/stake"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#CDFF57] text-black text-sm font-black uppercase tracking-wide rounded-full hover:scale-105 border-2 border-black"
                  style={{
                    transform: 'rotate(-2deg)',
                    boxShadow: '4px 4px 0px black',
                    transition: cssTransition.button,
                  }}
                >
                  <span className="w-2 h-2 rounded-full bg-black" />
                  ETHGlobal HackMoney 2025 Submission
                </Link>
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
                  className={`group relative ${role.color} ${role.textColor} p-6 lg:p-8 rounded-2xl border-2 border-black hover:translate-x-1 hover:translate-y-1 transition-transform duration-200 min-h-[180px] md:min-h-[200px] block`}
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
              </AnimateComponent>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
