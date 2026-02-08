import { useState } from 'react'
import AnimateComponent from '@/components/elements/AnimateComponent'

export default function VideoSection() {
  const [active, setActive] = useState(false)
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 md:px-8 bg-[#EDEBE6]">
      <div className="mx-auto max-w-5xl">
        <AnimateComponent onScroll variant="fadeInUp">
          <div className="mb-8 flex items-center gap-4">
            <span className="text-xs font-black uppercase tracking-widest text-black/50">
              [001] See it in action
            </span>
            <div className="flex-1 h-px bg-black/20" />
          </div>
        </AnimateComponent>

        <AnimateComponent onScroll variant="scaleIn" delay={150}>
          <div
            className="rounded-2xl border-3 border-black overflow-hidden"
            style={{ boxShadow: '8px 8px 0px black' }}
          >
            <div
              className="relative bg-black"
              style={{ aspectRatio: '16/9' }}
              onClick={() => setActive(true)}
              onMouseLeave={() => setActive(false)}
            >
              <iframe
                src="https://www.youtube.com/embed/ZR9WjhZt-hs"
                title="House Protocol Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
              {!active && (
                <div className="absolute inset-0 z-10 cursor-pointer" />
              )}
            </div>
          </div>
        </AnimateComponent>
      </div>
    </section>
  )
}
