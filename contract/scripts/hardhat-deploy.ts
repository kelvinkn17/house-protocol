import { ethers, run, network } from "hardhat";

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
  console.log("│  deploying HelloWorld                                       │");
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log(`│  network:   ${networkName.padEnd(47)}│`);
  console.log(`│  deployer:  ${deployer.address}  │`);
  console.log(`│  balance:   ${parseFloat(ethers.formatEther(balance)).toFixed(4).padEnd(47)}│`);
  console.log("└─────────────────────────────────────────────────────────────┘");
  console.log();

  const HelloWorld = await ethers.getContractFactory("HelloWorld");
  const constructorArgs = ["hello from the house protocol"];
  const helloWorld = await HelloWorld.deploy(...constructorArgs);

  await helloWorld.waitForDeployment();
  const address = await helloWorld.getAddress();

  console.log("✓ deployed successfully!\n");
  console.log(`  contract:  ${address}`);

  if (explorer) {
    console.log(`  explorer:  ${explorer}/address/${address}`);
  }

  // auto verify on testnets/mainnet
  if (networkName !== "localhost" && networkName !== "hardhat") {
    console.log("\n⏳ waiting for block confirmations...");
    await helloWorld.deploymentTransaction()?.wait(5);

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
        console.log(`  bun run verify ${address} --network ${networkName} "hello from the house protocol"`);
      }
    }
  }

  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
