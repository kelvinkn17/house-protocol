import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  VAULT_ADDRESS,
  USDH_ADDRESS,
  VAULT_ABI,
  ERC20_ABI,
  SEPOLIA_CHAIN_ID,
  getPublicClient,
} from '@/lib/contracts'
import { createWalletClient, custom, parseUnits, type Address } from 'viem'
import { sepolia } from 'viem/chains'
import { useWallets } from '@privy-io/react-auth'
import { useState, useCallback } from 'react'

// -- types for API responses --

interface VaultInfo {
  tvl: string
  totalSupply: string
  sharePrice: number
  custodyBalance: string
  usdhAddress: string
  tvlFormatted: number
  totalSupplyFormatted: number
  custodyFormatted: number
  updatedAt: string
}

interface VaultEvent {
  id: string
  type: 'deposit' | 'withdraw'
  sender: string
  owner: string
  assets: string
  shares: string
  assetsFormatted: number
  sharesFormatted: number
  txHash: string
  blockNumber: number
  timestamp: string
}

interface VaultHistoryPoint {
  sharePrice: number
  tvl: number
  timestamp: string
}

interface UserPosition {
  shares: string
  sharesFormatted: number
  assetsValue: string
  assetsValueFormatted: number
  usdhBalance: string
  usdhBalanceFormatted: number
  allowance: string
}

// -- query hooks --

export function useVaultInfo() {
  return useQuery({
    queryKey: ['vault', 'info'],
    queryFn: async () => {
      const res = await api.get<VaultInfo>('/vault/info')
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to fetch vault info')
      return res.data
    },
    refetchInterval: 15_000,
  })
}

export function useVaultActivity() {
  return useQuery({
    queryKey: ['vault', 'activity'],
    queryFn: async () => {
      const res = await api.get<VaultEvent[]>('/vault/activity?limit=20')
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to fetch activity')
      return res.data
    },
    refetchInterval: 30_000,
  })
}

export function useVaultHistory(period = '7d') {
  return useQuery({
    queryKey: ['vault', 'history', period],
    queryFn: async () => {
      const res = await api.get<VaultHistoryPoint[]>(`/vault/history?period=${period}`)
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to fetch history')
      return res.data
    },
    refetchInterval: 60_000,
  })
}

export function useUserPosition(address: string | null, opts?: { refetchInterval?: number | false }) {
  return useQuery({
    queryKey: ['vault', 'user', address],
    queryFn: async () => {
      if (!address) return null
      const res = await api.get<UserPosition>(`/vault/user/${address}`)
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to fetch position')
      return res.data
    },
    enabled: !!address,
    refetchInterval: opts?.refetchInterval ?? 15_000,
  })
}

// -- tx status tracking --

export type TxStatus = 'idle' | 'approving' | 'depositing' | 'withdrawing' | 'confirming' | 'success' | 'error'

// -- mutation hooks --

export function useDeposit() {
  const queryClient = useQueryClient()
  const { wallets } = useWallets()
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txError, setTxError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const reset = useCallback(() => {
    setTxStatus('idle')
    setTxError(null)
    setTxHash(null)
  }, [])

  const mutation = useMutation({
    mutationFn: async ({ amount, userAddress }: { amount: string; userAddress: Address }) => {
      setTxError(null)
      setTxHash(null)
      if (!VAULT_ADDRESS || !USDH_ADDRESS) throw new Error('Contract addresses not configured. Check VITE_HOUSE_VAULT_ADDRESS and VITE_USDH_TOKEN_ADDRESS in .env')

      const wallet = wallets.find(w => w.address?.toLowerCase() === userAddress.toLowerCase()) || wallets[0]
      if (!wallet) throw new Error('No wallet connected')

      // switch to sepolia if needed
      await wallet.switchChain(SEPOLIA_CHAIN_ID)
      const provider = await wallet.getEthereumProvider()

      const walletClient = createWalletClient({
        account: userAddress,
        chain: sepolia,
        transport: custom(provider),
      })

      const assets = parseUnits(amount, 6)

      // check allowance first
      setTxStatus('approving')
      const publicClient = getPublicClient()
      const allowance = await publicClient.readContract({
        address: USDH_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [userAddress, VAULT_ADDRESS],
      })

      if ((allowance as bigint) < assets) {
        const approveHash = await walletClient.writeContract({
          address: USDH_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [VAULT_ADDRESS, assets],
        })

        await publicClient.waitForTransactionReceipt({ hash: approveHash })
      }

      // deposit
      setTxStatus('depositing')
      const depositHash = await walletClient.writeContract({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'deposit',
        args: [assets, userAddress],
      })

      setTxStatus('confirming')
      await publicClient.waitForTransactionReceipt({ hash: depositHash })

      setTxHash(depositHash)
      setTxStatus('success')
      return depositHash
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault'] })
    },
    onError: (err: Error) => {
      setTxStatus('error')
      setTxError(err.message || 'Transaction failed')
    },
  })

  return { ...mutation, txStatus, txError, txHash, reset }
}

export function useWithdraw() {
  const queryClient = useQueryClient()
  const { wallets } = useWallets()
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txError, setTxError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const reset = useCallback(() => {
    setTxStatus('idle')
    setTxError(null)
    setTxHash(null)
  }, [])

  const mutation = useMutation({
    mutationFn: async ({ shares, userAddress }: { shares: string; userAddress: Address }) => {
      setTxError(null)
      setTxHash(null)
      if (!VAULT_ADDRESS) throw new Error('Contract address not configured. Check VITE_HOUSE_VAULT_ADDRESS in .env')

      const wallet = wallets.find(w => w.address?.toLowerCase() === userAddress.toLowerCase()) || wallets[0]
      if (!wallet) throw new Error('No wallet connected')

      await wallet.switchChain(SEPOLIA_CHAIN_ID)
      const provider = await wallet.getEthereumProvider()

      const walletClient = createWalletClient({
        account: userAddress,
        chain: sepolia,
        transport: custom(provider),
      })

      const shareAmount = parseUnits(shares, 9)

      // figure out how much USDH the shares are worth, then ask backend
      // to move that amount from custody to vault so redeem doesn't revert
      setTxStatus('withdrawing')
      const publicClient = getPublicClient()
      const assetsNeeded = await publicClient.readContract({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'previewRedeem',
        args: [shareAmount],
      }) as bigint

      const prepareRes = await api.post<{ txHash: string }>('/vault/prepare-withdraw', {
        amount: assetsNeeded.toString(),
        userAddress,
      })

      if (!prepareRes.success) {
        throw new Error(prepareRes.error?.message || 'Failed to prepare withdrawal')
      }

      const redeemHash = await walletClient.writeContract({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'redeem',
        args: [shareAmount, userAddress, userAddress],
      })

      setTxStatus('confirming')
      await publicClient.waitForTransactionReceipt({ hash: redeemHash })

      setTxHash(redeemHash)
      setTxStatus('success')
      return redeemHash
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault'] })
    },
    onError: (err: Error) => {
      setTxStatus('error')
      setTxError(err.message || 'Transaction failed')
    },
  })

  return { ...mutation, txStatus, txError, txHash, reset }
}
