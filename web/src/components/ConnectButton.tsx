'use client'

import { UserPill } from '@privy-io/react-auth/ui'

export default function ConnectButton() {
  return (
    <UserPill
      action={{
        type: 'login',
        options: {
          loginMethods: ['email', 'google', 'wallet'],
        },
      }}
    />
  )
}
