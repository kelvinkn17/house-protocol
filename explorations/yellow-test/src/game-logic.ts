import { keccak256, encodePacked, type Hex } from 'viem'
import {
  type Commitment,
  type RowConfig,
  type GameState,
  type GameStatus,
  MULTIPLIER_SCALE,
  DEFAULT_GAME_CONFIG,
} from './types'

// create commitment hash for commit-reveal
export function createCommitment(value: number, nonce: Hex): Commitment {
  const hash = keccak256(encodePacked(['uint8', 'bytes32'], [value, nonce]))
  return { hash, value, nonce }
}

// verify a revealed commitment matches the hash
export function verifyCommitment(commitment: Commitment): boolean {
  const computedHash = keccak256(
    encodePacked(['uint8', 'bytes32'], [commitment.value, commitment.nonce])
  )
  return computedHash === commitment.hash
}

// derive bomb position from both nonces, ensures neither party can predict outcome
export function deriveBombPosition(
  playerNonce: Hex,
  houseNonce: Hex,
  tilesInRow: number
): number {
  const combined = keccak256(encodePacked(['bytes32', 'bytes32'], [playerNonce, houseNonce]))
  // take first byte and mod by tilesInRow
  const firstByte = parseInt(combined.slice(2, 4), 16)
  return firstByte % tilesInRow
}

// calculate row multiplier
// formula: tiles / (tiles - 1) since 1 bomb means (tiles-1) safe options
export function calculateRowMultiplier(tilesInRow: number): bigint {
  // multiplier = tilesInRow / (tilesInRow - 1)
  // with scaling: (tilesInRow * SCALE) / (tilesInRow - 1)
  return (BigInt(tilesInRow) * MULTIPLIER_SCALE) / BigInt(tilesInRow - 1)
}

// apply house edge to multiplier
export function applyHouseEdge(multiplier: bigint, houseEdgeBps: bigint): bigint {
  // multiplier * (10000 - houseEdgeBps) / 10000
  return (multiplier * (10000n - houseEdgeBps)) / 10000n
}

// generate random row config
export function generateRowConfig(rowIndex: number): RowConfig {
  const { minTiles, maxTiles } = DEFAULT_GAME_CONFIG
  const tilesInRow = Math.floor(Math.random() * (maxTiles - minTiles + 1)) + minTiles
  return { tilesInRow, rowIndex }
}

// generate full game row configs
export function generateGameRows(numRows: number): RowConfig[] {
  return Array.from({ length: numRows }, (_, i) => generateRowConfig(i))
}

// random bytes for nonce
export function randomNonce(): Hex {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return ('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')) as Hex
}

// random tile choice for testing
export function randomTileChoice(tilesInRow: number): number {
  return Math.floor(Math.random() * tilesInRow)
}

// format multiplier for display (e.g., 1.5x)
export function formatMultiplier(multiplier: bigint): string {
  const scaled = Number(multiplier) / Number(MULTIPLIER_SCALE)
  return scaled.toFixed(2) + 'x'
}

// convert multiplier to event scale (1e4)
export function toEventScale(multiplier: bigint): bigint {
  return (multiplier * 10000n) / MULTIPLIER_SCALE
}

// encode game state for state channel
export function encodeGameState(state: GameState): Hex {
  const statusInt = state.status === 'playing' ? 0 : state.status === 'won' ? 1 : 2
  return encodePacked(
    ['uint256', 'uint8', 'uint256', 'uint256', 'uint8'],
    [state.gameId, state.currentRow, state.virtualBalance, state.multiplier, statusInt]
  )
}

// decode game state from state channel
export function decodeGameState(data: Hex): GameState {
  // simple parsing, in real impl would use proper ABI decoding
  // for now just return default, actual impl would decode the packed data
  return {
    gameId: 0n,
    currentRow: 0,
    virtualBalance: 100n,
    multiplier: MULTIPLIER_SCALE,
    status: 'playing',
  }
}

// helper to convert status to readable string
export function statusToString(status: GameStatus): string {
  return status.toUpperCase()
}

// calculate win probability for a row
export function winProbability(tilesInRow: number): number {
  return (tilesInRow - 1) / tilesInRow
}

// calculate cumulative win probability for multiple rows
export function cumulativeWinProbability(rows: RowConfig[]): number {
  return rows.reduce((prob, row) => prob * winProbability(row.tilesInRow), 1)
}

// calculate expected value
export function expectedValue(bet: number, multiplier: bigint, winProb: number): number {
  const mult = Number(multiplier) / Number(MULTIPLIER_SCALE)
  return bet * mult * winProb
}
