# Self-Hosted Nitrolite with USDH Token on Sepolia

This guide walks through deploying your own state channel infrastructure on Sepolia with a custom USDH token (public mint for testing).

## Architecture Overview

```
[Your Wallet]
     |
     | 1. Mint USDH (on-chain)
     | 2. Approve + Deposit to Custody (on-chain)
     v
[Custody Contract - Sepolia]
     |
     | 3. Clearnode detects deposit event
     | 4. Credits your ledger balance
     v
[Your Clearnode Server]
     |
     | 5. Create app session (off-chain)
     | 6. Play game rounds (off-chain, fast)
     | 7. Close session (off-chain)
     v
[Custody Contract - Sepolia]
     |
     | 8. Withdraw (on-chain)
     v
[Your Wallet - with winnings]
```

## Part 1: Prerequisites

### Required Tools

```bash
# Docker + Docker Compose
docker --version  # should be 20.10+
docker-compose --version  # or docker compose

# Foundry (forge, cast)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Node.js 18+
node --version
```

### Required Accounts

1. **Sepolia Wallet with ETH**
   - Use an existing wallet or create one: `cast wallet new`
   - Get Sepolia ETH from: https://sepoliafaucet.com/ or https://www.alchemy.com/faucets/ethereum-sepolia

2. **Sepolia RPC URL (WebSocket)**
   - Alchemy: `wss://eth-sepolia.g.alchemy.com/v2/YOUR_KEY`
   - Infura: `wss://sepolia.infura.io/ws/v3/YOUR_KEY`
   - Public (less reliable): `wss://sepolia.drpc.org`

3. **Broker Wallet** (for clearnode)
   - Generate fresh: `cast wallet new`
   - Fund with ~0.01 Sepolia ETH

## Part 2: Deploy Contracts to Sepolia

### Setup

```bash
cd explorations/nitrolite-local/contract

# install dependencies
forge install
```

### Create .env file

```bash
# contract/.env
PRIVATE_KEY=0x...your_deployer_private_key
SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ETHERSCAN_API_KEY=your_etherscan_api_key  # optional, for verification
```

### Deploy All Contracts

Deploy USDH, Custody, and DummyAdjudicator in one command:

```bash
source .env
forge script script/DeploySepolia.s.sol \
  --rpc-url $SEPOLIA_RPC \
  --broadcast \
  --verify
```

Or deploy individually:

```bash
# Deploy USDH token
forge script script/DeployUSDH.s.sol --rpc-url $SEPOLIA_RPC --broadcast --verify

# Deploy Custody (using existing script)
forge script script/DeployCustody.s.sol --rpc-url $SEPOLIA_RPC --broadcast \
  --sig "run(uint32,string)" 0 "test test test test test test test test test test test junk"

# Deploy DummyAdjudicator
forge script script/DeployDummyAdjudicator.s.sol --rpc-url $SEPOLIA_RPC --broadcast \
  --sig "run(uint32,string)" 0 "test test test test test test test test test test test junk"
```

### Save Contract Addresses

After deployment, save the addresses. You'll see output like:

```
USDH deployed at: 0x1234...
Custody deployed at: 0x5678...
DummyAdjudicator deployed at: 0x9abc...
```

## Part 3: Configure Clearnode

### Update Config Files

1. **Edit blockchains.yaml**

```bash
vim clearnode/config/compose/sepolia/blockchains.yaml
```

Replace placeholder addresses:

```yaml
default_contract_addresses:

blockchains:
- name: ethereum_sepolia
  id: 11155111
  contract_addresses:
    custody: "0x5678..."      # your Custody address
    adjudicator: "0x9abc..."  # your DummyAdjudicator address
```

2. **Edit assets.yaml**

```bash
vim clearnode/config/compose/sepolia/assets.yaml
```

Replace placeholder address:

```yaml
assets:
  - name: "House USD"
    symbol: "usdh"
    tokens:
      - blockchain_id: 11155111
        address: "0x1234..."  # your USDH address
        decimals: 6
```

3. **Create .env from template**

```bash
cp clearnode/config/compose/sepolia/.env.example clearnode/config/compose/sepolia/.env
vim clearnode/config/compose/sepolia/.env
```

Fill in:
- `BROKER_PRIVATE_KEY` - your broker wallet private key
- `ETHEREUM_SEPOLIA_BLOCKCHAIN_RPC` - your WebSocket RPC URL

## Part 4: Run Clearnode Locally

### Option A: Docker Compose (Recommended)

Create a root .env file:

```bash
# explorations/nitrolite-local/.env
BROKER_PRIVATE_KEY=0x...
ETHEREUM_SEPOLIA_BLOCKCHAIN_RPC=wss://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
USDH_TOKEN_ADDRESS=0x1234...
POSTGRES_USER=clearnode
POSTGRES_PASSWORD=clearnode
POSTGRES_DB=clearnode
```

Start the stack:

```bash
docker-compose -f docker-compose.sepolia.yml up -d
```

Check logs:

```bash
docker-compose -f docker-compose.sepolia.yml logs -f clearnode
```

### Option B: Run Clearnode Binary Directly

If you prefer not using Docker:

```bash
cd clearnode
go build -o ./bin/clearnode .

# Set environment variables
export CLEARNODE_CONFIG_DIR_PATH=./config/compose/sepolia
export CLEARNODE_MODE=test
export ETHEREUM_SEPOLIA_BLOCKCHAIN_RPC=wss://...
export CLEARNODE_DATABASE_URL=postgresql://user:pass@localhost:5432/clearnode
export CLEARNODE_LOG_LEVEL=info

./bin/clearnode
```

You'll need PostgreSQL running separately.

## Part 5: Test the Flow

### 1. Mint USDH Tokens

```bash
# Mint 1000 USDH (1000 * 10^6 = 1000000000)
cast send $USDH_ADDRESS "mint(address,uint256)" $YOUR_WALLET 1000000000 \
  --rpc-url $SEPOLIA_RPC \
  --private-key $PRIVATE_KEY

# Check balance
cast call $USDH_ADDRESS "balanceOf(address)(uint256)" $YOUR_WALLET \
  --rpc-url $SEPOLIA_RPC
```

### 2. Approve Custody

```bash
# Approve Custody to spend your USDH
cast send $USDH_ADDRESS "approve(address,uint256)" $CUSTODY_ADDRESS 1000000000 \
  --rpc-url $SEPOLIA_RPC \
  --private-key $PRIVATE_KEY
```

### 3. Deposit to Custody

```bash
# Deposit 100 USDH
cast send $CUSTODY_ADDRESS "deposit(address,uint256)" $USDH_ADDRESS 100000000 \
  --rpc-url $SEPOLIA_RPC \
  --private-key $PRIVATE_KEY
```

The clearnode should pick up the deposit event and credit your ledger balance.

### 4. Connect Death Game (or your app)

Update your app to connect to local clearnode:

```typescript
// instead of:
const CLEARNODE_URL = 'wss://clearnet-sandbox.yellow.com/ws'

// use:
const CLEARNODE_URL = 'ws://localhost:8000/ws'
```

### 5. Withdraw

After playing, withdraw your remaining balance:

```bash
# Check your ledger balance via clearnode API or WebSocket
# Then withdraw on-chain
cast send $CUSTODY_ADDRESS "withdraw(address,uint256)" $USDH_ADDRESS 50000000 \
  --rpc-url $SEPOLIA_RPC \
  --private-key $PRIVATE_KEY
```

## Part 6: Server Deployment

### Option A: VPS with Docker Compose

1. **Get a VPS** (DigitalOcean, Hetzner, AWS, etc.)

2. **Install Docker**
```bash
curl -fsSL https://get.docker.com | sh
```

3. **Clone and configure**
```bash
git clone <your-repo>
cd explorations/nitrolite-local
cp clearnode/config/compose/sepolia/.env.example .env
vim .env  # fill in values
```

4. **Run with Docker Compose**
```bash
docker-compose -f docker-compose.sepolia.yml up -d
```

### Option B: Add nginx + SSL

For production, put nginx in front:

```nginx
# /etc/nginx/sites-available/clearnode
server {
    listen 443 ssl;
    server_name clearnode.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/clearnode.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/clearnode.yourdomain.com/privkey.pem;

    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Get SSL cert:
```bash
sudo certbot --nginx -d clearnode.yourdomain.com
```

## Troubleshooting

### Clearnode not detecting deposits

1. Check RPC is WebSocket (not HTTP)
2. Check contract addresses in blockchains.yaml match deployed addresses
3. Check clearnode logs for errors

### Database connection errors

1. Make sure PostgreSQL is running and accessible
2. Check CLEARNODE_DATABASE_URL is correct
3. Check migrations ran successfully

### WebSocket connection refused

1. Check clearnode is running: `docker-compose ps`
2. Check port 8000 is exposed
3. Check firewall allows the port

## Quick Reference

### Contract Addresses (already deployed)

| Contract | Address |
|----------|---------|
| USDH | `0x25FfCCE632a03898c2ecB0EF9bb6a86177a363Ed` |
| Custody | `0xEC94b4039237ac9490377FDB8A65e884eD6154A0` |
| DummyAdjudicator | `0x27f6C661929E4BF44455eEE2A7fc3C61E5AE768d` |

Deployer/Token holder: `0x07f412ad9D23Fcd328c209FaC7844F9F7A0ccED4` (1 billion USDH minted)

### Useful Commands

```bash
# Check USDH balance
cast call $USDH "balanceOf(address)(uint256)" $WALLET --rpc-url $SEPOLIA_RPC

# Mint USDH
cast send $USDH "mint(address,uint256)" $WALLET 1000000000 --rpc-url $SEPOLIA_RPC --private-key $KEY

# Approve + Deposit
cast send $USDH "approve(address,uint256)" $CUSTODY 1000000000 --rpc-url $SEPOLIA_RPC --private-key $KEY
cast send $CUSTODY "deposit(address,uint256)" $USDH 100000000 --rpc-url $SEPOLIA_RPC --private-key $KEY

# Withdraw
cast send $CUSTODY "withdraw(address,uint256)" $USDH 50000000 --rpc-url $SEPOLIA_RPC --private-key $KEY

# Check clearnode logs
docker-compose -f docker-compose.sepolia.yml logs -f clearnode
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY` | Deployer wallet private key |
| `BROKER_PRIVATE_KEY` | Clearnode broker wallet private key |
| `ETHEREUM_SEPOLIA_BLOCKCHAIN_RPC` | WebSocket RPC URL |
| `USDH_TOKEN_ADDRESS` | Deployed USDH contract address |
| `CLEARNODE_LOG_LEVEL` | Log level (debug, info, warn, error) |
