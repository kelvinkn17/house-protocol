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

export default function InfraSection() {
  return (
    <>
      {/* diagonal cream-to-dark transition */}
      <div className="relative h-40 md:h-52 overflow-hidden">
        {/* cream background */}
        <div className="absolute inset-0 bg-[#EDEBE6]" />
        {/* diagonal dark background */}
        <div
          className="absolute bg-[#1A1A1A]"
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
              className="bg-white text-black px-8 sm:px-12 md:px-16 py-4 sm:py-5 md:py-6 rounded-full border-3 border-black font-black text-xl sm:text-2xl md:text-4xl uppercase tracking-tight"
              style={{
                boxShadow: '6px 6px 0px rgba(0,0,0,0.4)',
                transform: `rotate(${DIAGONAL_ANGLE}deg)`,
              }}
            >
              The Pitch
            </div>
          </AnimateComponent>
        </div>
      </div>
    </>
  )
}
