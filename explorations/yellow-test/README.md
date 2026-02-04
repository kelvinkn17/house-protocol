# Death Game - Base Exploration

Minimal "Death Game" (Mines style) simulation on Base.

## What This Is

A simulation of a Death Game where:
- Each row has 2-6 tiles, exactly 1 is a bomb
- Player picks a tile per row
- Safe pick = multiplier grows, continue to next row
- Bomb = game over, lose bet
- Virtual 100 token balance
- Uses commit-reveal for fairness

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

## Game Math

Row multiplier: `tiles / (tiles - 1)`
- 2 tiles: 2x per row
- 3 tiles: 1.5x per row
- 4 tiles: 1.33x per row
- 5 tiles: 1.25x per row
- 6 tiles: 1.2x per row

Cumulative multiplier compounds across rows.

## Commit-Reveal Flow

```
PLAYER                          HOUSE
   │                              │
   │── Commit(hash(tile, nonce)) ─►│
   │                              │
   │◄── Commit(hash(bomb, nonce)) ─│
   │                              │
   │── Reveal(tile, nonce) ───────►│
   │                              │
   │◄── Reveal(bomb, nonce) ───────│
   │                              │
   │    Bomb = hash(both nonces)   │
```

Neither party can cheat:
- Player can't change choice after seeing bomb
- House can't change bomb after seeing player choice
- Bomb position derived from both nonces

## Files

| File | Purpose |
|------|---------|
| `contracts/DeathGame.sol` | Event-only contract for on-chain observability |
| `src/types.ts` | Type definitions |
| `src/game-logic.ts` | Commit-reveal, multiplier calculations |
| `src/death-game.ts` | Main runnable script |
