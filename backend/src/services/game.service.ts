// game service: commit-reveal machinery, game type agnostic
// the actual game logic lives in primitives/, this just handles
// the cryptographic protocol and round management

import { keccak256, toHex, hexToBytes, bytesToHex } from 'viem';
import crypto from 'crypto';
import { prismaQuery } from '../lib/prisma.ts';
import { getPrimitive } from './primitives/registry.ts';
import type { PlayerChoice, RoundOutcome, GameSessionState } from './primitives/types.ts';
import type { GameConfig } from './primitives/types.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaQuery as any;

// -- crypto helpers (shared across all game types) --

export function generateNonce(): string {
  const bytes = crypto.randomBytes(32);
  return bytesToHex(bytes);
}

// generic commitment: hash(choiceData + nonce)
// choiceData is JSON stringified player choice
export function createCommitment(choiceData: string, nonce: string): string {
  const choiceBytes = new TextEncoder().encode(choiceData);
  const packed = toHex(
    new Uint8Array([
      ...choiceBytes,
      ...hexToBytes(nonce as `0x${string}`),
    ])
  );
  return keccak256(packed);
}

export function verifyCommitment(commitment: string, choiceData: string, nonce: string): boolean {
  const expected = createCommitment(choiceData, nonce);
  return commitment.toLowerCase() === expected.toLowerCase();
}

// -- round management --

interface PlayerCommitParams {
  sessionId: string;
  roundNumber: number;
  gameType: string;
  betAmount: bigint;
  commitment: string;
}

export async function playerCommit(params: PlayerCommitParams) {
  const { sessionId, roundNumber, gameType, betAmount, commitment } = params;

  const round = await db.round.create({
    data: {
      sessionId,
      roundNumber,
      gameType,
      betAmount: betAmount.toString(),
      playerCommitment: commitment,
    },
  });

  return round;
}

export async function houseCommit(roundId: string) {
  const houseNonce = generateNonce();
  const houseCommitment = keccak256(houseNonce as `0x${string}`);

  const round = await db.round.update({
    where: { id: roundId },
    data: { houseCommitment, houseNonce },
  });

  return { round, houseCommitment };
}

export async function playerReveal(roundId: string, choiceData: string, nonce: string) {
  const round = await db.round.findUnique({ where: { id: roundId } });
  if (!round) throw new Error('Round not found');
  if (!round.houseCommitment) throw new Error('House has not committed yet');

  const valid = verifyCommitment(round.playerCommitment, choiceData, nonce);
  if (!valid) throw new Error('Invalid commitment, nonce does not match');

  const updated = await db.round.update({
    where: { id: roundId },
    data: { choiceData, playerNonce: nonce },
  });

  return updated;
}

// settle a round using the appropriate game primitive
export async function houseRevealAndSettle(
  roundId: string,
  sessionState: GameSessionState,
  config: GameConfig,
): Promise<{ outcome: RoundOutcome; updatedState: GameSessionState }> {
  const round = await db.round.findUnique({ where: { id: roundId } });
  if (!round) throw new Error('Round not found');
  if (!round.playerNonce || !round.choiceData) throw new Error('Player has not revealed yet');
  if (!round.houseNonce) throw new Error('House nonce missing');

  const choice = JSON.parse(round.choiceData) as PlayerChoice;
  const primitive = getPrimitive(config.gameType);

  const outcome = primitive.deriveOutcome(
    round.playerNonce,
    round.houseNonce,
    choice,
    sessionState,
    config,
  );

  // update round in DB
  await db.round.update({
    where: { id: roundId },
    data: {
      result: JSON.stringify(outcome.metadata),
      playerWon: outcome.playerWon,
      payout: outcome.payout.toString(),
    },
  });

  // update session state
  const updatedState: GameSessionState = { ...sessionState };
  updatedState.currentRound = sessionState.currentRound + 1;

  if (outcome.metadata.multiplier !== undefined) {
    updatedState.cumulativeMultiplier = outcome.metadata.multiplier as number;
  }

  if (outcome.gameOver) {
    updatedState.isActive = false;
  }

  return { outcome, updatedState };
}

export const GameService = {
  generateNonce,
  createCommitment,
  verifyCommitment,
  playerCommit,
  houseCommit,
  playerReveal,
  houseRevealAndSettle,
};
