import { execFileSync } from "child_process";
import { select, confirm } from "@inquirer/prompts";
import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const networks = {
  localhost: {
    rpc: "http://127.0.0.1:8545",
    explorer: "",
    chainId: 31337,
  },
  sepolia: {
    rpc: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
    explorer: "https://sepolia.etherscan.io",
    chainId: 11155111,
  },
  mainnet: {
    rpc: process.env.MAINNET_RPC_URL || "https://eth.llamarpc.com",
    explorer: "https://etherscan.io",
    chainId: 1,
  },
} as const;

type NetworkName = keyof typeof networks;

function formatEth(wei: bigint): string {
  return parseFloat(ethers.formatEther(wei)).toFixed(4);
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function main() {
  console.log("\n🏠 the house protocol - contract deployer\n");

  const pk = process.env.DEPLOYER_PK;

  // select network with arrow keys
  const networkName = await select<NetworkName>({
    message: "select network",
    choices: [
      { name: "localhost", value: "localhost", description: "local hardhat node" },
      { name: "sepolia", value: "sepolia", description: "ethereum testnet" },
      { name: "mainnet", value: "mainnet", description: "ethereum mainnet ⚠️" },
    ],
  });

  const network = networks[networkName];

  // get provider and check deployer
  const provider = new ethers.JsonRpcProvider(network.rpc);

  let deployerAddress: string;
  let balance: bigint;

  if (networkName === "localhost") {
    try {
      const accounts = await provider.listAccounts();
      if (accounts.length === 0) {
        console.log("\n⚠ no accounts found. is hardhat node running?");
        console.log("  run: bun run node\n");
        process.exit(1);
      }
      deployerAddress = accounts[0].address;
      balance = await provider.getBalance(deployerAddress);
    } catch {
      console.log("\n⚠ cannot connect to localhost. is hardhat node running?");
      console.log("  run: bun run node\n");
      process.exit(1);
    }
  } else {
    if (!pk) {
      console.log("\n⚠ DEPLOYER_PK not set in .env\n");
      process.exit(1);
    }
    const wallet = new ethers.Wallet(pk, provider);
    deployerAddress = wallet.address;
    balance = await provider.getBalance(deployerAddress);
  }

  // show nice info box
  console.log();
  console.log("┌────────────────────────────────────────────────────────────┐");
  console.log(`│  network:   ${networkName.padEnd(46)}│`);
  console.log(`│  chain id:  ${String(network.chainId).padEnd(46)}│`);
  console.log(`│  deployer:  ${deployerAddress}  │`);
  console.log(`│  balance:   ${(formatEth(balance) + " ETH").padEnd(46)}│`);
  if (network.explorer) {
    console.log(`│  explorer:  ${network.explorer.padEnd(46)}│`);
  }
  console.log("└────────────────────────────────────────────────────────────┘");
  console.log();

  if (balance === 0n && networkName !== "localhost") {
    console.log("⚠ deployer has no funds\n");
    process.exit(1);
  }

  // extra warning for mainnet
  if (networkName === "mainnet") {
    console.log("⚠️  WARNING: you are deploying to MAINNET!\n");
  }

  // confirm deployment
  const shouldDeploy = await confirm({
    message: `deploy to ${networkName}?`,
    default: networkName !== "mainnet",
  });

  if (!shouldDeploy) {
    console.log("\ncancelled\n");
    process.exit(0);
  }

  // run hardhat deploy
  console.log("\n");
  try {
    execFileSync("npx", ["hardhat", "run", "scripts/hardhat-deploy.ts", "--network", networkName], {
      stdio: "inherit",
    });
  } catch {
    process.exit(1);
  }
}

main();
