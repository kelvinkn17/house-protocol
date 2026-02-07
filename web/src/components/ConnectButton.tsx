'use client'

import { usePrivy } from '@privy-io/react-auth'
import { UserPill } from '@privy-io/react-auth/ui'
import { cnm } from '@/utils/style'

interface ConnectButtonProps {
  className?: string
}

export default function ConnectButton({ className }: ConnectButtonProps) {
  const { ready } = usePrivy()

  if (!ready) {
    return (
      <div
        className={cnm(
          'inline-flex items-center justify-center rounded-full border-2 border-black bg-white overflow-hidden h-10 px-4 gap-2',
          className,
        )}
        style={{ boxShadow: '4px 4px 0px black' }}
      >
        <div className="h-5 w-5 rounded-full border-2 border-black/30 border-t-black animate-spin" />
        <span className="text-xs font-black text-black/40 uppercase tracking-wide hidden sm:inline">
          Loading
        </span>
      </div>
    )
  }

  return (
    <div
      className={cnm(
        'inline-flex font-medium items-center justify-center rounded-full border-2 border-black bg-white shadow-[4px_4px_0px_black] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-150 overflow-hidden cursor-pointer [&_button]:!bg-white [&_button]:!text-black',
        className,
      )}
    >
      <UserPill
        action={{
          type: 'login',
          options: {
            loginMethods: ['email', 'google', 'wallet'],
          },
        }}
        size={40}
      />
    </div>
  )
}
