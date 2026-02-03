export default function SectionDivider({ label }: { label: string }) {
  return (
    <div className="relative py-4 overflow-hidden" style={{ backgroundColor: '#1a3d30' }}>
      <div className="flex animate-marquee">
        {Array.from({ length: 20 }).map((_, i) => (
          <span
            key={i}
            className="shrink-0 mx-8 text-xs font-mono font-bold uppercase tracking-[0.3em] text-black/40 whitespace-nowrap"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
