// client side commit-reveal crypto helpers
// must produce byte-identical commitments to backend/src/services/game.service.ts

import { keccak256, toHex } from 'viem'

// generate a random 32 byte nonce as hex
export function generateNonce(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// create commitment hash from choiceData (JSON string) + nonce
// matches backend: keccak256(choiceBytes + nonceBytes)
export function createCommitment(choiceData: string, nonce: string): string {
  const choiceBytes = new TextEncoder().encode(choiceData)
  const nonceBytes = hexToUint8Array(nonce)
  const packed = toHex(new Uint8Array([...choiceBytes, ...nonceBytes]))
  return keccak256(packed)
}

function hexToUint8Array(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}
