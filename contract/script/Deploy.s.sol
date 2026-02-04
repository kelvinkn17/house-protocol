// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {HouseVault} from "../src/HouseVault.sol";
import {HouseEscrow} from "../src/HouseEscrow.sol";
import {MintableERC20} from "../src/MintableERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPk = vm.envUint("DEPLOYER_PK");
        address deployer = vm.addr(deployerPk);

        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerPk);

        // Deploy mock USDC
        MintableERC20 usdc = new MintableERC20("USD Coin", "USDC", 6);
        console.log("Mock USDC deployed to:", address(usdc));
        // Mint some USDC to deployer for testing
        usdc.mint(deployer, 1_000_000 * 10 ** 6);
        console.log(
            "Minted 1,000,000 USDC to deployer",
            usdc.balanceOf(deployer)
        );

        // Deploy HouseVault first with zero escrow (will set after)
        HouseVault vault = new HouseVault(
            IERC20(address(usdc)),
            deployer,
            address(0)
        );
        console.log("HouseVault deployed to:", address(vault));

        // Deploy HouseEscrow with vault address
        HouseEscrow escrow = new HouseEscrow(
            address(usdc),
            address(vault),
            deployer
        );
        console.log("HouseEscrow deployed to:", address(escrow));

        // Link escrow to vault
        vault.setEscrow(address(escrow));
        console.log("Escrow linked to vault");

        vm.stopBroadcast();
    }
}
