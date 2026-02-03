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
  avgEntry: 1.0087, // weighted avg of all deposits
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
      gsap.fromTo('.fade-in', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power2.out' })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  const priceChange = ((PRICE_HISTORY[PRICE_HISTORY.length - 1] - PRICE_HISTORY[0]) / PRICE_HISTORY[0]) * 100

  return (
    <div ref={containerRef} className="min-h-screen py-6">
      <div className="mx-auto max-w-6xl px-4">
        {/* header */}
        <div className="fade-in flex items-center justify-between mb-6 opacity-0">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-neutral-100">House Vault</h1>
            <p className="text-neutral-500 text-sm">Deposit USDC. Earn from every bet.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {VAULT.activeSessions} sessions live
          </div>
        </div>

        {/* stats row */}
        <div className="fade-in grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 opacity-0">
          <div className="border border-neutral-800 bg-neutral-900/50 p-4">
            <p className="text-xs text-neutral-500 mb-1">TVL</p>
            <p className="text-xl font-bold text-neutral-100">${(VAULT.tvl / 1e6).toFixed(2)}M</p>
          </div>
          <div className="border border-neutral-800 bg-neutral-900/50 p-4">
            <p className="text-xs text-neutral-500 mb-1">hUSDC Price</p>
            <p className="text-xl font-bold text-neutral-100">${VAULT.sharePrice.toFixed(4)}</p>
          </div>
          <div className="border border-neutral-800 bg-neutral-900/50 p-4">
            <p className="text-xs text-neutral-500 mb-1">hUSDC Supply</p>
            <p className="text-xl font-bold text-neutral-100">{(VAULT.hUsdcSupply / 1e6).toFixed(2)}M</p>
          </div>
          <div className="border border-neutral-800 bg-neutral-900/50 p-4">
            <p className="text-xs text-neutral-500 mb-1">House Cap</p>
            <p className="text-xl font-bold text-neutral-100">${(VAULT.houseCap / 1e6).toFixed(0)}M</p>
          </div>
        </div>

        {/* main grid */}
        <div className="grid lg:grid-cols-5 gap-4">
          {/* left col: chart + action */}
          <div className="lg:col-span-3 space-y-4">
            {/* chart card */}
            <div className="fade-in border border-neutral-800 bg-neutral-900/50 p-4 opacity-0">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-neutral-500">hUSDC Price History</p>
                <span className={cnm('text-xs font-medium', priceChange >= 0 ? 'text-green-400' : 'text-red-400')}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}% (7d)
                </span>
              </div>
              <PriceChart data={PRICE_HISTORY} />
            </div>

            {/* deposit/withdraw */}
            <div className="fade-in border border-neutral-800 bg-neutral-900/50 opacity-0">
              <div className="flex border-b border-neutral-800">
                {(['deposit', 'withdraw'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cnm(
                      'flex-1 py-3 text-xs font-mono uppercase tracking-wider transition-colors relative',
                      tab === t ? 'text-neutral-100' : 'text-neutral-500 hover:text-neutral-300'
                    )}
                  >
                    {t}
                    {tab === t && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[#dcb865]" />}
                  </button>
                ))}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 mb-1.5">
                  <span>{tab === 'deposit' ? 'Amount' : 'Shares'}</span>
                  <span>Bal: <span className="text-neutral-300">{tab === 'deposit' ? '12,500 USDC' : '4,800 hUSDC'}</span></span>
                </div>
                <div className="relative mb-3">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-neutral-700 bg-neutral-800/50 px-3 py-3 pr-20 text-xl font-mono text-neutral-100 placeholder-neutral-600 outline-none focus:border-neutral-500"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button className="text-[10px] font-mono text-neutral-500 hover:text-neutral-300">MAX</button>
                    <span className="text-xs font-mono text-neutral-600">{tab === 'deposit' ? 'USDC' : 'hUSDC'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-neutral-500 mb-4 px-1">
                  <span>You receive</span>
                  <span className="text-neutral-200">{tab === 'deposit' ? '~4,886 hUSDC' : '~5,117 USDC'}</span>
                </div>
                <button className="w-full py-3 text-sm font-bold uppercase tracking-wider bg-[#dcb865] text-[#0b0d0b] hover:bg-[#c9a855] transition-colors">
                  {tab === 'deposit' ? 'Deposit' : 'Withdraw'}
                </button>
              </div>
            </div>
          </div>

          {/* right col: position + activity */}
          <div className="lg:col-span-2 space-y-4">
            {/* position */}
            <div className="fade-in relative overflow-hidden border border-[#dcb865]/30 bg-gradient-to-br from-[#dcb865]/10 via-neutral-900/50 to-neutral-900/50 p-4 opacity-0">
              {/* shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#dcb865]/5 to-transparent" style={{ animation: 'shimmer 3s infinite' }} />
              {/* top accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#dcb865] to-transparent" />

              <div className="relative">
                <p className="text-xs text-[#dcb865]/70 mb-2">Your Position</p>
                <div className="flex items-baseline justify-between mb-4">
                  <span className="text-2xl font-black text-neutral-100">${POSITION.value.toLocaleString()}</span>
                  <span className="text-sm font-medium text-green-400">+${POSITION.profit.toFixed(2)} ({POSITION.profitPercent}%)</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center border-t border-[#dcb865]/20 pt-3">
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Shares</p>
                    <p className="text-sm font-semibold text-neutral-100">{POSITION.shares.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Avg Entry</p>
                    <p className="text-sm font-semibold text-neutral-100">${POSITION.avgEntry.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Current</p>
                    <p className="text-sm font-semibold text-neutral-100">${VAULT.sharePrice.toFixed(4)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* activity */}
            <div className="fade-in border border-neutral-800 bg-neutral-900/50 p-4 opacity-0">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Activity</p>
                <button className="text-[10px] font-mono text-neutral-600 hover:text-neutral-400">View all →</button>
              </div>
              <div className="space-y-2">
                {ACTIVITY.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-neutral-800/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={cnm(
                        'w-7 h-7 rounded flex items-center justify-center text-sm font-medium',
                        item.type === 'earnings' ? 'bg-green-900/50 text-green-400' :
                        item.type === 'deposit' ? 'bg-blue-900/50 text-blue-400' : 'bg-orange-900/50 text-orange-400'
                      )}>
                        {item.type === 'earnings' ? '↑' : item.type === 'deposit' ? '+' : '−'}
                      </span>
                      <div>
                        <p className="text-sm text-neutral-200">
                          {item.type === 'earnings' ? 'Earnings' : item.type === 'deposit' ? 'Deposit' : 'Withdraw'}
                        </p>
                        <p className="text-xs text-neutral-500">{item.addr}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cnm('text-sm font-medium', item.type === 'earnings' ? 'text-green-400' : 'text-neutral-200')}>
                        {item.type === 'earnings' ? '+' : ''}{item.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-neutral-500">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* how it works */}
            <div className="fade-in border border-neutral-800 bg-neutral-900/50 p-4 opacity-0">
              <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-2">How It Works</p>
              <div className="text-xs text-neutral-400 space-y-1.5">
                <p><span className="text-neutral-600 mr-2">1.</span>Deposit USDC, get hUSDC</p>
                <p><span className="text-neutral-600 mr-2">2.</span>Your capital backs bets</p>
                <p><span className="text-neutral-600 mr-2">3.</span>House edge = your yield</p>
                <p><span className="text-neutral-600 mr-2">4.</span>Withdraw anytime</p>
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

  const points = data.map((p, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 100 - ((p - min) / range) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="h-28 w-full">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="cg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#dcb865" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#dcb865" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${points} 100,100`} fill="url(#cg)" />
        <polyline points={points} fill="none" stroke="#dcb865" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between text-[9px] font-mono text-neutral-600 mt-1">
        <span>7d ago</span>
        <span>now</span>
      </div>
    </div>
  )
}
