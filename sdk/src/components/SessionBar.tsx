// self-contained session bar with all phases
// replaces the play.tsx SessionBar, no Privy/AuthContext/SoundProvider deps

import { useState } from 'react'
import { parseUnits } from 'viem'
import { cnm } from '../utils'
import { useSession } from '../hooks/useSession'
import { useBalance } from '../hooks/useBalance'

interface SessionBarProps {
  walletAddress?: string
  onLogin?: () => void
  onSound?: (sound: string) => void
  className?: string
}

export default function SessionBar({ walletAddress, onLogin, onSound, className }: SessionBarProps) {
  const session = useSession()
  const balance = useBalance()
  const [depositInput, setDepositInput] = useState('100')

  const { sessionPhase, sessionError, stats, sessionId, channelId } = session

  const scannerUrl = channelId
    ? `https://nitrolite-scanner.kwek.dev/sessions/${channelId}`
    : null

  // no wallet
  if (sessionPhase === 'no_wallet') {
    return (
      <div
        className={cnm('mb-6 bg-white border-2 border-black rounded-2xl p-5 flex items-center justify-between', className)}
        style={{ boxShadow: '4px 4px 0px black' }}
      >
        <div>
          <p className="text-xs font-mono text-black/40 uppercase mb-0.5">Session</p>
          <p className="text-sm font-bold text-black/60">Connect wallet to play</p>
        </div>
        <button
          onClick={onLogin}
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
        className={cnm('mb-6 bg-white border-2 border-black rounded-2xl p-5', className)}
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
                onClick={() => { onSound?.('click'); setDepositInput(String(amt)) }}
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
            <span className="px-2 py-1.5 text-[10px] font-mono text-black/40 bg-black/5 border-l-2 border-black">
              USDH
            </span>
          </div>
          <button
            onClick={() => {
              onSound?.('action')
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

  // loading states
  if (['approving', 'depositing', 'connecting', 'creating', 'signing', 'resuming'].includes(sessionPhase)) {
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
        className={cnm('mb-6 bg-white border-2 border-black rounded-2xl p-5 flex items-center gap-3', className)}
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
        className={cnm('mb-6 bg-white border-2 border-black rounded-2xl p-5 flex items-center justify-between', className)}
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
        className={cnm('mb-6 bg-white border-2 border-black rounded-2xl p-5', className)}
        style={{ boxShadow: '4px 4px 0px black' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-mono text-black/40 uppercase mb-0.5">Session Complete</p>
            <p className={cnm(
              'text-xl font-black',
              balance.isProfit ? 'text-[#7BA318]' : 'text-[#FF6B9D]',
            )}>
              {balance.pnlFormatted} USDH
            </p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono text-black/40">
            <span>R{stats.totalRounds}</span>
            <span className="text-[#7BA318]">W{stats.wins}</span>
            <span className="text-[#FF6B9D]">L{stats.losses}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-3 text-[10px] font-mono text-black/30">
          <span>Deposited: {balance.depositFormatted} USDH</span>
          <span className="text-black/10">|</span>
          <span>Withdrew: {balance.playerFormatted} USDH</span>
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
                Nitrolite Scanner
              </a>
            )}
          </div>
          <button
            onClick={() => { onSound?.('action'); session.reset() }}
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

  // active session: balance bar
  return (
    <div
      className={cnm('mb-6 bg-white border-2 border-black rounded-2xl p-4', className)}
      style={{ boxShadow: '4px 4px 0px black' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div>
            <p className="text-[10px] font-mono text-black/40 uppercase">Session Balance</p>
            <p className="text-lg font-black text-black">
              {balance.playerFormatted} USDH
            </p>
          </div>

          <div className="h-8 w-px bg-black/10" />

          <div className="flex items-center gap-4">
            <div>
              <p className="text-[10px] font-mono text-black/30 uppercase">Deposited</p>
              <p className="text-xs font-bold text-black/50">{balance.depositFormatted}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono text-black/30 uppercase">P&L</p>
              <p className={cnm(
                'text-xs font-black',
                balance.isProfit ? 'text-[#7BA318]' : 'text-[#FF6B9D]',
              )}>
                {balance.pnlFormatted}
              </p>
            </div>
          </div>

          <div className="h-8 w-px bg-black/10 hidden sm:block" />

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

      {scannerUrl && (
        <div className="mt-2 pt-2 border-t border-black/5 flex items-center gap-4">
          <a
            href={scannerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-black/25 hover:text-black/50 flex items-center gap-1 transition-colors"
          >
            View on Nitrolite Scanner
          </a>
        </div>
      )}
    </div>
  )
}
