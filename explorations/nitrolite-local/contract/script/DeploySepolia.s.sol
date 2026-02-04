// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Script, console} from "forge-std/Script.sol";
import {USDH} from "../src/USDH.sol";
import {Custody} from "../src/Custody.sol";
import {Dummy} from "../src/adjudicators/Dummy.sol";

/// @title Deploy all contracts to Sepolia in one go
/// @notice Deploys USDH, Custody, and DummyAdjudicator
contract DeploySepoliaScript is Script {
    function run() public {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerKey);

        // deploy USDH token
        USDH usdh = new USDH();
        console.log("USDH deployed at:", address(usdh));

        // deploy Custody
        Custody custody = new Custody();
        console.log("Custody deployed at:", address(custody));

        // deploy DummyAdjudicator
        Dummy adjudicator = new Dummy();
        console.log("DummyAdjudicator deployed at:", address(adjudicator));

        vm.stopBroadcast();

        // summary
        console.log("");
        console.log("=== DEPLOYMENT SUMMARY ===");
        console.log("USDH_ADDRESS=%s", address(usdh));
        console.log("CUSTODY_ADDRESS=%s", address(custody));
        console.log("ADJUDICATOR_ADDRESS=%s", address(adjudicator));
    }
}
