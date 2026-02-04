// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {HouseVault} from "../src/HouseVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title DeployHouseVault
/// @notice Deploys HouseVault with real USDH on Sepolia
/// @dev Uses existing Nitrolite infrastructure (custody, broker, USDH)
contract DeployHouseVaultScript is Script {
    // Sepolia addresses
    address constant USDH = 0x25FfCCE632a03898c2ecB0EF9bb6a86177a363Ed;
    address constant CUSTODY = 0xEC94b4039237ac9490377FDB8A65e884eD6154A0;
    address constant BROKER = 0x1F0335E50059099C6b10420a9B6c27E8A8261359;

    function setUp() public {}

    function run() public {
        uint256 deployerPk = vm.envUint("DEPLOYER_PK");
        address deployer = vm.addr(deployerPk);

        console.log("=== Deploying HouseVault ===");
        console.log("Deployer:", deployer);
        console.log("USDH:", USDH);
        console.log("Custody:", CUSTODY);
        console.log("Broker:", BROKER);

        // check deployer USDH balance
        uint256 usdhBalance = IERC20(USDH).balanceOf(deployer);
        console.log("Deployer USDH balance:", usdhBalance);

        vm.startBroadcast(deployerPk);

        // Deploy HouseVault
        HouseVault vault = new HouseVault(
            IERC20(USDH),
            deployer,
            address(0), // no legacy escrow
            CUSTODY,
            BROKER
        );

        console.log("");
        console.log("=== Deployed ===");
        console.log("HouseVault:", address(vault));

        vm.stopBroadcast();

        console.log("");
        console.log("Next steps:");
        console.log("1. Deposit USDH to vault as LP: vault.deposit(amount, receiver)");
        console.log("2. Fund house in custody: vault.depositToHouse(amount)");
        console.log("3. Run death-game.ts with USE_PRODUCTION=true");
    }
}
