import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { cnm } from '@/utils/style'
import { formatStringToNumericDecimals, serializeFormattedStringToFloat } from '@/utils/format'
import AnimateComponent from '@/components/elements/AnimateComponent'
import { useAuthContext } from '@/providers/AuthProvider'
import { useToast } from '@/components/Toast'
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

const SCAN_TX = 'https://sepolia.etherscan.io/tx/'

// format token amounts with commas, 2 decimals
function fmtToken(n: number, decimals = 2): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// abbreviated format for stats
function fmtUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`
  return `$${n.toFixed(2)}`
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

function Shimmer({ className }: { className?: string }) {
  return <div className={cnm('animate-pulse bg-black/10 rounded', className)} />
}

function TokenIcon({ token, size = 20 }: { token: 'usdh' | 'husdh'; size?: number }) {
  const src = token === 'usdh' ? '/assets/images/usdh.png' : '/assets/images/hUSDH.png'
  return (
    <img
      src={src}
      alt={token === 'usdh' ? 'USDH' : 'hUSDH'}
      width={size}
      height={size}
      className="inline-block rounded-full"
    />
  )
}

function StakePage() {
  const { authenticated, walletAddress, login } = useAuthContext()
  const { toast, update: updateToast } = useToast()
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [amount, setAmount] = useState('')
  const toastRef = useRef<string | null>(null)

  const { data: vault, isLoading: vaultLoading } = useVaultInfo()
  const { data: activity, isLoading: activityLoading } = useVaultActivity()
  const { data: history } = useVaultHistory('1d')
  const { data: position } = useUserPosition(authenticated ? walletAddress : null)

  const deposit = useDeposit()
  const withdraw = useWithdraw()

  // toast on tx status changes
  useEffect(() => {
    const status = tab === 'deposit' ? deposit.txStatus : withdraw.txStatus
    const error = tab === 'deposit' ? deposit.txError : withdraw.txError
    const action = tab === 'deposit' ? 'Deposit' : 'Withdrawal'
    const hash = tab === 'deposit' ? deposit.txHash : withdraw.txHash

    if (status === 'idle') return

    // create toast on first non-idle status
    if (!toastRef.current && status !== 'success' && status !== 'error') {
      const titles: Partial<Record<TxStatus, string>> = {
        approving: 'Approving USDH',
        depositing: 'Depositing...',
        withdrawing: 'Withdrawing...',
        confirming: 'Confirming transaction',
      }
      toastRef.current = toast({
        type: 'loading',
        title: titles[status] || 'Processing...',
        description: 'Please confirm in your wallet',
      })
      return
    }

    if (!toastRef.current) return

    // update existing toast based on status progression
    if (status === 'depositing') {
      updateToast(toastRef.current, { title: 'Depositing...', description: 'Sending deposit transaction...' })
    } else if (status === 'withdrawing') {
      updateToast(toastRef.current, { title: 'Withdrawing...', description: 'Sending withdraw transaction...' })
    } else if (status === 'confirming') {
      updateToast(toastRef.current, { title: 'Confirming Transaction', description: 'Waiting for block confirmation...' })
    } else if (status === 'success') {
      updateToast(toastRef.current, {
        type: 'success',
        title: `${action} Successful`,
        description: 'Transaction confirmed',
        txHash: hash || undefined,
      })
      toastRef.current = null
      setAmount('')
      setTimeout(() => { deposit.reset(); withdraw.reset() }, 2000)
    } else if (status === 'error') {
      updateToast(toastRef.current, {
        type: 'error',
        title: `${action} Failed`,
        description: error || 'Something went wrong',
      })
      toastRef.current = null
    }
  }, [deposit.txStatus, withdraw.txStatus, deposit.txHash, withdraw.txHash])

  // chart data
  const chartData = history || []
  const prices = chartData.map(h => h.sharePrice)
  const priceChange = prices.length >= 2
    ? ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100
    : 0

  const isTxPending =
    (deposit.txStatus !== 'idle' && deposit.txStatus !== 'success' && deposit.txStatus !== 'error')
    || (withdraw.txStatus !== 'idle' && withdraw.txStatus !== 'success' && withdraw.txStatus !== 'error')

  // preview what user receives
  const previewReceive = (() => {
    const num = serializeFormattedStringToFloat(amount)
    if (!num || !vault) return null
    if (tab === 'deposit') {
      return vault.sharePrice > 0 ? num / vault.sharePrice : 0
    }
    return num * vault.sharePrice
  })()

  function handleMax() {
    if (!position) return
    const raw = tab === 'deposit'
      ? position.usdhBalanceFormatted.toString()
      : position.sharesFormatted.toString()
    setAmount(formatStringToNumericDecimals(raw, 6))
  }

  function handleAction() {
    if (!authenticated || !walletAddress) {
      login()
      return
    }
    const cleanAmount = amount.replace(/,/g, '')
    const num = parseFloat(cleanAmount)
    if (!num || num <= 0) return

    if (tab === 'deposit') {
      deposit.mutate({ amount: cleanAmount, userAddress: walletAddress as Address })
    } else {
      withdraw.mutate({ shares: cleanAmount, userAddress: walletAddress as Address })
    }
  }

  return (
    <div className="pb-12">
      <div className="mx-auto max-w-6xl">
        {/* header with how it works */}
        <AnimateComponent delay={50}>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-black mb-2">HOUSE VAULT</h1>
              <p className="text-black/60 font-mono text-sm">** Deposit USDH. Earn from every bet.</p>
            </div>
            <div
              className="bg-black border-2 border-black rounded-xl px-5 py-3"
              style={{ boxShadow: '4px 4px 0px #FF6B9D' }}
            >
              <div className="flex items-center gap-3 text-sm font-mono text-white/80">
                {['Deposit', 'Back bets', 'Earn yield', 'Withdraw'].map((step, i, arr) => (
                  <span key={i} className="flex items-center gap-3">
                    <span className="whitespace-nowrap">{step}</span>
                    {i < arr.length - 1 && <span className="text-white/25">·</span>}
                  </span>
                ))}
              </div>
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
                  { label: 'hUSDH Price', value: `$${(vault?.sharePrice || 1).toFixed(4)}` },
                  { label: 'hUSDH Supply', value: fmtToken(vault?.totalSupplyFormatted || 0) },
                  { label: 'Custody', value: fmtUsd(vault?.custodyFormatted || 0) },
                ].map((stat, i) => (
                  <div
                    key={stat.label}
                    className={cnm('py-2', i < 3 && 'lg:border-r-2 lg:border-black/10')}
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
                  <div className="flex items-center gap-2">
                    <TokenIcon token="husdh" size={22} />
                    <p className="text-xs font-mono text-black/50 tracking-wider">hUSDH Price History</p>
                  </div>
                  {prices.length >= 2 && (
                    <span
                      className={cnm(
                        'px-3 py-1 text-xs font-black rounded-full border-2 border-black',
                        priceChange >= 0 ? 'bg-[#CDFF57] text-black' : 'bg-[#FF6B9D] text-black',
                      )}
                      style={{ boxShadow: '2px 2px 0px black' }}
                    >
                      {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}% (24h)
                    </span>
                  )}
                </div>
                {prices.length >= 2 ? (
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
                      onClick={() => { setTab(t); setAmount(''); deposit.reset(); withdraw.reset() }}
                      className={cnm(
                        'flex-1 py-4 text-sm font-black uppercase tracking-wider transition-colors cursor-pointer',
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
                        <span className="flex items-center gap-1.5">
                          <TokenIcon token={tab === 'deposit' ? 'usdh' : 'husdh'} size={18} />
                          {tab === 'deposit' ? 'Amount (USDH)' : 'Shares (hUSDH)'}
                        </span>
                        <span>
                          Bal:{' '}
                          <span className="text-black font-bold">
                            {position
                              ? tab === 'deposit'
                                ? `${fmtToken(position.usdhBalanceFormatted)} USDH`
                                : `${fmtToken(position.sharesFormatted)} hUSDH`
                              : '...'
                            }
                          </span>
                        </span>
                      </div>
                      <div className="relative mb-4">
                        <input
                          type="text"
                          value={amount}
                          onChange={(e) => setAmount(formatStringToNumericDecimals(e.target.value, 6))}
                          placeholder="0.00"
                          disabled={isTxPending}
                          className="w-full border-2 border-black bg-black/5 px-4 py-4 pr-36 text-2xl font-black text-black placeholder-black/30 outline-none rounded-xl focus:ring-2 focus:ring-black/20 disabled:opacity-50"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          <button
                            onClick={handleMax}
                            disabled={isTxPending}
                            className="px-2 py-1 text-xs font-black bg-black text-white rounded hover:bg-black/80 transition-colors disabled:opacity-50"
                          >
                            MAX
                          </button>
                          <div className="flex items-center gap-1">
                            <TokenIcon token={tab === 'deposit' ? 'usdh' : 'husdh'} size={20} />
                            <span className="text-sm font-mono text-black/50">{tab === 'deposit' ? 'USDH' : 'hUSDH'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm font-mono text-black/50 mb-5 px-1">
                        <span>You receive</span>
                        <span className="flex items-center gap-1.5 text-black font-bold">
                          {previewReceive !== null ? (
                            <>
                              <TokenIcon token={tab === 'deposit' ? 'husdh' : 'usdh'} size={18} />
                              ~{fmtToken(previewReceive)} {tab === 'deposit' ? 'hUSDH' : 'USDH'}
                            </>
                          ) : (
                            <>-- {tab === 'deposit' ? 'hUSDH' : 'USDH'}</>
                          )}
                        </span>
                      </div>
                      <button
                        onClick={handleAction}
                        disabled={isTxPending || !amount || serializeFormattedStringToFloat(amount) <= 0}
                        className="w-full py-4 text-sm font-black uppercase tracking-wider bg-black text-white border-2 border-black rounded-xl cursor-pointer transition-transform hover:translate-x-1 hover:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                        style={{ boxShadow: '4px 4px 0px #FF6B9D' }}
                      >
                        {isTxPending
                          ? (tab === 'deposit' ? deposit.txStatus : withdraw.txStatus).replace(/_/g, ' ').toUpperCase() + '...'
                          : tab === 'deposit' ? 'Deposit USDH' : 'Withdraw USDH'
                        }
                      </button>
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
                        ${fmtToken(position.assetsValueFormatted)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 border-t-2 border-black/10 pt-4">
                      {[
                        { label: 'hUSDH Balance', value: fmtToken(position.sharesFormatted), token: 'husdh' as const },
                        { label: 'USDH Balance', value: fmtToken(position.usdhBalanceFormatted), token: 'usdh' as const },
                      ].map((item) => (
                        <div key={item.label} className="text-center">
                          <p className="text-[10px] font-mono text-black/50 mb-1">{item.label}</p>
                          <div className="flex items-center justify-center gap-1.5">
                            <TokenIcon token={item.token} size={18} />
                            <p className="text-sm font-black text-black">{item.value}</p>
                          </div>
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
                            <a
                              href={`${SCAN_TX}${item.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-mono text-black/40 hover:text-black transition-colors underline decoration-black/20 hover:decoration-black/60"
                            >
                              {item.txHash.slice(0, 6)}...{item.txHash.slice(-4)} ↗
                            </a>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-black flex items-center gap-1 justify-end">
                            <TokenIcon token="usdh" size={18} />
                            {fmtToken(item.assetsFormatted)} USDH
                          </p>
                          <p className="text-xs font-mono text-black/40">{timeAgo(item.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AnimateComponent>
          </div>
        </div>
      </div>
    </div>
  )
}

function PriceChart({ data }: { data: { sharePrice: number; timestamp: string }[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ x: number; y: number; price: number; time: string; idx: number } | null>(null)

  const prices = data.map(d => d.sharePrice)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const padding = (max - min) * 0.1 || 0.01
  const yMin = min - padding
  const yMax = max + padding
  const range = yMax - yMin

  // svg dimensions
  const W = 500
  const H = 160
  const PX = 0 // no horizontal padding, labels are outside
  const PY = 10

  const pts = data.map((d, i) => ({
    x: PX + (i / (data.length - 1)) * (W - PX * 2),
    y: PY + (1 - (d.sharePrice - yMin) / range) * (H - PY * 2),
    price: d.sharePrice,
    time: d.timestamp,
  }))

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`

  function handleMouseMove(e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || !pts.length) return
    const mouseX = ((e.clientX - rect.left) / rect.width) * W
    // find closest point
    let closest = 0
    let closestDist = Infinity
    for (let i = 0; i < pts.length; i++) {
      const dist = Math.abs(pts[i].x - mouseX)
      if (dist < closestDist) { closestDist = dist; closest = i }
    }
    const p = pts[closest]
    setHover({ x: p.x, y: p.y, price: p.price, time: p.time, idx: closest })
  }

  function fmtTime(ts: string) {
    const d = new Date(ts)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  // pick ~5 time labels spread evenly
  const labelCount = 5
  const labelIndices = Array.from({ length: labelCount }, (_, i) =>
    Math.round((i / (labelCount - 1)) * (data.length - 1))
  )

  return (
    <div className="w-full" ref={containerRef}>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height: 160 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="cg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#CDFF57" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#CDFF57" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#cg)" />
          <path d={linePath} fill="none" stroke="#9ACC20" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          {/* dots at each data point */}
          {pts.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hover?.idx === i ? 5 : 2.5}
              fill={hover?.idx === i ? '#000' : '#9ACC20'}
              stroke={hover?.idx === i ? '#CDFF57' : 'none'}
              strokeWidth={2}
              style={{ transition: 'r 0.1s, fill 0.1s' }}
            />
          ))}
          {/* hover crosshair */}
          {hover && (
            <line
              x1={hover.x} y1={PY} x2={hover.x} y2={H - PY}
              stroke="black" strokeWidth="1" strokeDasharray="4 3" opacity="0.2"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {/* tooltip */}
        {hover && (
          <div
            className="absolute pointer-events-none bg-black text-white px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap border border-white/10"
            style={{
              left: `${(hover.x / W) * 100}%`,
              top: -8,
              transform: `translateX(${hover.x / W > 0.75 ? '-100%' : hover.x / W < 0.25 ? '0%' : '-50%'})`,
            }}
          >
            <span className="font-black">${hover.price.toFixed(4)}</span>
            <span className="text-white/50 ml-2">{fmtTime(hover.time)}</span>
          </div>
        )}
      </div>
      <div className="flex justify-between text-[10px] font-mono text-black/40 mt-2 px-0.5">
        {labelIndices.map((idx) => (
          <span key={idx}>{fmtTime(data[idx].timestamp)}</span>
        ))}
      </div>
    </div>
  )
}
