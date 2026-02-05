# Death Game - State Channel Demo

Full flow demo: on-chain deposit, off-chain gameplay, on-chain withdrawal.

## The Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COMPLETE FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. DEPOSIT (On-Chain TX)                                                   │
│     Player wallet ──[approve]──> USDH Token                                 │
│     Player wallet ──[deposit]──> Custody Contract                           │
│     └── TX visible on Etherscan!                                            │
│                                                                             │
│  2. SYNC (Automatic)                                                        │
│     Custody deposit event ──> Clearnode                                     │
│     Clearnode updates ──> Player ledger balance                             │
│                                                                             │
│  3. PLAY GAME (Off-Chain, NO TXS!)                                          │
│     Player ──[create_app_session]──> Clearnode                              │
│     Player + Broker fund session (state channel)                            │
│     ┌──────────────────────────────────────────┐                            │
│     │  Game rounds (commit-reveal)             │                            │
│     │  - submit_app_state                      │  ← All off-chain!          │
│     │  - submit_app_state                      │  ← Zero gas!               │
│     │  - submit_app_state                      │                            │
│     └──────────────────────────────────────────┘                            │
│     Player ──[close_app_session]──> Clearnode                               │
│     Funds redistributed in ledger                                           │
│                                                                             │
│  4. WITHDRAW (On-Chain TX)                                                  │
│     Player wallet ──[withdraw]──> Custody Contract                          │
│     └── TX visible on Etherscan!                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Why No Transactions During Game?

That's the whole point of state channels:
- Play unlimited rounds with **ZERO gas**
- Only pay for 2 txs total: deposit + withdraw
- Instant finality (no waiting for blocks)
- House-funded sessions with multiplied payouts

## Setup

```bash
cd explorations/yellow-test
bun install
cp .env.example .env
```

Edit `.env`:
```bash
PRIVATE_KEY=0x...           # Your wallet (needs Sepolia ETH + USDH)
BROKER_PRIVATE_KEY=0x...    # Broker key (for house funding)
CLEARNODE_URL=wss://nitrolite.kwek.dev/ws
ASSET_SYMBOL=usdh
```

You need:
- Sepolia ETH for gas (get from https://sepoliafaucet.com/)
- USDH tokens for betting

## Scripts

```bash
# Run full flow: deposit -> play -> withdraw
bun run death-game

# Try to mint test USDH
bun run mint-usdh
```

## Contract Addresses (Sepolia)

| Contract | Address |
|----------|---------|
| USDH Token | `0x25FfCCE632a03898c2ecB0EF9bb6a86177a363Ed` |
| Custody | `0xEC94b4039237ac9490377FDB8A65e884eD6154A0` |
| Broker | `0x1F0335E50059099C6b10420a9B6c27E8A8261359` |
| HouseVault | `0x6a309d4b666d6Eed842a81DA013441Db57607c4c` |

## House Funding

The game uses house-funded sessions:
- Player bets 100 USDH
- House (broker) funds max possible payout (3136 USDH for 5 rows)
- Total pool: 3236 USDH
- Winner takes proportional amount based on game state

Both player AND broker must sign session creation since both contribute funds.
This is handled automatically in the script using `BROKER_PRIVATE_KEY`.

## Game Math

Row multiplier: `tiles / (tiles - 1)`
- 2 tiles: 2.00x per row
- 3 tiles: 1.50x per row
- 4 tiles: 1.33x per row
- 5 tiles: 1.25x per row
- 6 tiles: 1.20x per row

Max multiplier for 5 rows with 2 tiles each: 2^5 = 32x
House edge: 2% applied to final payout

## Example Output

```
=== Step 0: Check Balances ===
  Sepolia ETH: 0.38 ETH
  USDH (wallet): 999.88 USDH
  USDH (custody): 1130 USDH

=== Creating House-Funded Session ===
  Player bet: 100 usdh
  House funding: 3136 usdh
  Total pool: 3236 usdh
✓ House-funded session created

=== Game Start ===
Row 1 (5 tiles): ✓ SAFE! Multiplier: 1.25x
Row 2 (5 tiles): ✓ SAFE! Multiplier: 1.56x
Row 3 (6 tiles): ✓ SAFE! Multiplier: 1.88x
Row 4 (3 tiles): ✓ SAFE! Multiplier: 2.81x
Row 5 (2 tiles): ✗ BOOM!

=== Game Over ===
Result: LOST
Final payout: 0 usdh
Profit: -100 usdh

Summary:
  - Deposit to Custody: 1 on-chain tx
  - Game play: 0 on-chain txs (state channels)
  - Withdraw from Custody: 1 on-chain tx
```

## Files

| File | Purpose |
|------|---------|
| `src/death-game.ts` | Full flow: deposit, auth, play, withdraw |
| `src/types.ts` | Type definitions, addresses |
| `src/game-logic.ts` | Commit-reveal, multiplier math |
| `src/mint-usdh.ts` | Helper to mint test USDH |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PRIVATE_KEY` | Yes | Player wallet private key |
| `BROKER_PRIVATE_KEY` | Yes | Broker key for house funding |
| `CLEARNODE_URL` | No | WebSocket URL (default: nitrolite.kwek.dev) |
| `ASSET_SYMBOL` | No | Asset symbol (default: usdh) |
| `SESSION_KEY` | No | Reuse session key for faster auth |
| `RPC_URL` | No | Custom RPC URL |
