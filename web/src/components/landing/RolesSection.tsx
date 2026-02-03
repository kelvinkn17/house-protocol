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
          { y: 80, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1,
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
      color: 'bg-white',
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
      color: 'bg-[#FF6B9D]',
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
      color: 'bg-[#CDFF57]',
    },
  ]

  return (
    <section ref={sectionRef} className="py-32 px-4 md:px-8 relative bg-[#EDEBE6]">
      <div className="mx-auto max-w-6xl relative">
        <div className="roles-title mb-16 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 opacity-0">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-black/50 block mb-4">
              [002] Three ways in
            </span>
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-black">
              Pick your
            </h2>
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-[#FF6B9D]">
              side.
            </h2>
          </div>
          <p className="max-w-xs text-black/60 font-mono text-sm lg:text-right">
            Or play all three.
            <br />
            <span className="text-black">We do not judge.</span>
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div
              key={role.number}
              className={`role-card group relative ${role.color} p-8 rounded-2xl border-2 border-black opacity-0 hover:translate-x-1 hover:translate-y-1 transition-transform duration-200`}
              style={{ boxShadow: '6px 6px 0px black' }}
            >
              {/* top bar */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-mono text-black/50">
                  role.{role.number}
                </span>
              </div>

              <div className="relative">
                <h3 className="text-3xl md:text-4xl font-black tracking-tight text-black mb-1">
                  {role.title}
                </h3>
                <p className="text-sm font-mono text-black/60 mb-6">
                  {role.tagline}
                </p>

                <p className="text-black/80 text-sm leading-relaxed mb-8">{role.description}</p>

                <div className="border-t border-black/20 pt-6 mb-8">
                  <ul className="space-y-2">
                    {role.perks.map((perk) => (
                      <li key={perk} className="flex items-center gap-3 text-sm text-black/70 font-mono">
                        <span>&gt;</span>
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  to={role.to}
                  className="block w-full py-4 text-center bg-black text-white text-sm font-black uppercase tracking-wide rounded-full hover:bg-black/80 transition-colors duration-200"
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
