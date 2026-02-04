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
        // login methods: email, google, wallet
        loginMethods: ['email', 'google', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#CDFF57',
          logo: '/assets/logos/the-house-protocol-favicon.png',
          showWalletLoginFirst: false,
        },
        // embedded wallets config, create for users signing in with email/social
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
