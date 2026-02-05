// blocks mobile users with a fun message, we'll fix responsiveness after the hackathon
import AnimatedMascot from './elements/AnimatedMascot'

export default function MobileOverlay() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0A090C] p-8 md:hidden">
      {/* bg pattern, subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(#cdff57 1px, transparent 1px), linear-gradient(90deg, #cdff57 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative flex flex-col items-center gap-6 text-center">
        {/* mascot with a fun wobble */}
        <div className="animate-mascot-sway w-40 h-40 drop-shadow-[0_0_40px_rgba(205,255,87,0.3)]">
          <AnimatedMascot className="w-full h-full" />
        </div>

        {/* neobrutalism card */}
        <div className="rounded-2xl border-4 border-[#cdff57] bg-[#cdff57] px-6 py-5 shadow-[6px_6px_0px_0px_rgba(205,255,87,0.4)] rotate-[-1deg]">
          <h1 className="text-3xl font-black uppercase leading-tight tracking-tight text-[#0A090C]">
            Whoops!
          </h1>
        </div>

        <p className="max-w-[280px] text-lg font-bold leading-snug text-white/90">
          We haven't built the mobile version yet. <span className="text-[#cdff57]">Hackathon vibes</span>, you know how it is.
        </p>

        <p className="max-w-[280px] text-sm text-white/50 leading-relaxed">
          Tight deadline, big dreams, zero responsiveness. Please hop on a desktop or laptop to enjoy the full experience!
        </p>

        {/* fun little cta */}
        <div className="mt-2 rounded-xl border-2 border-[#cdff57]/30 bg-[#cdff57]/10 px-5 py-3 rotate-[0.5deg]">
          <p className="text-sm font-bold text-[#cdff57]">
            Cheers from the House Protocol Team ✌️
          </p>
        </div>
      </div>
    </div>
  )
}
