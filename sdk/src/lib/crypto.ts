// client side commit-reveal crypto helpers
// must produce byte-identical commitments to backend

import { keccak256, encodePacked, toHex, type Address } from 'viem'

export function generateNonce(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function createCommitment(choiceData: string, nonce: string): string {
  const choiceBytes = new TextEncoder().encode(choiceData)
  const nonceBytes = hexToUint8Array(nonce)
  const packed = toHex(new Uint8Array([...choiceBytes, ...nonceBytes]))
  return keccak256(packed)
}

export function deriveHouseNonce(sessionSeed: bigint, roundNumber: number): string {
  return keccak256(encodePacked(['uint256', 'uint256'], [sessionSeed, BigInt(roundNumber)]))
}

export function verifyRound(sessionSeed: bigint, roundNumber: number, expectedHouseNonce: string): boolean {
  const derived = deriveHouseNonce(sessionSeed, roundNumber)
  return derived.toLowerCase() === expectedHouseNonce.toLowerCase()
}

export function computeSessionHash(sessionSeed: bigint, playerAddress: Address): string {
  return keccak256(encodePacked(['uint256', 'address'], [sessionSeed, playerAddress]))
}

function hexToUint8Array(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}
