import {generateNonce, createCommitment, verifyCommitment, deriveResult, calculatePayout} from "../backend/src/services/game.service.ts";

type CoinChoice = 'heads' | 'tails';

console.log('Testing Game Service Functions\n');
console.log('================================\n');

console.log('1. Testing nonce generation...');
const nonce1 = generateNonce();
const nonce2 = generateNonce();
console.log(`   Nonce 1: ${nonce1.slice(0, 20)}...`);
console.log(`   Nonce 2: ${nonce2.slice(0, 20)}...`);
console.log(`   Different: ${nonce1 !== nonce2 ? '✓ PASS' : '✗ FAIL'}`);
console.log(`   Length (66 chars): ${nonce1.length === 66 ? '✓ PASS' : '✗ FAIL'}\n`);

console.log('2. Testing commitment creation...');
const betAmount = 1000000n;
const choice = 'heads' as const;
const playerNonce = generateNonce();
const commitment = createCommitment(betAmount, choice, playerNonce);
console.log(`   Bet: ${betAmount} wei`);
console.log(`   Choice: ${choice}`);
console.log(`   Commitment: ${commitment.slice(0, 20)}...`);

console.log('\n3. Testing commitment verification...');
const validVerify = verifyCommitment(commitment, betAmount, choice, playerNonce);
const invalidVerify = verifyCommitment(commitment, betAmount, 'tails', playerNonce);
console.log(`   Valid commitment: ${validVerify ? '✓ PASS' : '✗ FAIL'}`);
console.log(`   Wrong choice rejected: ${!invalidVerify ? '✓ PASS' : '✗ FAIL'}`);

console.log('\n4. Testing result derivation...');
const houseNonce = generateNonce();
const result = deriveResult(playerNonce, houseNonce);
console.log(`   Player nonce: ${playerNonce.slice(0, 20)}...`);
console.log(`   House nonce: ${houseNonce.slice(0, 20)}...`);
console.log(`   Result: ${result}`);
console.log(`   Valid result: ${result === 'heads' || result === 'tails' ? '✓ PASS' : '✗ FAIL'}`);

console.log('\n5. Testing determinism...');
const result2 = deriveResult(playerNonce, houseNonce);
console.log(`   Same inputs same result: ${result === result2 ? '✓ PASS' : '✗ FAIL'}`);

console.log('\n6. Testing payout calculation...');
const winPayout = calculatePayout(betAmount, true);
const losePayout = calculatePayout(betAmount, false);
console.log(`   Bet amount: ${betAmount}`);
console.log(`   Win payout: ${winPayout} (expected ~1960000 with 2% edge)`);
console.log(`   Lose payout: ${losePayout} (expected 0)`);
console.log(`   Win payout > 0: ${winPayout > 0n ? '✓ PASS' : '✗ FAIL'}`);
console.log(`   Lose payout = 0: ${losePayout === 0n ? '✓ PASS' : '✗ FAIL'}`);

console.log('\n7. Testing fairness (1000 rounds)...');
let heads = 0;
let tails = 0;
for (let i = 0; i < 1000; i++) {
  const pNonce = generateNonce();
  const hNonce = generateNonce();
  const r = deriveResult(pNonce, hNonce);
  if (r === 'heads') heads++;
  else tails++;
}
const ratio = (heads / 1000) * 100;
console.log(`   Heads: ${heads} (${ratio.toFixed(1)}%)`);
console.log(`   Tails: ${tails} (${(100 - ratio).toFixed(1)}%)`);
console.log(`   Fair (40-60% range): ${ratio >= 40 && ratio <= 60 ? '✓ PASS' : '✗ FAIL'}`);

console.log('\n================================');
console.log('All pure function tests complete!\n');

console.log('Next steps to test full backend:');
console.log('1. Copy .env.example to .env and configure');
console.log('2. Start PostgreSQL');
console.log('3. Run: bun run db:push');
console.log('4. Run: bun run dev');
console.log('5. Connect via WebSocket to ws://localhost:3700/ws/game');