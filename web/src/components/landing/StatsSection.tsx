import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function StatsSection() {
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px]" style={{ backgroundColor: '#1a3d30' }}>
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="stat-item bg-neutral-950 p-8 md:p-10 flex flex-col group hover:bg-neutral-900/50 transition-colors duration-500 relative overflow-hidden opacity-0"
            >
              {/* index marker */}
              <span className="absolute top-4 right-4 text-[9px] font-mono text-neutral-700">0{i + 1}</span>
              <span
                className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4 tabular-nums"
                style={{ color: '#dcb865' }}
              >
                {stat.prefix}
                <CountUp end={stat.value} decimals={stat.suffix === 'M' ? 1 : 0} shouldAnimate={hasAnimated} />
                {stat.suffix}
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-neutral-300 mb-2">
                {stat.label}
              </span>
              <span className="text-xs text-neutral-500 font-mono">{stat.note}</span>
              {/* bottom accent line */}
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                style={{ backgroundColor: '#dcb865' }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

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
