import { useState } from 'react'
import { cnm } from '@/utils/style'

interface SdkTab {
  label: string
  code: string
}

export default function SdkPanel({
  tabs,
  gameType,
  description,
}: {
  tabs: SdkTab[]
  gameType: string
  description: string
}) {
  const [active, setActive] = useState(0)

  return (
    <div className="space-y-4">
      {/* game info */}
      <div
        className="bg-white border-2 border-black rounded-2xl p-5"
        style={{ boxShadow: '6px 6px 0px black' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span
            className="px-3 py-1 text-[10px] font-black uppercase rounded-full border-2 border-black bg-[#CDFF57] text-black"
            style={{ boxShadow: '2px 2px 0px black' }}
          >
            {gameType}
          </span>
          <span className="text-[10px] font-mono text-black/40 uppercase">primitive</span>
        </div>
        <p className="text-sm text-black/60 leading-relaxed">{description}</p>
      </div>

      {/* sdk code */}
      <div
        className="bg-[#1a1a1a] border-2 border-black rounded-2xl overflow-hidden"
        style={{ boxShadow: '6px 6px 0px #FF6B9D' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-[10px] font-black text-white/40 uppercase tracking-wider">
            House SDK
          </span>
          <div className="flex gap-1">
            {tabs.map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => setActive(i)}
                className={cnm(
                  'px-3 py-1 text-[10px] font-black uppercase rounded-full transition-colors',
                  active === i
                    ? 'bg-white text-black'
                    : 'text-white/40 hover:text-white/60',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 overflow-x-auto">
          <pre className="text-[11px] font-mono text-white/70 leading-relaxed whitespace-pre">
            {tabs[active].code}
          </pre>
        </div>
      </div>
    </div>
  )
}
