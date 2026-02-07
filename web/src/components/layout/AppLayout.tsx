import { Link, useLocation } from '@tanstack/react-router'
import { useState } from 'react'
import { cnm } from '@/utils/style'
import ConnectButton from '@/components/ConnectButton'

interface AppLayoutProps {
  children: React.ReactNode
  noPadding?: boolean
  hideNavLogo?: boolean
}

export default function AppLayout({ children, noPadding, hideNavLogo }: AppLayoutProps) {
  const location = useLocation()
  const path = location.pathname
  const isBuild = path.startsWith('/build')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#cdff57]">
      {/* Sticky navbar */}
      <header className="sticky top-0 z-40 h-20 bg-[#cdff57] px-4 sm:px-6">
        <nav className="relative mx-auto flex h-full max-w-7xl items-center justify-between">
          <Link to="/" className="relative z-10 flex items-center">
            <img
              src="/assets/logos/house-protocol-horizontal-logo.svg"
              alt="House Protocol"
              className={cnm('h-12 sm:h-16', hideNavLogo && 'invisible')}
            />
          </Link>

          {/* centered nav links, absolutely positioned so logo/button don't affect centering */}
          <div className="absolute inset-0 hidden md:flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
              <NavLink to="/app/stake" active={path.includes('/stake')}>
                STAKERS
              </NavLink>
              <NavLink to="/build" active={isBuild}>
                BUILDERS
              </NavLink>
              <NavLink to="/app/play" active={path.includes('/play')}>
                PLAY
              </NavLink>
              <NavLink to="/app/faucet" active={path.includes('/faucet')}>
                FAUCET
              </NavLink>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <ConnectButton />
            {/* mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-xl border-2 border-black bg-white"
              style={{ boxShadow: '3px 3px 0px black' }}
              aria-label="Toggle menu"
            >
              <span className={cnm('block h-0.5 w-5 bg-black transition-all duration-200', mobileMenuOpen && 'translate-y-[3px] rotate-45')} />
              <span className={cnm('block h-0.5 w-5 bg-black mt-1 transition-all duration-200', mobileMenuOpen && 'opacity-0')} />
              <span className={cnm('block h-0.5 w-5 bg-black mt-1 transition-all duration-200', mobileMenuOpen && '-translate-y-[3px] -rotate-45')} />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu dropdown */}
      <div
        className={cnm(
          'md:hidden fixed top-20 left-0 right-0 z-30 bg-[#cdff57] border-b-2 border-black overflow-hidden transition-all duration-300 ease-out',
          mobileMenuOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0 pointer-events-none',
        )}
      >
        <div className="flex flex-col items-center gap-1 py-4 px-4">
          <MobileNavLink to="/app/stake" active={path.includes('/stake')} onClick={() => setMobileMenuOpen(false)}>
            STAKERS
          </MobileNavLink>
          <MobileNavLink to="/build" active={isBuild} onClick={() => setMobileMenuOpen(false)}>
            BUILDERS
          </MobileNavLink>
          <MobileNavLink to="/app/play" active={path.includes('/play')} onClick={() => setMobileMenuOpen(false)}>
            PLAY
          </MobileNavLink>
          <MobileNavLink to="/app/faucet" active={path.includes('/faucet')} onClick={() => setMobileMenuOpen(false)}>
            FAUCET
          </MobileNavLink>
        </div>
      </div>

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
        'text-[15px] font-black uppercase tracking-wide transition-colors px-4 py-2.5 rounded-xl',
        active ? 'text-black' : 'text-black/50 hover:text-black'
      )}
    >
      {children}
    </Link>
  )
}

function MobileNavLink({
  to,
  active,
  children,
  onClick,
}: {
  to: string
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cnm(
        'w-full text-center text-base font-black uppercase tracking-wide transition-colors px-4 py-3 rounded-xl',
        active ? 'text-black bg-black/10' : 'text-black/60 hover:text-black',
      )}
    >
      {children}
    </Link>
  )
}
