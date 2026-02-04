# Death Game - Yellow Network State Channels

Exploration of Yellow Network / Nitrolite state channels for gasless gaming on Sepolia.

## Status

**Working:**
- WebSocket connection to Yellow clearnode (sandbox)
- EIP-712 authentication flow
- Session key registration
- Channel creation
- Game logic with commit-reveal fairness
- Multiplier calculations
- Session/channel reuse for faster startup

## Setup

```bash
cd explorations/yellow-test
bun install
cp .env.example .env
# Add your PRIVATE_KEY to .env
```

You need Sepolia ETH for gas. Get some from https://sepoliafaucet.com/

## Running

```bash
bun run death-game
```

First run output:
```
Death Game - Yellow Network State Channels
==========================================

CONFIG:
  Main wallet: 0x...
  Session key: 0x... (new)
  Chain: Sepolia (11155111)
  Clearnode: wss://clearnet-sandbox.yellow.com/ws

Sepolia ETH: 0.399 ETH

Requesting faucet tokens...
  Faucet: {"success":true,"amount":"10000000","asset":"ytest.usd"}

✓ Connected to Yellow Network (sandbox)
✓ Authenticated!
✓ Channel created: 0x...

  To reuse this session, add to .env:
  SESSION_KEY=0x...
  CHANNEL_ID=0x...

=== Game Start ===
...
```

After adding `SKIP_FAUCET=true`, `SESSION_KEY`, and `CHANNEL_ID` to .env, subsequent runs are faster:
```
CONFIG:
  Session key: 0x... (saved)
  Channel: 0x...

✓ Connected to Yellow Network (sandbox)
✓ Authenticated!
  Using saved channel: 0x...

=== Game Start ===
...
```

## Authentication Flow

```
1. Generate session keypair locally (or reuse from .env)
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

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PRIVATE_KEY` | Yes | Wallet private key (Sepolia) |
| `RPC_URL` | No | Custom RPC URL |
| `SKIP_FAUCET` | No | Set to `true` after first run |
| `SESSION_KEY` | No | Reuse session key |
| `CHANNEL_ID` | No | Reuse channel |

## Contract Addresses (Sepolia)

- Custody: `0x019B65A265EB3363822f2752141b3dF16131B262`
- Adjudicator: `0x7c7ccbc98469190849BCC6c926307794fDfB11F2`
- ytest.usd: `0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb`
