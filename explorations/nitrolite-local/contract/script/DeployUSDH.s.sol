// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Script, console} from "forge-std/Script.sol";
import {USDH} from "../src/USDH.sol";

/// @title Deploy USDH token to Sepolia
/// @notice Simple deployment script using PRIVATE_KEY from env
contract DeployUSDHScript is Script {
    function run() public {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerKey);

        USDH usdh = new USDH();

        vm.stopBroadcast();

        console.log("Deployed USDH at:", address(usdh));
        console.log("Token name:", usdh.name());
        console.log("Token symbol:", usdh.symbol());
        console.log("Decimals:", usdh.decimals());
    }
}
