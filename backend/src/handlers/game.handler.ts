// websocket game handler, session-first architecture
// session = deposit once, play any game. games start/end within a session.
// integrates with Nitrolite clearnode for real state channel deposits.
// backend handles close via its own clearnode connection (broker signs close).

import type { FastifyInstance } from 'fastify';
import type WebSocket from 'ws';
import { GameService } from '../services/game.service.ts';
import { getVaultState } from '../services/vault.service.ts';
import { triggerSnapshot } from '../workers/vaultIndexer.ts';
import { getPrimitive } from '../services/primitives/registry.ts';
import { getGameConfig } from '../services/primitives/configs.ts';
import { prismaQuery } from '../lib/prisma.ts';
import { Prisma } from '../../prisma/generated';
import { ClearnodeBackend } from '../lib/clearnode.ts';
import type { GameSessionState, GameConfig } from '../services/primitives/types.ts';
import { HOUSE_EDGE_BPS, BPS_BASE } from '../services/primitives/types.ts';
import { RPCProtocolVersion } from '@erc7824/nitrolite';
import { privateKeyToAccount } from 'viem/accounts';
import { OPERATOR_PRIVATE_KEY } from '../config/main-config.ts';
import type { Hex, Address } from 'viem';

const db = prismaQuery;

const ASSET_SYMBOL = 'usdh';
const APP_NAME = 'the-house-protocol';
const DECIMALS = 1000000n;

// broker address (lazy init from operator private key)
let _brokerAddress: Address | null = null;

function getBrokerAddress(): Address {
  if (!_brokerAddress) {
    if (!OPERATOR_PRIVATE_KEY) throw new Error('OPERATOR_PRIVATE_KEY not configured');
    _brokerAddress = privateKeyToAccount(OPERATOR_PRIVATE_KEY as Hex).address;
  }
  return _brokerAddress;
}

interface ClientMessage {
  type: string;
  payload: unknown;
}

interface CreateSessionPayload {
  depositAmount: string;
  tokenAddress?: string;
}

interface StartGamePayload {
  sessionId: string;
  gameSlug: string;
}

interface EndGamePayload {
  sessionId: string;
}

interface PlaceBetPayload {
  sessionId: string;
  amount: string;
  choiceData: string;
  commitment: string;
}

interface RevealPayload {
  sessionId: string;
  roundId: string;
  choiceData: string;
  nonce: string;
}

interface CashOutPayload {
  sessionId: string;
}

interface CloseSessionPayload {
  sessionId: string;
}

interface ResumeSessionPayload {
  sessionId: string;
}

const connections = new Map<string, WebSocket>();

// session-level state (persists across games within a session)
const sessions = new Map<string, {
  playerId: string;
  playerBalance: bigint;
  houseBalance: bigint;
  isActive: boolean;
}>();

// game-level state (reset when switching games)
const activeGames = new Map<string, {
  config: GameConfig;
  state: GameSessionState;
}>();

function send(ws: WebSocket, type: string, payload: unknown) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

function sendError(ws: WebSocket, error: string, code?: string) {
  send(ws, 'error', { error, code });
}

async function handleMessage(ws: WebSocket, playerId: string, message: ClientMessage) {
  const { type, payload } = message;

  try {
    switch (type) {
      case 'create_session':
        await handleCreateSession(ws, playerId, payload as CreateSessionPayload);
        break;
      case 'start_game':
        await handleStartGame(ws, playerId, payload as StartGamePayload);
        break;
      case 'end_game':
        await handleEndGame(ws, playerId, payload as EndGamePayload);
        break;
      case 'place_bet':
        await handlePlaceBet(ws, playerId, payload as PlaceBetPayload);
        break;
      case 'reveal':
        await handleReveal(ws, playerId, payload as RevealPayload);
        break;
      case 'cashout':
        await handleCashOut(ws, playerId, payload as CashOutPayload);
        break;
      case 'close_session':
        await handleCloseSession(ws, playerId, payload as CloseSessionPayload);
        break;
      case 'resume_session':
        await handleResumeSession(ws, playerId, payload as ResumeSessionPayload);
        break;
      case 'list_sessions':
        await handleListSessions(ws, playerId);
        break;
      case 'get_session':
        await handleGetSession(ws, payload as { sessionId: string });
        break;
      case 'ping':
        send(ws, 'pong', { time: Date.now() });
        break;
      default:
        sendError(ws, `Unknown message type: ${type}`, 'UNKNOWN_TYPE');
    }
  } catch (err) {
    const error = err as Error;
    console.error(`Error handling ${type}:`, error);
    sendError(ws, error.message, 'HANDLER_ERROR');
  }
}

// validate deposit, create clearnode session as broker, return session_created directly
async function handleCreateSession(ws: WebSocket, playerId: string, payload: CreateSessionPayload) {
  const { depositAmount } = payload;
  const playerDeposit = BigInt(depositAmount);

  // force-close any stale sessions for this player (leftover from crashes, old code, etc.)
  const staleSessions = await db.session.findMany({
    where: { playerId, status: { in: ['ACTIVE', 'PENDING'] } },
  });
  for (const stale of staleSessions) {
    console.log(`[session] force-closing stale session ${stale.id} for ${playerId}`);

    // try clearnode close, best effort (old sessions might have weight [100,0] so broker can't close)
    if (stale.channelId) {
      const brokerAddr = getBrokerAddress();
      try {
        // clearnode tracks whole units. derive one side from the other to avoid
        // truncation rounding that makes the total not add up.
        const clearnodeTotal = BigInt(stale.playerDeposit) / DECIMALS + BigInt(stale.houseDeposit) / DECIMALS;
        const playerAmt = BigInt(stale.currentPlayerBalance || stale.playerDeposit) / DECIMALS;
        const houseAmt = clearnodeTotal - playerAmt;
        await ClearnodeBackend.closeAppSession(stale.channelId, [
          { participant: playerId as Address, asset: ASSET_SYMBOL, amount: playerAmt.toString() },
          { participant: brokerAddr, asset: ASSET_SYMBOL, amount: houseAmt.toString() },
        ]);
      } catch {
        // old sessions with [100,0] weights won't close, that's expected
      }
    }

    await db.session.update({
      where: { id: stale.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        finalPlayerBalance: stale.currentPlayerBalance || stale.playerDeposit,
        finalHouseBalance: stale.currentHouseBalance || stale.houseDeposit,
      },
    });
    sessions.delete(stale.id);
    activeGames.delete(stale.id);
  }

  // house deposit = player * 10, capped by custody
  let vaultState;
  try {
    vaultState = await getVaultState();
  } catch (err) {
    console.error('Failed to fetch vault state:', err);
    sendError(ws, 'Could not verify house liquidity', 'VAULT_ERROR');
    return;
  }

  // max deposit = 1% of custody
  const maxDeposit = vaultState.custodyBalance / 100n;
  if (playerDeposit > maxDeposit) {
    sendError(ws, `Max deposit is ${maxDeposit.toString()} (1% of custody ${vaultState.custodyBalance})`, 'MAX_BET_EXCEEDED');
    return;
  }

  let houseDeposit = playerDeposit * 10n;
  if (houseDeposit > vaultState.custodyBalance) {
    houseDeposit = vaultState.custodyBalance;
  }

  if (vaultState.custodyBalance < houseDeposit) {
    sendError(ws, `Insufficient house liquidity. Custody has ${vaultState.custodyBalance}, needs ${houseDeposit}`, 'LIQUIDITY_ERROR');
    return;
  }

  console.log(`[session] preparing for ${playerId}, deposit=${playerDeposit} house=${houseDeposit}`);

  // create session in DB as PENDING (waiting for clearnode confirmation)
  const session = await db.session.create({
    data: {
      playerId,
      gameConfigSlug: null,
      playerDeposit: playerDeposit.toString(),
      houseDeposit: houseDeposit.toString(),
      status: 'PENDING',
    },
  });

  // store session state (not active yet)
  sessions.set(session.id, {
    playerId,
    playerBalance: playerDeposit,
    houseBalance: houseDeposit,
    isActive: false,
  });

  // build nitrolite app session definition
  const brokerAddr = getBrokerAddress();

  const definition = {
    protocol: RPCProtocolVersion.NitroRPC_0_4,
    participants: [playerId as Address, brokerAddr],
    weights: [100, 100], // either player or broker can close
    quorum: 100,
    challenge: 0,
    nonce: Date.now(),
    application: APP_NAME,
  };

  // clearnode expects human-readable amounts, not 6-decimal on-chain units
  const allocations = [
    { participant: playerId as Address, asset: ASSET_SYMBOL, amount: (playerDeposit / DECIMALS).toString() },
    { participant: brokerAddr, asset: ASSET_SYMBOL, amount: (houseDeposit / DECIMALS).toString() },
  ];

  // backend creates the clearnode session directly (broker weight alone meets quorum)
  const appSessionId = await ClearnodeBackend.createAppSession(definition, allocations);

  session.isActive = true;

  await db.session.update({
    where: { id: session.id },
    data: {
      channelId: appSessionId,
      status: 'ACTIVE',
      currentPlayerBalance: playerDeposit.toString(),
      currentHouseBalance: houseDeposit.toString(),
    },
  });

  console.log(`[session] ${session.id} active, appSession=${appSessionId}`);

  send(ws, 'session_created', {
    sessionId: session.id,
    playerDeposit: playerDeposit.toString(),
    houseDeposit: houseDeposit.toString(),
  });
}

async function handleStartGame(ws: WebSocket, playerId: string, payload: StartGamePayload) {
  const { sessionId, gameSlug } = payload;

  const session = sessions.get(sessionId);
  if (!session || session.playerId !== playerId) {
    sendError(ws, 'Session not found or not authorized', 'AUTH_ERROR');
    return;
  }

  if (!session.isActive) {
    sendError(ws, 'Session not active', 'SESSION_CLOSED');
    return;
  }

  if (session.playerBalance <= 0n) {
    sendError(ws, 'No balance remaining. Close your session to withdraw.', 'INSUFFICIENT_BALANCE');
    return;
  }

  // check no game already running
  if (activeGames.has(sessionId)) {
    sendError(ws, 'A game is already running in this session. End it first.', 'GAME_ACTIVE');
    return;
  }

  const config = getGameConfig(gameSlug);
  if (!config) {
    sendError(ws, `Unknown game: ${gameSlug}`, 'INVALID_GAME');
    return;
  }

  const primitive = getPrimitive(config.gameType);
  const gameState = primitive.initializeState(config, session.playerBalance);
  gameState.playerBalance = session.playerBalance;
  gameState.houseBalance = session.houseBalance;

  // store in activeGames
  activeGames.set(sessionId, { config, state: gameState });

  // update session in DB with current game slug
  await db.session.update({
    where: { id: sessionId },
    data: { gameConfigSlug: gameSlug },
  });

  send(ws, 'game_started', {
    gameSlug,
    gameType: config.gameType,
    maxRounds: gameState.maxRounds,
    primitiveState: gameState.primitiveState,
  });
}

async function handleEndGame(ws: WebSocket, playerId: string, payload: EndGamePayload) {
  const { sessionId } = payload;

  const session = sessions.get(sessionId);
  if (!session || session.playerId !== playerId) {
    sendError(ws, 'Session not found or not authorized', 'AUTH_ERROR');
    return;
  }

  // clear active game, session stays open
  activeGames.delete(sessionId);

  // clear game slug in DB
  await db.session.update({
    where: { id: sessionId },
    data: { gameConfigSlug: null },
  });

  send(ws, 'game_ended', { sessionId });
}

async function handlePlaceBet(ws: WebSocket, playerId: string, payload: PlaceBetPayload) {
  const { sessionId, amount, commitment, choiceData } = payload;

  const session = sessions.get(sessionId);
  if (!session || session.playerId !== playerId) {
    sendError(ws, 'Not authorized for this session', 'AUTH_ERROR');
    return;
  }

  const game = activeGames.get(sessionId);
  if (!game) {
    sendError(ws, 'No active game in this session', 'NO_GAME');
    return;
  }

  const { config, state } = game;

  if (!state.isActive) {
    sendError(ws, 'Game not active', 'GAME_CLOSED');
    return;
  }

  const betAmount = BigInt(amount);

  if (betAmount <= 0n) {
    sendError(ws, 'Bet amount must be greater than zero', 'INVALID_BET');
    return;
  }

  if (betAmount > session.playerBalance) {
    sendError(ws, `Bet ${betAmount} exceeds balance ${session.playerBalance}`, 'INSUFFICIENT_BALANCE');
    return;
  }

  // validate choice using primitive
  const primitive = getPrimitive(config.gameType);
  const choice = JSON.parse(choiceData);
  const validation = primitive.validateChoice(choice, state, config);
  if (!validation.valid) {
    sendError(ws, validation.error || 'Invalid choice', 'INVALID_CHOICE');
    return;
  }

  // track per-round bet amount
  state.betAmount = betAmount;

  const roundNumber = state.currentRound + 1;

  // commit-reveal: player commits
  const round = await GameService.playerCommit({
    sessionId,
    roundNumber,
    gameType: config.gameType,
    betAmount,
    commitment,
  });

  // house commits
  const { houseCommitment } = await GameService.houseCommit(round.id);

  send(ws, 'bet_accepted', {
    roundId: round.id,
    roundNumber,
    houseCommitment,
  });
}

async function handleReveal(ws: WebSocket, playerId: string, payload: RevealPayload) {
  const { sessionId, roundId, choiceData, nonce } = payload;

  const session = sessions.get(sessionId);
  if (!session || session.playerId !== playerId) {
    sendError(ws, 'Not authorized for this session', 'AUTH_ERROR');
    return;
  }

  const game = activeGames.get(sessionId);
  if (!game) {
    sendError(ws, 'No active game in this session', 'NO_GAME');
    return;
  }

  const { config, state } = game;

  // player reveals
  try {
    await GameService.playerReveal(roundId, choiceData, nonce);
  } catch (err) {
    const error = err as Error;
    sendError(ws, error.message, 'REVEAL_ERROR');
    return;
  }

  // house reveals and settles via primitive
  const { outcome, updatedState } = await GameService.houseRevealAndSettle(roundId, state, config);

  const betAmount = state.betAmount;
  let newPlayerBalance = session.playerBalance;
  let newHouseBalance = session.houseBalance;

  // settle balances for all game types uniformly
  if (outcome.gameOver || outcome.playerWon !== undefined) {
    if (outcome.playerWon && outcome.payout > 0n) {
      newPlayerBalance = session.playerBalance - betAmount + outcome.payout;
      newHouseBalance = session.houseBalance + betAmount - outcome.payout;
    } else if (!outcome.playerWon) {
      newPlayerBalance = session.playerBalance - betAmount;
      newHouseBalance = session.houseBalance + betAmount;
    }
  }

  // universal bust detection, applies to every game type
  const busted = newPlayerBalance <= 0n;
  if (busted) {
    updatedState.isActive = false;
  }

  updatedState.playerBalance = newPlayerBalance;
  updatedState.houseBalance = newHouseBalance;

  // update session-level balances
  session.playerBalance = newPlayerBalance;
  session.houseBalance = newHouseBalance;

  // update game state
  game.state = updatedState;

  // persist balances + game state to DB every round
  await db.session.update({
    where: { id: sessionId },
    data: {
      gameState: JSON.parse(JSON.stringify(updatedState, (_k, v) =>
        typeof v === 'bigint' ? v.toString() : v
      )),
      currentPlayerBalance: newPlayerBalance.toString(),
      currentHouseBalance: newHouseBalance.toString(),
      status: session.isActive ? 'ACTIVE' : 'CLOSED',
    },
  });

  const round = await db.round.findUnique({ where: { id: roundId } });

  send(ws, 'round_result', {
    roundId,
    outcome: {
      rawValue: outcome.rawValue,
      playerWon: outcome.playerWon,
      payout: outcome.payout.toString(),
      gameOver: outcome.gameOver,
      canCashOut: outcome.canCashOut,
      metadata: outcome.metadata,
    },
    newPlayerBalance: newPlayerBalance.toString(),
    newHouseBalance: newHouseBalance.toString(),
    houseNonce: round?.houseNonce,
    currentRound: updatedState.currentRound,
    cumulativeMultiplier: updatedState.cumulativeMultiplier,
    isActive: updatedState.isActive,
  });

  // auto-close on bust: close clearnode session and finalize
  if (busted) {
    await closeClearnodeAndFinalize(sessionId, session, ws);
    send(ws, 'session_busted', {
      sessionId,
      finalPlayerBalance: session.playerBalance.toString(),
      finalHouseBalance: session.houseBalance.toString(),
    });
  }
}

async function handleCashOut(ws: WebSocket, playerId: string, payload: CashOutPayload) {
  const { sessionId } = payload;

  const session = sessions.get(sessionId);
  if (!session || session.playerId !== playerId) {
    sendError(ws, 'Not authorized for this session', 'AUTH_ERROR');
    return;
  }

  const game = activeGames.get(sessionId);
  if (!game) {
    sendError(ws, 'No active game to cash out from', 'NO_GAME');
    return;
  }

  const { state } = game;

  if (!state.isActive) {
    sendError(ws, 'Game not active', 'GAME_CLOSED');
    return;
  }

  // calculate cashout payout with house edge
  const grossPayout = (state.betAmount * BigInt(Math.floor(state.cumulativeMultiplier * 10000))) / 10000n;
  const netPayout = (grossPayout * BigInt(BPS_BASE - HOUSE_EDGE_BPS)) / BigInt(BPS_BASE);

  const newPlayerBalance = session.playerBalance - state.betAmount + netPayout;
  const newHouseBalance = session.houseBalance + state.betAmount - netPayout;

  // update session balances
  session.playerBalance = newPlayerBalance;
  session.houseBalance = newHouseBalance;

  // end the game, but keep session open
  activeGames.delete(sessionId);

  // persist balances, clear game slug, session stays ACTIVE
  await db.session.update({
    where: { id: sessionId },
    data: {
      gameConfigSlug: null,
      gameState: Prisma.JsonNull,
      currentPlayerBalance: newPlayerBalance.toString(),
      currentHouseBalance: newHouseBalance.toString(),
    },
  });

  send(ws, 'cashout_result', {
    sessionId,
    payout: netPayout.toString(),
    multiplier: state.cumulativeMultiplier,
    newPlayerBalance: newPlayerBalance.toString(),
    newHouseBalance: newHouseBalance.toString(),
  });
}

// shared close logic: close clearnode session as broker, persist final state
async function closeClearnodeAndFinalize(
  sessionId: string,
  session: { playerId: string; playerBalance: bigint; houseBalance: bigint; isActive: boolean },
  ws?: WebSocket,
) {
  const dbSession = await db.session.findUnique({ where: { id: sessionId } });
  const brokerAddr = getBrokerAddress();

  // close clearnode app session as broker
  if (dbSession?.channelId) {
    try {
      // clearnode tracks whole units. integer division truncates both sides,
      // so playerAmt + houseAmt can end up less than the original total.
      // fix: compute one side, derive the other from the original clearnode total.
      const clearnodeTotal = BigInt(dbSession.playerDeposit) / DECIMALS + BigInt(dbSession.houseDeposit) / DECIMALS;
      const playerAmt = session.playerBalance / DECIMALS;
      const houseAmt = clearnodeTotal - playerAmt;

      await ClearnodeBackend.closeAppSession(dbSession.channelId, [
        { participant: session.playerId as Address, asset: ASSET_SYMBOL, amount: playerAmt.toString() },
        { participant: brokerAddr, asset: ASSET_SYMBOL, amount: houseAmt.toString() },
      ]);
    } catch (err) {
      // log but don't fail the session close, clearnode might already be closed
      console.error(`[session] clearnode close failed for ${sessionId}:`, (err as Error).message);
    }
  }

  session.isActive = false;

  const finalPlayer = session.playerBalance.toString();
  const finalHouse = session.houseBalance.toString();

  await db.session.update({
    where: { id: sessionId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
      gameConfigSlug: null,
      gameState: Prisma.JsonNull,
      finalPlayerBalance: finalPlayer,
      finalHouseBalance: finalHouse,
    },
  });

  // cleanup in-memory state
  sessions.delete(sessionId);
  activeGames.delete(sessionId);

  // calculate and log session P&L for the house
  const houseDeposit = BigInt(dbSession?.houseDeposit || '0');
  const housePnL = session.houseBalance - houseDeposit;
  console.log(`[session] ${sessionId} closed, player=${finalPlayer} house=${finalHouse} pnl=${housePnL > 0n ? '+' : ''}${housePnL}`);

  // fire-and-forget snapshot so TVL/price updates immediately
  triggerSnapshot().catch(() => {});
}

// backend handles close entirely, no more 2-step dance with frontend
async function handleCloseSession(ws: WebSocket, playerId: string, payload: CloseSessionPayload) {
  const { sessionId } = payload;

  const session = sessions.get(sessionId);
  if (!session || session.playerId !== playerId) {
    sendError(ws, 'Session not found or not authorized', 'AUTH_ERROR');
    return;
  }

  // forfeit any running game
  activeGames.delete(sessionId);

  await closeClearnodeAndFinalize(sessionId, session, ws);

  send(ws, 'session_closed', {
    sessionId,
    finalPlayerBalance: session.playerBalance.toString(),
    finalHouseBalance: session.houseBalance.toString(),
  });
}

// resume a session from DB after page refresh
async function handleResumeSession(ws: WebSocket, playerId: string, payload: ResumeSessionPayload) {
  const { sessionId } = payload;

  // check if already in memory
  const existing = sessions.get(sessionId);
  if (existing) {
    if (existing.playerId !== playerId) {
      sendError(ws, 'Not authorized for this session', 'AUTH_ERROR');
      return;
    }

    const game = activeGames.get(sessionId);
    send(ws, 'session_resumed', {
      sessionId,
      playerBalance: existing.playerBalance.toString(),
      houseBalance: existing.houseBalance.toString(),
      activeGame: game ? {
        gameSlug: game.config.builderParams.slug,
        gameType: game.config.gameType,
        currentRound: game.state.currentRound,
        cumulativeMultiplier: game.state.cumulativeMultiplier,
        primitiveState: game.state.primitiveState,
        isActive: game.state.isActive,
      } : null,
    });
    return;
  }

  // load from DB
  const dbSession = await db.session.findUnique({ where: { id: sessionId } });
  if (!dbSession || dbSession.status !== 'ACTIVE' || dbSession.playerId !== playerId) {
    sendError(ws, 'Session not found, closed, or not yours', 'SESSION_NOT_FOUND');
    return;
  }

  // restore balances (prefer currentPlayerBalance, fall back to initial deposits)
  const playerBalance = BigInt(dbSession.currentPlayerBalance || dbSession.playerDeposit);
  const houseBalance = BigInt(dbSession.currentHouseBalance || dbSession.houseDeposit);

  // restore to in-memory map
  sessions.set(sessionId, {
    playerId,
    playerBalance,
    houseBalance,
    isActive: true,
  });

  // restore active game if there's a saved game state
  let activeGameInfo = null;
  if (dbSession.gameConfigSlug && dbSession.gameState) {
    const config = getGameConfig(dbSession.gameConfigSlug);
    if (config) {
      const savedState = dbSession.gameState as Record<string, unknown>;
      // rebuild GameSessionState from saved JSON
      const gameState: GameSessionState = {
        gameType: config.gameType,
        isActive: savedState.isActive as boolean ?? true,
        currentRound: savedState.currentRound as number ?? 0,
        maxRounds: savedState.maxRounds as number ?? 1,
        betAmount: BigInt((savedState.betAmount as string) || '0'),
        playerBalance,
        houseBalance,
        cumulativeMultiplier: savedState.cumulativeMultiplier as number ?? 1,
        primitiveState: savedState.primitiveState as Record<string, unknown> ?? {},
      };

      activeGames.set(sessionId, { config, state: gameState });

      activeGameInfo = {
        gameSlug: dbSession.gameConfigSlug,
        gameType: config.gameType,
        currentRound: gameState.currentRound,
        cumulativeMultiplier: gameState.cumulativeMultiplier,
        primitiveState: gameState.primitiveState,
        isActive: gameState.isActive,
      };
    }
  }

  console.log(`[session] ${sessionId} resumed for ${playerId}, balance=${playerBalance}`);

  send(ws, 'session_resumed', {
    sessionId,
    playerBalance: playerBalance.toString(),
    houseBalance: houseBalance.toString(),
    activeGame: activeGameInfo,
  });
}

// list active sessions for a player
async function handleListSessions(ws: WebSocket, playerId: string) {
  const dbSessions = await db.session.findMany({
    where: { playerId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      currentPlayerBalance: true,
      currentHouseBalance: true,
      playerDeposit: true,
      houseDeposit: true,
      gameConfigSlug: true,
      createdAt: true,
    },
  });

  const list = dbSessions.map((s) => ({
    id: s.id,
    playerBalance: s.currentPlayerBalance || s.playerDeposit,
    houseBalance: s.currentHouseBalance || s.houseDeposit,
    gameConfigSlug: s.gameConfigSlug,
    createdAt: s.createdAt.toISOString(),
  }));

  send(ws, 'sessions_list', { sessions: list });
}

async function handleGetSession(ws: WebSocket, payload: { sessionId: string }) {
  const session = sessions.get(payload.sessionId);
  const game = activeGames.get(payload.sessionId);

  if (!session) {
    // try loading from DB
    const dbSession = await db.session.findUnique({ where: { id: payload.sessionId } });
    if (!dbSession) {
      sendError(ws, 'Session not found', 'NOT_FOUND');
      return;
    }

    send(ws, 'session_state', {
      sessionId: dbSession.id,
      status: dbSession.status,
      playerBalance: dbSession.currentPlayerBalance || dbSession.playerDeposit,
      houseBalance: dbSession.currentHouseBalance || dbSession.houseDeposit,
      gameState: dbSession.gameState,
    });
    return;
  }

  send(ws, 'session_state', {
    sessionId: payload.sessionId,
    status: session.isActive ? 'ACTIVE' : 'CLOSED',
    playerBalance: session.playerBalance.toString(),
    houseBalance: session.houseBalance.toString(),
    activeGame: game ? {
      gameType: game.config.gameType,
      currentRound: game.state.currentRound,
      cumulativeMultiplier: game.state.cumulativeMultiplier,
      primitiveState: game.state.primitiveState,
    } : null,
  });
}

// registered as a fastify plugin so WS decorator is available
export const gameHandlerPlugin = async (fastify: FastifyInstance) => {
  fastify.get('/ws/game', { websocket: true }, (socket, req) => {
    const query = req.query as Record<string, string>;
    const playerId = query.address || 'anonymous';

    console.log(`Player connected: ${playerId}`);
    connections.set(playerId, socket);

    send(socket, 'connected', {
      playerId,
      serverTime: Date.now(),
    });

    socket.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString()) as ClientMessage;
        await handleMessage(socket, playerId, message);
      } catch (err) {
        console.error('Failed to parse message:', err);
        sendError(socket, 'Invalid message format', 'PARSE_ERROR');
      }
    });

    socket.on('close', () => {
      console.log(`Player disconnected: ${playerId}`);
      connections.delete(playerId);
    });

    socket.on('error', (err) => {
      console.error(`Socket error for ${playerId}:`, err);
    });
  });
};

export const GameHandler = {
  gameHandlerPlugin,
};
