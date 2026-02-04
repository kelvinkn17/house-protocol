import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useMemo, useCallback } from 'react'

export interface AuthUser {
  id: string
  email: string | null
  walletAddress: string | null
  isEmailUser: boolean
  isWalletUser: boolean
}

export function useAuth() {
  const {
    ready,
    authenticated,
    user,
    login,
    logout,
    getAccessToken,
    linkEmail,
    linkGoogle,
    linkWallet,
    unlinkEmail,
    unlinkGoogle,
    unlinkWallet,
  } = usePrivy()

  const { wallets } = useWallets()

  // get the primary wallet (embedded or external)
  const primaryWallet = useMemo(() => {
    if (!wallets.length) return null
    // prefer embedded wallet, fallback to first connected
    return wallets.find((w) => w.walletClientType === 'privy') || wallets[0]
  }, [wallets])

  // normalized user object
  const authUser: AuthUser | null = useMemo(() => {
    if (!user) return null

    const emailAccount = user.linkedAccounts.find((a) => a.type === 'email')
    const googleAccount = user.linkedAccounts.find((a) => a.type === 'google_oauth')
    const walletAccount = user.linkedAccounts.find((a) => a.type === 'wallet')

    return {
      id: user.id,
      email: emailAccount?.address ?? googleAccount?.email ?? null,
      walletAddress: walletAccount?.address ?? primaryWallet?.address ?? null,
      isEmailUser: !!emailAccount || !!googleAccount,
      isWalletUser: !!walletAccount,
    }
  }, [user, primaryWallet])

  // get auth header for API calls
  const getAuthHeader = useCallback(async (): Promise<string | null> => {
    if (!authenticated) return null
    try {
      const token = await getAccessToken()
      return token ? `Bearer ${token}` : null
    } catch {
      return null
    }
  }, [authenticated, getAccessToken])

  return {
    // state
    ready,
    authenticated,
    user: authUser,
    privyUser: user,
    wallets,
    primaryWallet,

    // actions
    login,
    logout,
    getAccessToken,
    getAuthHeader,

    // linking
    linkEmail,
    linkGoogle,
    linkWallet,
    unlinkEmail,
    unlinkGoogle,
    unlinkWallet,
  }
}
