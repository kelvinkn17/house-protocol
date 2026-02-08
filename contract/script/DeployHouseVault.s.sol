// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {HouseVault} from "../src/HouseVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ICustody} from "../src/interfaces/ICustody.sol";

/// @title DeployHouseVault
/// @notice Deploys HouseVault with real USDH on Sepolia
/// @dev Uses existing Nitrolite infrastructure (custody, USDH)
contract DeployHouseVaultScript is Script {
    // Sepolia addresses
    address constant USDH = 0x25FfCCE632a03898c2ecB0EF9bb6a86177a363Ed;
    address constant CUSTODY = 0xEC94b4039237ac9490377FDB8A65e884eD6154A0;

    function setUp() public {}

    function run() public {
        uint256 deployerPk = vm.envUint("DEPLOYER_PK");
        address deployer = vm.addr(deployerPk);
        address operator = 0x7952a3087B0f48F427CcA652fe0EEf1a2d516A62;

        console.log("=== Deploying HouseVault ===");
        console.log("Deployer:", deployer);
        console.log("USDH:", USDH);
        console.log("Custody:", CUSTODY);
        console.log("Operator:", operator);

        // check deployer USDH balance
        uint256 usdhBalance = IERC20(USDH).balanceOf(deployer);
        console.log("Deployer USDH balance:", usdhBalance);

        vm.startBroadcast(deployerPk);

        HouseVault vault = HouseVault(
            0x4ce1DE2054da21DB659a90E04aee1f599e3027cE
        );
        console.log("Onchain operator", vault.operator());

        // // Deploy HouseVault (deployer is also operator for now)
        // HouseVault vault = new HouseVault(
        //     IERC20(USDH),
        //     deployer,
        //     CUSTODY,
        //     operator
        // );

        // console.log("");
        // console.log("=== Deployed ===");
        // console.log("HouseVault:", address(vault));

        // console.log("");
        // console.log(
        //     "1. Deposit USDH to vault as LP: vault.deposit(amount, receiver)"
        // );
        // // IERC20(USDH).approve(address(vault), 5000 * 10 ** 6);
        // vault.deposit(50 * 10 ** 6, deployer);
        // console.log(
        //     "Deposited USDH to vault, shares minted to deployer",
        //     vault.balanceOf(deployer)
        // );

        console.log("");
        console.log("2. Check vault:");
        console.log("   - total assets", vault.totalAssets());
        console.log("   - total supply", vault.totalSupply());
        console.log(
            "   - my share value",
            vault.convertToAssets(vault.balanceOf(deployer))
        );
        console.log(
            "   - share price",
            ((vault.totalAssets() * 10e18) / vault.totalSupply()) / 10e9
        );
        console.log("   - custody balance", vault.getCustodyBalance());
        console.log(
            "   - idle balance",
            IERC20(USDH).balanceOf(address(vault))
        );

        // console.log("");
        // console.log("3. Check player:");
        // address[] calldata accounts = new address[](1);
        // accounts[0] = deployer;
        // address[] calldata tokens = new address[](1);
        // tokens[0] = USDH;

        // ICustody(CUSTODY).getAccountsBalances(accounts, tokens);
        // console.log("   - custody balance", cbal);

        // console.log(
        //     "3. Transfer additional 100USDH and sweep, shares should worth more"
        // );
        // IERC20(USDH).transfer(address(vault), 100 * 10 ** 6);
        // console.log(
        //     "   - share value before sweep",
        //     vault.convertToAssets(vault.balanceOf(deployer))
        // );
        // vault.sweepToCustody();
        // console.log(
        //     "   - share value after sweep",
        //     vault.convertToAssets(vault.balanceOf(deployer))
        // );
        // console.log(
        //     "   - share price",
        //     ((vault.totalAssets() * 10e18) / vault.totalSupply()) / 10e6
        // );
        // console.log("   - custody", vault.getCustodyBalance());

        // console.log("4. Withdraw some shares:");
        // uint256 sharesToWithdraw = vault.balanceOf(deployer) / 2;
        // // operator withdraw from custody
        // vm.startBroadcast()

        // vault.redeem(sharesToWithdraw, deployer, deployer);
        // console.log(
        //     "   - shares withdrawn:",
        //     sharesToWithdraw,
        //     "remaining:",
        //     vault.balanceOf(deployer)
        // );
    }
}
