import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { cnm } from '@/utils/style'
import AnimateComponent from '@/components/elements/AnimateComponent'
import { useAuthContext } from '@/providers/AuthProvider'
import {
  useVaultInfo,
  useVaultActivity,
  useVaultHistory,
  useUserPosition,
  useDeposit,
  useWithdraw,
  type TxStatus,
} from '@/hooks/useVault'
import type { Address } from 'viem'

export const Route = createFileRoute('/app/stake')({
  component: StakePage,
})

// format large numbers nicely
function fmtUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`
  return `$${n.toFixed(2)}`
}

function fmtAmount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
  return n.toFixed(2)
}

function shortAddr(addr: string) {
  if (addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

// skeleton shimmer for loading states
function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cnm(
        'animate-pulse bg-black/10 rounded',
        className,
      )}
    />
  )
}

// status label for transactions
function TxStatusLabel({ status, error }: { status: TxStatus; error: string | null }) {
  if (status === 'idle') return null
  const labels: Record<TxStatus, string> = {
    idle: '',
    approving: 'Approving USDH...',
    depositing: 'Depositing...',
    withdrawing: 'Withdrawing...',
    confirming: 'Confirming tx...',
    success: 'Done!',
    error: error || 'Transaction failed',
  }
  const isError = status === 'error'
  const isSuccess = status === 'success'
  return (
    <div
      className={cnm(
        'text-xs font-mono mt-2 px-1',
        isError && 'text-[#FF6B9D]',
        isSuccess && 'text-[#7BA318]',
        !isError && !isSuccess && 'text-black/50',
      )}
    >
      {labels[status]}
    </div>
  )
}

function StakePage() {
  const { authenticated, walletAddress, login } = useAuthContext()
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [amount, setAmount] = useState('')

  const { data: vault, isLoading: vaultLoading } = useVaultInfo()
  const { data: activity, isLoading: activityLoading } = useVaultActivity()
  const { data: history } = useVaultHistory('7d')
  const { data: position } = useUserPosition(authenticated ? walletAddress : null)

  const deposit = useDeposit()
  const withdraw = useWithdraw()

  // reset tx status after success
  useEffect(() => {
    if (deposit.txStatus === 'success' || withdraw.txStatus === 'success') {
      const timer = setTimeout(() => {
        deposit.reset()
        withdraw.reset()
        setAmount('')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [deposit.txStatus, withdraw.txStatus])

  // build chart data from history
  const chartData = history?.map(h => h.sharePrice) || []
  const priceChange = chartData.length >= 2
    ? ((chartData[chartData.length - 1] - chartData[0]) / chartData[0]) * 100
    : 0

  const isTxPending =
    (deposit.txStatus !== 'idle' && deposit.txStatus !== 'success' && deposit.txStatus !== 'error')
    || (withdraw.txStatus !== 'idle' && withdraw.txStatus !== 'success' && withdraw.txStatus !== 'error')

  // figure out the "you receive" preview
  const previewReceive = (() => {
    const num = parseFloat(amount)
    if (!num || !vault) return null
    if (tab === 'deposit') {
      // user deposits USDH, receives sUSDH
      return vault.sharePrice > 0 ? (num / vault.sharePrice).toFixed(2) : '0'
    }
    // user redeems sUSDH, receives USDH
    return (num * vault.sharePrice).toFixed(2)
  })()

  function handleMax() {
    if (!position) return
    if (tab === 'deposit') {
      setAmount(position.usdhBalanceFormatted.toString())
    } else {
      setAmount(position.sharesFormatted.toString())
    }
  }

  function handleAction() {
    if (!authenticated || !walletAddress) {
      login()
      return
    }
    const num = parseFloat(amount)
    if (!num || num <= 0) return

    if (tab === 'deposit') {
      deposit.mutate({ amount, userAddress: walletAddress as Address })
    } else {
      withdraw.mutate({ shares: amount, userAddress: walletAddress as Address })
    }
  }

  return (
    <div className="pb-12">
      <div className="mx-auto max-w-6xl">
        {/* header */}
        <AnimateComponent delay={50}>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-black mb-2">HOUSE VAULT</h1>
              <p className="text-black/60 font-mono text-sm">** Deposit USDH. Earn from every bet.</p>
            </div>
          </div>
        </AnimateComponent>

        {/* stats row */}
        <AnimateComponent delay={130}>
          <div
            className="bg-white border-2 border-black rounded-2xl p-5 mb-6"
            style={{ boxShadow: '6px 6px 0px black' }}
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {vaultLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="py-2">
                    <Shimmer className="h-3 w-12 mb-2" />
                    <Shimmer className="h-8 w-24" />
                  </div>
                ))
              ) : (
                [
                  { label: 'TVL', value: fmtUsd(vault?.tvlFormatted || 0) },
                  { label: 'sUSDH Price', value: `$${(vault?.sharePrice || 1).toFixed(4)}` },
                  { label: 'sUSDH Supply', value: fmtAmount(vault?.totalSupplyFormatted || 0) },
                  { label: 'Custody', value: fmtUsd(vault?.custodyFormatted || 0) },
                ].map((stat, i) => (
                  <div
                    key={stat.label}
                    className={cnm(
                      'py-2',
                      i < 3 && 'lg:border-r-2 lg:border-black/10',
                    )}
                  >
                    <p className="text-xs font-mono text-black/50 mb-1">{stat.label}</p>
                    <p className="text-2xl font-black text-black">{stat.value}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </AnimateComponent>

        {/* main grid */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* left col: chart + action */}
          <div className="lg:col-span-3 space-y-6">
            {/* chart card */}
            <AnimateComponent delay={210}>
              <div
                className="bg-white border-2 border-black p-5 rounded-2xl"
                style={{ boxShadow: '6px 6px 0px black' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-mono text-black/50 tracking-wider">sUSDH Price History</p>
                  {chartData.length >= 2 && (
                    <span
                      className={cnm(
                        'px-3 py-1 text-xs font-black rounded-full border-2 border-black',
                        priceChange >= 0 ? 'bg-[#CDFF57] text-black' : 'bg-[#FF6B9D] text-black',
                      )}
                      style={{ boxShadow: '2px 2px 0px black' }}
                    >
                      {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}% (7d)
                    </span>
                  )}
                </div>
                {chartData.length >= 2 ? (
                  <PriceChart data={chartData} />
                ) : (
                  <div className="h-32 flex items-center justify-center text-sm font-mono text-black/30">
                    Collecting price data...
                  </div>
                )}
              </div>
            </AnimateComponent>

            {/* deposit/withdraw */}
            <AnimateComponent delay={290}>
              <div
                className="bg-white border-2 border-black rounded-2xl overflow-hidden"
                style={{ boxShadow: '6px 6px 0px black' }}
              >
                <div className="flex border-b-2 border-black">
                  {(['deposit', 'withdraw'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setTab(t); setAmount(''); deposit.reset(); withdraw.reset(); }}
                      className={cnm(
                        'flex-1 py-4 text-sm font-black uppercase tracking-wider transition-colors',
                        tab === t
                          ? 'bg-black text-white'
                          : 'bg-white text-black/40 hover:text-black/70',
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="p-5">
                  {!authenticated ? (
                    <div className="text-center py-8">
                      <p className="text-sm font-mono text-black/50 mb-4">Connect your wallet to {tab}</p>
                      <button
                        onClick={login}
                        className="px-6 py-3 text-sm font-black uppercase tracking-wider bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1"
                        style={{ boxShadow: '4px 4px 0px #FF6B9D' }}
                      >
                        Connect Wallet
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-xs font-mono text-black/50 mb-2">
                        <span className="uppercase">{tab === 'deposit' ? 'Amount (USDH)' : 'Shares (sUSDH)'}</span>
                        <span>
                          Bal:{' '}
                          <span className="text-black font-bold">
                            {position
                              ? tab === 'deposit'
                                ? `${fmtAmount(position.usdhBalanceFormatted)} USDH`
                                : `${fmtAmount(position.sharesFormatted)} sUSDH`
                              : '...'
                            }
                          </span>
                        </span>
                      </div>
                      <div className="relative mb-4">
                        <input
                          type="text"
                          value={amount}
                          onChange={(e) => {
                            // only allow numbers and decimals
                            const v = e.target.value.replace(/[^0-9.]/g, '')
                            setAmount(v)
                          }}
                          placeholder="0.00"
                          disabled={isTxPending}
                          className="w-full border-2 border-black bg-black/5 px-4 py-4 pr-24 text-2xl font-black text-black placeholder-black/30 outline-none rounded-xl focus:ring-2 focus:ring-black/20 disabled:opacity-50"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          <button
                            onClick={handleMax}
                            disabled={isTxPending}
                            className="px-2 py-1 text-xs font-black bg-black text-white rounded hover:bg-black/80 transition-colors disabled:opacity-50"
                          >
                            MAX
                          </button>
                          <span className="text-sm font-mono text-black/50">{tab === 'deposit' ? 'USDH' : 'sUSDH'}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm font-mono text-black/50 mb-5 px-1">
                        <span>You receive</span>
                        <span className="text-black font-bold">
                          {previewReceive
                            ? `~${previewReceive} ${tab === 'deposit' ? 'sUSDH' : 'USDH'}`
                            : `-- ${tab === 'deposit' ? 'sUSDH' : 'USDH'}`
                          }
                        </span>
                      </div>
                      <button
                        onClick={handleAction}
                        disabled={isTxPending || !amount || parseFloat(amount) <= 0}
                        className="w-full py-4 text-sm font-black uppercase tracking-wider bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1 disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                        style={{ boxShadow: '4px 4px 0px #FF6B9D' }}
                      >
                        {isTxPending
                          ? (tab === 'deposit' ? deposit.txStatus : withdraw.txStatus).replace(/_/g, ' ').toUpperCase() + '...'
                          : tab === 'deposit' ? 'Deposit USDH' : 'Withdraw USDH'
                        }
                      </button>
                      <TxStatusLabel
                        status={tab === 'deposit' ? deposit.txStatus : withdraw.txStatus}
                        error={tab === 'deposit' ? deposit.txError : withdraw.txError}
                      />
                    </>
                  )}
                </div>
              </div>
            </AnimateComponent>
          </div>

          {/* right col: position + activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* position */}
            <AnimateComponent delay={370}>
              <div
                className="relative bg-white border-2 border-black p-5 rounded-2xl"
                style={{ boxShadow: '6px 6px 0px black' }}
              >
                <p className="text-xs font-mono text-black/50 uppercase mb-2">Your Position</p>
                {!authenticated ? (
                  <div className="py-4 text-center">
                    <p className="text-sm font-mono text-black/30">Connect wallet to view</p>
                  </div>
                ) : !position ? (
                  <div className="py-4 space-y-2">
                    <Shimmer className="h-8 w-32" />
                    <Shimmer className="h-4 w-20" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline justify-between mb-4">
                      <span className="text-3xl font-black text-black">
                        {fmtUsd(position.assetsValueFormatted)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 border-t-2 border-black/10 pt-4">
                      {[
                        { label: 'sUSDH Balance', value: fmtAmount(position.sharesFormatted) },
                        { label: 'USDH Balance', value: fmtAmount(position.usdhBalanceFormatted) },
                      ].map((item) => (
                        <div key={item.label} className="text-center">
                          <p className="text-[10px] font-mono text-black/50 uppercase mb-1">{item.label}</p>
                          <p className="text-sm font-black text-black">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </AnimateComponent>

            {/* activity */}
            <AnimateComponent delay={450}>
              <div
                className="bg-white border-2 border-black p-5 rounded-2xl"
                style={{ boxShadow: '6px 6px 0px black' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-mono text-black/50 uppercase tracking-wider">Activity</p>
                </div>
                {activityLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <Shimmer className="w-8 h-8 rounded-lg" />
                          <div className="space-y-1">
                            <Shimmer className="h-4 w-16" />
                            <Shimmer className="h-3 w-20" />
                          </div>
                        </div>
                        <Shimmer className="h-4 w-14" />
                      </div>
                    ))}
                  </div>
                ) : !activity?.length ? (
                  <p className="text-sm font-mono text-black/30 py-4 text-center">No activity yet</p>
                ) : (
                  <div className="space-y-0">
                    {activity.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-3 border-b border-black/10 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cnm(
                              'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black border-2 border-black',
                              item.type === 'deposit'
                                ? 'bg-white text-black'
                                : 'bg-[#FF6B9D] text-black',
                            )}
                          >
                            {item.type === 'deposit' ? '+' : '\u2212'}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-black">
                              {item.type === 'deposit' ? 'Deposit' : 'Withdraw'}
                            </p>
                            <p className="text-xs font-mono text-black/40">{shortAddr(item.owner)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-black">
                            {item.assetsFormatted.toLocaleString()} USDH
                          </p>
                          <p className="text-xs font-mono text-black/40">{timeAgo(item.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AnimateComponent>

            {/* how it works */}
            <AnimateComponent delay={530}>
              <div
                className="bg-black border-2 border-black p-5 rounded-2xl"
                style={{ boxShadow: '6px 6px 0px #FF6B9D' }}
              >
                <p className="text-xs font-mono text-white/50 uppercase tracking-wider mb-3">How It Works</p>
                <div className="space-y-2">
                  {[
                    'Deposit USDH, get sUSDH',
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
            </AnimateComponent>
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
