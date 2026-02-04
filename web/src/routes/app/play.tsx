import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/app/play')({
  component: PlayPage,
})

// dummy games data
const GAMES = [
  { slug: 'coinflip', name: 'Coinflip', type: 'pick-one', volume: '124K', players: 89 },
  { slug: 'dice', name: 'Dice', type: 'pick-number', volume: '89K', players: 56 },
  { slug: 'crash', name: 'Crash', type: 'cash-out', volume: '234K', players: 142 },
  { slug: 'mines', name: 'Mines', type: 'reveal-tiles', volume: '67K', players: 34 },
]

function PlayPage() {
  return (
    <div className="pb-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-black mb-2">PLAY</h1>
          <p className="text-black/60 font-mono text-sm">** Gasless betting with state channels. Open a session, play unlimited rounds.</p>
        </div>

        {/* session status */}
        <div
          className="mb-8 bg-white border-2 border-black rounded-2xl p-6"
          style={{ boxShadow: '6px 6px 0px black' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-black/50 uppercase">Session Status</p>
              <p className="text-lg font-black text-black">No active session</p>
            </div>
            <button
              className="px-6 py-3 text-sm font-black uppercase bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1"
              style={{ boxShadow: '4px 4px 0px #FF6B9D' }}
            >
              Open Session
            </button>
          </div>
        </div>

        {/* games grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {GAMES.map((game) => (
            <Link
              key={game.slug}
              to="/app/play/$slug"
              params={{ slug: game.slug }}
              className="group bg-white border-2 border-black rounded-2xl p-5 transition-transform hover:translate-x-1 hover:translate-y-1"
              style={{ boxShadow: '6px 6px 0px black' }}
            >
              {/* placeholder for game visual */}
              <div className="mb-4 flex h-24 items-center justify-center rounded-xl bg-black/5 border-2 border-black/10 text-black/40 text-xs font-mono uppercase">
                {game.type}
              </div>

              <h3 className="mb-1 font-black text-black group-hover:text-black">
                {game.name}
              </h3>
              <div className="flex items-center justify-between text-xs font-mono text-black/50">
                <span>${game.volume} vol</span>
                <span>{game.players} playing</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
