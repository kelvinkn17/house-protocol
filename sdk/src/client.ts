// core client class wrapping socket + session state + game state
// mirrors SessionProvider logic but framework-agnostic with event emitter pattern

import type { WalletClient, Address } from 'viem'
import { sepolia } from 'viem/chains'
import { GameSocket } from './lib/socket'
import { generateNonce, createCommitment } from './lib/crypto'
import { playerSignAppSession } from './lib/clearnode'
import {
  CUSTODY_ABI,
  ERC20_ABI,
  SEPOLIA_CHAIN_ID,
  getPublicClient,
} from './lib/contracts'
import type {
  HouseConfig,
  HouseClientState,
  SessionPhase,
  GamePhase,
  RoundResult,
  ActiveGame,
  SessionStats,
  PlayerChoice,
} from './types'

const SESSION_STORAGE_KEY = 'house_session_id'

type Listener = () => void

export class HouseClient {
  private config: HouseConfig
  private walletClient: WalletClient | null = null
  private walletAddress: string | null = null
  private listeners = new Set<Listener>()
  private errorUnsub: (() => void) | null = null
  private bustedUnsub: (() => void) | null = null
  private resumeAttempted = false

  // round ephemeral data
  private roundNonce = ''
  private roundChoiceData = ''

  // state
  private _state: HouseClientState = {
    sessionPhase: 'no_wallet',
    sessionId: null,
    channelId: null,
    playerBalance: '0',
    houseBalance: '0',
    depositAmount: '0',
    sessionError: null,
    sessionSeedHash: null,
    sessionSeed: null,
    roundHistory: [],
    activeGame: null,
    gamePhase: 'none',
    lastResult: null,
    stats: { wins: 0, losses: 0, totalRounds: 0 },
  }

  constructor(config: HouseConfig) {
    this.config = config
    GameSocket.configure(config.apiUrl, config.apiKey)
  }

  // external store interface (useSyncExternalStore compatible)
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getState = (): HouseClientState => {
    return this._state
  }

  private setState(partial: Partial<HouseClientState>) {
    this._state = { ...this._state, ...partial }
    this.listeners.forEach(l => l())
  }

  private setPhase(sessionPhase: SessionPhase) {
    this.setState({ sessionPhase })
  }

  // set wallet, triggers resume if applicable
  setWallet(walletClient: WalletClient, address: string) {
    this.walletClient = walletClient
    this.walletAddress = address

    if (this._state.sessionPhase === 'no_wallet') {
      this.setPhase('idle')
    }

    // try resume
    if (!this.resumeAttempted) {
      this.resumeAttempted = true
      this.tryResume()
    }
  }

  clearWallet() {
    this.walletClient = null
    this.walletAddress = null
    this.setPhase('no_wallet')
  }

  private async tryResume() {
    if (!this.walletAddress) return
    if (typeof window === 'undefined') return

    const saved = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!saved) return

    let savedId: string
    let savedDeposit: string | null = null
    try {
      const parsed = JSON.parse(saved)
      savedId = parsed.sessionId
      savedDeposit = parsed.depositAmount || null
    } catch {
      savedId = saved
    }

    this.setPhase('resuming')
    try {
      await GameSocket.connect(this.walletAddress)

      this.subscribeErrors()

      GameSocket.send('resume_session', { sessionId: savedId })

      const result = await GameSocket.waitForOrError<{
        sessionId: string
        playerBalance: string
        houseBalance: string
        playerDeposit: string
        channelId: string | null
        sessionSeedHash: string | null
        openSessionTxHash: string | null
        activeGame: {
          gameSlug: string
          gameType: string
          currentRound: number
          cumulativeMultiplier: number
          primitiveState: Record<string, unknown>
          isActive: boolean
        } | null
      }>('session_resumed')

      let activeGame: ActiveGame | null = null
      let gamePhase: GamePhase = 'none'

      if (result.activeGame) {
        activeGame = {
          slug: result.activeGame.gameSlug,
          gameType: result.activeGame.gameType,
          maxRounds: 0,
          primitiveState: result.activeGame.primitiveState || {},
          currentRound: result.activeGame.currentRound,
          cumulativeMultiplier: result.activeGame.cumulativeMultiplier,
        }
        gamePhase = result.activeGame.isActive ? 'active' : 'none'
      }

      this.subscribeBusted()

      this.setState({
        sessionPhase: 'active',
        sessionId: result.sessionId,
        channelId: result.channelId,
        playerBalance: result.playerBalance,
        houseBalance: result.houseBalance,
        sessionSeedHash: result.sessionSeedHash,
        depositAmount: result.playerDeposit || savedDeposit || result.playerBalance,
        activeGame,
        gamePhase,
      })
    } catch {
      localStorage.removeItem(SESSION_STORAGE_KEY)
      this.setPhase('idle')
    }
  }

  private subscribeErrors() {
    if (this.errorUnsub) this.errorUnsub()
    this.errorUnsub = GameSocket.subscribe('error', (payload: unknown) => {
      const p = payload as { error: string }
      this.setState({ sessionError: p.error })
    })
  }

  private subscribeBusted() {
    if (this.bustedUnsub) this.bustedUnsub()
    this.bustedUnsub = GameSocket.subscribe('session_busted', (payload: unknown) => {
      const p = payload as {
        sessionId: string
        finalPlayerBalance: string
        finalHouseBalance: string
        sessionSeed?: string
      }
      this.setState({
        playerBalance: p.finalPlayerBalance,
        houseBalance: p.finalHouseBalance,
        sessionSeed: p.sessionSeed || null,
        activeGame: null,
        gamePhase: 'none',
        sessionPhase: 'closed',
      })
      localStorage.removeItem(SESSION_STORAGE_KEY)
    })
  }

  async openSession(deposit: string) {
    if (!this.walletClient || !this.walletAddress) {
      this.setPhase('no_wallet')
      return
    }

    this.setState({ sessionError: null })

    const wc = this.walletClient
    const addr = this.walletAddress
    const usdhAddress = (this.config.usdhAddress || '') as Address
    const custodyAddress = (this.config.custodyAddress || '') as Address

    if (!usdhAddress || !custodyAddress) {
      this.setState({ sessionError: 'Contract addresses not configured', sessionPhase: 'error' })
      return
    }

    try {
      const publicClient = getPublicClient(this.config.rpcUrl)

      // deposit callback for clearnode
      const handleDepositNeeded = async (deficit: string) => {
        const deficitBigInt = BigInt(deficit)

        this.setPhase('approving')
        const allowance = await publicClient.readContract({
          address: usdhAddress,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [addr as Address, custodyAddress],
        }) as bigint

        if (allowance < deficitBigInt) {
          const approveHash = await wc.writeContract({
            account: addr as Address,
            chain: sepolia,
            address: usdhAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [custodyAddress, 2n ** 256n - 1n],
          })
          await publicClient.waitForTransactionReceipt({ hash: approveHash })
        }

        this.setPhase('depositing')
        const depositHash = await wc.writeContract({
          account: addr as Address,
          chain: sepolia,
          address: custodyAddress,
          abi: CUSTODY_ABI,
          functionName: 'deposit',
          args: [addr as Address, usdhAddress, deficitBigInt],
        })
        await publicClient.waitForTransactionReceipt({ hash: depositHash })
      }

      this.setPhase('connecting')
      await GameSocket.connect(addr)
      this.subscribeErrors()

      this.setPhase('creating')
      GameSocket.send('create_session', { depositAmount: deposit })

      const signRequest = await GameSocket.waitForOrError<{
        sessionId: string
        definition: Record<string, unknown>
        allocations: Array<{ participant: string; asset: string; amount: string }>
        brokerSignature: string
        requestId: number
        timestamp: number
      }>('session_sign_request', 30000)

      this.setPhase('signing')
      const appSessionId = await playerSignAppSession(
        wc,
        addr,
        signRequest.definition,
        signRequest.allocations,
        signRequest.brokerSignature,
        signRequest.requestId,
        signRequest.timestamp,
        handleDepositNeeded,
        this.config.clearnodeUrl,
      )

      GameSocket.send('session_player_signed', {
        sessionId: signRequest.sessionId,
        channelId: appSessionId,
      })

      const result = await GameSocket.waitForOrError<{
        sessionId: string
        playerDeposit: string
        houseDeposit: string
        channelId: string
        sessionSeedHash?: string
      }>('session_created', 60000)

      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        sessionId: result.sessionId,
        depositAmount: deposit,
      }))

      this.subscribeBusted()

      this.setState({
        sessionPhase: 'active',
        sessionId: result.sessionId,
        channelId: result.channelId,
        playerBalance: result.playerDeposit,
        houseBalance: result.houseDeposit,
        depositAmount: result.playerDeposit,
        sessionSeedHash: result.sessionSeedHash || null,
        sessionSeed: null,
        roundHistory: [],
        stats: { wins: 0, losses: 0, totalRounds: 0 },
        lastResult: null,
        activeGame: null,
        gamePhase: 'none',
      })
    } catch (err) {
      this.setState({
        sessionError: (err as Error).message,
        sessionPhase: 'error',
      })
    }
  }

  async startGame(slug: string) {
    const { sessionId, sessionPhase, gamePhase } = this._state
    if (!sessionId || sessionPhase !== 'active') return

    this.setState({ sessionError: null, gamePhase: 'starting' })

    try {
      GameSocket.send('start_game', { sessionId, gameSlug: slug })

      const result = await GameSocket.waitForOrError<{
        gameSlug: string
        gameType: string
        maxRounds: number
        primitiveState: Record<string, unknown>
      }>('game_started')

      this.setState({
        activeGame: {
          slug,
          gameType: result.gameType,
          maxRounds: result.maxRounds,
          primitiveState: result.primitiveState || {},
          currentRound: 0,
          cumulativeMultiplier: 1,
        },
        lastResult: null,
        gamePhase: 'active',
      })
    } catch (err) {
      this.setState({
        sessionError: (err as Error).message,
        gamePhase: 'none',
      })
    }
  }

  async endGame() {
    const { sessionId } = this._state
    if (!sessionId) return

    try {
      GameSocket.send('end_game', { sessionId })
      await GameSocket.waitForOrError('game_ended')
    } catch {
      // best effort
    }

    this.setState({
      activeGame: null,
      gamePhase: 'none',
      lastResult: null,
    })
  }

  async playRound(choice: PlayerChoice, betAmount?: string): Promise<RoundResult | null> {
    const { sessionId, gamePhase, playerBalance } = this._state
    if (!sessionId || gamePhase !== 'active') return null

    this.setState({ gamePhase: 'playing_round', sessionError: null })

    try {
      const choiceData = JSON.stringify(choice)
      const nonce = generateNonce()
      const commitment = createCommitment(choiceData, nonce)

      this.roundNonce = nonce
      this.roundChoiceData = choiceData

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

      const prevStats = this._state.stats

      this.setState({
        lastResult: result,
        roundHistory: [...this._state.roundHistory, { ...result, roundNumber: roundResult.currentRound }],
        playerBalance: roundResult.newPlayerBalance,
        houseBalance: roundResult.newHouseBalance,
        activeGame: this._state.activeGame ? {
          ...this._state.activeGame,
          currentRound: roundResult.currentRound,
          cumulativeMultiplier: roundResult.cumulativeMultiplier,
        } : null,
        stats: {
          wins: prevStats.wins + (result.playerWon ? 1 : 0),
          losses: prevStats.losses + (result.playerWon ? 0 : 1),
          totalRounds: prevStats.totalRounds + 1,
        },
        gamePhase: roundResult.isActive ? 'active' : 'none',
      })

      return result
    } catch (err) {
      this.setState({
        sessionError: (err as Error).message,
        gamePhase: 'active',
      })
      return null
    }
  }

  async cashOut() {
    const { sessionId } = this._state
    if (!sessionId) return

    this.setState({ sessionError: null })

    try {
      GameSocket.send('cashout', { sessionId })

      const result = await GameSocket.waitForOrError<{
        sessionId: string
        payout: string
        multiplier: number
        newPlayerBalance: string
        newHouseBalance: string
      }>('cashout_result')

      this.setState({
        playerBalance: result.newPlayerBalance,
        houseBalance: result.newHouseBalance,
        activeGame: null,
        gamePhase: 'none',
      })
    } catch (err) {
      this.setState({ sessionError: (err as Error).message })
    }
  }

  async closeSession() {
    const { sessionId } = this._state
    if (!sessionId) return

    this.setPhase('closing')
    try {
      GameSocket.send('close_session', { sessionId })

      const result = await GameSocket.waitForOrError<{
        sessionId: string
        finalPlayerBalance: string
        finalHouseBalance: string
        sessionSeed?: string
      }>('session_closed')

      this.setState({
        playerBalance: result.finalPlayerBalance,
        houseBalance: result.finalHouseBalance,
        sessionSeed: result.sessionSeed || null,
        activeGame: null,
        gamePhase: 'none',
      })

      // withdraw from custody if wallet is available
      this.setPhase('withdrawing')
      await this.withdrawFromCustody(result.finalPlayerBalance)

      this.setPhase('closed')
      localStorage.removeItem(SESSION_STORAGE_KEY)
    } catch (err) {
      this.setState({
        sessionError: (err as Error).message,
        sessionPhase: 'error',
      })
    }
  }

  private async withdrawFromCustody(finalPlayerBalance: string) {
    if (BigInt(finalPlayerBalance) <= 0n) return
    if (!this.walletClient || !this.walletAddress) return

    const custodyAddress = (this.config.custodyAddress || '') as Address
    const usdhAddress = (this.config.usdhAddress || '') as Address
    if (!custodyAddress || !usdhAddress) return

    try {
      const publicClient = getPublicClient(this.config.rpcUrl)
      const addr = this.walletAddress as Address

      const balances = await publicClient.readContract({
        address: custodyAddress,
        abi: CUSTODY_ABI,
        functionName: 'getAccountsBalances',
        args: [[addr], [usdhAddress]],
      }) as bigint[][]
      const available = balances[0]?.[0] ?? 0n

      if (available <= 0n) return

      const owed = BigInt(finalPlayerBalance)
      const toWithdraw = available < owed ? available : owed

      const txHash = await this.walletClient.writeContract({
        account: addr,
        chain: sepolia,
        address: custodyAddress,
        abi: CUSTODY_ABI,
        functionName: 'withdraw',
        args: [usdhAddress, toWithdraw],
      })
      await publicClient.waitForTransactionReceipt({ hash: txHash })
    } catch (err) {
      console.error('[sdk] custody withdraw failed:', (err as Error).message)
    }
  }

  reset() {
    if (this.bustedUnsub) {
      this.bustedUnsub()
      this.bustedUnsub = null
    }
    this.setState({
      sessionPhase: this.walletAddress ? 'idle' : 'no_wallet',
      sessionError: null,
      sessionId: null,
      channelId: null,
      playerBalance: '0',
      houseBalance: '0',
      depositAmount: '0',
      sessionSeedHash: null,
      sessionSeed: null,
      roundHistory: [],
      activeGame: null,
      gamePhase: 'none',
      lastResult: null,
      stats: { wins: 0, losses: 0, totalRounds: 0 },
    })
  }

  disconnect() {
    GameSocket.disconnect()
    if (this.errorUnsub) this.errorUnsub()
    if (this.bustedUnsub) this.bustedUnsub()
  }
}
