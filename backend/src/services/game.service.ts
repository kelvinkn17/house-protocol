import { keccak256, toHex, hexToBytes, bytesToHex } from 'viem';
import crypto from 'crypto';
import { prismaQuery } from '../lib/prisma.ts';

export type CoinChoice = 'heads' | 'tails';

export interface RoundCommitment {
  commitment: string;
  nonce: string;
}

export interface RoundResult {
  result: CoinChoice;
  playerWon: boolean;
  payout: bigint;
}

export function generateNonce(): string {
  const bytes = crypto.randomBytes(32);
  return bytesToHex(bytes);
}

export function createCommitment(
  amount: bigint,
  choice: CoinChoice,
  nonce: string
): string {
  const choiceNum = choice === 'heads' ? 0 : 1;
  const packed = toHex(
    new Uint8Array([
      ...hexToBytes(toHex(amount, { size: 32 })),
      choiceNum,
      ...hexToBytes(nonce as `0x${string}`),
    ])
  );
  return keccak256(packed);
}

export function verifyCommitment(
  commitment: string,
  amount: bigint,
  choice: CoinChoice,
  nonce: string
): boolean {
  const expected = createCommitment(amount, choice, nonce);
  return commitment.toLowerCase() === expected.toLowerCase();
}

export function deriveResult(playerNonce: string, houseNonce: string): CoinChoice {
  const combined = keccak256(
    toHex(
      new Uint8Array([
        ...hexToBytes(playerNonce as `0x${string}`),
        ...hexToBytes(houseNonce as `0x${string}`),
      ])
    )
  );
  const resultByte = parseInt(combined.slice(-2), 16);
  return resultByte % 2 === 0 ? 'heads' : 'tails';
}

const HOUSE_EDGE_BPS = 200n; // 2% in basis points
const BPS_BASE = 10000n;

export function calculatePayout(betAmount: bigint, playerWon: boolean): bigint {
  if (!playerWon) return 0n;
  // win pays 2x minus house edge (98% of 2x = 1.96x)
  // payout = bet * 2 * (10000 - 200) / 10000 = bet * 19600 / 10000
  return (betAmount * 2n * (BPS_BASE - HOUSE_EDGE_BPS)) / BPS_BASE;
}

interface PlayerCommitParams {
  sessionId: string;
  roundNumber: number;
  betAmount: bigint;
  commitment: string;
}

interface HouseCommitParams {
  roundId: string;
}

interface PlayerRevealParams {
  roundId: string;
  choice: CoinChoice;
  nonce: string;
}

interface HouseRevealParams {
  roundId: string;
}

export async function playerCommit(params: PlayerCommitParams) {
  const { sessionId, roundNumber, betAmount, commitment } = params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const round = await (prismaQuery as any).round.create({
    data: {
      sessionId,
      roundNumber,
      betAmount: betAmount.toString(),
      betChoice: '',
      playerCommitment: commitment,
      playerCommitAt: new Date(),
    },
  });

  return round;
}

export async function houseCommit(params: HouseCommitParams) {
  const { roundId } = params;
  const houseNonce = generateNonce();
  const houseCommitment = keccak256(houseNonce as `0x${string}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const round = await (prismaQuery as any).round.update({
    where: { id: roundId },
    data: {
      houseCommitment,
      houseNonce, 
      houseCommitAt: new Date(),
    },
  });

  return { round, houseCommitment };
}

export async function playerReveal(params: PlayerRevealParams) {
  const { roundId, choice, nonce } = params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const round = await (prismaQuery as any).round.findUnique({
    where: { id: roundId },
  });

  if (!round) {
    throw new Error('Round not found');
  }

  if (!round.houseCommitment) {
    throw new Error('House has not committed yet');
  }

  const valid = verifyCommitment(
    round.playerCommitment,
    BigInt(round.betAmount.toString()),
    choice,
    nonce
  );

  if (!valid) {
    throw new Error('Invalid commitment, nonce does not match');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated = await (prismaQuery as any).round.update({
    where: { id: roundId },
    data: {
      betChoice: choice,
      playerNonce: nonce,
      playerRevealAt: new Date(),
    },
  });

  return updated;
}

export async function houseRevealAndSettle(params: HouseRevealParams): Promise<RoundResult> {
  const { roundId } = params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const round = await (prismaQuery as any).round.findUnique({
    where: { id: roundId },
  });

  if (!round) {
    throw new Error('Round not found');
  }

  if (!round.playerNonce || !round.betChoice) {
    throw new Error('Player has not revealed yet');
  }

  if (!round.houseNonce) {
    throw new Error('House nonce missing');
  }

  const result = deriveResult(round.playerNonce, round.houseNonce);
  const playerWon = result === round.betChoice;
  const payout = calculatePayout(BigInt(round.betAmount.toString()), playerWon);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prismaQuery as any).round.update({
    where: { id: roundId },
    data: {
      result,
      playerWon,
      houseRevealAt: new Date(),
    },
  });

  return { result, playerWon, payout };
}

export async function processFullRound(
  sessionId: string,
  roundNumber: number,
  betAmount: bigint,
  playerChoice: CoinChoice
): Promise<RoundResult> {
  const playerNonce = generateNonce();
  const playerCommitment = createCommitment(betAmount, playerChoice, playerNonce);

  const round = await playerCommit({
    sessionId,
    roundNumber,
    betAmount,
    commitment: playerCommitment,
  });

  await houseCommit({ roundId: round.id });

  await playerReveal({
    roundId: round.id,
    choice: playerChoice,
    nonce: playerNonce,
  });

  const result = await houseRevealAndSettle({ roundId: round.id });

  return result;
}

export const GameService = {
  generateNonce,
  createCommitment,
  verifyCommitment,
  deriveResult,
  calculatePayout,
  playerCommit,
  houseCommit,
  playerReveal,
  houseRevealAndSettle,
  processFullRound,
};
