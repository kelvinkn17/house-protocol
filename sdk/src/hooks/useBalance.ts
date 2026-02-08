// derived balance hook, computes P&L from session state

import { useMemo } from 'react'
import { formatUnits } from 'viem'
import { useSession } from './useSession'

export function useBalance() {
  const { playerBalance, houseBalance, depositAmount } = useSession()

  return useMemo(() => {
    const playerNum = parseFloat(formatUnits(BigInt(playerBalance || '0'), 6))
    const houseNum = parseFloat(formatUnits(BigInt(houseBalance || '0'), 6))
    const depositNum = parseFloat(formatUnits(BigInt(depositAmount || '0'), 6))
    const pnl = playerNum - depositNum
    const isProfit = pnl >= 0

    return {
      player: playerNum,
      house: houseNum,
      playerFormatted: playerNum.toFixed(2),
      houseFormatted: houseNum.toFixed(2),
      deposit: depositNum,
      depositFormatted: depositNum.toFixed(2),
      pnl,
      pnlFormatted: (isProfit ? '+' : '') + pnl.toFixed(2),
      isProfit,
    }
  }, [playerBalance, houseBalance, depositAmount])
}
