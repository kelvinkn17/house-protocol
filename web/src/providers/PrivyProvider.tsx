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
        // embedded wallets config
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        // external wallets
        externalWallets: {
          coinbaseWallet: {
            connectionOptions: 'smartWalletOnly',
          },
        },
      }}
    >
      {children}
    </PrivyProviderBase>
  )
}
