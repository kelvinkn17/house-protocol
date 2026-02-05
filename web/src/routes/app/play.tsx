import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router'
import { Coins, Skull, Target, type LucideIcon } from 'lucide-react'
import { cnm } from '@/utils/style'

const GAMES: { slug: string; name: string; type: string; color: string; Icon: LucideIcon }[] = [
  { slug: 'double-or-nothing', name: 'Double or Nothing', type: 'cash-out', color: '#CDFF57', Icon: Coins },
  { slug: 'death', name: 'Death', type: 'reveal-tiles', color: '#FF6B9D', Icon: Skull },
  { slug: 'range', name: 'Range', type: 'pick-number', color: '#dcb865', Icon: Target },
]

export const Route = createFileRoute('/app/play')({
  component: PlayLayout,
})

function PlayLayout() {
  const location = useLocation()
  const path = location.pathname

  return (
    <div className="flex gap-6">
      {/* sidebar */}
      <aside className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-24">
          <div
            className="bg-white border-2 border-black rounded-2xl overflow-hidden"
            style={{ boxShadow: '5px 5px 0px black' }}
          >
            <div className="px-4 py-3 border-b-2 border-black/10">
              <h2 className="text-sm font-black text-black uppercase tracking-wider">Games</h2>
            </div>
            <div className="p-2">
              {GAMES.map((game) => {
                const isActive = path.includes(`/play/${game.slug}`)
                return (
                  <Link
                    key={game.slug}
                    to="/app/play/$slug"
                    params={{ slug: game.slug }}
                    className={cnm(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-0.5',
                      isActive
                        ? 'text-black'
                        : 'text-black/70 hover:bg-black/5',
                    )}
                    style={
                      isActive
                        ? { backgroundColor: `${game.color}25`, boxShadow: `3px 3px 0px ${game.color}` }
                        : undefined
                    }
                  >
                    <div
                      className="w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: isActive ? game.color : `${game.color}20`,
                        borderColor: isActive ? 'black' : `${game.color}50`,
                      }}
                    >
                      <game.Icon size={14} className="text-black" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={cnm(
                          'text-sm font-bold truncate',
                          isActive ? 'text-black' : 'text-black/70',
                        )}
                      >
                        {game.name}
                      </p>
                      <p className="text-[10px] font-mono text-black/40 truncate">
                        {game.type}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* builder CTA */}
          <Link
            to="/build"
            className="mt-4 block bg-black border-2 border-black rounded-2xl p-4 transition-transform hover:translate-x-0.5 hover:translate-y-0.5"
            style={{ boxShadow: '4px 4px 0px #FF6B9D' }}
          >
            <p className="text-[10px] font-mono text-white/40 uppercase mb-1">For Builders</p>
            <p className="text-xs text-white/80">Build your own game with the SDK</p>
          </Link>
        </div>
      </aside>

      {/* content */}
      <div className="flex-1 min-w-0">
        {/* mobile game tabs */}
        <div className="lg:hidden mb-6">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {GAMES.map((game) => {
              const isActive = path.includes(`/play/${game.slug}`)
              return (
                <Link
                  key={game.slug}
                  to="/app/play/$slug"
                  params={{ slug: game.slug }}
                  className={cnm(
                    'shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase border-2 border-black rounded-xl transition-all',
                    isActive ? 'text-black' : 'bg-white text-black/50',
                  )}
                  style={
                    isActive
                      ? { backgroundColor: game.color, boxShadow: '3px 3px 0px black' }
                      : undefined
                  }
                >
                  <game.Icon size={12} />
                  {game.name}
                </Link>
              )
            })}
          </div>
        </div>

        <Outlet />
      </div>
    </div>
  )
}
