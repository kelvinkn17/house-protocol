import { Link } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function RolesSection() {
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
      to: '/app/stake',
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
      to: '/app/play',
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
      to: '/build',
      icon: '○',
    },
  ]

  return (
    <section
      ref={sectionRef}
      className="py-32 px-4 md:px-8 relative"
      style={{ backgroundColor: 'rgba(11, 13, 11, 0.95)' }}
    >
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

                <p className="text-neutral-300 text-sm leading-relaxed mb-8">{role.description}</p>

                <ul className="space-y-3 mb-10">
                  {role.perks.map((perk, j) => (
                    <li key={perk} className="flex items-center gap-3 text-sm text-neutral-400">
                      <span className="w-1.5 h-1.5 transition-colors duration-300" style={{ backgroundColor: '#1a3d30' }} />
                      <span
                        className="group-hover:text-neutral-300 transition-colors"
                        style={{ transitionDelay: `${j * 50}ms` }}
                      >
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
                  <div
                    className="absolute inset-0 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"
                    style={{ backgroundColor: '#dcb865' }}
                  />
                </Link>
              </div>

              {/* bottom accent */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                style={{ backgroundColor: '#dcb865' }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
