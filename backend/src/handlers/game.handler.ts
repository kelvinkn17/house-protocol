import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import {
  GameService,
  type CoinChoice,
} from '../services/game.service.ts';
import { YellowService } from '../services/yellow.service.ts';
import { VaultService } from '../services/vault.service.ts';
import { prismaQuery } from '../lib/prisma.ts';
import type { Hex, Address } from 'viem';

interface ClientMessage {
  type: string;
  payload: unknown;
}

interface CreateSessionPayload {
  playerAddress: Address;
  depositAmount: string; 
  tokenAddress: Address;
}

interface PlaceBetPayload {
  sessionId: string;
  amount: string;
  choice: CoinChoice;
  commitment: string;
}

interface RevealPayload {
  sessionId: string;
  roundId: string;
  choice: CoinChoice;
  nonce: string;
}

interface CloseSessionPayload {
  sessionId: string;
}

const connections = new Map<string, WebSocket>();
const sessionPlayers = new Map<string, string>();

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
  const { playerAddress, depositAmount, tokenAddress } = payload;

  if (playerAddress.toLowerCase() !== playerId.toLowerCase()) {
    sendError(ws, 'Player address mismatch', 'AUTH_ERROR');
    return;
  }

  const playerDeposit = BigInt(depositAmount);

  const vaultInfo = await VaultService.getVaultInfo();
  const houseDeposit = playerDeposit; 

  if (vaultInfo.availableLiquidity < houseDeposit) {
    sendError(ws, 'Insufficient house liquidity', 'LIQUIDITY_ERROR');
    return;
  }

  const { channelId, sessionId } = await YellowService.createChannel({
    playerAddress,
    playerDeposit,
    houseDeposit,
    tokenAddress,
  });

  const txHash = await VaultService.allocateToChannel(
    VaultService.sessionIdToChannelId(sessionId),
    houseDeposit
  );

  sessionPlayers.set(sessionId, playerId);

  send(ws, 'session_created', {
    sessionId,
    channelId,
    playerDeposit: playerDeposit.toString(),
    houseDeposit: houseDeposit.toString(),
    allocationTx: txHash,
  });
}

async function handlePlaceBet(ws: WebSocket, playerId: string, payload: PlaceBetPayload) {
  const { sessionId, amount, commitment } = payload;

  if (sessionPlayers.get(sessionId) !== playerId) {
    sendError(ws, 'Not authorized for this session', 'AUTH_ERROR');
    return;
  }

  const state = await YellowService.getSessionState(sessionId);
  if (!state) {
    sendError(ws, 'Session not found', 'NOT_FOUND');
    return;
  }

  if (state.status !== 'ACTIVE') {
    sendError(ws, 'Session not active', 'SESSION_CLOSED');
    return;
  }

  const betAmount = BigInt(amount);

  if (state.playerBalance < betAmount) {
    sendError(ws, 'Insufficient balance', 'INSUFFICIENT_BALANCE');
    return;
  }

  const roundNumber = state.stats.totalRounds + 1;

  const round = await GameService.playerCommit({
    sessionId,
    roundNumber,
    betAmount,
    commitment,
  });

  const { houseCommitment } = await GameService.houseCommit({
    roundId: round.id,
  });

  send(ws, 'bet_accepted', {
    roundId: round.id,
    roundNumber,
    houseCommitment,
  });
}

async function handleReveal(ws: WebSocket, playerId: string, payload: RevealPayload) {
  const { sessionId, roundId, choice, nonce } = payload;

  if (sessionPlayers.get(sessionId) !== playerId) {
    sendError(ws, 'Not authorized for this session', 'AUTH_ERROR');
    return;
  }

  try {
    await GameService.playerReveal({
      roundId,
      choice,
      nonce,
    });
  } catch (err) {
    const error = err as Error;
    sendError(ws, error.message, 'REVEAL_ERROR');
    return;
  }

  const result = await GameService.houseRevealAndSettle({ roundId });

  const state = await YellowService.getSessionState(sessionId);
  if (!state) {
    sendError(ws, 'Session state lost', 'STATE_ERROR');
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const round = await (prismaQuery as any).round.findUnique({ where: { id: roundId } });
  if (!round) {
    sendError(ws, 'Round not found', 'NOT_FOUND');
    return;
  }

  const betAmount = BigInt(round.betAmount.toString());
  let newPlayerBalance = state.playerBalance;
  let newHouseBalance = state.houseBalance;

  if (result.playerWon) {
    const payout = result.payout;
    newPlayerBalance = state.playerBalance + payout - betAmount;
    newHouseBalance = state.houseBalance - payout + betAmount;
  } else {
    newPlayerBalance = state.playerBalance - betAmount;
    newHouseBalance = state.houseBalance + betAmount;
  }

  const stateData = `0x${Buffer.from(JSON.stringify({
    roundId,
    result: result.result,
  })).toString('hex')}` as Hex;

  await YellowService.updateChannelState(sessionId, newPlayerBalance, newHouseBalance, stateData);

  send(ws, 'round_result', {
    roundId,
    result: result.result,
    playerWon: result.playerWon,
    payout: result.payout.toString(),
    newPlayerBalance: newPlayerBalance.toString(),
    newHouseBalance: newHouseBalance.toString(),
    houseNonce: round.houseNonce,
  });
}

async function handleCloseSession(ws: WebSocket, playerId: string, payload: CloseSessionPayload) {
  const { sessionId } = payload;

  if (sessionPlayers.get(sessionId) !== playerId) {
    sendError(ws, 'Not authorized for this session', 'AUTH_ERROR');
    return;
  }

  const state = await YellowService.getSessionState(sessionId);
  if (!state) {
    sendError(ws, 'Session not found', 'NOT_FOUND');
    return;
  }

  const txHash = await YellowService.closeChannel(sessionId);

  const channelId = VaultService.sessionIdToChannelId(sessionId);
  const returnAmount = state.houseBalance;

  const settleTx = await VaultService.settleChannel(channelId, returnAmount);

  sessionPlayers.delete(sessionId);

  send(ws, 'session_closed', {
    sessionId,
    closeTx: txHash,
    settleTx,
    finalPlayerBalance: state.playerBalance.toString(),
    finalHouseBalance: state.houseBalance.toString(),
    stats: state.stats,
  });
}

async function handleGetSession(ws: WebSocket, payload: { sessionId: string }) {
  const state = await YellowService.getSessionState(payload.sessionId);

  if (!state) {
    sendError(ws, 'Session not found', 'NOT_FOUND');
    return;
  }

  send(ws, 'session_state', {
    ...state,
    playerBalance: state.playerBalance.toString(),
    houseBalance: state.houseBalance.toString(),
  });
}

export function registerGameHandler(fastify: FastifyInstance) {
  fastify.get('/ws/game', { websocket: true }, (socket, req) => {
    const playerId = req.headers['x-player-address'] as string || 'anonymous';

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
