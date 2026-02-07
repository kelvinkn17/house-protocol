// session-first provider: one deposit, play any game
// wraps the play layout so all game components share the same session
// integrates with Nitrolite clearnode for real state channel deposits
// persists sessionId to localStorage so sessions survive page refresh

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react'
import { GameSocket } from '@/hooks/useGameSocket'
import { ClearnodeClient } from '@/lib/clearnode'
import { generateNonce, createCommitment } from '@/lib/game'
import { useAuthContext } from '@/providers/AuthProvider'
import { useWallets } from '@privy-io/react-auth'
import { createWalletClient, custom } from 'viem'
import { sepolia } from 'viem/chains'
import type { Address } from 'viem'
import {
  USDH_ADDRESS,
  CUSTODY_ADDRESS,
  ERC20_ABI,
  CUSTODY_ABI,
  SEPOLIA_CHAIN_ID,
  getPublicClient,
} from '@/lib/contracts'

const SESSION_STORAGE_KEY = 'house_session_id'

// session lifecycle
export type SessionPhase =
  | 'no_wallet'
  | 'idle'
  | 'approving'
  | 'depositing'
  | 'connecting'
  | 'creating'
  | 'resuming'
  | 'active'
  | 'closing'
  | 'closed'
  | 'error'

// game lifecycle within a session
export type GamePhase =
  | 'none'
  | 'starting'
  | 'active'
  | 'playing_round'

export interface RoundResult {
  roundId: string
  playerWon: boolean
  payout: string
  gameOver: boolean
  canCashOut: boolean
  metadata: Record<string, unknown>
  houseNonce: string
}

export interface ActiveGame {
  slug: string
  gameType: string
  maxRounds: number
  primitiveState: Record<string, unknown>
  currentRound: number
  cumulativeMultiplier: number
}

export interface SessionStats {
  wins: number
  losses: number
  totalRounds: number
}

interface SessionContextValue {
  // session level
  sessionPhase: SessionPhase
  sessionId: string | null
  playerBalance: string
  houseBalance: string
  depositAmount: string
  sessionError: string | null

  // game level
  activeGame: ActiveGame | null
  gamePhase: GamePhase
  lastResult: RoundResult | null
  stats: SessionStats

  // methods
  openSession: (deposit: string) => Promise<void>
  startGame: (slug: string) => Promise<void>
  endGame: () => Promise<void>
  playRound: (choice: Record<string, unknown>, betAmount?: string) => Promise<RoundResult | null>
  cashOut: () => Promise<void>
  closeSession: () => Promise<void>
  reset: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { walletAddress } = useAuthContext()
  const { wallets } = useWallets()

  // session state
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>(walletAddress ? 'idle' : 'no_wallet')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [playerBalance, setPlayerBalance] = useState('0')
  const [houseBalance, setHouseBalance] = useState('0')
  const [depositAmount, setDepositAmount] = useState('0')
  const [sessionError, setSessionError] = useState<string | null>(null)

  // sync phase when wallet loads async (privy takes a tick to hydrate)
  useEffect(() => {
    if (walletAddress && sessionPhase === 'no_wallet') {
      setSessionPhase('idle')
    } else if (!walletAddress && sessionPhase === 'idle') {
      setSessionPhase('no_wallet')
    }
  }, [walletAddress])

  // game state
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null)
  const [gamePhase, setGamePhase] = useState<GamePhase>('none')
  const [lastResult, setLastResult] = useState<RoundResult | null>(null)
  const [stats, setStats] = useState<SessionStats>({ wins: 0, losses: 0, totalRounds: 0 })

  // ephemeral round data
  const roundRef = useRef<{ nonce: string; choiceData: string; roundId: string | null }>({
    nonce: '', choiceData: '', roundId: null,
  })
  const errorUnsub = useRef<(() => void) | null>(null)
  const bustedUnsub = useRef<(() => void) | null>(null)
  const resumeAttempted = useRef(false)

  // try to resume session from localStorage on mount
  useEffect(() => {
    if (!walletAddress || resumeAttempted.current) return
    if (sessionPhase !== 'idle') return

    resumeAttempted.current = true
    const savedId = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!savedId) return

    const doResume = async () => {
      setSessionPhase('resuming')
      try {
        await GameSocket.connect(walletAddress)

        // subscribe to errors
        if (errorUnsub.current) errorUnsub.current()
        errorUnsub.current = GameSocket.subscribe('error', (payload: unknown) => {
          const p = payload as { error: string }
          setSessionError(p.error)
        })

        GameSocket.send('resume_session', { sessionId: savedId })

        const result = await GameSocket.waitForOrError<{
          sessionId: string
          playerBalance: string
          houseBalance: string
          activeGame: {
            gameSlug: string
            gameType: string
            currentRound: number
            cumulativeMultiplier: number
            primitiveState: Record<string, unknown>
            isActive: boolean
          } | null
        }>('session_resumed')

        setSessionId(result.sessionId)
        setPlayerBalance(result.playerBalance)
        setHouseBalance(result.houseBalance)
        setDepositAmount(result.playerBalance)

        if (result.activeGame) {
          setActiveGame({
            slug: result.activeGame.gameSlug,
            gameType: result.activeGame.gameType,
            maxRounds: 0,
            primitiveState: result.activeGame.primitiveState || {},
            currentRound: result.activeGame.currentRound,
            cumulativeMultiplier: result.activeGame.cumulativeMultiplier,
          })
          setGamePhase(result.activeGame.isActive ? 'active' : 'none')
        }

        // subscribe to session_busted
        if (bustedUnsub.current) bustedUnsub.current()
        bustedUnsub.current = GameSocket.subscribe('session_busted', (payload: unknown) => {
          const p = payload as { sessionId: string; finalPlayerBalance: string; finalHouseBalance: string }
          setPlayerBalance(p.finalPlayerBalance)
          setHouseBalance(p.finalHouseBalance)
          setActiveGame(null)
          setGamePhase('none')
          setSessionPhase('closed')
          localStorage.removeItem(SESSION_STORAGE_KEY)
        })

        setSessionPhase('active')
      } catch {
        // session gone or expired, clear and go back to idle
        localStorage.removeItem(SESSION_STORAGE_KEY)
        setSessionPhase('idle')
      }
    }

    doResume()
  }, [walletAddress, sessionPhase])

  // full flow: approve + deposit to custody, backend validates + signs as broker,
  // frontend creates app session on clearnode
  const openSession = useCallback(async (deposit: string) => {
    if (!walletAddress) {
      setSessionPhase('no_wallet')
      return
    }

    setSessionError(null)

    try {
      // step 0: deposit USDH into Nitrolite Custody contract (on-chain)
      if (!USDH_ADDRESS || !CUSTODY_ADDRESS) throw new Error('Contract addresses not configured')

      const wallet = wallets[0]
      if (!wallet) throw new Error('No wallet connected')

      await wallet.switchChain(SEPOLIA_CHAIN_ID)
      const provider = await wallet.getEthereumProvider()
      const wc = createWalletClient({
        account: walletAddress as Address,
        chain: sepolia,
        transport: custom(provider),
      })
      const publicClient = getPublicClient()
      const depositBigInt = BigInt(deposit)

      // approve USDH spending by custody contract
      setSessionPhase('approving')
      const allowance = await publicClient.readContract({
        address: USDH_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [walletAddress as Address, CUSTODY_ADDRESS],
      }) as bigint

      if (allowance < depositBigInt) {
        const approveHash = await wc.writeContract({
          address: USDH_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CUSTODY_ADDRESS, depositBigInt * 10n],
        })
        await publicClient.waitForTransactionReceipt({ hash: approveHash })
      }

      // then: deposit into custody
      setSessionPhase('depositing')
      const depositHash = await wc.writeContract({
        address: CUSTODY_ADDRESS,
        abi: CUSTODY_ABI,
        functionName: 'deposit',
        args: [walletAddress as Address, USDH_ADDRESS, depositBigInt],
      })
      await publicClient.waitForTransactionReceipt({ hash: depositHash })

      // now proceed with session creation
      setSessionPhase('connecting')

      // connect to our backend WS
      await GameSocket.connect(walletAddress)

      if (errorUnsub.current) errorUnsub.current()
      errorUnsub.current = GameSocket.subscribe('error', (payload: unknown) => {
        const p = payload as { error: string }
        setSessionError(p.error)
      })

      setSessionPhase('creating')

      // step 1: ask backend to validate deposit and sign as broker
      GameSocket.send('create_session', { depositAmount: deposit })

      const params = await GameSocket.waitForOrError<{
        sessionId: string
        playerDeposit: string
        houseDeposit: string
        brokerAddress: string
        definition: Record<string, unknown>
        allocations: Array<{ participant: string; asset: string; amount: string }>
        brokerSigs: string[]
        requestId: number
        timestamp: number
      }>('session_params')

      // step 2: authenticate with clearnode using player's wallet (reuse wc from deposit step)
      await ClearnodeClient.authenticate(walletAddress as Address, wc)

      // step 3: create app session on clearnode (player signs + broker sigs combined)
      const appSessionId = await ClearnodeClient.openAppSession(
        params.definition,
        params.allocations,
        params.brokerSigs,
        params.requestId,
        params.timestamp,
      )

      // step 4: tell backend the clearnode session is confirmed
      GameSocket.send('confirm_session', {
        sessionId: params.sessionId,
        appSessionId,
      })

      // step 5: wait for backend to acknowledge
      const result = await GameSocket.waitForOrError<{
        sessionId: string
        playerDeposit: string
        houseDeposit: string
      }>('session_created')

      // persist sessionId for resume on refresh
      localStorage.setItem(SESSION_STORAGE_KEY, result.sessionId)

      setSessionId(result.sessionId)
      setPlayerBalance(result.playerDeposit)
      setHouseBalance(result.houseDeposit)
      setDepositAmount(result.playerDeposit)
      setStats({ wins: 0, losses: 0, totalRounds: 0 })
      setLastResult(null)
      setActiveGame(null)
      setGamePhase('none')
      setSessionPhase('active')

      // subscribe to session_busted for auto-close on bust
      if (bustedUnsub.current) bustedUnsub.current()
      bustedUnsub.current = GameSocket.subscribe('session_busted', (payload: unknown) => {
        const p = payload as { sessionId: string; finalPlayerBalance: string; finalHouseBalance: string }
        setPlayerBalance(p.finalPlayerBalance)
        setHouseBalance(p.finalHouseBalance)
        setActiveGame(null)
        setGamePhase('none')
        setSessionPhase('closed')
        localStorage.removeItem(SESSION_STORAGE_KEY)
      })
    } catch (err) {
      setSessionError((err as Error).message)
      setSessionPhase('error')
    }
  }, [walletAddress, wallets])

  const startGame = useCallback(async (slug: string) => {
    if (!sessionId || sessionPhase !== 'active') return

    setSessionError(null)
    setGamePhase('starting')

    try {
      GameSocket.send('start_game', { sessionId, gameSlug: slug })

      const result = await GameSocket.waitForOrError<{
        gameSlug: string
        gameType: string
        maxRounds: number
        primitiveState: Record<string, unknown>
      }>('game_started')

      setActiveGame({
        slug,
        gameType: result.gameType,
        maxRounds: result.maxRounds,
        primitiveState: result.primitiveState || {},
        currentRound: 0,
        cumulativeMultiplier: 1,
      })
      setLastResult(null)
      setGamePhase('active')
    } catch (err) {
      setSessionError((err as Error).message)
      setGamePhase('none')
    }
  }, [sessionId, sessionPhase])

  const endGame = useCallback(async () => {
    if (!sessionId) return

    try {
      GameSocket.send('end_game', { sessionId })
      await GameSocket.waitForOrError('game_ended')
    } catch {
      // best effort
    }

    setActiveGame(null)
    setGamePhase('none')
    setLastResult(null)
  }, [sessionId])

  const playRound = useCallback(async (choice: Record<string, unknown>, betAmount?: string) => {
    if (!sessionId || gamePhase !== 'active') return null

    setGamePhase('playing_round')
    setSessionError(null)

    try {
      const choiceData = JSON.stringify(choice)
      const nonce = generateNonce()
      const commitment = createCommitment(choiceData, nonce)

      roundRef.current = { nonce, choiceData, roundId: null }

      // commit
      GameSocket.send('place_bet', {
        sessionId,
        amount: betAmount || playerBalance,
        choiceData,
        commitment,
      })

      const betResult = await GameSocket.waitForOrError<{
        roundId: string
        roundNumber: number
        houseCommitment: string
      }>('bet_accepted')

      roundRef.current.roundId = betResult.roundId

      // reveal
      GameSocket.send('reveal', {
        sessionId,
        roundId: betResult.roundId,
        choiceData,
        nonce,
      })

      const roundResult = await GameSocket.waitForOrError<{
        roundId: string
        outcome: {
          rawValue: number
          playerWon: boolean
          payout: string
          gameOver: boolean
          canCashOut: boolean
          metadata: Record<string, unknown>
        }
        newPlayerBalance: string
        newHouseBalance: string
        houseNonce: string
        currentRound: number
        cumulativeMultiplier: number
        isActive: boolean
      }>('round_result')

      const result: RoundResult = {
        roundId: roundResult.roundId,
        playerWon: roundResult.outcome.playerWon,
        payout: roundResult.outcome.payout,
        gameOver: roundResult.outcome.gameOver,
        canCashOut: roundResult.outcome.canCashOut,
        metadata: roundResult.outcome.metadata,
        houseNonce: roundResult.houseNonce,
      }

      setLastResult(result)
      setPlayerBalance(roundResult.newPlayerBalance)
      setHouseBalance(roundResult.newHouseBalance)
      setActiveGame(prev => prev ? {
        ...prev,
        currentRound: roundResult.currentRound,
        cumulativeMultiplier: roundResult.cumulativeMultiplier,
      } : null)
      setStats(prev => ({
        wins: prev.wins + (result.playerWon ? 1 : 0),
        losses: prev.losses + (result.playerWon ? 0 : 1),
        totalRounds: prev.totalRounds + 1,
      }))

      if (!roundResult.isActive) {
        setGamePhase('none')
      } else {
        setGamePhase('active')
      }

      return result
    } catch (err) {
      setSessionError((err as Error).message)
      setGamePhase('active')
      return null
    }
  }, [sessionId, playerBalance, gamePhase])

  const cashOut = useCallback(async () => {
    if (!sessionId) return

    setSessionError(null)

    try {
      GameSocket.send('cashout', { sessionId })

      const result = await GameSocket.waitForOrError<{
        sessionId: string
        payout: string
        multiplier: number
        newPlayerBalance: string
        newHouseBalance: string
      }>('cashout_result')

      setPlayerBalance(result.newPlayerBalance)
      setHouseBalance(result.newHouseBalance)

      // game ended, session stays active
      setActiveGame(null)
      setGamePhase('none')
    } catch (err) {
      setSessionError((err as Error).message)
    }
  }, [sessionId])

  // simplified close: backend handles clearnode close, we just wait for confirmation
  const closeSession = useCallback(async () => {
    if (!sessionId) return

    setSessionPhase('closing')
    try {
      GameSocket.send('close_session', { sessionId })

      const result = await GameSocket.waitForOrError<{
        sessionId: string
        finalPlayerBalance: string
        finalHouseBalance: string
      }>('session_closed')

      setPlayerBalance(result.finalPlayerBalance)
      setHouseBalance(result.finalHouseBalance)
      setActiveGame(null)
      setGamePhase('none')
      setSessionPhase('closed')
      localStorage.removeItem(SESSION_STORAGE_KEY)
    } catch (err) {
      setSessionError((err as Error).message)
      setSessionPhase('error')
    }
  }, [sessionId])

  const reset = useCallback(() => {
    ClearnodeClient.disconnect()
    if (bustedUnsub.current) {
      bustedUnsub.current()
      bustedUnsub.current = null
    }
    setSessionPhase(walletAddress ? 'idle' : 'no_wallet')
    setSessionError(null)
    setSessionId(null)
    setPlayerBalance('0')
    setHouseBalance('0')
    setDepositAmount('0')
    setActiveGame(null)
    setGamePhase('none')
    setLastResult(null)
    setStats({ wins: 0, losses: 0, totalRounds: 0 })
  }, [walletAddress])

  return (
    <SessionContext.Provider value={{
      sessionPhase,
      sessionId,
      playerBalance,
      houseBalance,
      depositAmount,
      sessionError,
      activeGame,
      gamePhase,
      lastResult,
      stats,
      openSession,
      startGame,
      endGame,
      playRound,
      cashOut,
      closeSession,
      reset,
    }}>
      {children}
    </SessionContext.Provider>
  )
}
