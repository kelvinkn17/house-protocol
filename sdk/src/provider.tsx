// HouseProvider creates HouseClient instance and puts it in context
// builders wrap their app with this, then use hooks to interact

import {
  createContext,
  useContext,
  useRef,
  useEffect,
  type ReactNode,
} from 'react'
import { HouseClient } from './client'
import type { HouseConfig } from './types'
import type { WalletClient } from 'viem'

const HouseClientContext = createContext<HouseClient | null>(null)

export interface HouseProviderProps {
  apiUrl: string
  apiKey?: string
  clearnodeUrl?: string
  custodyAddress?: string
  usdhAddress?: string
  chainId?: number
  rpcUrl?: string
  walletClient?: WalletClient
  walletAddress?: string
  children: ReactNode
}

export function HouseProvider({
  apiUrl,
  apiKey,
  clearnodeUrl,
  custodyAddress,
  usdhAddress,
  chainId,
  rpcUrl,
  walletClient,
  walletAddress,
  children,
}: HouseProviderProps) {
  const clientRef = useRef<HouseClient | null>(null)

  if (!clientRef.current) {
    clientRef.current = new HouseClient({
      apiUrl,
      apiKey,
      clearnodeUrl,
      custodyAddress,
      usdhAddress,
      chainId,
      rpcUrl,
    })
  }

  // sync wallet into client when it changes
  useEffect(() => {
    const client = clientRef.current!
    if (walletClient && walletAddress) {
      client.setWallet(walletClient, walletAddress)
    } else {
      client.clearWallet()
    }
  }, [walletClient, walletAddress])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      clientRef.current?.disconnect()
    }
  }, [])

  return (
    <HouseClientContext.Provider value={clientRef.current}>
      {children}
    </HouseClientContext.Provider>
  )
}

export function useHouseClient(): HouseClient {
  const client = useContext(HouseClientContext)
  if (!client) throw new Error('useHouseClient must be used within HouseProvider')
  return client
}
