'use client'

import { useAuthContext } from '@/providers/AuthProvider'
import { cnm } from '@/utils/style'

interface ConnectButtonProps {
  className?: string
  variant?: 'default' | 'compact'
}

export default function ConnectButton({ className, variant = 'default' }: ConnectButtonProps) {
  const { ready, authenticated, walletAddress, email, login, logout } = useAuthContext()

  // still loading privy
  if (!ready) {
    return (
      <button
        disabled
        className={cnm(
          'px-5 py-2.5 text-sm font-black uppercase tracking-wide rounded-full border-2 border-black bg-white text-black opacity-50',
          className,
        )}
        style={{ boxShadow: '4px 4px 0px black' }}
      >
        Loading...
      </button>
    )
  }

  // not connected, show connect button
  if (!authenticated) {
    return (
      <button
        onClick={login}
        className={cnm(
          'px-5 py-2.5 text-sm font-black uppercase tracking-wide rounded-full border-2 border-black bg-white text-black hover:translate-x-0.5 hover:translate-y-0.5 transition-transform duration-200',
          className,
        )}
        style={{ boxShadow: '4px 4px 0px black' }}
      >
        Connect
      </button>
    )
  }

  // connected, show address/email with disconnect option
  const displayText = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : email
      ? email.length > 16
        ? `${email.slice(0, 14)}...`
        : email
      : 'Connected'

  if (variant === 'compact') {
    return (
      <button
        onClick={logout}
        className={cnm(
          'px-5 py-2.5 text-sm font-black uppercase tracking-wide rounded-full border-2 border-black bg-[#CDFF57] text-black hover:bg-red-400 hover:translate-x-0.5 hover:translate-y-0.5 transition-all duration-200 group',
          className,
        )}
        style={{ boxShadow: '4px 4px 0px black' }}
      >
        <span className="group-hover:hidden">{displayText}</span>
        <span className="hidden group-hover:inline">Disconnect</span>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-wide text-black/60">{displayText}</span>
      <button
        onClick={logout}
        className={cnm(
          'px-4 py-2 text-xs font-black uppercase tracking-wide rounded-full border-2 border-black bg-white text-black hover:bg-red-400 hover:translate-x-0.5 hover:translate-y-0.5 transition-all duration-200',
          className,
        )}
        style={{ boxShadow: '3px 3px 0px black' }}
      >
        Disconnect
      </button>
    </div>
  )
}
