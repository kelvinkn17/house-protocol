import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { cnm } from '@/utils/style'
import AppLayout from '@/components/layout/AppLayout'

export const Route = createFileRoute('/build')({
  component: BuildLayout,
})

const BUILDER_STATS = {
  totalGames: 3,
  activeGames: 2,
  totalEarnings: 2_770,
  pendingPayout: 124.5,
}

const NAV_ITEMS = [
  { to: '/build', label: 'Overview', icon: '◉', exact: true },
  { to: '/build/games', label: 'My Games', icon: '◈', exact: false },
  { to: '/build/keys', label: 'API Keys', icon: '◇', exact: false },
  { to: '/build/analytics', label: 'Analytics', icon: '◆', exact: false },
]

function BuildLayout() {
  const location = useLocation()
  const path = location.pathname
  const isIndex = path === '/build' || path === '/build/'
  const sidebarRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (sidebarRef.current) {
      gsap.fromTo(
        sidebarRef.current,
        { x: -40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.1 },
      )
    }
  }, [])

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
                  ${BUILDER_STATS.totalEarnings.toLocaleString()}
                </p>
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex justify-between text-xs">
                    <span className="font-mono text-white/50">Pending</span>
                    <span className="font-bold text-white">
                      ${BUILDER_STATS.pendingPayout}
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
          {isIndex ? <BuildOverviewPage /> : <Outlet />}
        </main>
      </div>
    </AppLayout>
  )
}

const RECENT_GAMES = [
  {
    id: 'lucky-flip',
    name: 'Lucky Flip',
    type: 'pick-one',
    status: 'active',
    earnings24h: 62,
    volume24h: 12400,
  },
  {
    id: 'dice-royale',
    name: 'Dice Royale',
    type: 'pick-number',
    status: 'active',
    earnings24h: 30.75,
    volume24h: 8200,
  },
  {
    id: 'moon-crash',
    name: 'Moon Crash',
    type: 'cash-out',
    status: 'pending',
    earnings24h: 0,
    volume24h: 0,
  },
]

function BuildOverviewPage() {
  const containerRef = useRef<HTMLDivElement>(null)

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
              Welcome back
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Games',
              value: BUILDER_STATS.totalGames,
              sub: `${BUILDER_STATS.activeGames} active`,
            },
            { label: '24h Volume', value: '$20.6K', sub: '+12% vs 7d' },
            {
              label: '24h Earnings',
              value: '$92.75',
              sub: 'Your cut',
              highlight: true,
            },
            { label: 'Players', value: '342', sub: 'Unique' },
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
            {RECENT_GAMES.map((game) => (
              <Link
                key={game.id}
                to="/build/games/$id"
                params={{ id: game.id }}
                className="flex items-center justify-between p-4 hover:bg-black/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cnm(
                      'w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center text-sm font-black',
                      game.status === 'active'
                        ? 'bg-[#CDFF57] text-black'
                        : 'bg-black/10 text-black/40',
                    )}
                  >
                    {game.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-black text-sm">{game.name}</p>
                    <p className="text-[10px] font-mono text-black/50">
                      {game.type} • {game.status}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-mono text-black/40">Vol</p>
                    <p className="font-bold text-black text-sm">
                      ${game.volume24h.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-mono text-black/40">
                      Earned
                    </p>
                    <p className="font-bold text-[#7BA318] text-sm">
                      ${game.earnings24h.toFixed(2)}
                    </p>
                  </div>
                  <span className="text-black/30 group-hover:text-black transition-colors">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* right column: how it works + revenue */}
        <div
          className="main-fade lg:col-span-2 bg-white border-2 border-black rounded-2xl overflow-hidden opacity-0"
          style={{ boxShadow: '5px 5px 0px black' }}
        >
          {/* how it works */}
          <div className="p-4 border-b-2 border-black/10">
            <p className="text-xs font-mono text-black/50 uppercase mb-3">
              How It Works
            </p>
            <div className="space-y-2">
              {[
                { n: '1', text: 'Pick a game type' },
                { n: '2', text: 'Configure house edge' },
                { n: '3', text: 'Integrate SDK' },
                { n: '4', text: 'Earn 25% of edge' },
              ].map((step) => (
                <div key={step.n} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded bg-[#FF6B9D] text-black text-xs font-black flex items-center justify-center border border-black">
                    {step.n}
                  </span>
                  <p className="text-sm text-black/80">{step.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* revenue split */}
          <div className="p-4 bg-black">
            <p className="text-xs font-mono text-white/50 uppercase mb-2">
              Revenue Split
            </p>
            <p className="text-[10px] font-mono text-white/40 mb-3">
              $100 bet @ 2% edge = $2
            </p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-white/60">Stakers</span>
                <span className="font-bold text-white">$1.40 (70%)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/60">You</span>
                <span className="font-bold text-[#CDFF57]">$0.50 (25%)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/60">Protocol</span>
                <span className="font-bold text-white/80">$0.10 (5%)</span>
              </div>
            </div>
          </div>

          {/* sdk preview */}
          <div className="border-t-2 border-black">
            <div className="px-4 py-2 flex items-center justify-between bg-black/5 border-b border-black/10">
              <span className="text-[10px] font-mono text-black/50">
                SDK Preview
              </span>
              <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-[#CDFF57] text-black rounded">
                TS
              </span>
            </div>
            <pre className="p-3 text-[11px] font-mono text-black/70 overflow-x-auto">
              {`const { placeBet } = useBet('game-id')
const result = await placeBet({
  choice: 'heads', amount: 100
})`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
