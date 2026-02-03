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
    <div className="min-h-screen" style={{ backgroundColor: '#0b0d0b' }}>
      {/* nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-sm" style={{ borderColor: '#1a3d30', backgroundColor: 'rgba(11, 13, 11, 0.9)' }}>
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/explore" className="flex items-center">
            <img
              src="/assets/logos/the-house-protocol-horizontal-logo.svg"
              alt="House Protocol"
              className="h-7"
            />
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

          <button
            className="px-4 py-2 text-sm font-bold transition-colors"
            style={{ backgroundColor: '#dcb865', color: '#0b0d0b' }}
          >
            Connect Wallet
          </button>
        </div>
      </nav>

      {/* main content */}
      <main className="pt-14">
        <Outlet />
      </main>

      {/* footer */}
      <footer className="border-t py-8" style={{ borderColor: '#1a3d30' }}>
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-neutral-600 font-mono tracking-wider">
          HOUSE//PROTOCOL — EVERYONE CAN BE THE HOUSE
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
        'px-3 py-2 text-sm font-bold uppercase tracking-wider transition-colors',
        active ? 'text-[#dcb865]' : 'text-neutral-500 hover:text-neutral-100'
      )}
    >
      {children}
    </Link>
  )
}
