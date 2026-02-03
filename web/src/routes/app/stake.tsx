import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { cnm } from '@/utils/style'

export const Route = createFileRoute('/app/stake')({
  component: StakePage,
})

const VAULT = {
  tvl: 2_420_000,
  sharePrice: 1.0234,
  apy: 8.4,
  utilization: 67,
  activeSessions: 23,
  hUsdcSupply: 2_365_000,
  houseCap: 5_000_000,
}

const POSITION = {
  shares: 4_800,
  value: 4_912.32,
  profit: 112.32,
  profitPercent: 2.34,
  avgEntry: 1.0087,
}

// mock price history (7 days hourly)
const PRICE_HISTORY = (() => {
  const data = []
  let price = 1.0
  for (let i = 168; i >= 0; i--) {
    price = price * (1 + (Math.random() * 0.002 - 0.0005))
    data.push(price)
  }
  return data
})()

const ACTIVITY = [
  { type: 'deposit', addr: '0x1a2b...3c4d', amount: 5000, time: '2m' },
  { type: 'earnings', addr: 'vault', amount: 124.5, time: '15m' },
  { type: 'withdraw', addr: '0x5e6f...7g8h', amount: 2500, time: '1h' },
  { type: 'deposit', addr: '0x9i0j...1k2l', amount: 10000, time: '2h' },
]

function StakePage() {
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [amount, setAmount] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set('.fade-in', { y: 30, opacity: 0 })
      gsap.to('.fade-in', {
        y: 0,
        opacity: 1,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power2.out',
        delay: 0.1,
      })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  const priceChange = ((PRICE_HISTORY[PRICE_HISTORY.length - 1] - PRICE_HISTORY[0]) / PRICE_HISTORY[0]) * 100

  return (
    <div ref={containerRef} className="pb-12">
      <div className="mx-auto max-w-6xl">
        {/* header */}
        <div className="fade-in flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 opacity-0">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-black mb-2">HOUSE VAULT</h1>
            <p className="text-black/60 font-mono text-sm">** Deposit USDC. Earn from every bet.</p>
          </div>
          <div
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-black rounded-full"
            style={{ boxShadow: '3px 3px 0px black' }}
          >
            <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
            <span className="text-xs font-black text-black">{VAULT.activeSessions} SESSIONS LIVE</span>
          </div>
        </div>

        {/* stats row - grouped */}
        <div
          className="fade-in bg-white border-2 border-black rounded-2xl p-5 mb-6 opacity-0"
          style={{ boxShadow: '6px 6px 0px black' }}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'TVL', value: `$${(VAULT.tvl / 1e6).toFixed(2)}M` },
              { label: 'hUSDC Price', value: `$${VAULT.sharePrice.toFixed(4)}` },
              { label: 'hUSDC Supply', value: `${(VAULT.hUsdcSupply / 1e6).toFixed(2)}M` },
              { label: 'House Cap', value: `$${(VAULT.houseCap / 1e6).toFixed(0)}M` },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={cnm(
                  'py-2',
                  i < 3 && 'lg:border-r-2 lg:border-black/10'
                )}
              >
                <p className="text-xs font-mono text-black/50 uppercase mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-black">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* main grid */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* left col: chart + action */}
          <div className="lg:col-span-3 space-y-6">
            {/* chart card */}
            <div
              className="fade-in bg-white border-2 border-black p-5 rounded-2xl opacity-0"
              style={{ boxShadow: '6px 6px 0px black' }}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-mono text-black/50 uppercase tracking-wider">hUSDC Price History</p>
                <span
                  className={cnm(
                    'px-3 py-1 text-xs font-black rounded-full border-2 border-black',
                    priceChange >= 0 ? 'bg-[#CDFF57] text-black' : 'bg-[#FF6B9D] text-black'
                  )}
                  style={{ boxShadow: '2px 2px 0px black' }}
                >
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}% (7d)
                </span>
              </div>
              <PriceChart data={PRICE_HISTORY} />
            </div>

            {/* deposit/withdraw */}
            <div
              className="fade-in bg-white border-2 border-black rounded-2xl overflow-hidden opacity-0"
              style={{ boxShadow: '6px 6px 0px black' }}
            >
              <div className="flex border-b-2 border-black">
                {(['deposit', 'withdraw'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cnm(
                      'flex-1 py-4 text-sm font-black uppercase tracking-wider transition-colors',
                      tab === t
                        ? 'bg-black text-white'
                        : 'bg-white text-black/40 hover:text-black/70'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between text-xs font-mono text-black/50 mb-2">
                  <span className="uppercase">{tab === 'deposit' ? 'Amount' : 'Shares'}</span>
                  <span>
                    Bal: <span className="text-black font-bold">{tab === 'deposit' ? '12,500 USDC' : '4,800 hUSDC'}</span>
                  </span>
                </div>
                <div className="relative mb-4">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full border-2 border-black bg-black/5 px-4 py-4 pr-24 text-2xl font-black text-black placeholder-black/30 outline-none rounded-xl focus:ring-2 focus:ring-black/20"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button className="px-2 py-1 text-xs font-black bg-black text-white rounded hover:bg-black/80 transition-colors">
                      MAX
                    </button>
                    <span className="text-sm font-mono text-black/50">{tab === 'deposit' ? 'USDC' : 'hUSDC'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm font-mono text-black/50 mb-5 px-1">
                  <span>You receive</span>
                  <span className="text-black font-bold">{tab === 'deposit' ? '~4,886 hUSDC' : '~5,117 USDC'}</span>
                </div>
                <button
                  className="w-full py-4 text-sm font-black uppercase tracking-wider bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1"
                  style={{ boxShadow: '4px 4px 0px #FF6B9D' }}
                >
                  {tab === 'deposit' ? 'Deposit USDC' : 'Withdraw USDC'}
                </button>
              </div>
            </div>
          </div>

          {/* right col: position + activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* position */}
            <div
              className="fade-in relative bg-white border-2 border-black p-5 rounded-2xl opacity-0"
              style={{ boxShadow: '6px 6px 0px black' }}
            >
              <p className="text-xs font-mono text-black/50 uppercase mb-2">Your Position</p>
              <div className="flex items-baseline justify-between mb-4">
                <span className="text-3xl font-black text-black">${POSITION.value.toLocaleString()}</span>
                <span className="text-sm font-bold text-[#7BA318]">+${POSITION.profit.toFixed(2)} ({POSITION.profitPercent}%)</span>
              </div>
              <div className="grid grid-cols-3 gap-3 border-t-2 border-black/10 pt-4">
                {[
                  { label: 'Shares', value: POSITION.shares.toLocaleString() },
                  { label: 'Avg Entry', value: `$${POSITION.avgEntry.toFixed(4)}` },
                  { label: 'Current', value: `$${VAULT.sharePrice.toFixed(4)}` },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <p className="text-[10px] font-mono text-black/50 uppercase mb-1">{item.label}</p>
                    <p className="text-sm font-black text-black">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* activity */}
            <div
              className="fade-in bg-white border-2 border-black p-5 rounded-2xl opacity-0"
              style={{ boxShadow: '6px 6px 0px black' }}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-mono text-black/50 uppercase tracking-wider">Activity</p>
                <button className="text-xs font-black text-black/40 hover:text-black transition-colors">
                  View all →
                </button>
              </div>
              <div className="space-y-0">
                {ACTIVITY.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3 border-b border-black/10 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cnm(
                          'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black border-2 border-black',
                          item.type === 'earnings'
                            ? 'bg-[#CDFF57] text-black'
                            : item.type === 'deposit'
                              ? 'bg-white text-black'
                              : 'bg-[#FF6B9D] text-black'
                        )}
                      >
                        {item.type === 'earnings' ? '↑' : item.type === 'deposit' ? '+' : '−'}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-black">
                          {item.type === 'earnings' ? 'Earnings' : item.type === 'deposit' ? 'Deposit' : 'Withdraw'}
                        </p>
                        <p className="text-xs font-mono text-black/40">{item.addr}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-black">
                        {item.type === 'earnings' ? '+' : ''}
                        {item.amount.toLocaleString()}
                      </p>
                      <p className="text-xs font-mono text-black/40">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* how it works */}
            <div
              className="fade-in bg-black border-2 border-black p-5 rounded-2xl opacity-0"
              style={{ boxShadow: '6px 6px 0px #FF6B9D' }}
            >
              <p className="text-xs font-mono text-white/50 uppercase tracking-wider mb-3">How It Works</p>
              <div className="space-y-2">
                {[
                  'Deposit USDC, get hUSDC',
                  'Your capital backs bets',
                  'House edge = your yield',
                  'Withdraw anytime',
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center text-xs font-black bg-white text-black rounded">
                      {i + 1}
                    </span>
                    <p className="text-sm text-white/80">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PriceChart({ data }: { data: number[] }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data
    .map((p, i) => {
      const x = (i / (data.length - 1)) * 100
      const y = 100 - ((p - min) / range) * 100
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="h-32 w-full">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="cg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#CDFF57" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#CDFF57" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${points} 100,100`} fill="url(#cg)" />
        <polyline points={points} fill="none" stroke="#9ACC20" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between text-[10px] font-mono text-black/40 mt-2">
        <span>7d ago</span>
        <span>now</span>
      </div>
    </div>
  )
}
