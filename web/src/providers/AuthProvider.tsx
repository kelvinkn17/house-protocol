'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { api, authApi } from '@/lib/api'

interface BackendUser {
  id: string
  walletAddress: string | null
  email: string | null
  privyId: string
}

interface AuthContextValue {
  // privy state
  ready: boolean
  authenticated: boolean
  privyId: string | null

  // wallet info
  walletAddress: string | null
  email: string | null

  // backend user (synced)
  backendUser: BackendUser | null
  isBackendSynced: boolean

  // actions
  login: () => void
  logout: () => Promise<void>
  getAuthHeader: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return ctx
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { ready, authenticated, user, login, logout: privyLogout, getAccessToken } = usePrivy()
  const { wallets } = useWallets()

  const [backendUser, setBackendUser] = useState<BackendUser | null>(null)
  const [isBackendSynced, setIsBackendSynced] = useState(false)

  // track if we already synced to prevent double calls
  const syncRef = useRef(false)
  const lastPrivyId = useRef<string | null>(null)

  // get primary wallet address
  const walletAddress = useMemo(() => {
    if (!wallets.length) return null
    const embedded = wallets.find((w) => w.walletClientType === 'privy')
    return embedded?.address || wallets[0]?.address || null
  }, [wallets])

  // get email from linked accounts
  const email = useMemo(() => {
    if (!user) return null
    const emailAccount = user.linkedAccounts.find((a) => a.type === 'email')
    const googleAccount = user.linkedAccounts.find((a) => a.type === 'google_oauth')
    return emailAccount?.address ?? googleAccount?.email ?? null
  }, [user])

  // sync with backend when authenticated
  const syncWithBackend = useCallback(async () => {
    if (!authenticated || !user) {
      setBackendUser(null)
      setIsBackendSynced(false)
      return
    }

    // prevent double sync for same user
    if (syncRef.current && lastPrivyId.current === user.id) {
      return
    }

    syncRef.current = true
    lastPrivyId.current = user.id

    try {
      const token = await getAccessToken()
      if (!token) {
        console.error('Failed to get access token')
        setIsBackendSynced(false)
        syncRef.current = false
        return
      }

      api.setAuthToken(token)
      const response = await authApi.verify()

      if (response.success && response.data) {
        setBackendUser(response.data.user as BackendUser)
        setIsBackendSynced(true)
      } else {
        console.error('Backend sync failed:', response.error)
        setIsBackendSynced(false)
      }
    } catch (error) {
      console.error('Backend sync error:', error)
      setIsBackendSynced(false)
    }

    syncRef.current = false
  }, [authenticated, user, getAccessToken])

  // sync on auth change
  useEffect(() => {
    if (ready && authenticated && user) {
      // small delay to ensure privy is fully ready
      const timeout = setTimeout(() => {
        syncWithBackend()
      }, 100)
      return () => clearTimeout(timeout)
    } else if (ready && !authenticated) {
      setBackendUser(null)
      setIsBackendSynced(false)
      api.setAuthToken(null)
      lastPrivyId.current = null
    }
  }, [ready, authenticated, user, syncWithBackend])

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

  // logout handler
  const logout = useCallback(async () => {
    setBackendUser(null)
    setIsBackendSynced(false)
    api.setAuthToken(null)
    lastPrivyId.current = null
    syncRef.current = false
    await privyLogout()
  }, [privyLogout])

  const value: AuthContextValue = {
    ready,
    authenticated,
    privyId: user?.id || null,
    walletAddress,
    email,
    backendUser,
    isBackendSynced,
    login,
    logout,
    getAuthHeader,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
