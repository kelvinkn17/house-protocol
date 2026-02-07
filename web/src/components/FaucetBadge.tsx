import { Link } from '@tanstack/react-router'
import { useAuthContext } from '@/providers/AuthProvider'
import { useQuery } from '@tanstack/react-query'
import { formatUnits, type Address } from 'viem'
import { USDH_ADDRESS, ERC20_ABI, getPublicClient } from '@/lib/contracts'
import { Droplets } from 'lucide-react'

// shows a banner when the connected wallet has 0 USDH, nudging to the faucet
export default function FaucetBadge() {
  const { authenticated, walletAddress } = useAuthContext()

  const { data: balance } = useQuery({
    queryKey: ['usdh-balance', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null
      const client = getPublicClient()
      const raw = await client.readContract({
        address: USDH_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [walletAddress as Address],
      }) as bigint
      return parseFloat(formatUnits(raw, 6))
    },
    enabled: !!authenticated && !!walletAddress && !!USDH_ADDRESS,
    refetchInterval: 15_000,
  })

  // only show when authenticated and balance is confirmed zero
  if (!authenticated || balance === null || balance === undefined || balance > 0) return null

  return (
    <Link
      to="/app/faucet"
      className="mb-6 flex items-center gap-3 bg-[#CDFF57] border-2 border-black rounded-xl px-4 py-3 transition-transform hover:translate-x-0.5 hover:translate-y-0.5 group"
      style={{ boxShadow: '4px 4px 0px black' }}
    >
      <div className="w-8 h-8 rounded-lg border-2 border-black bg-white flex items-center justify-center shrink-0">
        <Droplets size={14} className="text-black" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-black uppercase">No USDH in your wallet</p>
        <p className="text-[11px] font-mono text-black/60">Mint free testnet tokens from the faucet to get started.</p>
      </div>
      <span className="shrink-0 px-3 py-1.5 text-[10px] font-black uppercase bg-black text-[#CDFF57] rounded-lg border-2 border-black group-hover:bg-black/80 transition-colors">
        Get USDH
      </span>
    </Link>
  )
}
