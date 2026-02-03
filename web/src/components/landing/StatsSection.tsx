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

  const colors = ['bg-[#CDFF57]', 'bg-[#FF6B9D]', 'bg-white', 'bg-[#CDFF57]']

  return (
    <section ref={sectionRef} className="py-28 px-4 md:px-8 relative bg-[#EDEBE6]">
      <div className="mx-auto max-w-6xl relative">
        <div className="stats-label mb-10 flex items-center gap-4 opacity-0">
          <span className="text-xs font-black uppercase tracking-widest text-black/50">
            [001.5] Live numbers
          </span>
          <div className="flex-1 h-px bg-black/20" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`stat-item ${colors[i]} p-6 md:p-8 flex flex-col rounded-2xl border-2 border-black hover:translate-x-1 hover:translate-y-1 transition-transform duration-200 opacity-0`}
              style={{ boxShadow: '6px 6px 0px black' }}
            >
              {/* index marker */}
              <span className="text-xs font-mono text-black/40 mb-4">0{i + 1}</span>
              <span className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-2 text-black tabular-nums">
                {stat.prefix}
                <CountUp end={stat.value} decimals={stat.suffix === 'M' ? 1 : 0} shouldAnimate={hasAnimated} />
                {stat.suffix}
              </span>
              <span className="text-sm font-black uppercase tracking-wide text-black mb-1">
                {stat.label}
              </span>
              <span className="text-xs text-black/60 font-mono">{stat.note}</span>
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
