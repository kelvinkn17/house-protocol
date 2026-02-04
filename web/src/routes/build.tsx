import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { cnm } from '@/utils/style'
import AppLayout from '@/components/layout/AppLayout'

export const Route = createFileRoute('/build')({
  component: BuildLayout,
})

// mock data for sidebar stats
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
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set('.sidebar-fade', { x: -20, opacity: 0 })
      gsap.to('.sidebar-fade', {
        x: 0,
        opacity: 1,
        duration: 0.5,
        stagger: 0.05,
        ease: 'power2.out',
        delay: 0.1,
      })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  return (
    <AppLayout noPadding>
      <div ref={containerRef} className="min-h-screen bg-[#EDEBE6] flex">
        {/* sidebar, always visible */}
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r-2 border-black sticky top-0 h-screen overflow-y-auto">
          {/* header */}
          <div className="sidebar-fade p-5 border-b-2 border-black opacity-0">
            <h2 className="text-lg font-black text-black tracking-tight">BUILDER</h2>
            <p className="text-xs font-mono text-black/50">Dashboard</p>
          </div>

          {/* nav */}
          <nav className="flex-1 p-3">
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
                    'sidebar-fade flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all mb-1 opacity-0',
                    (isActive || isOverviewActive)
                      ? 'bg-[#CDFF57] text-black border-2 border-black'
                      : 'text-black/60 hover:text-black hover:bg-black/5'
                  )}
                  style={(isActive || isOverviewActive) ? { boxShadow: '3px 3px 0px black' } : {}}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* earnings card */}
          <div className="sidebar-fade p-3 opacity-0">
            <div
              className="bg-black rounded-xl p-4 border-2 border-black"
              style={{ boxShadow: '4px 4px 0px #FF6B9D' }}
            >
              <p className="text-xs font-mono text-white/50 uppercase mb-2">Total Earned</p>
              <p className="text-2xl font-black text-[#CDFF57]">${BUILDER_STATS.totalEarnings.toLocaleString()}</p>
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex justify-between text-xs">
                  <span className="font-mono text-white/50">Pending</span>
                  <span className="font-bold text-white">${BUILDER_STATS.pendingPayout}</span>
                </div>
              </div>
            </div>
          </div>

          {/* quick create */}
          <div className="sidebar-fade p-3 border-t-2 border-black opacity-0">
            <Link
              to="/build/games/new"
              className="flex items-center justify-center gap-2 w-full py-3 bg-black text-white text-sm font-black uppercase rounded-xl hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
              style={{ boxShadow: '3px 3px 0px #FF6B9D' }}
            >
              + New Game
            </Link>
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
                    (isActive || isOverviewActive) ? 'text-black bg-[#CDFF57]' : 'text-black/50'
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
        <main className="flex-1 min-h-screen pb-20 lg:pb-0">
          {isIndex ? <BuildOverviewPage /> : <Outlet />}
        </main>
      </div>
    </AppLayout>
  )
}

// mock data for overview
const RECENT_GAMES = [
  { id: 'lucky-flip', name: 'Lucky Flip', status: 'active', earnings24h: 62 },
  { id: 'dice-royale', name: 'Dice Royale', status: 'active', earnings24h: 30.75 },
  { id: 'moon-crash', name: 'Moon Crash', status: 'pending', earnings24h: 0 },
]

const GAME_TYPES = [
  { type: 'PICK ONE', desc: 'Coinflip, roulette', available: true },
  { type: 'PICK NUMBER', desc: 'Dice, limbo', available: true },
  { type: 'CASH OUT', desc: 'Crash, rocket', available: true },
  { type: 'REVEAL TILES', desc: 'Mines, tower', available: false },
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
        stagger: 0.06,
        ease: 'power2.out',
        delay: 0.15,
      })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={containerRef} className="p-4 md:p-6 lg:p-8">
      {/* header */}
      <div className="main-fade mb-6 opacity-0">
        <h1 className="text-3xl md:text-4xl font-black text-black tracking-tight">Welcome back</h1>
        <p className="text-black/50 font-mono text-sm mt-1">** Build games, earn 25% of house edge</p>
      </div>

      {/* top row: stats + quick actions */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* stats card */}
        <div
          className="main-fade lg:col-span-2 bg-white border-2 border-black rounded-2xl p-5 opacity-0"
          style={{ boxShadow: '4px 4px 0px black' }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Games', value: BUILDER_STATS.totalGames, sub: `${BUILDER_STATS.activeGames} active` },
              { label: '24h Volume', value: '$20.6K', sub: '+12% vs 7d' },
              { label: '24h Earnings', value: '$92.75', sub: 'Your cut', highlight: true },
              { label: 'Total Players', value: '342', sub: 'Unique' },
            ].map((stat) => (
              <div key={stat.label} className="py-1">
                <p className="text-[10px] font-mono text-black/50 uppercase">{stat.label}</p>
                <p className={cnm('text-xl md:text-2xl font-black', stat.highlight ? 'text-[#7BA318]' : 'text-black')}>
                  {stat.value}
                </p>
                <p className="text-[10px] font-mono text-black/40">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* quick action */}
        <Link
          to="/build/games/new"
          className="main-fade bg-black border-2 border-black rounded-2xl p-5 flex flex-col justify-between hover:translate-x-1 hover:translate-y-1 transition-transform opacity-0"
          style={{ boxShadow: '4px 4px 0px #FF6B9D' }}
        >
          <div>
            <p className="text-xs font-mono text-white/50 uppercase">Quick Action</p>
            <p className="text-xl font-black text-white mt-1">Create Game</p>
          </div>
          <span className="text-3xl text-[#CDFF57]">+</span>
        </Link>
      </div>

      {/* main grid */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* left: games + types */}
        <div className="lg:col-span-3 space-y-4">
          {/* recent games */}
          <div
            className="main-fade bg-white border-2 border-black rounded-2xl overflow-hidden opacity-0"
            style={{ boxShadow: '4px 4px 0px black' }}
          >
            <div className="border-b-2 border-black px-4 py-3 flex items-center justify-between">
              <p className="text-xs font-mono text-black/50 uppercase">My Games</p>
              <Link to="/build/games" className="text-xs font-bold text-black/50 hover:text-black">
                View all →
              </Link>
            </div>
            <div className="divide-y divide-black/10">
              {RECENT_GAMES.map((game) => (
                <Link
                  key={game.id}
                  to="/build/games/$id"
                  params={{ id: game.id }}
                  className="flex items-center justify-between p-4 hover:bg-black/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cnm(
                        'w-8 h-8 rounded-lg border-2 border-black flex items-center justify-center text-sm font-black',
                        game.status === 'active' ? 'bg-[#CDFF57]' : 'bg-black/10 text-black/40'
                      )}
                    >
                      {game.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-black text-sm">{game.name}</p>
                      <p className="text-[10px] font-mono text-black/50">{game.status}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#7BA318] text-sm">${game.earnings24h.toFixed(2)}</p>
                    <p className="text-[10px] font-mono text-black/40">24h</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* game types */}
          <div
            className="main-fade bg-white border-2 border-black rounded-2xl p-4 opacity-0"
            style={{ boxShadow: '4px 4px 0px black' }}
          >
            <p className="text-xs font-mono text-black/50 uppercase mb-3">Available Game Types</p>
            <div className="grid grid-cols-2 gap-2">
              {GAME_TYPES.map((type) => (
                <div
                  key={type.type}
                  className={cnm(
                    'p-3 rounded-xl border-2 border-black',
                    type.available ? 'bg-white' : 'bg-black/5 opacity-60'
                  )}
                >
                  <p className="font-black text-black text-sm">{type.type}</p>
                  <p className="text-[10px] font-mono text-black/50">{type.desc}</p>
                  {!type.available && (
                    <span className="text-[10px] font-mono text-[#FF6B9D]">Coming soon</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* right: info + sdk */}
        <div className="lg:col-span-2 space-y-4">
          {/* how it works */}
          <div
            className="main-fade bg-white border-2 border-black rounded-2xl p-4 opacity-0"
            style={{ boxShadow: '4px 4px 0px black' }}
          >
            <p className="text-xs font-mono text-black/50 uppercase mb-3">How It Works</p>
            <div className="space-y-2">
              {[
                { n: '1', text: 'Pick a game type' },
                { n: '2', text: 'Configure house edge' },
                { n: '3', text: 'Integrate SDK' },
                { n: '4', text: 'Earn 25% of edge' },
              ].map((step) => (
                <div key={step.n} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-[#FF6B9D] text-black text-xs font-black flex items-center justify-center border border-black">
                    {step.n}
                  </span>
                  <p className="text-sm text-black/80">{step.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* revenue split */}
          <div
            className="main-fade bg-black border-2 border-black rounded-2xl p-4 opacity-0"
            style={{ boxShadow: '4px 4px 0px #FF6B9D' }}
          >
            <p className="text-xs font-mono text-white/50 uppercase mb-3">Revenue Split</p>
            <p className="text-[10px] font-mono text-white/40 mb-3">On $100 bet @ 2% edge = $2</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/60">Stakers</span>
                <span className="font-bold text-white">$1.40 (70%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/60">You</span>
                <span className="font-bold text-[#CDFF57]">$0.50 (25%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/60">Protocol</span>
                <span className="font-bold text-white/80">$0.10 (5%)</span>
              </div>
            </div>
          </div>

          {/* sdk snippet */}
          <div
            className="main-fade bg-white border-2 border-black rounded-2xl overflow-hidden opacity-0"
            style={{ boxShadow: '4px 4px 0px black' }}
          >
            <div className="border-b-2 border-black px-3 py-2 flex items-center justify-between bg-black/5">
              <span className="text-[10px] font-mono text-black/50">SDK Preview</span>
              <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-[#CDFF57] text-black rounded">TS</span>
            </div>
            <pre className="p-3 text-[11px] font-mono text-black/70 overflow-x-auto">
{`import { useBet } from '@house/sdk'

const { placeBet } = useBet('game-id')
const result = await placeBet({
  choice: 'heads',
  amount: 100
})`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
