import { Link, useLocation } from '@tanstack/react-router'
import { cnm } from '@/utils/style'

interface AppLayoutProps {
  children: React.ReactNode
  noPadding?: boolean
}

export default function AppLayout({ children, noPadding }: AppLayoutProps) {
  const location = useLocation()
  const path = location.pathname
  const isBuild = path.startsWith('/build')

  return (
    <div className="min-h-screen bg-[#151515]">
      {/* Sticky navbar */}
      <header className="sticky top-0 z-40 h-14 bg-[#151515] px-4 sm:px-6">
        <nav className="mx-auto flex h-full max-w-7xl items-center justify-between">
          <Link to="/" className="flex items-center">
            <img
              src="/assets/logos/the-house-protocol-horizontal-logo.svg"
              alt="House Protocol"
              className="h-7"
            />
          </Link>

          <div className="flex items-center gap-1">
            <NavLink to="/app/stake" active={path.includes('/stake')}>
              Stake
            </NavLink>
            <NavLink to="/app/play" active={path.includes('/play')}>
              Play
            </NavLink>
            <NavLink to="/build" active={isBuild}>
              Build
            </NavLink>
          </div>

          <button className="rounded-sm px-4 py-2 text-sm font-bold transition-colors bg-[#0b0d0b] text-white">
            Connect Wallet
          </button>
        </nav>
      </header>

      {/* Sticky inverted corners */}
      <div className="pointer-events-none sticky top-14 z-20 mx-2 flex justify-between sm:mx-6">
        <div className="h-6 w-6 bg-[#151515] sm:h-8 sm:w-8 [mask-image:radial-gradient(circle_at_100%_100%,transparent_23px,black_24px)] sm:[mask-image:radial-gradient(circle_at_100%_100%,transparent_31px,black_32px)]" />
        <div className="h-6 w-6 bg-[#151515] sm:h-8 sm:w-8 [mask-image:radial-gradient(circle_at_0%_100%,transparent_23px,black_24px)] sm:[mask-image:radial-gradient(circle_at_0%_100%,transparent_31px,black_32px)]" />
      </div>

      {/* Main content wrapper */}
      <div className="relative -mt-6 px-2 sm:-mt-8 sm:px-6">
        <main className="relative min-h-[calc(100vh-56px)] overflow-hidden rounded-t-[24px] bg-[#0b0d0b] sm:rounded-t-[32px]">
          <div
            className={cnm(
              'min-h-[calc(100vh-56px)]',
              !noPadding && 'px-4 py-12 sm:px-6 sm:py-16 lg:px-12 lg:py-20',
            )}
          >
            <div className={cnm(!noPadding && 'mx-auto max-w-7xl')}>
              {children}
            </div>
          </div>
          <footer className="border-t border-[#1a3d30] py-8">
            <div className="mx-auto max-w-6xl px-4 text-center text-sm text-neutral-600 font-mono tracking-wider">
              HOUSE//PROTOCOL — EVERYONE CAN BE THE HOUSE
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={cnm(
        'px-3 py-2 text-sm font-bold uppercase tracking-wider transition-colors',
        active ? 'text-white' : 'text-white/60 hover:text-white'
      )}
    >
      {children}
    </Link>
  )
}
