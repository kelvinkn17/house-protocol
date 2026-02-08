import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { cnm } from '@/utils/style'
import AppLayout from '@/components/layout/AppLayout'
import { useBuilderProfile, useBuilderRegister, useBuilderGames } from '@/hooks/useBuilder'
import { useAuthContext } from '@/providers/AuthProvider'
import { isBuilderTestMode } from '@/data/builderTestData'

export const Route = createFileRoute('/build')({
  component: BuildLayout,
})

const NAV_ITEMS = [
  { to: '/build', label: 'Overview', icon: '◉', exact: true },
  { to: '/build/games', label: 'My Games', icon: '◈', exact: false },
  { to: '/build/keys', label: 'API Keys', icon: '◇', exact: false },
  { to: '/build/docs', label: 'SDK', icon: '◎', exact: false },
]

function BuildLayout() {
  const location = useLocation()
  const path = location.pathname
  const isIndex = path === '/build' || path === '/build/'
  const sidebarRef = useRef<HTMLElement>(null)
  const { authenticated, isBackendSynced, isSyncing } = useAuthContext()

  const { data: builder, isLoading } = useBuilderProfile()

  useEffect(() => {
    if (sidebarRef.current) {
      gsap.fromTo(
        sidebarRef.current,
        { x: -40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.1 },
      )
    }
  }, [])

  const testMode = isBuilderTestMode()

  // wait for auth to fully sync before deciding what to show
  const authReady = testMode || (!isSyncing && (!authenticated || isBackendSynced))
  const showRegistration = isIndex && authReady && !isLoading && !builder && !testMode

  return (
    <AppLayout noPadding fullWidth>
      <div className="h-full bg-[#EDEBE6] flex">
        {/* sidebar */}
        <aside
          ref={sidebarRef}
          className="hidden lg:flex flex-col w-64 h-full bg-white border-r-2 border-black"
          style={{ opacity: 0 }}
        >
          {/* header */}
          <div className="shrink-0 p-5 border-b-2 border-black">
            <h2 className="text-lg font-black text-black tracking-tight">
              BUILDER
            </h2>
            <p className="text-xs font-mono text-black/50">Dashboard</p>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.exact
                ? path === item.to || path === item.to + '/'
                : path.startsWith(item.to) && item.to !== '/build'
              const isOverviewActive = item.exact && isIndex

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cnm(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all',
                    isActive || isOverviewActive
                      ? 'bg-[#CDFF57] text-black border-2 border-black'
                      : 'text-black/60 hover:text-black hover:bg-black/5 border-2 border-transparent',
                  )}
                  style={
                    isActive || isOverviewActive
                      ? { boxShadow: '3px 3px 0px black' }
                      : {}
                  }
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="shrink-0 mt-auto border-t border-black/10">
            {/* earnings card */}
            <div className="p-3">
              <div className="bg-black rounded-xl p-4 border-2 border-black">
                <p className="text-xs font-mono text-white/50 uppercase mb-2">
                  Total Earned
                </p>
                <p className="text-2xl font-black text-[#CDFF57]">
                  ${builder ? Number(builder.totalRevenue).toLocaleString() : '0'}
                </p>
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex justify-between text-xs">
                    <span className="font-mono text-white/50">Games</span>
                    <span className="font-bold text-white">
                      {builder?.totalGames ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* quick create */}
            <div className="p-3 pt-0">
              <Link
                to="/build/games/new"
                className="flex items-center justify-center gap-2 w-full py-3 bg-black text-white text-sm font-black uppercase rounded-xl hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
                style={{ boxShadow: '3px 3px 0px #FF6B9D' }}
              >
                + New Game
              </Link>
            </div>
          </div>
        </aside>

        {/* mobile nav */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black z-50">
          <div className="flex">
            {NAV_ITEMS.map((item) => {
              const isActive = item.exact
                ? path === item.to || path === item.to + '/'
                : path.startsWith(item.to) && item.to !== '/build'
              const isOverviewActive = item.exact && isIndex

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cnm(
                    'flex-1 flex flex-col items-center py-3 text-xs font-bold',
                    isActive || isOverviewActive
                      ? 'text-black bg-[#CDFF57]'
                      : 'text-black/50',
                  )}
                >
                  <span className="text-lg mb-1">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>

        {/* main content */}
        <main className="flex-1 h-full overflow-y-auto pb-20 lg:pb-0">
          {isIndex && (!authReady || isLoading) ? (
            <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
              <div className="bg-white border-2 border-black rounded-2xl p-8 text-center" style={{ boxShadow: '5px 5px 0px black' }}>
                <p className="text-black/50 font-mono">Loading...</p>
              </div>
            </div>
          ) : showRegistration ? (
            <BuildRegistrationPage />
          ) : isIndex ? (
            <BuildOverviewPage builder={builder} />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </AppLayout>
  )
}

function BuildRegistrationPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [email, setEmail] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const { authenticated, login } = useAuthContext()

  const register = useBuilderRegister()

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set('.reg-fade', { y: 20, opacity: 0 })
      gsap.to('.reg-fade', {
        y: 0,
        opacity: 1,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power2.out',
        delay: 0.15,
      })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  const handleRegister = async () => {
    if (!name.trim()) return
    try {
      const result = await register.mutateAsync({ name: name.trim(), website: website.trim() || undefined, email: email.trim() || undefined })
      setCreatedKey(result.apiKey)
    } catch (e) {
      // error handled by mutation
    }
  }

  if (!authenticated) {
    return (
      <div ref={containerRef} className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
        <div
          className="reg-fade bg-white border-2 border-black rounded-2xl p-8 text-center opacity-0"
          style={{ boxShadow: '5px 5px 0px black' }}
        >
          <h1 className="text-3xl font-black text-black mb-2">Become a Builder</h1>
          <p className="text-black/50 font-mono text-sm mb-6">Connect your wallet to get started</p>
          <button
            onClick={() => login()}
            className="px-8 py-3 bg-black text-white font-black uppercase text-sm rounded-full hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
            style={{ boxShadow: '3px 3px 0px #FF6B9D' }}
          >
            Connect Wallet
          </button>
        </div>
      </div>
    )
  }

  if (createdKey) {
    return (
      <div ref={containerRef} className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
        <div
          className="reg-fade bg-white border-2 border-black rounded-2xl p-8 opacity-0"
          style={{ boxShadow: '5px 5px 0px black' }}
        >
          <div className="text-center mb-6">
            <span className="inline-flex w-16 h-16 rounded-full bg-[#CDFF57] border-2 border-black items-center justify-center text-3xl font-black mb-4">
              ✓
            </span>
            <h1 className="text-2xl font-black text-black">You're in!</h1>
            <p className="text-black/50 font-mono text-xs mt-1">Builder account created</p>
          </div>
          <div className="bg-black rounded-xl p-4 mb-4">
            <p className="text-xs font-mono text-white/50 uppercase mb-2">Your API Key (save this, shown only once)</p>
            <code className="text-sm font-mono text-[#CDFF57] break-all">{createdKey}</code>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(createdKey)}
            className="w-full py-3 bg-[#CDFF57] text-black font-black uppercase text-sm rounded-xl border-2 border-black hover:translate-x-0.5 hover:translate-y-0.5 transition-transform mb-3"
            style={{ boxShadow: '3px 3px 0px black' }}
          >
            Copy Key
          </button>
          <Link
            to="/build"
            className="block text-center text-sm font-bold text-black/50 hover:text-black"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      <div
        className="reg-fade bg-white border-2 border-black rounded-2xl p-8 opacity-0"
        style={{ boxShadow: '5px 5px 0px black' }}
      >
        <h1 className="text-2xl font-black text-black mb-1">Register as Builder</h1>
        <p className="text-black/50 font-mono text-xs mb-6">Create games, earn 25% of house edge</p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-xs font-bold text-black mb-2 block">Builder Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your studio or project name"
              className="w-full border-2 border-black rounded-xl px-4 py-3 text-black font-bold placeholder-black/30 outline-none focus:ring-2 focus:ring-black/20"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-black mb-2 block">Website</label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              className="w-full border-2 border-black rounded-xl px-4 py-3 text-black placeholder-black/30 outline-none focus:ring-2 focus:ring-black/20"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-black mb-2 block">Email</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border-2 border-black rounded-xl px-4 py-3 text-black placeholder-black/30 outline-none focus:ring-2 focus:ring-black/20"
            />
          </div>
        </div>

        <button
          onClick={handleRegister}
          disabled={!name.trim() || register.isPending}
          className={cnm(
            'w-full py-3 text-sm font-black uppercase rounded-xl border-2 border-black transition-all',
            name.trim() && !register.isPending
              ? 'bg-[#CDFF57] text-black hover:translate-x-0.5 hover:translate-y-0.5'
              : 'bg-black/10 text-black/40 cursor-not-allowed',
          )}
          style={name.trim() ? { boxShadow: '3px 3px 0px black' } : {}}
        >
          {register.isPending ? 'Creating...' : 'Register'}
        </button>

        {register.isError && (
          <p className="text-xs font-mono text-[#FF6B9D] mt-3 text-center">
            {register.error?.message || 'Something went wrong'}
          </p>
        )}
      </div>
    </div>
  )
}

function BuildOverviewPage({ builder }: { builder: any }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { data: games } = useBuilderGames()

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set('.main-fade', { y: 20, opacity: 0 })
      gsap.to('.main-fade', {
        y: 0,
        opacity: 1,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power2.out',
        delay: 0.15,
      })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  const recentGames = (games || []).slice(0, 3)

  return (
    <div ref={containerRef} className="p-4 md:p-6 lg:p-8 max-w-5xl">
      {/* header + stats combined */}
      <div
        className="main-fade bg-white border-2 border-black rounded-2xl p-5 mb-5 opacity-0"
        style={{ boxShadow: '5px 5px 0px black' }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-5 border-b-2 border-black/10">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-black tracking-tight">
              Welcome back{builder?.name ? `, ${builder.name}` : ''}
            </h1>
            <p className="text-black/50 font-mono text-xs mt-1">
              ** Build games, earn 25% of house edge
            </p>
          </div>
          <Link
            to="/build/games/new"
            className="px-6 py-3 bg-black text-white text-xs font-black uppercase rounded-full hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
            style={{ boxShadow: '3px 3px 0px #FF6B9D' }}
          >
            + Create Game
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'Games',
              value: builder?.totalGames ?? 0,
              sub: `${builder?.activeGames ?? 0} active`,
            },
            {
              label: 'Total Earned',
              value: `$${Number(builder?.totalRevenue ?? 0).toLocaleString()}`,
              sub: '25% of house edge',
              highlight: true,
            },
            {
              label: 'Total Bets',
              value: (games || []).reduce((acc: number, g: any) => acc + (g.totalBets ?? 0), 0).toLocaleString(),
              sub: 'All time',
            },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-[10px] font-mono text-black/50 uppercase">
                {stat.label}
              </p>
              <p
                className={cnm(
                  'text-xl md:text-2xl font-black',
                  stat.highlight ? 'text-[#7BA318]' : 'text-black',
                )}
              >
                {stat.value}
              </p>
              <p className="text-[10px] font-mono text-black/40">{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* main content: games + info */}
      <div className="grid lg:grid-cols-5 gap-5">
        {/* games list */}
        <div
          className="main-fade lg:col-span-3 bg-white border-2 border-black rounded-2xl overflow-hidden opacity-0"
          style={{ boxShadow: '5px 5px 0px black' }}
        >
          <div className="border-b-2 border-black px-4 py-3 flex items-center justify-between">
            <p className="text-xs font-mono text-black/50 uppercase">
              My Games
            </p>
            <Link
              to="/build/games"
              className="text-xs font-bold text-black/50 hover:text-black"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-black/10">
            {recentGames.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-black/40 font-mono text-sm mb-3">No games yet</p>
                <Link
                  to="/build/games/new"
                  className="inline-flex px-5 py-2.5 bg-[#CDFF57] text-black text-xs font-black uppercase rounded-full border-2 border-black"
                  style={{ boxShadow: '3px 3px 0px black' }}
                >
                  Create your first game
                </Link>
              </div>
            ) : (
              recentGames.map((game: any) => (
                <Link
                  key={game.slug}
                  to="/build/games/$id"
                  params={{ id: game.slug }}
                  className="flex items-center justify-between p-4 hover:bg-black/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cnm(
                        'w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center text-sm font-black',
                        game.isActive
                          ? 'bg-[#CDFF57] text-black'
                          : 'bg-black/10 text-black/40',
                      )}
                    >
                      {game.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-black text-sm">{game.name}</p>
                      <p className="text-[10px] font-mono text-black/50">
                        {game.gameType} {game.isActive ? '• active' : '• paused'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] font-mono text-black/40">Vol</p>
                      <p className="font-bold text-black text-sm">
                        ${Number(game.totalVolume).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-mono text-black/40">
                        Earned
                      </p>
                      <p className="font-bold text-[#7BA318] text-sm">
                        ${Number(game.totalRevenue).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-black/30 group-hover:text-black transition-colors">
                      →
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* right column: sdk + revenue */}
        <div
          className="main-fade lg:col-span-2 space-y-5 opacity-0"
        >
          {/* sdk card */}
          <div
            className="bg-black border-2 border-black rounded-2xl overflow-hidden"
            style={{ boxShadow: '5px 5px 0px #FF6B9D' }}
          >
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-mono text-white/50 uppercase">
                  React SDK
                </p>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-[#CDFF57] text-black rounded">
                  Coming Soon
                </span>
              </div>
              <p className="text-[10px] font-mono text-white/40">
                @house-protocol/react-sdk
              </p>
            </div>
            <pre className="p-4 text-[11px] font-mono text-white/80 overflow-x-auto">
{`import { HouseProvider, CoinFlip }
  from '@house-protocol/react-sdk'

<HouseProvider apiKey={API_KEY}>
  <CoinFlip gameSlug="my-flip" />
</HouseProvider>`}
            </pre>
            <div className="px-4 pb-4">
              <Link
                to="/build/docs"
                className="block w-full py-2.5 text-center text-xs font-black uppercase text-black bg-[#CDFF57] rounded-lg border-2 border-black hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
              >
                View SDK Docs
              </Link>
            </div>
          </div>

          {/* revenue split */}
          <div
            className="bg-white border-2 border-black rounded-2xl p-4"
            style={{ boxShadow: '5px 5px 0px black' }}
          >
            <p className="text-xs font-mono text-black/50 uppercase mb-2">
              Revenue Split
            </p>
            <p className="text-[10px] font-mono text-black/40 mb-3">
              $100 bet @ 2% edge = $2
            </p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-black/60">Stakers</span>
                <span className="font-bold text-black">$1.40 (70%)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-black/60">You</span>
                <span className="font-bold text-[#7BA318]">$0.50 (25%)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-black/60">Protocol</span>
                <span className="font-bold text-black/50">$0.10 (5%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
