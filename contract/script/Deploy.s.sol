// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {HouseVault} from "../src/HouseVault.sol";
import {MintableERC20} from "../src/MintableERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPk = vm.envUint("DEPLOYER_PK");
        address deployer = vm.addr(deployerPk);

        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerPk);

        // // Deploy mock USDC
        // MintableERC20 usdc = new MintableERC20("USD Coin", "USDC", 6);
        // console.log("Mock USDC deployed to:", address(usdc));
        // // Mint some USDC to deployer for testing
        // usdc.mint(deployer, 1_000_000 * 10 ** 6);
        // console.log(
        //     "Minted 1,000,000 USDC to deployer",
        //     usdc.balanceOf(deployer)
        // );

        // Nitrolite custody on Sepolia
        address custody = 0xEC94b4039237ac9490377FDB8A65e884eD6154A0;
        IERC20 usdh = IERC20(0x25FfCCE632a03898c2ecB0EF9bb6a86177a363Ed);
        console.log("USDH balance of deployer:", usdh.balanceOf(deployer));

        // Deploy HouseVault
        HouseVault vault = new HouseVault(IERC20(usdh), deployer, custody);
        console.log("HouseVault deployed to:", address(vault));
        console.log("Custody:", custody);

        // deployer deposit and check shares and custody balance of vault
        usdh.approve(address(vault), 100 * 10 ** 6);
        uint256 shares = vault.deposit(100 * 10 ** 6, deployer);
        console.log("Deposited 100 USDH, received shares:", shares);
        console.log("Vault total assets:", vault.totalAssets());
        console.log("Custody balance of vault:", vault.getCustodyBalance());

        // depoloyer direct transfer to vault and sweep to custody
        usdh.transfer(address(vault), 50 * 10 ** 6);
        console.log("Transferred 50 USDH directly to vault");
        vault.sweepToCustody();
        console.log(
            "After sweeping 50 USDH, received shares:",
            vault.balanceOf(deployer) - shares
        );
        console.log("Vault total assets:", vault.totalAssets());
        console.log("Custody balance of vault:", vault.getCustodyBalance());

        vm.stopBroadcast();
    }
}
