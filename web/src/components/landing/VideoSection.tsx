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
            {/* browser title bar */}
            <div className="flex items-center gap-3 px-4 sm:px-5 py-5 bg-[#1A1A1A] border-b-3 border-black">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF6B9D] border border-black/20" />
                <div className="w-3 h-3 rounded-full bg-[#CDFF57] border border-black/20" />
                <div className="w-3 h-3 rounded-full bg-white border border-black/20" />
              </div>
              <div className="flex-1 bg-white/10 rounded-lg px-3 h-9 hidden sm:flex items-center">
                <p className="text-sm font-sans text-white/50">
                  houseprotocol.xyz/demo
                </p>
              </div>
              <div className="px-3 h-9 bg-[#CDFF57] rounded-lg border border-black/20 hidden sm:flex items-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-black leading-none">
                  Live
                </span>
              </div>
            </div>

            <div
              className="relative bg-black"
              style={{ aspectRatio: '16/9' }}
              onClick={() => setActive(true)}
              onMouseLeave={() => setActive(false)}
            >
              <iframe
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
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
