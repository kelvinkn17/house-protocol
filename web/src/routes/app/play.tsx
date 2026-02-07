import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router'
import { Coins, Skull, Target, ExternalLink, type LucideIcon } from 'lucide-react'
import { cnm } from '@/utils/style'
import { SessionProvider, useSession } from '@/providers/SessionProvider'
import { useAuthContext } from '@/providers/AuthProvider'
import { useSound } from '@/providers/SoundProvider'
import { useState } from 'react'
import { parseUnits, formatUnits } from 'viem'
import FaucetBadge from '@/components/FaucetBadge'

const GAMES: { slug: string; name: string; type: string; color: string; Icon: LucideIcon }[] = [
  { slug: 'double-or-nothing', name: 'Double or Nothing', type: 'cash-out', color: '#CDFF57', Icon: Coins },
  { slug: 'death', name: 'Death', type: 'reveal-tiles', color: '#FF6B9D', Icon: Skull },
  { slug: 'range', name: 'Range', type: 'pick-number', color: '#dcb865', Icon: Target },
]

export const Route = createFileRoute('/app/play')({
  component: PlayLayout,
})

function PlayLayout() {
  return (
    <SessionProvider>
      <PlayLayoutInner />
    </SessionProvider>
  )
}

function PlayLayoutInner() {
  const location = useLocation()
  const path = location.pathname

  return (
    <div className="flex gap-6">
      {/* sidebar */}
      <aside className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-24">
          <div
            className="bg-white border-2 border-black rounded-2xl overflow-hidden"
            style={{ boxShadow: '5px 5px 0px black' }}
          >
            <div className="px-4 py-3 border-b-2 border-black/10">
              <h2 className="text-sm font-black text-black uppercase tracking-wider">Games</h2>
            </div>
            <div className="p-2">
              {GAMES.map((game) => {
                const isActive = path.includes(`/play/${game.slug}`)
                return (
                  <Link
                    key={game.slug}
                    to="/app/play/$slug"
                    params={{ slug: game.slug }}
                    className={cnm(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-0.5',
                      isActive
                        ? 'text-black'
                        : 'text-black/70 hover:bg-black/5',
                    )}
                    style={
                      isActive
                        ? { backgroundColor: `${game.color}25`, boxShadow: `3px 3px 0px ${game.color}` }
                        : undefined
                    }
                  >
                    <div
                      className="w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: isActive ? game.color : `${game.color}20`,
                        borderColor: isActive ? 'black' : `${game.color}50`,
                      }}
                    >
                      <game.Icon size={14} className="text-black" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={cnm(
                          'text-sm font-bold truncate',
                          isActive ? 'text-black' : 'text-black/70',
                        )}
                      >
                        {game.name}
                      </p>
                      <p className="text-[10px] font-mono text-black/40 truncate">
                        {game.type}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* builder CTA */}
          <Link
            to="/build"
            className="mt-4 block bg-black border-2 border-black rounded-2xl p-4 transition-transform hover:translate-x-0.5 hover:translate-y-0.5"
            style={{ boxShadow: '4px 4px 0px #FF6B9D' }}
          >
            <p className="text-[10px] font-mono text-white/40 uppercase mb-1">For Builders</p>
            <p className="text-xs text-white/80">Build your own game with the SDK</p>
          </Link>
        </div>
      </aside>

      {/* content */}
      <div className="flex-1 min-w-0">
        {/* mobile game tabs */}
        <div className="lg:hidden mb-6">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {GAMES.map((game) => {
              const isActive = path.includes(`/play/${game.slug}`)
              return (
                <Link
                  key={game.slug}
                  to="/app/play/$slug"
                  params={{ slug: game.slug }}
                  className={cnm(
                    'shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase border-2 border-black rounded-xl transition-all',
                    isActive ? 'text-black' : 'bg-white text-black/50',
                  )}
                  style={
                    isActive
                      ? { backgroundColor: game.color, boxShadow: '3px 3px 0px black' }
                      : undefined
                  }
                >
                  <game.Icon size={12} />
                  {game.name}
                </Link>
              )
            })}
          </div>
        </div>

        <FaucetBadge />

        {/* session bar */}
        <SessionBar />

        <Outlet />
      </div>
    </div>
  )
}

function SessionBar() {
  const { login, walletAddress } = useAuthContext()
  const { play } = useSound()
  const session = useSession()
  const [depositInput, setDepositInput] = useState('100')

  const { sessionPhase, playerBalance, depositAmount, sessionError, stats, sessionId, channelId } = session

  const balanceNum = playerBalance !== '0'
    ? parseFloat(formatUnits(BigInt(playerBalance), 6))
    : 0

  const depositNum = depositAmount !== '0'
    ? parseFloat(formatUnits(BigInt(depositAmount), 6))
    : 0

  const balanceFormatted = balanceNum.toFixed(2)
  const depositFormatted = depositNum.toFixed(2)
  const pnl = balanceNum - depositNum
  const pnlFormatted = (pnl >= 0 ? '+' : '') + pnl.toFixed(2)
  const isProfit = pnl >= 0

  const scannerUrl = channelId
    ? `https://nitrolite-scanner.kwek.dev/sessions/${channelId}`
    : null

  // no wallet
  if (sessionPhase === 'no_wallet') {
    return (
      <div
        className="mb-6 bg-white border-2 border-black rounded-2xl p-5 flex items-center justify-between"
        style={{ boxShadow: '4px 4px 0px black' }}
      >
        <div>
          <p className="text-xs font-mono text-black/40 uppercase mb-0.5">Session</p>
          <p className="text-sm font-bold text-black/60">Connect wallet to play</p>
        </div>
        <button
          onClick={() => login()}
          className="px-6 py-2.5 text-xs font-black uppercase bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-0.5 hover:translate-y-0.5"
          style={{ boxShadow: '3px 3px 0px #CDFF57' }}
        >
          Connect Wallet
        </button>
      </div>
    )
  }

  // idle: deposit prompt
  if (sessionPhase === 'idle') {
    return (
      <div
        className="mb-6 bg-white border-2 border-black rounded-2xl p-5"
        style={{ boxShadow: '4px 4px 0px black' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-mono text-black/40 uppercase mb-0.5">Open Session</p>
            <p className="text-sm text-black/50">Deposit USDH to start playing. You choose your bet per game.</p>
          </div>
          {walletAddress && (
            <p className="text-[10px] font-mono text-black/30">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {[10, 50, 100, 500].map((amt) => (
              <button
                key={amt}
                onClick={() => { play('click'); setDepositInput(String(amt)) }}
                className={cnm(
                  'px-3 py-1.5 text-xs font-black border-2 border-black rounded-lg transition-transform hover:translate-x-0.5 hover:translate-y-0.5',
                  depositInput === String(amt) ? 'bg-black text-white' : 'bg-white text-black',
                )}
              >
                {amt}
              </button>
            ))}
          </div>
          <div className="flex items-center border-2 border-black rounded-lg overflow-hidden">
            <input
              type="number"
              value={depositInput}
              onChange={(e) => setDepositInput(e.target.value)}
              className="w-20 px-2 py-1.5 text-xs font-black text-black bg-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min="1"
            />
            <span className="px-2 py-1.5 text-[10px] font-mono text-black/40 bg-black/5 border-l-2 border-black flex items-center gap-1">
              <img src="/assets/images/usdh.png" alt="USDH" className="w-4.5 h-4.5 rounded-full" />
              USDH
            </span>
          </div>
          <button
            onClick={() => {
              play('action')
              const amount = parseUnits(depositInput, 6).toString()
              session.openSession(amount)
            }}
            className="ml-auto px-6 py-2.5 text-xs font-black uppercase bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-0.5 hover:translate-y-0.5"
            style={{ boxShadow: '3px 3px 0px #CDFF57' }}
          >
            Open Session ({depositInput} USDH)
          </button>
        </div>
      </div>
    )
  }

  // loading states: approving, depositing, connecting, creating, signing, resuming
  if (sessionPhase === 'approving' || sessionPhase === 'depositing' || sessionPhase === 'connecting' || sessionPhase === 'creating' || sessionPhase === 'signing' || sessionPhase === 'resuming') {
    const phaseLabel: Record<string, string> = {
      approving: 'Approving USDH...',
      depositing: 'Depositing to custody...',
      connecting: 'Connecting...',
      creating: 'Creating session...',
      signing: 'Signing state channel...',
      resuming: 'Resuming session...',
    }
    return (
      <div
        className="mb-6 bg-white border-2 border-black rounded-2xl p-5 flex items-center gap-3"
        style={{ boxShadow: '4px 4px 0px black' }}
      >
        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-mono text-black/50">
          {phaseLabel[sessionPhase] || 'Processing...'}
        </p>
      </div>
    )
  }

  // error
  if (sessionPhase === 'error') {
    return (
      <div
        className="mb-6 bg-white border-2 border-black rounded-2xl p-5 flex items-center justify-between"
        style={{ boxShadow: '4px 4px 0px #FF6B9D' }}
      >
        <div>
          <p className="text-xs font-mono text-[#FF6B9D] uppercase mb-0.5">Error</p>
          <p className="text-sm font-bold text-black/70">{sessionError || 'Something went wrong'}</p>
        </div>
        <button
          onClick={() => session.reset()}
          className="px-6 py-2.5 text-xs font-black uppercase bg-black text-white border-2 border-black rounded-xl"
        >
          Try Again
        </button>
      </div>
    )
  }

  // closed: session summary
  if (sessionPhase === 'closed') {
    return (
      <div
        className="mb-6 bg-white border-2 border-black rounded-2xl p-5"
        style={{ boxShadow: '4px 4px 0px black' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-mono text-black/40 uppercase mb-0.5">Session Complete</p>
            <p className={cnm(
              'text-xl font-black flex items-center gap-1.5',
              isProfit ? 'text-[#7BA318]' : 'text-[#FF6B9D]',
            )}>
              <img src="/assets/images/usdh.png" alt="USDH" className="w-6 h-6 rounded-full" />
              {pnlFormatted} USDH
            </p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono text-black/40">
            <span>R{stats.totalRounds}</span>
            <span className="text-[#7BA318]">W{stats.wins}</span>
            <span className="text-[#FF6B9D]">L{stats.losses}</span>
          </div>
        </div>

        {/* details row */}
        <div className="flex items-center gap-4 mb-3 text-[10px] font-mono text-black/30">
          <span>Deposited: {depositFormatted} USDH</span>
          <span className="text-black/10">|</span>
          <span>Withdrew: {balanceFormatted} USDH</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {sessionId && (
              <span className="text-[10px] font-mono text-black/20">
                {sessionId.slice(0, 8)}...{sessionId.slice(-4)}
              </span>
            )}
            {scannerUrl && (
              <a
                href={scannerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono text-black/30 hover:text-black/60 flex items-center gap-1 transition-colors"
              >
                <ExternalLink size={10} />
                Nitrolite Scanner
              </a>
            )}
          </div>
          <button
            onClick={() => { play('action'); session.reset() }}
            className="px-6 py-2.5 text-xs font-black uppercase bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-0.5 hover:translate-y-0.5"
            style={{ boxShadow: '3px 3px 0px #CDFF57' }}
          >
            New Session
          </button>
        </div>
      </div>
    )
  }

  const isClosing = sessionPhase === 'closing' || sessionPhase === 'withdrawing'

  // active session: balance bar with P&L tracking
  return (
    <div
      className="mb-6 bg-white border-2 border-black rounded-2xl p-4"
      style={{ boxShadow: '4px 4px 0px black' }}
    >
      {/* main row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          {/* session balance */}
          <div>
            <p className="text-[10px] font-mono text-black/40 uppercase">Session Balance</p>
            <p className="text-lg font-black text-black flex items-center gap-1.5">
              <img src="/assets/images/usdh.png" alt="USDH" className="w-5 h-5 rounded-full" />
              {balanceFormatted}
            </p>
          </div>

          <div className="h-8 w-px bg-black/10" />

          {/* deposit + P&L */}
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[10px] font-mono text-black/30 uppercase">Deposited</p>
              <p className="text-xs font-bold text-black/50">{depositFormatted}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono text-black/30 uppercase">P&L</p>
              <p className={cnm(
                'text-xs font-black',
                isProfit ? 'text-[#7BA318]' : 'text-[#FF6B9D]',
              )}>
                {pnlFormatted}
              </p>
            </div>
          </div>

          <div className="h-8 w-px bg-black/10 hidden sm:block" />

          {/* stats */}
          <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono text-black/40">
            <span>R{stats.totalRounds}</span>
            <span className="text-[#7BA318]">W{stats.wins}</span>
            <span className="text-[#FF6B9D]">L{stats.losses}</span>
          </div>
        </div>

        <button
          onClick={() => session.closeSession()}
          disabled={isClosing}
          className="shrink-0 px-5 py-2 text-xs font-black uppercase bg-black/5 text-black/60 border-2 border-black/20 rounded-xl transition-all hover:bg-black hover:text-white hover:border-black disabled:opacity-50"
        >
          {sessionPhase === 'withdrawing' ? 'Withdrawing...' : isClosing ? 'Closing...' : 'Close Session'}
        </button>
      </div>

      {sessionError && (
        <p className="text-xs font-mono text-[#FF6B9D] mt-2">{sessionError}</p>
      )}

      {/* scanner link */}
      {scannerUrl && (
        <div className="mt-2 pt-2 border-t border-black/5">
          <a
            href={scannerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-black/25 hover:text-black/50 flex items-center gap-1 transition-colors"
          >
            <ExternalLink size={9} />
            View on Nitrolite Scanner
          </a>
        </div>
      )}
    </div>
  )
}
