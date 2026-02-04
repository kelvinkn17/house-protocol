# Death Game - Yellow Network State Channels

Exploration of Yellow Network / Nitrolite state channels for gasless gaming on Sepolia.

## Status

**Working:**
- WebSocket connection to Yellow clearnode (sandbox & production)
- EIP-712 authentication flow (session key registration + challenge signing)
- Game logic with commit-reveal fairness
- Multiplier calculations

**Known Issue:**
- Yellow clearnode returns "failed to generate JWT token" after valid EIP-712 signature
- This may require creating a channel first at https://app.yellow.org or is a server-side issue

## Setup

```bash
cd explorations/yellow-test
bun install
cp .env.example .env
# Add your PRIVATE_KEY to .env
```

## Running

```bash
bun run death-game
```

Expected output:
```
Death Game - Yellow Network State Channels
==========================================
Main wallet: 0x...
Session key: 0x...
Clearnode: wss://clearnet-sandbox.yellow.com/ws

Sepolia balance: 0.399026 ETH

✓ Connected to Yellow Network (sandbox)
  Sending auth_request...
  Received challenge: 57da306b...
  Signed EIP-712, sending auth_verify...
  Error: failed to generate JWT token    <-- server-side issue

=== Game Start ===
Game ID: 0x...
Virtual bet: 100
Rows: 5

Row 1 (3 tiles):
  ✓ SAFE! Picked 2. Multiplier: 1.50x
  Cumulative: 1.50x (with edge: 1.47x)
...
```

## Authentication Flow (per Yellow docs)

```
1. Generate session keypair locally
2. auth_request (public, no signature)
   → address, session_key, application, expires_at, allowances
3. auth_challenge (from server)
   → challenge_message (UUID)
4. Sign EIP-712 with MAIN WALLET (not session key)
   → Policy type with challenge, wallet, session_key, etc.
5. auth_verify with signature
6. Receive JWT + use session key for subsequent ops
```

## Game Math

Row multiplier: `tiles / (tiles - 1)`
- 2 tiles: 2x per row
- 3 tiles: 1.5x per row
- 4 tiles: 1.33x per row
- 5 tiles: 1.25x per row
- 6 tiles: 1.2x per row

Cumulative multiplier compounds. House edge (2%) applied at payout.

## Commit-Reveal

```
PLAYER                          HOUSE
   │                              │
   │── Commit(hash(tile, nonce)) ─►│
   │                              │
   │◄── Commit(hash(bomb, nonce)) ─│
   │                              │
   │       Both Reveal            │
   │                              │
   │  Bomb = hash(player_nonce +  │
   │              house_nonce)    │
```

## Files

| File | Purpose |
|------|---------|
| `contracts/DeathGame.sol` | Event-only contract |
| `src/types.ts` | Type definitions |
| `src/game-logic.ts` | Commit-reveal, multipliers |
| `src/death-game.ts` | Main script with Yellow auth |

## Next Steps

1. Create channel at https://app.yellow.org (may resolve JWT issue)
2. Or wait for Yellow Network to fix server-side JWT generation
3. Once authenticated, use session key to sign app session messages
