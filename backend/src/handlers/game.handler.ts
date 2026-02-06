// websocket game handler, session-first architecture
// session = deposit once, play any game. games start/end within a session.
// delegates all game logic to primitives via game service

import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import { GameService } from '../services/game.service.ts';
import { getVaultState } from '../services/vault.service.ts';
import { getPrimitive } from '../services/primitives/registry.ts';
import { getGameConfig } from '../services/primitives/configs.ts';
import { prismaQuery } from '../lib/prisma.ts';
import type { GameSessionState, GameConfig } from '../services/primitives/types.ts';
import { HOUSE_EDGE_BPS, BPS_BASE } from '../services/primitives/types.ts';

const db = prismaQuery;

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

async function handleCreateSession(ws: WebSocket, playerId: string, payload: CreateSessionPayload) {
  const { depositAmount } = payload;
  const playerDeposit = BigInt(depositAmount);

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

  console.log(`[session] creating for ${playerId}, deposit=${playerDeposit} house=${houseDeposit}`);

  // create session in DB, no game yet
  const session = await db.session.create({
    data: {
      playerId,
      gameConfigSlug: null,
      playerDeposit: playerDeposit.toString(),
      houseDeposit: houseDeposit.toString(),
      status: 'ACTIVE',
    },
  });

  // store session-level state
  sessions.set(session.id, {
    playerId,
    playerBalance: playerDeposit,
    houseBalance: houseDeposit,
    isActive: true,
  });

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

  if (outcome.gameOver) {
    if (outcome.playerWon && outcome.payout > 0n) {
      newPlayerBalance = session.playerBalance - betAmount + outcome.payout;
      newHouseBalance = session.houseBalance + betAmount - outcome.payout;
    } else if (!outcome.playerWon) {
      newPlayerBalance = session.playerBalance - betAmount;
      newHouseBalance = session.houseBalance + betAmount;
    }
  } else if (config.gameType === 'pick-number') {
    // range: each round is independent
    if (outcome.playerWon && outcome.payout > 0n) {
      newPlayerBalance = session.playerBalance - betAmount + outcome.payout;
      newHouseBalance = session.houseBalance + betAmount - outcome.payout;
    } else {
      newPlayerBalance = session.playerBalance - betAmount;
      newHouseBalance = session.houseBalance + betAmount;
    }

    // bust detection
    if (newPlayerBalance < betAmount) {
      updatedState.isActive = false;
    }
  }

  updatedState.playerBalance = newPlayerBalance;
  updatedState.houseBalance = newHouseBalance;

  // update session-level balances
  session.playerBalance = newPlayerBalance;
  session.houseBalance = newHouseBalance;

  // update game state
  game.state = updatedState;

  // persist to DB
  await db.session.update({
    where: { id: sessionId },
    data: {
      gameState: JSON.parse(JSON.stringify(updatedState, (_k, v) =>
        typeof v === 'bigint' ? v.toString() : v
      )),
      // session stays ACTIVE even if game ends. only close_session closes it.
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

  // clear game slug in DB, session stays ACTIVE
  await db.session.update({
    where: { id: sessionId },
    data: {
      gameConfigSlug: null,
      gameState: null,
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

async function handleCloseSession(ws: WebSocket, playerId: string, payload: CloseSessionPayload) {
  const { sessionId } = payload;

  const session = sessions.get(sessionId);
  if (!session || session.playerId !== playerId) {
    sendError(ws, 'Session not found or not authorized', 'AUTH_ERROR');
    return;
  }

  // if a game is running, end it (forfeit)
  activeGames.delete(sessionId);

  session.isActive = false;

  await db.session.update({
    where: { id: sessionId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
      gameConfigSlug: null,
    },
  });

  const finalPlayer = session.playerBalance.toString();
  const finalHouse = session.houseBalance.toString();

  // cleanup
  sessions.delete(sessionId);

  send(ws, 'session_closed', {
    sessionId,
    finalPlayerBalance: finalPlayer,
    finalHouseBalance: finalHouse,
  });
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
      playerBalance: dbSession.playerDeposit,
      houseBalance: dbSession.houseDeposit,
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
