import { Link, useLocation } from '@tanstack/react-router'
import { cnm } from '@/utils/style'
import ConnectButton from '@/components/ConnectButton'

interface AppLayoutProps {
  children: React.ReactNode
  noPadding?: boolean
}

export default function AppLayout({ children, noPadding }: AppLayoutProps) {
  const location = useLocation()
  const path = location.pathname
  const isBuild = path.startsWith('/build')

  return (
    <div className="min-h-screen bg-[#cdff57]">
      {/* Sticky navbar */}
      <header className="sticky top-0 z-40 h-20 bg-[#cdff57] px-4 sm:px-6">
        <nav className="mx-auto flex h-full max-w-7xl items-center justify-between">
          <Link to="/" className="flex items-center">
            <div className="px-3 py-1.5 bg-black text-[#CDFF57] font-black text-lg tracking-tight">
              HOUSE PROTOCOL
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <NavLink to="/app/stake" active={path.includes('/stake')}>
              STAKERS
            </NavLink>
            <NavLink to="/build" active={isBuild}>
              BUILDERS
            </NavLink>
            <NavLink to="/docs" active={path.includes('/docs')}>
              DOCS
            </NavLink>
          </div>

          <ConnectButton />
        </nav>
      </header>

      {/* Sticky inverted corners */}
      <div className="pointer-events-none sticky top-20 z-20 mx-2 flex justify-between sm:mx-6">
        <div className="h-6 w-6 bg-[#cdff57] sm:h-8 sm:w-8 [mask-image:radial-gradient(circle_at_100%_100%,transparent_23px,black_24px)] sm:[mask-image:radial-gradient(circle_at_100%_100%,transparent_31px,black_32px)]" />
        <div className="h-6 w-6 bg-[#cdff57] sm:h-8 sm:w-8 [mask-image:radial-gradient(circle_at_0%_100%,transparent_23px,black_24px)] sm:[mask-image:radial-gradient(circle_at_0%_100%,transparent_31px,black_32px)]" />
      </div>

      {/* Main content wrapper with rounded top card */}
      <div className="relative -mt-6 px-2 sm:-mt-8 sm:px-6">
        <main className="relative min-h-[calc(100vh-56px)] overflow-hidden rounded-t-[24px] bg-[#EDEBE6] sm:rounded-t-[32px]">
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
        </main>
      </div>
    </div>
  )
}

function NavLink({
  to,
  active,
  children,
}: {
  to: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className={cnm(
        'text-sm font-black uppercase tracking-wide transition-colors',
        active ? 'text-black' : 'text-black/50 hover:text-black'
      )}
    >
      {children}
    </Link>
  )
}
