// websocket game handler, game type agnostic
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaQuery as any;

interface ClientMessage {
  type: string;
  payload: unknown;
}

interface CreateSessionPayload {
  depositAmount: string;
  gameSlug: string;
  tokenAddress?: string;
}

interface PlaceBetPayload {
  sessionId: string;
  amount: string;
  choiceData: string; // JSON stringified PlayerChoice
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
const sessionPlayers = new Map<string, string>();
// in memory game state per session, mirrors what's in DB but faster to access
const sessionStates = new Map<string, GameSessionState>();
const sessionConfigs = new Map<string, GameConfig>();

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
  const { depositAmount, gameSlug } = payload;

  // look up game config
  const config = getGameConfig(gameSlug);
  if (!config) {
    sendError(ws, `Unknown game: ${gameSlug}`, 'INVALID_GAME');
    return;
  }

  const playerDeposit = BigInt(depositAmount);
  const primitive = getPrimitive(config.gameType);

  // calculate how much house needs to fund based on max possible payout
  const maxPayout = primitive.calculateMaxPayout(playerDeposit, config);
  const houseDeposit = maxPayout > playerDeposit ? maxPayout : playerDeposit;

  // check vault has enough liquidity
  let vaultState;
  try {
    vaultState = await getVaultState();
  } catch (err) {
    console.error('Failed to fetch vault state:', err);
    sendError(ws, 'Could not verify house liquidity', 'VAULT_ERROR');
    return;
  }

  if (vaultState.custodyBalance < houseDeposit) {
    sendError(ws, 'Insufficient house liquidity', 'LIQUIDITY_ERROR');
    return;
  }

  // check max bet
  const maxBet = primitive.calculateMaxBet(vaultState.custodyBalance);
  if (playerDeposit > maxBet) {
    sendError(ws, `Max bet is ${maxBet.toString()}`, 'MAX_BET_EXCEEDED');
    return;
  }

  // initialize game state
  const gameState = primitive.initializeState(config, playerDeposit);
  gameState.playerBalance = playerDeposit;
  gameState.houseBalance = houseDeposit;

  // create session in DB
  const session = await db.session.create({
    data: {
      playerId,
      gameConfigSlug: gameSlug,
      playerDeposit: playerDeposit.toString(),
      houseDeposit: houseDeposit.toString(),
      status: 'ACTIVE',
      gameState: JSON.parse(JSON.stringify(gameState, (_k, v) =>
        typeof v === 'bigint' ? v.toString() : v
      )),
    },
  });

  // store in memory
  sessionPlayers.set(session.id, playerId);
  sessionStates.set(session.id, gameState);
  sessionConfigs.set(session.id, config);

  send(ws, 'session_created', {
    sessionId: session.id,
    gameType: config.gameType,
    gameSlug,
    playerDeposit: playerDeposit.toString(),
    houseDeposit: houseDeposit.toString(),
    maxRounds: gameState.maxRounds,
    // send tile counts for death game so frontend can render the grid
    primitiveState: gameState.primitiveState,
  });
}

async function handlePlaceBet(ws: WebSocket, playerId: string, payload: PlaceBetPayload) {
  const { sessionId, amount, commitment, choiceData } = payload;

  if (sessionPlayers.get(sessionId) !== playerId) {
    sendError(ws, 'Not authorized for this session', 'AUTH_ERROR');
    return;
  }

  const state = sessionStates.get(sessionId);
  const config = sessionConfigs.get(sessionId);
  if (!state || !config) {
    sendError(ws, 'Session not found in memory', 'NOT_FOUND');
    return;
  }

  if (!state.isActive) {
    sendError(ws, 'Session not active', 'SESSION_CLOSED');
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

  if (sessionPlayers.get(sessionId) !== playerId) {
    sendError(ws, 'Not authorized for this session', 'AUTH_ERROR');
    return;
  }

  const state = sessionStates.get(sessionId);
  const config = sessionConfigs.get(sessionId);
  if (!state || !config) {
    sendError(ws, 'Session state not found', 'STATE_ERROR');
    return;
  }

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

  // update balances based on outcome
  let newPlayerBalance = state.playerBalance;
  let newHouseBalance = state.houseBalance;
  const betAmount = state.betAmount;

  if (outcome.gameOver) {
    if (outcome.playerWon && outcome.payout > 0n) {
      // player cashed out or won final round
      newPlayerBalance = state.playerBalance - betAmount + outcome.payout;
      newHouseBalance = state.houseBalance + betAmount - outcome.payout;
    } else if (!outcome.playerWon) {
      // player lost their bet
      newPlayerBalance = state.playerBalance - betAmount;
      newHouseBalance = state.houseBalance + betAmount;
    }
  } else if (config.gameType === 'pick-number') {
    // range game: each round is independent bet
    if (outcome.playerWon && outcome.payout > 0n) {
      newPlayerBalance = state.playerBalance - betAmount + outcome.payout;
      newHouseBalance = state.houseBalance + betAmount - outcome.payout;
    } else {
      newPlayerBalance = state.playerBalance - betAmount;
      newHouseBalance = state.houseBalance + betAmount;
    }
  }
  // for multi-round games (cash-out, reveal-tiles), balance only changes on cashout/loss

  updatedState.playerBalance = newPlayerBalance;
  updatedState.houseBalance = newHouseBalance;

  // persist updated state
  sessionStates.set(sessionId, updatedState);

  // update session in DB
  await db.session.update({
    where: { id: sessionId },
    data: {
      gameState: JSON.parse(JSON.stringify(updatedState, (_k, v) =>
        typeof v === 'bigint' ? v.toString() : v
      )),
      status: updatedState.isActive ? 'ACTIVE' : 'CLOSED',
      closedAt: updatedState.isActive ? undefined : new Date(),
    },
  });

  // fetch round for house nonce
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

  if (sessionPlayers.get(sessionId) !== playerId) {
    sendError(ws, 'Not authorized for this session', 'AUTH_ERROR');
    return;
  }

  const state = sessionStates.get(sessionId);
  const config = sessionConfigs.get(sessionId);
  if (!state || !config) {
    sendError(ws, 'Session not found', 'NOT_FOUND');
    return;
  }

  if (!state.isActive) {
    sendError(ws, 'Session not active', 'SESSION_CLOSED');
    return;
  }

  // calculate cashout payout with house edge
  const grossPayout = (state.betAmount * BigInt(Math.floor(state.cumulativeMultiplier * 10000))) / 10000n;
  const netPayout = (grossPayout * BigInt(BPS_BASE - HOUSE_EDGE_BPS)) / BigInt(BPS_BASE);

  const newPlayerBalance = state.playerBalance - state.betAmount + netPayout;
  const newHouseBalance = state.houseBalance + state.betAmount - netPayout;

  state.isActive = false;
  state.playerBalance = newPlayerBalance;
  state.houseBalance = newHouseBalance;
  sessionStates.set(sessionId, state);

  // update DB
  await db.session.update({
    where: { id: sessionId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
      gameState: JSON.parse(JSON.stringify(state, (_k, v) =>
        typeof v === 'bigint' ? v.toString() : v
      )),
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

  if (sessionPlayers.get(sessionId) !== playerId) {
    sendError(ws, 'Not authorized for this session', 'AUTH_ERROR');
    return;
  }

  const state = sessionStates.get(sessionId);
  if (!state) {
    sendError(ws, 'Session not found', 'NOT_FOUND');
    return;
  }

  // mark closed
  state.isActive = false;
  sessionStates.set(sessionId, state);

  await db.session.update({
    where: { id: sessionId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
    },
  });

  // cleanup
  sessionPlayers.delete(sessionId);
  sessionStates.delete(sessionId);
  sessionConfigs.delete(sessionId);

  send(ws, 'session_closed', {
    sessionId,
    finalPlayerBalance: state.playerBalance.toString(),
    finalHouseBalance: state.houseBalance.toString(),
  });
}

async function handleGetSession(ws: WebSocket, payload: { sessionId: string }) {
  const state = sessionStates.get(payload.sessionId);

  if (!state) {
    // try loading from DB
    const session = await db.session.findUnique({ where: { id: payload.sessionId } });
    if (!session) {
      sendError(ws, 'Session not found', 'NOT_FOUND');
      return;
    }

    send(ws, 'session_state', {
      sessionId: session.id,
      status: session.status,
      playerBalance: session.playerDeposit,
      houseBalance: session.houseDeposit,
      gameState: session.gameState,
    });
    return;
  }

  send(ws, 'session_state', {
    sessionId: payload.sessionId,
    status: state.isActive ? 'ACTIVE' : 'CLOSED',
    playerBalance: state.playerBalance.toString(),
    houseBalance: state.houseBalance.toString(),
    currentRound: state.currentRound,
    cumulativeMultiplier: state.cumulativeMultiplier,
    primitiveState: state.primitiveState,
  });
}

export function registerGameHandler(fastify: FastifyInstance) {
  fastify.get('/ws/game', { websocket: true }, (socket, req) => {
    // get player address from query param (browsers can't set WS headers)
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const playerId = url.searchParams.get('address') || 'anonymous';

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
}

export const GameHandler = {
  registerGameHandler,
};
