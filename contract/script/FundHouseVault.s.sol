// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {HouseVault} from "../src/HouseVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title FundHouseVault
/// @notice Deposits USDH from vault to custody for broker's ledger balance
/// @dev Run after vault has LP deposits. Broker uses these funds for state channel games.
contract FundHouseVaultScript is Script {
    // deployed addresses on Sepolia
    address constant HOUSE_VAULT = address(0); // TODO: update after deploy
    address constant USDH = 0x25FfCCE632a03898c2ecB0EF9bb6a86177a363Ed;
    address constant CUSTODY = 0xEC94b4039237ac9490377FDB8A65e884eD6154A0;
    address constant BROKER = 0x1F0335E50059099C6b10420a9B6c27E8A8261359;

    function setUp() public {}

    function run() public {
        uint256 deployerPk = vm.envUint("DEPLOYER_PK");
        address deployer = vm.addr(deployerPk);

        console.log("Funding HouseVault");
        console.log("==================");
        console.log("Deployer:", deployer);
        console.log("Vault:", HOUSE_VAULT);
        console.log("Custody:", CUSTODY);
        console.log("Broker:", BROKER);

        HouseVault vault = HouseVault(HOUSE_VAULT);

        // check current state
        uint256 vaultBalance = IERC20(USDH).balanceOf(HOUSE_VAULT);
        uint256 currentCustodyBalance = vault.custodyBalance();
        uint256 totalAssets = vault.totalAssets();

        console.log("\nCurrent State:");
        console.log("  Vault USDH balance:", vaultBalance);
        console.log("  Custody balance (tracked):", currentCustodyBalance);
        console.log("  Total assets:", totalAssets);

        // how much to deposit (50% of vault balance)
        uint256 depositAmount = vaultBalance / 2;
        if (depositAmount == 0) {
            console.log("\nNo funds to deposit. Add LP deposits first.");
            return;
        }

        console.log("\nDepositing to custody:", depositAmount);

        vm.startBroadcast(deployerPk);

        // deposit to custody for broker
        vault.depositToHouse(depositAmount);

        vm.stopBroadcast();

        // verify
        uint256 newCustodyBalance = vault.custodyBalance();
        console.log("\nAfter deposit:");
        console.log("  Custody balance:", newCustodyBalance);
        console.log("  Available for risk:", vault.availableForRisk());
    }
}
