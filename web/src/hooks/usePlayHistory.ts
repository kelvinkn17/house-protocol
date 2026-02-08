import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface HistoryRound {
  id: string
  roundNumber: number
  gameType: string
  betAmount: string
  betAmountFormatted: number
  payout: string
  payoutFormatted: number
  playerWon: boolean | null
  createdAt: string
}

export interface HistorySession {
  id: string
  status: string
  playerDeposit: string
  playerDepositFormatted: number
  finalPlayerBalance: string
  finalPlayerBalanceFormatted: number
  pnl: string
  pnlFormatted: number
  totalRounds: number
  wins: number
  losses: number
  createdAt: string
  closedAt: string | null
  rounds: HistoryRound[]
}

interface PlayHistoryResponse {
  sessions: HistorySession[]
  total: number
}

export function usePlayHistory(address: string | null) {
  return useQuery({
    queryKey: ['play', 'history', address],
    queryFn: async () => {
      const res = await api.get<PlayHistoryResponse>(`/game/history/${address}`)
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to fetch play history')
      return res.data
    },
    enabled: !!address,
    refetchInterval: 30_000,
  })
}
