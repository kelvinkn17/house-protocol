import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { cnm } from '@/utils/style'

export const Route = createFileRoute('/explore/app/stake')({
  component: StakePage,
})

// dummy data
const VAULT_STATS = {
  tvl: 2_420_000,
  sharePrice: 1.0234,
  apy: 8.4,
  utilization: 67,
  totalStakers: 1_247,
  yourShares: 4_800,
  yourValue: 4_912.32,
}

const HISTORY = [
  { date: 'Jan 28', tvl: 2.1, apy: 7.8 },
  { date: 'Jan 29', tvl: 2.2, apy: 8.1 },
  { date: 'Jan 30', tvl: 2.25, apy: 8.3 },
  { date: 'Jan 31', tvl: 2.3, apy: 8.5 },
  { date: 'Feb 1', tvl: 2.35, apy: 8.2 },
  { date: 'Feb 2', tvl: 2.4, apy: 8.4 },
  { date: 'Feb 3', tvl: 2.42, apy: 8.4 },
]

const RECENT_ACTIVITY = [
  { type: 'deposit', address: '0x1a2b...3c4d', amount: 5000, time: '2m ago' },
  { type: 'withdraw', address: '0x5e6f...7g8h', amount: 2500, time: '15m ago' },
  { type: 'deposit', address: '0x9i0j...1k2l', amount: 10000, time: '32m ago' },
  { type: 'deposit', address: '0x3m4n...5o6p', amount: 1000, time: '1h ago' },
  { type: 'withdraw', address: '0x7q8r...9s0t', amount: 7500, time: '2h ago' },
]

function StakePage() {
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [amount, setAmount] = useState('')

  return (
    <div className="min-h-screen py-8">
      <div className="mx-auto max-w-6xl px-4">
        {/* header */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-neutral-100">House Vault</h1>
          <p className="text-neutral-400">
            Deposit USDC, earn yield from the house edge. Your capital backs all games on the
            protocol.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* left column, main action + your position */}
          <div className="lg:col-span-2 space-y-6">
            {/* deposit/withdraw card */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50">
              {/* tabs */}
              <div className="flex border-b border-neutral-800">
                <button
                  onClick={() => setTab('deposit')}
                  className={cnm(
                    'flex-1 py-3 text-sm font-medium transition-colors',
                    tab === 'deposit'
                      ? 'border-b-2 border-neutral-100 text-neutral-100'
                      : 'text-neutral-500 hover:text-neutral-300'
                  )}
                >
                  Deposit
                </button>
                <button
                  onClick={() => setTab('withdraw')}
                  className={cnm(
                    'flex-1 py-3 text-sm font-medium transition-colors',
                    tab === 'withdraw'
                      ? 'border-b-2 border-neutral-100 text-neutral-100'
                      : 'text-neutral-500 hover:text-neutral-300'
                  )}
                >
                  Withdraw
                </button>
              </div>

              <div className="p-6">
                {/* amount input */}
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm text-neutral-400">
                      {tab === 'deposit' ? 'Amount to deposit' : 'Shares to withdraw'}
                    </label>
                    <span className="text-sm text-neutral-500">
                      Balance: {tab === 'deposit' ? '12,500 USDC' : '4,800 hUSDC'}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 pr-20 text-lg text-neutral-100 placeholder-neutral-600 outline-none focus:border-neutral-500"
                    />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-neutral-700 px-2 py-1 text-xs font-medium text-neutral-300 hover:bg-neutral-600">
                      MAX
                    </button>
                  </div>
                </div>

                {/* conversion preview */}
                <div className="mb-6 rounded-lg bg-neutral-800/50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400">You will receive</span>
                    <span className="font-medium text-neutral-100">
                      {tab === 'deposit' ? '~4,886 hUSDC' : '~5,117 USDC'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-neutral-400">Share price</span>
                    <span className="text-neutral-300">1 hUSDC = {VAULT_STATS.sharePrice} USDC</span>
                  </div>
                </div>

                {/* action button */}
                <button className="w-full rounded-lg bg-neutral-100 py-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200">
                  {tab === 'deposit' ? 'Deposit USDC' : 'Withdraw USDC'}
                </button>

                {/* cross chain note */}
                {tab === 'deposit' && (
                  <p className="mt-4 text-center text-xs text-neutral-500">
                    Depositing from another chain? We support Arbitrum, Optimism, Polygon via Circle
                    CCTP.
                  </p>
                )}
              </div>
            </div>

            {/* your position */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-neutral-100">Your Position</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="mb-1 text-sm text-neutral-500">Your Shares</p>
                  <p className="text-xl font-semibold text-neutral-100">
                    {VAULT_STATS.yourShares.toLocaleString()} hUSDC
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-neutral-500">Current Value</p>
                  <p className="text-xl font-semibold text-neutral-100">
                    ${VAULT_STATS.yourValue.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-neutral-500">Profit/Loss</p>
                  <p className="text-xl font-semibold text-green-400">+$112.32</p>
                </div>
              </div>
            </div>

            {/* chart placeholder */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-100">Vault History</h2>
                <div className="flex gap-2">
                  <button className="rounded bg-neutral-800 px-3 py-1 text-xs font-medium text-neutral-300">
                    7D
                  </button>
                  <button className="rounded px-3 py-1 text-xs font-medium text-neutral-500 hover:text-neutral-300">
                    30D
                  </button>
                  <button className="rounded px-3 py-1 text-xs font-medium text-neutral-500 hover:text-neutral-300">
                    ALL
                  </button>
                </div>
              </div>

              {/* simple bar chart representation */}
              <div className="flex h-32 items-end gap-2">
                {HISTORY.map((day) => (
                  <div key={day.date} className="flex-1">
                    <div
                      className="rounded-t bg-neutral-700 transition-colors hover:bg-neutral-600"
                      style={{ height: `${(day.tvl / 2.5) * 100}%` }}
                    />
                    <p className="mt-2 text-center text-xs text-neutral-500">{day.date}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* right column, stats + activity */}
          <div className="space-y-6">
            {/* vault stats */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-neutral-100">Vault Stats</h2>
              <div className="space-y-4">
                <StatRow label="Total Value Locked" value={`$${(VAULT_STATS.tvl / 1_000_000).toFixed(2)}M`} />
                <StatRow label="Share Price" value={`$${VAULT_STATS.sharePrice}`} />
                <StatRow label="Current APY" value={`${VAULT_STATS.apy}%`} highlight />
                <StatRow label="Utilization" value={`${VAULT_STATS.utilization}%`} />
                <StatRow label="Total Stakers" value={VAULT_STATS.totalStakers.toLocaleString()} />
              </div>
            </div>

            {/* how it works */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-neutral-100">How It Works</h2>
              <div className="space-y-3 text-sm text-neutral-400">
                <p>1. Deposit USDC, receive hUSDC shares</p>
                <p>2. Your capital backs player bets across all games</p>
                <p>3. When players lose, vault profits. When they win, vault pays out</p>
                <p>4. Long term, house edge means steady yield</p>
                <p>5. Withdraw anytime at current share price</p>
              </div>
            </div>

            {/* recent activity */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-neutral-100">Recent Activity</h2>
              <div className="space-y-3">
                {RECENT_ACTIVITY.map((activity, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={cnm(
                          'h-2 w-2 rounded-full',
                          activity.type === 'deposit' ? 'bg-green-500' : 'bg-red-500'
                        )}
                      />
                      <span className="text-neutral-400">{activity.address}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-neutral-100">
                        {activity.type === 'deposit' ? '+' : '-'}${activity.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-neutral-500">{activity.time}</p>
                    </div>
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

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-neutral-400">{label}</span>
      <span className={cnm('font-medium', highlight ? 'text-green-400' : 'text-neutral-100')}>
        {value}
      </span>
    </div>
  )
}
