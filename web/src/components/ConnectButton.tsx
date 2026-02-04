'use client'

import { UserPill } from '@privy-io/react-auth/ui'
import { cnm } from '@/utils/style'

interface ConnectButtonProps {
  className?: string
}

export default function ConnectButton({ className }: ConnectButtonProps) {
  return (
    <div
      className={cnm(
        'inline-flex items-center justify-center rounded-full border-2 border-black bg-white hover:translate-x-0.5 hover:translate-y-0.5 transition-transform duration-200 overflow-hidden [&_button]:!bg-white [&_button]:!text-black',
        className,
      )}
      style={{ boxShadow: '4px 4px 0px black' }}
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
