import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_explore/app/play')({
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
    <div className="min-h-screen py-8">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-neutral-100">Play</h1>
          <p className="text-neutral-400">
            Gasless betting with state channels. Open a session, play unlimited rounds.
          </p>
        </div>

        {/* session status */}
        <div className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">Session Status</p>
              <p className="text-lg font-semibold text-neutral-100">No active session</p>
            </div>
            <button className="rounded-lg bg-neutral-100 px-6 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200">
              Open Session
            </button>
          </div>
        </div>

        {/* games grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GAMES.map((game) => (
            <Link
              key={game.slug}
              to="/_explore/app/play/$slug"
              params={{ slug: game.slug }}
              className="group rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
            >
              {/* placeholder for game visual */}
              <div className="mb-4 flex h-24 items-center justify-center rounded-lg bg-neutral-800 text-neutral-600">
                {game.type}
              </div>

              <h3 className="mb-1 font-semibold text-neutral-100 group-hover:text-white">
                {game.name}
              </h3>
              <div className="flex items-center justify-between text-sm text-neutral-500">
                <span>${game.volume} volume</span>
                <span>{game.players} playing</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
