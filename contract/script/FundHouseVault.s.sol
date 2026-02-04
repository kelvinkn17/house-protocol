// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {HouseVault} from "../src/HouseVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title FundHouseVault
/// @notice Deposits USDH to vault as LP, then funds broker in custody
/// @dev Run after deploying HouseVault
contract FundHouseVaultScript is Script {
    // deployed addresses on Sepolia
    address constant HOUSE_VAULT = 0x6a309d4b666d6Eed842a81DA013441Db57607c4c;
    address constant USDH = 0x25FfCCE632a03898c2ecB0EF9bb6a86177a363Ed;
    address constant CUSTODY = 0xEC94b4039237ac9490377FDB8A65e884eD6154A0;
    address constant BROKER = 0x1F0335E50059099C6b10420a9B6c27E8A8261359;

    // how much to deposit as LP and to custody
    uint256 constant LP_DEPOSIT = 10_000e6; // 10,000 USDH
    uint256 constant CUSTODY_DEPOSIT = 5_000e6; // 5,000 USDH to custody

    function setUp() public {}

    function run() public {
        uint256 deployerPk = vm.envUint("DEPLOYER_PK");
        address deployer = vm.addr(deployerPk);

        console.log("=== Funding HouseVault ===");
        console.log("Deployer:", deployer);
        console.log("Vault:", HOUSE_VAULT);
        console.log("USDH:", USDH);

        HouseVault vault = HouseVault(HOUSE_VAULT);
        IERC20 usdh = IERC20(USDH);

        // check current state
        uint256 deployerUsdh = usdh.balanceOf(deployer);
        uint256 vaultBalance = usdh.balanceOf(HOUSE_VAULT);
        uint256 custodyBalance = vault.custodyBalance();

        console.log("");
        console.log("Current State:");
        console.log("  Deployer USDH:", deployerUsdh);
        console.log("  Vault USDH:", vaultBalance);
        console.log("  Custody balance:", custodyBalance);

        vm.startBroadcast(deployerPk);

        // Step 1: Approve vault to spend USDH
        console.log("");
        console.log("Step 1: Approve vault...");
        usdh.approve(HOUSE_VAULT, LP_DEPOSIT);

        // Step 2: Deposit as LP
        console.log("Step 2: Deposit", LP_DEPOSIT / 1e6, "USDH as LP...");
        uint256 shares = vault.deposit(LP_DEPOSIT, deployer);
        console.log("  Received shares:", shares);

        // Step 3: Fund broker in custody
        console.log("Step 3: Deposit", CUSTODY_DEPOSIT / 1e6, "USDH to custody for broker...");
        vault.depositToHouse(CUSTODY_DEPOSIT);

        vm.stopBroadcast();

        // verify
        console.log("");
        console.log("=== After Funding ===");
        console.log("  Vault total assets:", vault.totalAssets());
        console.log("  Custody balance:", vault.custodyBalance());
        console.log("  Available for risk:", vault.availableForRisk());
        console.log("  LP shares:", vault.balanceOf(deployer));
    }
}
