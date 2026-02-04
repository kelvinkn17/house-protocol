import { expect } from "chai";
import { ethers } from "hardhat";
import { HouseVault } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import * as dotenv from "dotenv";

dotenv.config();

// Sepolia USDC (Circle official)
const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

// Your deployer wallet (has real USDC on Sepolia)
const DEPLOYER_PK = process.env.DEPLOYER_PK || "";

// minimal ERC20 ABI for testing
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function transfer(address, uint256) returns (bool)",
  "function decimals() view returns (uint8)",
];

describe("HouseVault", function () {
  let vault: HouseVault;
  let usdc: any;
  let owner: HardhatEthersSigner;
  let operator: HardhatEthersSigner;
  let deployer: HardhatEthersSigner;
  let deployerAddress: string;

  before(async function () {
    const blockNumber = await ethers.provider.getBlockNumber();
    if (blockNumber === 0) {
      console.log("WARNING: Not forking Sepolia. Set SEPOLIA_RPC_URL in .env for full tests.");
      this.skip();
    }

    if (!DEPLOYER_PK) {
      console.log("WARNING: DEPLOYER_PK not set in .env. Cannot run tests with real USDC.");
      this.skip();
    }

    const wallet = new ethers.Wallet(DEPLOYER_PK);
    deployerAddress = wallet.address;

    const tempUsdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, ethers.provider);
    const balance = await tempUsdc.balanceOf(deployerAddress);
    console.log(`\n  Deployer: ${deployerAddress}`);
    console.log(`  USDC Balance: ${ethers.formatUnits(balance, 6)} USDC\n`);

    if (balance === 0n) {
      console.log("WARNING: Deployer has no USDC. Get some from https://faucet.circle.com/");
      this.skip();
    }
  });

  beforeEach(async function () {
    [owner, operator] = await ethers.getSigners();

    await ethers.provider.send("hardhat_impersonateAccount", [deployerAddress]);
    await ethers.provider.send("hardhat_setBalance", [deployerAddress, "0x56BC75E2D63100000"]);
    deployer = await ethers.getSigner(deployerAddress);

    usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, deployer);

    const HouseVault = await ethers.getContractFactory("HouseVault", owner);
    vault = await HouseVault.deploy(
      USDC_ADDRESS,
      "House USDC",
      "hUSDC",
      operator.address
    );
    await vault.waitForDeployment();
  });

  afterEach(async function () {
    if (deployerAddress) {
      await ethers.provider.send("hardhat_stopImpersonatingAccount", [deployerAddress]);
    }
  });

  describe("Deployment", function () {
    it("should set correct asset", async function () {
      expect(await vault.asset()).to.equal(USDC_ADDRESS);
    });

    it("should set correct name and symbol", async function () {
      expect(await vault.name()).to.equal("House USDC");
      expect(await vault.symbol()).to.equal("hUSDC");
    });

    it("should set correct operator", async function () {
      expect(await vault.operator()).to.equal(operator.address);
    });

    it("should set correct owner", async function () {
      expect(await vault.owner()).to.equal(owner.address);
    });

    it("should have 80% max allocation by default", async function () {
      expect(await vault.maxAllocationPercent()).to.equal(8000n);
    });
  });

  describe("Deposits (using real USDC)", function () {
    it("should mint shares on deposit", async function () {
      const depositAmount = 1n * 10n ** 6n;

      await usdc.connect(deployer).approve(await vault.getAddress(), depositAmount);
      await vault.connect(deployer).deposit(depositAmount, deployer.address);

      expect(await vault.balanceOf(deployer.address)).to.be.gt(0n);
      expect(await vault.totalAssets()).to.equal(depositAmount);
    });

    it("should track total assets correctly", async function () {
      const depositAmount = 1n * 10n ** 6n;

      await usdc.connect(deployer).approve(await vault.getAddress(), depositAmount);
      await vault.connect(deployer).deposit(depositAmount, deployer.address);

      expect(await vault.totalAssets()).to.equal(depositAmount);
    });
  });

  describe("Channel Allocation", function () {
    const depositAmount = 10n * 10n ** 6n;
    const channelId = ethers.keccak256(ethers.toUtf8Bytes("channel-1"));

    beforeEach(async function () {
      await usdc.connect(deployer).approve(await vault.getAddress(), depositAmount);
      await vault.connect(deployer).deposit(depositAmount, deployer.address);
    });

    it("should allocate funds to channel", async function () {
      const allocAmount = 5n * 10n ** 6n;

      const operatorBalanceBefore = await usdc.balanceOf(operator.address);
      await vault.connect(operator).allocateToChannel(channelId, allocAmount);

      expect(await vault.channelAllocations(channelId)).to.equal(allocAmount);
      expect(await vault.totalAllocated()).to.equal(allocAmount);
      const operatorBalanceAfter = await usdc.balanceOf(operator.address);
      expect(operatorBalanceAfter - operatorBalanceBefore).to.equal(allocAmount);
    });

    it("should emit ChannelAllocated event", async function () {
      const allocAmount = 5n * 10n ** 6n;

      await expect(vault.connect(operator).allocateToChannel(channelId, allocAmount))
        .to.emit(vault, "ChannelAllocated")
        .withArgs(channelId, allocAmount);
    });

    it("should respect max allocation percent", async function () {
      const tooMuch = 9n * 10n ** 6n;

      await expect(
        vault.connect(operator).allocateToChannel(channelId, tooMuch)
      ).to.be.revertedWithCustomError(vault, "InsufficientLiquidity");
    });

    it("should only allow operator", async function () {
      await expect(
        vault.connect(deployer).allocateToChannel(channelId, 1n * 10n ** 6n)
      ).to.be.revertedWithCustomError(vault, "NotOperator");
    });

    it("should not allow duplicate channel", async function () {
      await vault.connect(operator).allocateToChannel(channelId, 1n * 10n ** 6n);

      await expect(
        vault.connect(operator).allocateToChannel(channelId, 1n * 10n ** 6n)
      ).to.be.revertedWithCustomError(vault, "ChannelExists");
    });
  });

  describe("Channel Settlement", function () {
    const depositAmount = 10n * 10n ** 6n; 
    const allocAmount = 5n * 10n ** 6n; 
    const channelId = ethers.keccak256(ethers.toUtf8Bytes("channel-1"));

    beforeEach(async function () {
      await usdc.connect(deployer).approve(await vault.getAddress(), depositAmount);
      await vault.connect(deployer).deposit(depositAmount, deployer.address);
      await vault.connect(operator).allocateToChannel(channelId, allocAmount);
    });

    it("should settle with profit (house won)", async function () {
      const returnAmount = 6n * 10n ** 6n;

      await usdc.connect(operator).approve(await vault.getAddress(), returnAmount);
      await vault.connect(operator).settleChannel(channelId, returnAmount);

      expect(await vault.channelAllocations(channelId)).to.equal(0n);
      expect(await vault.totalAllocated()).to.equal(0n);
      expect(await vault.totalAssets()).to.equal(depositAmount + 1n * 10n ** 6n); 
    });

    it("should settle with loss (player won)", async function () {
      const returnAmount = 4n * 10n ** 6n;

      await usdc.connect(operator).approve(await vault.getAddress(), returnAmount);
      await vault.connect(operator).settleChannel(channelId, returnAmount);

      expect(await vault.totalAssets()).to.equal(depositAmount - 1n * 10n ** 6n);
    });

    it("should emit ChannelSettled with correct pnl", async function () {
      const returnAmount = 6n * 10n ** 6n;
      const expectedPnl = 1n * 10n ** 6n;

      await usdc.connect(operator).approve(await vault.getAddress(), returnAmount);

      await expect(vault.connect(operator).settleChannel(channelId, returnAmount))
        .to.emit(vault, "ChannelSettled")
        .withArgs(channelId, returnAmount, expectedPnl);
    });

    it("should fail for unknown channel", async function () {
      const unknownChannel = ethers.keccak256(ethers.toUtf8Bytes("unknown"));

      await expect(
        vault.connect(operator).settleChannel(unknownChannel, 1n * 10n ** 6n)
      ).to.be.revertedWithCustomError(vault, "ChannelNotFound");
    });
  });

  describe("Available Liquidity", function () {
    it("should return 80% of deposits as available", async function () {
      const depositAmount = 10n * 10n ** 6n; 

      await usdc.connect(deployer).approve(await vault.getAddress(), depositAmount);
      await vault.connect(deployer).deposit(depositAmount, deployer.address);

      expect(await vault.availableLiquidity()).to.equal(8n * 10n ** 6n);
    });

    it("should decrease after allocation", async function () {
      const depositAmount = 10n * 10n ** 6n;

      await usdc.connect(deployer).approve(await vault.getAddress(), depositAmount);
      await vault.connect(deployer).deposit(depositAmount, deployer.address);

      const channelId = ethers.keccak256(ethers.toUtf8Bytes("channel-1"));
      await vault.connect(operator).allocateToChannel(channelId, 3n * 10n ** 6n);

      expect(await vault.availableLiquidity()).to.equal(5n * 10n ** 6n);
    });
  });

  describe("Admin Functions", function () {
    it("should allow owner to change operator", async function () {
      await vault.connect(owner).setOperator(deployer.address);
      expect(await vault.operator()).to.equal(deployer.address);
    });

    it("should emit OperatorUpdated", async function () {
      await expect(vault.connect(owner).setOperator(deployer.address))
        .to.emit(vault, "OperatorUpdated")
        .withArgs(operator.address, deployer.address);
    });

    it("should allow owner to set max per channel", async function () {
      const maxPerChannel = 5n * 10n ** 6n;
      await vault.connect(owner).setMaxPerChannel(maxPerChannel);
      expect(await vault.maxPerChannel()).to.equal(maxPerChannel);
    });

    it("should enforce max per channel", async function () {
      const depositAmount = 10n * 10n ** 6n;

      await usdc.connect(deployer).approve(await vault.getAddress(), depositAmount);
      await vault.connect(deployer).deposit(depositAmount, deployer.address);

      await vault.connect(owner).setMaxPerChannel(2n * 10n ** 6n);

      const channelId = ethers.keccak256(ethers.toUtf8Bytes("channel-1"));
      await expect(
        vault.connect(operator).allocateToChannel(channelId, 3n * 10n ** 6n)
      ).to.be.revertedWithCustomError(vault, "ExceedsMaxPerChannel");
    });

    it("should allow owner to change max allocation percent", async function () {
      await vault.connect(owner).setMaxAllocationPercent(5000); // 50%
      expect(await vault.maxAllocationPercent()).to.equal(5000n);
    });

    it("should reject invalid percent", async function () {
      await expect(
        vault.connect(owner).setMaxAllocationPercent(10001)
      ).to.be.revertedWithCustomError(vault, "InvalidPercent");
    });

    it("should not allow non-owner to change settings", async function () {
      await expect(
        vault.connect(deployer).setOperator(deployer.address)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });
  });
});
