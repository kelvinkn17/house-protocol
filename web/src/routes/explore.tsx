import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router'
import { cnm } from '@/utils/style'

export const Route = createFileRoute('/explore')({
  component: ExploreLayout,
})

// shared layout for all exploration pages
function ExploreLayout() {
  const location = useLocation()
  const path = location.pathname
  const isBuild = path.startsWith('/explore/build')

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/explore" className="text-lg font-semibold tracking-tight text-neutral-100">
            House Protocol
          </Link>

          <div className="flex items-center gap-1">
            <NavLink to="/explore/app/stake" active={path.includes('/stake')}>
              Stake
            </NavLink>
            <NavLink to="/explore/app/play" active={path.includes('/play')}>
              Play
            </NavLink>
            <NavLink to="/explore/build" active={isBuild}>
              Build
            </NavLink>
          </div>

          <button className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200">
            Connect Wallet
          </button>
        </div>
      </nav>

      {/* main content */}
      <main className="pt-14">
        <Outlet />
      </main>

      {/* footer */}
      <footer className="border-t border-neutral-800 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-neutral-500">
          House Protocol, Everyone can be the house.
        </div>
      </footer>
    </div>
  )
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={cnm(
        'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-100'
      )}
    >
      {children}
    </Link>
  )
}
