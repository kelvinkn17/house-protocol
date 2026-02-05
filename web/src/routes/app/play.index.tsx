import { createFileRoute, Link } from '@tanstack/react-router'
import { cnm } from '@/utils/style'
import AnimateComponent from '@/components/elements/AnimateComponent'

export const Route = createFileRoute('/app/play/')({
  component: PlayPage,
})

const GAMES = [
  {
    slug: 'double-or-nothing',
    name: 'Double or Nothing',
    type: 'cash-out',
    description: 'Win 2x or lose it all. Keep doubling or cash out anytime.',
    color: '#CDFF57',
    volume: '234K',
    players: 142,
  },
  {
    slug: 'death',
    name: 'Death',
    type: 'reveal-tiles',
    description: 'Pick the safe tile each row. One wrong pick and you are dead.',
    color: '#FF6B9D',
    volume: '156K',
    players: 89,
  },
  {
    slug: 'range',
    name: 'Range',
    type: 'pick-number',
    description: 'Set your target. Over, under, or in range. You decide the odds.',
    color: '#dcb865',
    volume: '189K',
    players: 67,
  },
]

function PlayPage() {
  return (
    <div className="pb-12">
      <div className="mx-auto max-w-6xl">
        <AnimateComponent delay={50}>
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-black mb-2">
              PLAY
            </h1>
            <p className="text-black/60 font-mono text-sm">
              ** Demo games built with House Protocol SDK. Each one uses a different game primitive.
            </p>
          </div>
        </AnimateComponent>

        {/* builder banner */}
        <AnimateComponent delay={130}>
          <div
            className="mb-8 bg-black border-2 border-black rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style={{ boxShadow: '6px 6px 0px #FF6B9D' }}
          >
            <div>
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1">
                For Builders
              </p>
              <p className="text-sm text-white/80">
                These games showcase what you can build with House Protocol. Each game is a
                different primitive, fully configurable via the SDK.
              </p>
            </div>
            <Link
              to="/build"
              className="shrink-0 px-5 py-2.5 text-xs font-black uppercase bg-white text-black border-2 border-white rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1 text-center"
            >
              Build Yours
            </Link>
          </div>
        </AnimateComponent>

        {/* games grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((game, i) => (
            <AnimateComponent key={game.slug} delay={210 + i * 80}>
              <Link
                to="/app/play/$slug"
                params={{ slug: game.slug }}
                className="group block bg-white border-2 border-black rounded-2xl overflow-hidden transition-transform hover:translate-x-1 hover:translate-y-1"
                style={{ boxShadow: '6px 6px 0px black' }}
              >
                {/* game visual preview */}
                <div
                  className="h-36 flex items-center justify-center border-b-2 border-black"
                  style={{ backgroundColor: `${game.color}15` }}
                >
                  <GamePreview slug={game.slug} color={game.color} />
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full border-2 border-black"
                      style={{ backgroundColor: game.color, boxShadow: '2px 2px 0px black' }}
                    >
                      {game.type}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-black mb-1">{game.name}</h3>
                  <p className="text-xs text-black/50 mb-4 leading-relaxed">
                    {game.description}
                  </p>
                  <div className="flex items-center justify-between text-[10px] font-mono text-black/40 uppercase">
                    <span>${game.volume} vol</span>
                    <span>{game.players} playing</span>
                  </div>
                </div>
              </Link>
            </AnimateComponent>
          ))}
        </div>
      </div>
    </div>
  )
}

function GamePreview({ slug, color }: { slug: string; color: string }) {
  if (slug === 'double-or-nothing') {
    return (
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-full border-2 border-black flex items-center justify-center font-black text-xl"
          style={{ backgroundColor: color }}
        >
          2x
        </div>
        <span className="text-xl font-black text-black/15">&rarr;</span>
        <div
          className="w-16 h-16 rounded-full border-2 border-black/20 flex items-center justify-center font-black text-xl text-black/25"
          style={{ backgroundColor: `${color}30` }}
        >
          4x
        </div>
      </div>
    )
  }

  if (slug === 'death') {
    return (
      <div className="grid grid-cols-3 gap-1.5">
        {Array.from({ length: 9 }).map((_, i) => {
          const isBomb = i === 1 || i === 5 || i === 6
          return (
            <div
              key={i}
              className={cnm(
                'w-9 h-9 rounded-lg border-2',
                isBomb ? 'border-black bg-[#FF6B9D]' : 'border-black/15 bg-white',
              )}
            />
          )
        })}
      </div>
    )
  }

  if (slug === 'range') {
    return (
      <div className="w-44">
        <div className="relative h-6 bg-black/10 rounded-full border-2 border-black overflow-hidden">
          <div
            className="absolute top-0 bottom-0 rounded-full"
            style={{ left: '35%', width: '30%', backgroundColor: color }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] font-mono text-black/30">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>
    )
  }

  return null
}
