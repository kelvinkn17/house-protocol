# Contract Development Guidelines

## project structure

```
contract/
├── contracts/          # solidity source files
├── scripts/            # deployment scripts
├── test/               # test files
├── hardhat.config.ts   # hardhat configuration
└── .env.example        # env template
```

## commands

```bash
bun run compile         # compile contracts
bun run test            # run tests
bun run node            # start local hardhat node
bun run deploy:localhost # deploy to local node
bun run deploy:sepolia  # deploy to sepolia testnet
bun run deploy:mainnet  # deploy to mainnet
bun run verify          # verify on etherscan
bun run clean           # clean artifacts
```

## environment setup

copy `.env.example` to `.env` and fill in:
- `DEPLOYER_PK` - private key without 0x prefix
- `ETHERSCAN_API_KEY` - for contract verification
- `SEPOLIA_RPC_URL` / `MAINNET_RPC_URL` - optional custom rpcs

## adding new contracts

1. create `.sol` file in `contracts/`
2. add deploy script in `scripts/`
3. add tests in `test/`
4. run `bun run compile` to generate types

## testing pattern

```ts
import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract", function () {
  it("should do something", async function () {
    const Factory = await ethers.getContractFactory("MyContract");
    const contract = await Factory.deploy();
    // assertions
  });
});
```

## deployment pattern

```ts
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deploying with:", deployer.address);

  const Factory = await ethers.getContractFactory("MyContract");
  const contract = await Factory.deploy(/* args */);
  await contract.waitForDeployment();

  console.log("deployed to:", await contract.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
```

## verifying contracts

```bash
# after deployment
bun run --cwd contract verify <address> --network sepolia "constructor arg 1" "arg 2"
```
