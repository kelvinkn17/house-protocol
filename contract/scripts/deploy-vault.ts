import { ethers, run, network } from "hardhat";

// Sepolia USDC (Circle official)
const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

const explorers: Record<string, string> = {
  sepolia: "https://sepolia.etherscan.io",
  mainnet: "https://etherscan.io",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  const networkName = network.name;
  const explorer = explorers[networkName] || "";

  console.log("┌─────────────────────────────────────────────────────────────┐");
  console.log("│  deploying HouseVault                                       │");
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log(`│  network:   ${networkName.padEnd(47)}│`);
  console.log(`│  deployer:  ${deployer.address}  │`);
  console.log(`│  balance:   ${parseFloat(ethers.formatEther(balance)).toFixed(4).padEnd(47)}│`);
  console.log("└─────────────────────────────────────────────────────────────┘");
  console.log();

  let assetAddress: string;
  if (networkName === "sepolia") {
    assetAddress = SEPOLIA_USDC;
  } else if (networkName === "mainnet") {
    assetAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  } else {
    console.log("⚠ using Sepolia USDC address for local testing");
    assetAddress = SEPOLIA_USDC;
  }

  const operatorAddress = deployer.address;

  console.log(`  asset (USDC): ${assetAddress}`);
  console.log(`  operator:     ${operatorAddress}`);
  console.log();

  const HouseVault = await ethers.getContractFactory("HouseVault");
  const constructorArgs = [
    assetAddress,
    "House USDC",
    "hUSDC",
    operatorAddress,
  ] as const;

  const vault = await HouseVault.deploy(...constructorArgs);

  await vault.waitForDeployment();
  const address = await vault.getAddress();

  console.log("✓ HouseVault deployed successfully!\n");
  console.log(`  contract:  ${address}`);

  if (explorer) {
    console.log(`  explorer:  ${explorer}/address/${address}`);
  }

  if (networkName !== "localhost" && networkName !== "hardhat") {
    console.log("\n⏳ waiting for block confirmations...");
    await vault.deploymentTransaction()?.wait(5);

    console.log("⏳ verifying contract on etherscan...\n");
    try {
      await run("verify:verify", {
        address: address,
        constructorArguments: constructorArgs,
      });
      console.log("\n✓ contract verified!");
      console.log(`  verified:  ${explorer}/address/${address}#code`);
    } catch (error: unknown) {
      const err = error as Error;
      if (err.message.includes("Already Verified")) {
        console.log("\n✓ contract already verified!");
      } else {
        console.log("\n⚠ verification failed:", err.message);
        console.log("  you can verify manually with:");
        console.log(`  npx hardhat verify --network ${networkName} ${address} "${assetAddress}" "House USDC" "hUSDC" "${operatorAddress}"`);
      }
    }
  }

  console.log("\n┌─────────────────────────────────────────────────────────────┐");
  console.log("│  NEXT STEPS                                                 │");
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log("│  1. Get test USDC from https://faucet.circle.com/          │");
  console.log("│  2. Approve and deposit USDC to the vault                   │");
  console.log("│  3. Update HOUSE_VAULT_ADDRESS in backend .env              │");
  console.log("└─────────────────────────────────────────────────────────────┘");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
