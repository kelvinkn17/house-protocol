export default function SectionDivider({ label }: { label: string }) {
  return (
    <div className="relative py-4 overflow-hidden bg-black">
      <div className="flex animate-marquee">
        {Array.from({ length: 20 }).map((_, i) => (
          <span
            key={i}
            className="shrink-0 mx-8 text-xs font-black uppercase tracking-widest text-[#CDFF57]/60 whitespace-nowrap"
          >
            {label}
            <span className="ml-8 text-[#FF6B9D]/60">✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}
