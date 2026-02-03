import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { cnm } from '@/utils/style'

export const Route = createFileRoute('/explore/app/stake')({
  component: StakePage,
})

const VAULT = {
  tvl: 2_420_000,
  sharePrice: 1.0234,
  apy: 8.4,
  utilization: 67,
}

const POSITION = {
  shares: 4_800,
  value: 4_912.32,
  profit: 112.32,
}

function StakePage() {
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [amount, setAmount] = useState('')

  return (
    <div className="min-h-screen py-8">
      <div className="mx-auto max-w-4xl px-4">
        {/* header */}
        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-bold text-neutral-100">House Vault</h1>
          <p className="text-neutral-400">
            Deposit USDC, earn yield from the house edge.
          </p>
        </div>

        {/* stats row */}
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <StatCard label="TVL" value={`$${(VAULT.tvl / 1_000_000).toFixed(2)}M`} />
          <StatCard label="Share Price" value={`$${VAULT.sharePrice}`} />
          <StatCard label="APY" value={`${VAULT.apy}%`} highlight />
          <StatCard label="Utilization" value={`${VAULT.utilization}%`} />
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* main action */}
          <div className="lg:col-span-3">
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
                {/* input */}
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm text-neutral-400">
                      {tab === 'deposit' ? 'Amount' : 'Shares'}
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
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 pr-16 text-lg text-neutral-100 placeholder-neutral-600 outline-none focus:border-neutral-500"
                    />
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-neutral-700 px-2 py-1 text-xs font-medium text-neutral-300 hover:bg-neutral-600">
                      MAX
                    </button>
                  </div>
                </div>

                {/* preview */}
                <div className="mb-6 rounded-lg bg-neutral-800/50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400">You receive</span>
                    <span className="font-medium text-neutral-100">
                      {tab === 'deposit' ? '~4,886 hUSDC' : '~5,117 USDC'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-neutral-400">Rate</span>
                    <span className="text-neutral-300">1 hUSDC = ${VAULT.sharePrice} USDC</span>
                  </div>
                </div>

                {/* button */}
                <button className="w-full rounded-lg bg-neutral-100 py-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200">
                  {tab === 'deposit' ? 'Deposit' : 'Withdraw'}
                </button>

                {tab === 'deposit' && (
                  <p className="mt-4 text-center text-xs text-neutral-500">
                    Cross-chain via Circle CCTP supported
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* sidebar */}
          <div className="lg:col-span-2 space-y-6">
            {/* position */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
              <h2 className="mb-4 font-semibold text-neutral-100">Your Position</h2>
              <div className="space-y-3">
                <Row label="Shares" value={`${POSITION.shares.toLocaleString()} hUSDC`} />
                <Row label="Value" value={`$${POSITION.value.toLocaleString()}`} />
                <Row label="Profit" value={`+$${POSITION.profit.toFixed(2)}`} highlight />
              </div>
            </div>

            {/* how it works */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
              <h2 className="mb-4 font-semibold text-neutral-100">How It Works</h2>
              <ol className="space-y-2 text-sm text-neutral-400">
                <li>1. Deposit USDC, get hUSDC</li>
                <li>2. Your capital backs player bets</li>
                <li>3. Players lose = vault profits</li>
                <li>4. House edge = steady yield</li>
                <li>5. Withdraw anytime</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      <p className="mb-1 text-sm text-neutral-500">{label}</p>
      <p className={cnm('text-2xl font-semibold', highlight ? 'text-green-400' : 'text-neutral-100')}>
        {value}
      </p>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-neutral-400">{label}</span>
      <span className={cnm('font-medium', highlight ? 'text-green-400' : 'text-neutral-100')}>
        {value}
      </span>
    </div>
  )
}
