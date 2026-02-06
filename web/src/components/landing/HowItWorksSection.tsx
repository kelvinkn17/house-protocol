import { Link } from '@tanstack/react-router'
import AnimateComponent from '@/components/elements/AnimateComponent'

const DIAGONAL_ANGLE = -7

// polkadot pattern for section dividers
function PolkaDots({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: `radial-gradient(circle, currentColor 2px, transparent 2px)`,
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  )
}

// diagonal section divider with title badge
function DiagonalDivider({
  title,
  fromColor,
  toColor,
  titleColor = 'bg-black',
  textColor = 'text-[#CDFF57]',
}: {
  title: string
  fromColor: string
  toColor: string
  titleColor?: string
  textColor?: string
}) {
  return (
    <div className="relative h-40 md:h-52 overflow-hidden">
      {/* base color */}
      <div className={`absolute inset-0 ${fromColor}`} />
      {/* diagonal overlay */}
      <div
        className={`absolute ${toColor}`}
        style={{
          left: '-25%',
          right: '-25%',
          top: '50%',
          height: '150%',
          transformOrigin: 'center top',
          transform: `rotate(${DIAGONAL_ANGLE}deg)`,
        }}
      />
      {/* polkadots on the diagonal strip */}
      <div
        className="absolute"
        style={{
          left: '-25%',
          right: '-25%',
          top: '50%',
          height: '60px',
          transformOrigin: 'center top',
          transform: `rotate(${DIAGONAL_ANGLE}deg) translateY(-50%)`,
        }}
      >
        <PolkaDots className="text-white" />
      </div>
      {/* centered title badge */}
      <div className="absolute inset-0 flex items-center justify-center">
        <AnimateComponent onScroll variant="fadeInUp">
          <div
            className={`${titleColor} ${textColor} px-8 sm:px-12 md:px-16 py-4 sm:py-5 md:py-6 rounded-full border-3 border-black font-black text-xl sm:text-2xl md:text-4xl uppercase tracking-tight`}
            style={{
              boxShadow: '6px 6px 0px rgba(0,0,0,0.4)',
              transform: `rotate(${DIAGONAL_ANGLE}deg)`,
            }}
          >
            {title}
          </div>
        </AnimateComponent>
      </div>
    </div>
  )
}

export default function HowItWorksSection() {
  const steps = [
    {
      num: '1.',
      title: 'STAKE & EARN LIKE THE HOUSE',
      desc: "Deposit USDC into the House Vault. Your money becomes the casino's bankroll. When players lose (and statistically, they do), you earn.",
      cta: 'View Vaults',
      to: '/app/stake',
    },
    {
      num: '2.',
      title: 'BUILD WITHOUT THE BANK',
      desc: "Connect to House Protocol's shared liquidity. No need to fund your own bankroll. Just build the game, plug into the vault, and launch.",
      cta: 'Start Building',
      to: '/build',
    },
  ]

  return (
    <>
      {/* cream to dark transition */}
      <DiagonalDivider
        title="How It Works"
        fromColor="bg-[#EDEBE6]"
        toColor="bg-[#1A1A1A]"
        titleColor="bg-[#CDFF57]"
        textColor="text-black"
      />

      <section className="py-24 px-4 md:px-8 relative bg-[#1A1A1A] -mt-px">
        <div className="mx-auto max-w-6xl relative">
          <AnimateComponent onScroll variant="fadeInUp">
            <div className="mb-16">
              <span className="text-xs font-black uppercase tracking-widest text-white/40 block mb-4">
                THE SOLUTION: HOUSE PROTOCOL
              </span>
              <p className="text-[#FF6B9D] font-mono text-sm">// FLIP THE SCRIPT</p>
            </div>
          </AnimateComponent>

          <div className="border-t border-white/20 pt-16">
            <div className="grid md:grid-cols-2 gap-px bg-white/10">
              {steps.map((step, i) => (
                <AnimateComponent key={step.num} onScroll delay={100 + i * 150}>
                  <div
                    className={`bg-[#1A1A1A] p-8 md:p-12 flex flex-col ${i === 0 ? '' : 'md:border-l border-white/10'}`}
                  >
                    <span className="text-[5rem] sm:text-[8rem] md:text-[10rem] font-black leading-none text-[#FF6B9D] mb-4">
                      {step.num}
                    </span>
                    <h3 className="text-xl font-black text-white mb-4 tracking-tight uppercase">
                      {step.title}
                    </h3>
                    <p className="text-white/60 text-sm leading-relaxed mb-8 flex-1">{step.desc}</p>
                    <Link
                      to={step.to}
                      className="inline-flex self-start px-8 py-4 bg-[#CDFF57] text-black text-sm font-black uppercase tracking-wide rounded-full border-2 border-black hover:translate-x-1 hover:translate-y-1 transition-transform duration-200"
                      style={{ boxShadow: '4px 4px 0px black' }}
                    >
                      {step.cta}
                    </Link>
                  </div>
                </AnimateComponent>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* dark to cream transition */}
      <DiagonalDivider
        title="Game Primitives"
        fromColor="bg-[#1A1A1A]"
        toColor="bg-[#EDEBE6]"
        titleColor="bg-[#FF6B9D]"
        textColor="text-black"
      />
    </>
  )
}
