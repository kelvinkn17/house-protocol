import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback, useRef } from 'react'
import { cnm } from '@/utils/style'
import { createWalletClient, custom, parseUnits, formatUnits, type Address } from 'viem'
import { sepolia } from 'viem/chains'
import { useWallets } from '@privy-io/react-auth'
import AnimateComponent from '@/components/elements/AnimateComponent'
import { useAuthContext } from '@/providers/AuthProvider'
import { useToast } from '@/components/Toast'
import {
  USDH_ADDRESS,
  USDH_MINT_ABI,
  ERC20_ABI,
  SEPOLIA_CHAIN_ID,
  getPublicClient,
} from '@/lib/contracts'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Droplets, Coins, Gamepad2, TrendingUp } from 'lucide-react'

export const Route = createFileRoute('/app/faucet')({
  component: FaucetPage,
})

const MINT_AMOUNT = 500
const MINT_AMOUNT_RAW = parseUnits(String(MINT_AMOUNT), 6)

function useUsdhBalance(address: string | null) {
  return useQuery({
    queryKey: ['usdh-balance', address],
    queryFn: async () => {
      if (!address) return null
      const client = getPublicClient()
      const raw = await client.readContract({
        address: USDH_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address as Address],
      }) as bigint
      return {
        raw,
        formatted: parseFloat(formatUnits(raw, 6)),
      }
    },
    enabled: !!address,
    refetchInterval: 10_000,
  })
}

function FaucetPage() {
  const { authenticated, walletAddress, login } = useAuthContext()
  const { wallets } = useWallets()
  const { toast, update: updateToast } = useToast()
  const queryClient = useQueryClient()
  const [minting, setMinting] = useState(false)
  const toastRef = useRef<string | null>(null)

  const { data: balance } = useUsdhBalance(authenticated ? walletAddress : null)

  const handleMint = useCallback(async () => {
    if (!authenticated || !walletAddress) {
      login()
      return
    }
    if (!USDH_ADDRESS) return
    if (minting) return

    setMinting(true)
    toastRef.current = toast({
      type: 'loading',
      title: 'Minting USDH',
      description: 'Confirm the transaction in your wallet',
    })

    try {
      const wallet = wallets.find(w => w.address?.toLowerCase() === walletAddress.toLowerCase()) || wallets[0]
      if (!wallet) throw new Error('No wallet connected')

      await wallet.switchChain(SEPOLIA_CHAIN_ID)
      const provider = await wallet.getEthereumProvider()

      const walletClient = createWalletClient({
        account: walletAddress as Address,
        chain: sepolia,
        transport: custom(provider),
      })

      updateToast(toastRef.current!, {
        title: 'Minting USDH',
        description: 'Sending mint transaction...',
      })

      const hash = await walletClient.writeContract({
        address: USDH_ADDRESS,
        abi: USDH_MINT_ABI,
        functionName: 'mint',
        args: [walletAddress as Address, MINT_AMOUNT_RAW],
      })

      updateToast(toastRef.current!, {
        title: 'Confirming',
        description: 'Waiting for block confirmation...',
      })

      const publicClient = getPublicClient()
      await publicClient.waitForTransactionReceipt({ hash })

      updateToast(toastRef.current!, {
        type: 'success',
        title: `Minted ${MINT_AMOUNT} USDH`,
        description: 'Tokens added to your wallet',
        txHash: hash,
      })

      // refresh balances
      queryClient.invalidateQueries({ queryKey: ['usdh-balance'] })
      queryClient.invalidateQueries({ queryKey: ['vault'] })
    } catch (err: any) {
      const msg = err?.message?.includes('User rejected')
        ? 'Transaction rejected'
        : err?.message?.slice(0, 120) || 'Mint failed'
      updateToast(toastRef.current!, {
        type: 'error',
        title: 'Mint Failed',
        description: msg,
      })
    } finally {
      setMinting(false)
      toastRef.current = null
    }
  }, [authenticated, walletAddress, wallets, minting, toast, updateToast, queryClient, login])

  return (
    <div className="pb-12">
      <div className="mx-auto max-w-3xl">
        {/* header */}
        <AnimateComponent delay={50}>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-10 h-10 rounded-xl border-2 border-black bg-[#CDFF57] flex items-center justify-center"
                  style={{ boxShadow: '3px 3px 0px black' }}
                >
                  <Droplets size={20} className="text-black" />
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-black">USDH FAUCET</h1>
              </div>
              <p className="text-black/60 font-mono text-sm">** Testnet faucet. Mint demo tokens to play and stake.</p>
            </div>
            <span
              className="inline-block px-4 py-2 text-xs font-black uppercase bg-[#FF6B9D] text-black border-2 border-black rounded-xl"
              style={{ boxShadow: '3px 3px 0px black' }}
            >
              Sepolia Testnet
            </span>
          </div>
        </AnimateComponent>

        {/* what is USDH */}
        <AnimateComponent delay={130}>
          <div
            className="bg-white border-2 border-black rounded-2xl p-6 mb-6"
            style={{ boxShadow: '6px 6px 0px black' }}
          >
            <h2 className="text-sm font-black uppercase tracking-wider text-black mb-4">What is USDH?</h2>
            <p className="text-sm text-black/70 leading-relaxed mb-5">
              USDH is the testnet stablecoin that powers everything on House Protocol. You need it to play games and stake in the vault. It's free, mint as much as you want.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  icon: Gamepad2,
                  label: 'Play Games',
                  desc: 'Open a session, place bets, win big.',
                  color: '#CDFF57',
                },
                {
                  icon: TrendingUp,
                  label: 'Stake & Earn',
                  desc: 'Back the house, earn from every bet.',
                  color: '#FF6B9D',
                },
                {
                  icon: Coins,
                  label: 'Free to Mint',
                  desc: 'Testnet only. No real money, go wild.',
                  color: '#dcb865',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="border-2 border-black rounded-xl p-4"
                  style={{ backgroundColor: `${item.color}15` }}
                >
                  <div
                    className="w-8 h-8 rounded-lg border-2 border-black flex items-center justify-center mb-3"
                    style={{ backgroundColor: item.color }}
                  >
                    <item.icon size={14} className="text-black" />
                  </div>
                  <p className="text-xs font-black text-black uppercase mb-1">{item.label}</p>
                  <p className="text-[11px] font-mono text-black/50 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </AnimateComponent>

        {/* mint card */}
        <AnimateComponent delay={210}>
          <div
            className="bg-white border-2 border-black rounded-2xl overflow-hidden"
            style={{ boxShadow: '6px 6px 0px black' }}
          >
            {/* top section */}
            <div className="p-6 border-b-2 border-black/10">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-mono text-black/50 uppercase tracking-wider">Mint Amount</p>
                {authenticated && balance && (
                  <p className="text-xs font-mono text-black/40">
                    Balance: <span className="text-black font-bold">{(balance.formatted ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> USDH
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-3 flex-1">
                  <img
                    src="/assets/images/usdh.png"
                    alt="USDH"
                    className="w-12 h-12 rounded-full border-2 border-black"
                    style={{ boxShadow: '3px 3px 0px black' }}
                  />
                  <div>
                    <p className="text-3xl font-black text-black">{MINT_AMOUNT}</p>
                    <p className="text-xs font-mono text-black/40">USDH tokens</p>
                  </div>
                </div>
                <div
                  className="px-4 py-2 bg-black/5 border-2 border-black/10 rounded-xl text-center"
                >
                  <p className="text-[10px] font-mono text-black/40 uppercase">Value</p>
                  <p className="text-lg font-black text-black">${MINT_AMOUNT}</p>
                </div>
              </div>
            </div>

            {/* action section */}
            <div className="p-6">
              {!authenticated ? (
                <div className="text-center py-4">
                  <p className="text-sm font-mono text-black/50 mb-4">Connect your wallet to mint USDH</p>
                  <button
                    onClick={login}
                    className="px-8 py-3.5 text-sm font-black uppercase tracking-wider bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-1 hover:translate-y-1 cursor-pointer"
                    style={{ boxShadow: '4px 4px 0px #FF6B9D' }}
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleMint}
                    disabled={minting}
                    className={cnm(
                      'w-full py-4 text-sm font-black uppercase tracking-wider border-2 border-black rounded-xl cursor-pointer transition-transform',
                      minting
                        ? 'bg-black/50 text-white/70 cursor-not-allowed'
                        : 'bg-[#CDFF57] text-black hover:translate-x-1 hover:translate-y-1',
                    )}
                    style={{ boxShadow: minting ? '4px 4px 0px #666' : '4px 4px 0px black' }}
                  >
                    {minting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                        Minting...
                      </span>
                    ) : (
                      `Mint ${MINT_AMOUNT} USDH`
                    )}
                  </button>

                  {/* balance after mint preview */}
                  {balance && (
                    <div className="mt-4 flex items-center justify-between text-xs font-mono text-black/40 px-1">
                      <span>Balance after mint</span>
                      <span className="text-black font-bold">
                        {((balance.formatted ?? 0) + MINT_AMOUNT).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDH
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </AnimateComponent>

        {/* tips section */}
        <AnimateComponent delay={290}>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className="bg-black border-2 border-black rounded-2xl p-5"
              style={{ boxShadow: '4px 4px 0px #FF6B9D' }}
            >
              <p className="text-[10px] font-mono text-white/40 uppercase mb-2">Be the House</p>
              <p className="text-sm font-bold text-white mb-1">Stake in the Vault</p>
              <p className="text-xs text-white/50">
                Deposit USDH, earn yield from every bet on the platform.
              </p>
              <a
                href="/app/stake"
                className="inline-block mt-3 px-4 py-2 text-[10px] font-black uppercase bg-[#FF6B9D] text-black border-2 border-black rounded-lg transition-transform hover:translate-x-0.5 hover:translate-y-0.5"
              >
                Go to Stake
              </a>
            </div>
            <div
              className="bg-black border-2 border-black rounded-2xl p-5"
              style={{ boxShadow: '4px 4px 0px #CDFF57' }}
            >
              <p className="text-[10px] font-mono text-white/40 uppercase mb-2">Or</p>
              <p className="text-sm font-bold text-white mb-1">Start Playing</p>
              <p className="text-xs text-white/50">
                Open a session, pick a game, try your luck.
              </p>
              <a
                href="/app/play"
                className="inline-block mt-3 px-4 py-2 text-[10px] font-black uppercase bg-[#CDFF57] text-black border-2 border-black rounded-lg transition-transform hover:translate-x-0.5 hover:translate-y-0.5"
              >
                Go to Play
              </a>
            </div>
          </div>
        </AnimateComponent>
      </div>
    </div>
  )
}
