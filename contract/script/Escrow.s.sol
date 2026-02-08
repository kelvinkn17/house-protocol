// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {HouseSession} from "../src/HouseSession.sol";
import {ICustody} from "../src/interfaces/ICustody.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title EscrowScript
/// @notice Deploys HouseSession, player deposits to custody directly, opens a session
contract EscrowScript is Script {
    // Sepolia addresses
    address constant USDH = 0x25FfCCE632a03898c2ecB0EF9bb6a86177a363Ed;
    address constant CUSTODY = 0xEC94b4039237ac9490377FDB8A65e884eD6154A0;

    function setUp() public {}

    function run() public {
        uint256 deployerPk = vm.envUint("DEPLOYER_PK");
        address deployer = vm.addr(deployerPk);

        console.log("=== Deploy HouseSession ===");
        console.log("Deployer:", deployer);
        console.log("USDH:", USDH);
        console.log("Custody:", CUSTODY);

        uint256 usdhBalance = IERC20(USDH).balanceOf(deployer);
        console.log("Deployer USDH balance:", usdhBalance);

        vm.startBroadcast(deployerPk);

        // 1. Deploy HouseSession
        HouseSession session = new HouseSession(USDH, CUSTODY, deployer);
        console.log("HouseSession deployed to:", address(session));

        // // 2. Player deposits to custody directly (approve custody, then deposit)
        // uint256 depositAmount = 10 * 10 ** 6; // 10 USDH
        // console.log("");
        // console.log("=== Player Deposits to Custody ===");
        // console.log("Player:", deployer);
        // console.log("Amount:", depositAmount);

        // IERC20(USDH).approve(CUSTODY, depositAmount);
        // ICustody(CUSTODY).deposit(deployer, USDH, depositAmount);

        // // 3. Check player balance in custody via session contract
        // uint256 custodyBalance = session.getBalance(deployer);
        // console.log("Player custody balance:", custodyBalance);

        // // 4. Open a session (app commits a session hash before letting player play)
        // uint256 seed = 123456789;
        // bytes32 sessionHash = sha256(abi.encodePacked(seed, deployer));
        // console.log("");
        // console.log("=== Open Session ===");
        // session.openSession(sessionHash, deployer);
        // console.log("Session opened, hash:");
        // console.logBytes32(sessionHash);
        // console.log("sessionExists:", session.sessionExists(deployer));

        // // 5. Verify session (reveals seed, clears active session)
        // console.log("");
        // console.log("=== Verify Session ===");
        // session.verifySession(seed, deployer);
        // console.log("Session verified and closed.");
        // console.log("sessionExists:", session.sessionExists(deployer));

        vm.stopBroadcast();
    }
}
