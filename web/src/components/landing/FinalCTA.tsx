import { Link } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function FinalCTA() {
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
            to="/app/stake"
            className="cta-btn group relative px-16 py-7 text-sm font-black uppercase tracking-[0.2em] overflow-hidden opacity-0"
            style={{ backgroundColor: '#dcb865', color: '#0b0d0b' }}
          >
            <span className="relative z-10 group-hover:text-[#dcb865] transition-colors duration-300">Launch App</span>
            <div
              className="absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"
              style={{ backgroundColor: '#0b0d0b' }}
            />
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="cta-btn group relative px-16 py-7 border-2 text-neutral-100 text-sm font-black uppercase tracking-[0.2em] transition-colors overflow-hidden opacity-0"
            style={{ borderColor: '#1a3d30' }}
          >
            <span className="relative z-10 group-hover:text-[#0b0d0b] transition-colors duration-300">View Docs</span>
            <div
              className="absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"
              style={{ backgroundColor: '#dcb865' }}
            />
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
