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
  isSyncing: boolean

  // actions
  login: () => void
  logout: () => Promise<void>
  getAuthHeader: () => Promise<string | null>
  refreshUser: () => Promise<void>
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
  const [isSyncing, setIsSyncing] = useState(false)

  // track if we already synced to prevent double calls
  const syncRef = useRef(false)
  const lastPrivyId = useRef<string | null>(null)
  const mountedRef = useRef(true)

  // cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

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
  const syncWithBackend = useCallback(async (force = false) => {
    if (!authenticated || !user) {
      if (mountedRef.current) {
        setBackendUser(null)
        setIsBackendSynced(false)
      }
      return
    }

    // prevent double sync for same user (unless forced)
    if (!force && syncRef.current && lastPrivyId.current === user.id) {
      return
    }

    syncRef.current = true
    lastPrivyId.current = user.id

    if (mountedRef.current) {
      setIsSyncing(true)
    }

    try {
      const token = await getAccessToken()
      if (!token) {
        console.error('Failed to get access token')
        if (mountedRef.current) {
          setIsBackendSynced(false)
          setIsSyncing(false)
        }
        syncRef.current = false
        return
      }

      api.setAuthToken(token)
      const response = await authApi.verify()

      if (mountedRef.current) {
        if (response.success && response.data) {
          setBackendUser(response.data.user as BackendUser)
          setIsBackendSynced(true)
        } else {
          console.error('Backend sync failed:', response.error)
          setIsBackendSynced(false)
        }
        setIsSyncing(false)
      }
    } catch (error) {
      console.error('Backend sync error:', error)
      if (mountedRef.current) {
        setIsBackendSynced(false)
        setIsSyncing(false)
      }
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

  // refresh user data from backend
  const refreshUser = useCallback(async () => {
    await syncWithBackend(true)
  }, [syncWithBackend])

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
    isSyncing,
    login,
    logout,
    getAuthHeader,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
