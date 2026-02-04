'use client'

import { PrivyProvider as PrivyProviderBase } from '@privy-io/react-auth'
import { env } from '@/env'

interface PrivyProviderProps {
  children: React.ReactNode
}

export default function PrivyProvider({ children }: PrivyProviderProps) {
  return (
    <PrivyProviderBase
      appId={env.VITE_PRIVY_APP_ID}
      config={{
        loginMethods: ['email', 'google', 'wallet'],
        appearance: {
          theme: 'light',
          accentColor: '#000000',
          logo: '/assets/logos/the-house-protocol-favicon.png',
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      {children}
    </PrivyProviderBase>
  )
}
