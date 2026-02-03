import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SectionDivider from './SectionDivider'

gsap.registerPlugin(ScrollTrigger)

export default function InfraSection() {
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
      <section
        ref={sectionRef}
        className="py-32 px-4 md:px-8 relative overflow-hidden"
        style={{ backgroundColor: '#0b0d0b' }}
      >
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
              <h2 className="text-4xl md:text-6xl font-black tracking-[-0.03em] text-neutral-100">Built on</h2>
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
              <div
                className="connect-line flex-1 h-px origin-left mx-4 scale-x-0"
                style={{ backgroundColor: '#1a3d30' }}
              />
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#dcb865' }} />
              <div
                className="connect-line flex-1 h-px origin-left mx-4 scale-x-0"
                style={{ backgroundColor: '#1a3d30' }}
              />
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1a3d30' }} />
              <div
                className="connect-line flex-1 h-px origin-left mx-4 scale-x-0"
                style={{ backgroundColor: '#1a3d30' }}
              />
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1a3d30' }} />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-mono text-neutral-600 bg-[#0b0d0b] px-4">
              connected
            </div>
          </div>

          <div className="infra-grid grid grid-cols-2 md:grid-cols-4 gap-[1px]" style={{ backgroundColor: '#1a3d30' }}>
            {infra.map((item, i) => (
              <div
                key={item.name}
                className="infra-item bg-neutral-950 p-6 md:p-8 group relative overflow-hidden opacity-0"
              >
                {/* index */}
                <span className="absolute top-4 right-4 text-[9px] font-mono text-neutral-700">0{i + 1}</span>

                {/* icon */}
                <span className="text-4xl mb-6 block text-neutral-700 group-hover:text-[#dcb865] transition-colors duration-300">
                  {item.icon}
                </span>

                <span
                  className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] px-3 py-1.5 inline-block mb-5 transition-colors text-neutral-500 group-hover:text-[#dcb865]"
                  style={{ backgroundColor: '#1a3d30' }}
                >
                  {item.tag}
                </span>
                <h3 className="text-lg font-black text-neutral-100 mb-2 tracking-tight group-hover:text-white transition-colors">
                  {item.name}
                </h3>
                <p className="text-xs text-neutral-500 font-mono group-hover:text-neutral-400 transition-colors">
                  {item.desc}
                </p>

                {/* hover accent */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                  style={{ backgroundColor: '#dcb865' }}
                />
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
