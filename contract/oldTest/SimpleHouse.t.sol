// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {HouseVault} from "../src/HouseVault.sol";
import {HouseEscrow} from "../src/HouseEscrow.sol";
import {MintableERC20} from "../src/MintableERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SimpleHouseTest is Test {
    MintableERC20 public usdc;
    HouseVault public vault;
    HouseEscrow public escrow;

    address owner = makeAddr("owner");
    address lp1 = makeAddr("lp1");
    address lp2 = makeAddr("lp2");
    address player = makeAddr("player");

    uint256 constant USDC_DECIMALS = 6;
    uint256 constant ONE_USDC = 10 ** USDC_DECIMALS;

    uint256 sessionNonce;

    /// @dev Helper to generate unique seed and session hash
    function _newSession(
        address _player
    ) internal returns (uint256 seed, bytes32 sessionHash) {
        seed = uint256(
            keccak256(
                abi.encodePacked(_player, block.timestamp, sessionNonce++)
            )
        );
        sessionHash = sha256(abi.encodePacked(seed, _player));
    }

    function setUp() public {
        // Deploy mock USDC
        usdc = new MintableERC20("USD Coin", "USDC", 6);

        // Deploy vault (escrow placeholder for now)
        // Using dummy addresses for custody/broker since these tests focus on escrow flow
        address dummyCustody = address(0xdead);
        address dummyBroker = address(0xbeef);
        vm.startPrank(owner);
        vault = new HouseVault(
            IERC20(address(usdc)),
            owner,
            address(0), // escrow set after
            dummyCustody,
            dummyBroker
        );

        // Deploy escrow
        escrow = new HouseEscrow(address(usdc), address(vault), owner);

        // Link vault to escrow
        vault.setEscrow(address(escrow));
        vm.stopPrank();

        // Mint USDC to participants
        usdc.mint(lp1, 100_000 * ONE_USDC);
        usdc.mint(lp2, 100_000 * ONE_USDC);
        usdc.mint(player, 10_000 * ONE_USDC);

        // LPs approve vault
        vm.prank(lp1);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(lp2);
        usdc.approve(address(vault), type(uint256).max);

        // Player approves escrow
        vm.prank(player);
        usdc.approve(address(escrow), type(uint256).max);
    }

    // ==================== Basic Win/Lose Tests ====================

    function test_PlayerWins() public {
        console.log("=== TEST: Player Wins ===");

        // LP1 deposits liquidity
        vm.prank(lp1);
        vault.deposit(10_000 * ONE_USDC, lp1);
        console.log("LP1 deposited: 10,000 USDC");
        console.log("Vault total assets:", vault.totalAssets());

        uint256 playerBalanceBefore = usdc.balanceOf(player);
        uint256 vaultBalanceBefore = vault.totalAssets();
        console.log("Player balance before:", playerBalanceBefore);

        // Open session with 100 USDC
        (uint256 seed, bytes32 sessionHash) = _newSession(player);
        vm.prank(owner);
        escrow.openSession(sessionHash, player, 100 * ONE_USDC);
        console.log("Session opened with 100 USDC");
        console.log("Session hash:", uint256(sessionHash));
        console.log(
            "Player balance after opening session:",
            usdc.balanceOf(player)
        );

        // Close session - player won, final balance is 150 (50 profit)
        // Reveals seed for provably fair verification
        vm.prank(owner);
        escrow.closeSession(seed, player, 150 * ONE_USDC);
        console.log("Session closed with final balance: 150 USDC (50 profit)");
        console.log("Seed revealed:", seed);

        uint256 playerBalanceAfter = usdc.balanceOf(player);
        uint256 vaultBalanceAfter = vault.totalAssets();

        console.log("Player balance after:", playerBalanceAfter);
        console.log(
            "Player profit:",
            playerBalanceAfter - playerBalanceBefore + 100 * ONE_USDC
        );
        console.log("Vault balance before:", vaultBalanceBefore);
        console.log("Vault balance after:", vaultBalanceAfter);
        console.log("Vault loss:", vaultBalanceBefore - vaultBalanceAfter);

        // Player should have gained 50 USDC
        assertEq(
            playerBalanceAfter,
            playerBalanceBefore + 50 * ONE_USDC,
            "Player should profit 50 USDC"
        );

        // Vault should have lost 50 USDC
        assertEq(
            vaultBalanceAfter,
            vaultBalanceBefore - 50 * ONE_USDC,
            "Vault should lose 50 USDC"
        );
    }

    function test_PlayerLoses() public {
        console.log("=== TEST: Player Loses ===");

        // LP1 deposits liquidity
        vm.prank(lp1);
        vault.deposit(10_000 * ONE_USDC, lp1);
        console.log("LP1 deposited: 10,000 USDC");
        console.log("Vault total assets:", vault.totalAssets());

        uint256 playerBalanceBefore = usdc.balanceOf(player);
        uint256 vaultBalanceBefore = vault.totalAssets();
        console.log("Player balance before:", playerBalanceBefore);

        // Open session with 100 USDC
        (uint256 seed, bytes32 sessionHash) = _newSession(player);
        vm.prank(owner);
        escrow.openSession(sessionHash, player, 100 * ONE_USDC);
        console.log("Session opened with 100 USDC");

        // Close session - player lost, final balance is 30 (70 loss)
        vm.prank(owner);
        escrow.closeSession(seed, player, 30 * ONE_USDC);
        console.log("Session closed with final balance: 30 USDC (70 loss)");

        uint256 playerBalanceAfter = usdc.balanceOf(player);
        uint256 vaultBalanceAfter = vault.totalAssets();

        console.log("Player balance after:", playerBalanceAfter);
        console.log("Player loss:", playerBalanceBefore - playerBalanceAfter);
        console.log("Vault balance before:", vaultBalanceBefore);
        console.log("Vault balance after:", vaultBalanceAfter);
        console.log("Vault gain:", vaultBalanceAfter - vaultBalanceBefore);

        // Player should have lost 70 USDC
        assertEq(
            playerBalanceAfter,
            playerBalanceBefore - 70 * ONE_USDC,
            "Player should lose 70 USDC"
        );

        // Vault should have gained 70 USDC
        assertEq(
            vaultBalanceAfter,
            vaultBalanceBefore + 70 * ONE_USDC,
            "Vault should gain 70 USDC"
        );
    }

    function test_PlayerLosesAll() public {
        console.log("=== TEST: Player Loses All ===");

        // LP1 deposits liquidity
        vm.prank(lp1);
        vault.deposit(10_000 * ONE_USDC, lp1);
        console.log("LP1 deposited: 10,000 USDC");
        console.log("Vault total assets:", vault.totalAssets());

        uint256 playerBalanceBefore = usdc.balanceOf(player);
        uint256 vaultBalanceBefore = vault.totalAssets();
        console.log("Player balance before:", playerBalanceBefore);

        // Open session with 100 USDC
        (uint256 seed, bytes32 sessionHash) = _newSession(player);
        vm.prank(owner);
        escrow.openSession(sessionHash, player, 100 * ONE_USDC);
        console.log("Session opened with 100 USDC");

        // Close session - player lost everything
        vm.prank(owner);
        escrow.closeSession(seed, player, 0);
        console.log("Session closed with final balance: 0 USDC (total loss)");

        uint256 playerBalanceAfter = usdc.balanceOf(player);
        uint256 vaultBalanceAfter = vault.totalAssets();

        console.log("Player balance after:", playerBalanceAfter);
        console.log(
            "Player total loss:",
            playerBalanceBefore - playerBalanceAfter
        );
        console.log("Vault balance before:", vaultBalanceBefore);
        console.log("Vault balance after:", vaultBalanceAfter);
        console.log("Vault gain:", vaultBalanceAfter - vaultBalanceBefore);

        // Player should have lost 100 USDC
        assertEq(
            playerBalanceAfter,
            playerBalanceBefore - 100 * ONE_USDC,
            "Player should lose all 100 USDC"
        );

        // Vault should have gained 100 USDC
        assertEq(
            vaultBalanceAfter,
            vaultBalanceBefore + 100 * ONE_USDC,
            "Vault should gain 100 USDC"
        );
    }

    function test_BreakEven() public {
        console.log("=== TEST: Break Even ===");

        // LP1 deposits liquidity
        vm.prank(lp1);
        vault.deposit(10_000 * ONE_USDC, lp1);
        console.log("LP1 deposited: 10,000 USDC");
        console.log("Vault total assets:", vault.totalAssets());

        uint256 playerBalanceBefore = usdc.balanceOf(player);
        uint256 vaultBalanceBefore = vault.totalAssets();
        console.log("Player balance before:", playerBalanceBefore);

        // Open session with 100 USDC
        (uint256 seed, bytes32 sessionHash) = _newSession(player);
        vm.prank(owner);
        escrow.openSession(sessionHash, player, 100 * ONE_USDC);
        console.log("Session opened with 100 USDC");

        // Close session - break even
        vm.prank(owner);
        escrow.closeSession(seed, player, 100 * ONE_USDC);
        console.log("Session closed with final balance: 100 USDC (break even)");

        uint256 playerBalanceAfter = usdc.balanceOf(player);
        uint256 vaultBalanceAfter = vault.totalAssets();

        console.log("Player balance after:", playerBalanceAfter);
        console.log(
            "Player net change:",
            int256(playerBalanceAfter) - int256(playerBalanceBefore)
        );
        console.log("Vault balance before:", vaultBalanceBefore);
        console.log("Vault balance after:", vaultBalanceAfter);
        console.log(
            "Vault net change:",
            int256(vaultBalanceAfter) - int256(vaultBalanceBefore)
        );

        // No change for either party
        assertEq(
            playerBalanceAfter,
            playerBalanceBefore,
            "Player balance unchanged"
        );
        assertEq(
            vaultBalanceAfter,
            vaultBalanceBefore,
            "Vault balance unchanged"
        );
    }

    // ==================== First Deposit Exploit Test ====================

    function test_FirstDepositExploit_Mitigated() public {
        console.log("=== TEST: First Deposit Exploit (Mitigated) ===");
        console.log("Classic ERC4626 first depositor attack attempt:");

        // Classic ERC4626 first depositor attack:
        // 1. Attacker deposits 1 wei, gets 1000 shares because decimals offset
        // 2. Attacker donates large amount directly to vault
        // 3. Victim deposits, but due to rounding, gets 0 shares
        // 4. Attacker redeems and takes victim's funds

        address attacker = makeAddr("attacker");
        address victim = makeAddr("victim");

        usdc.mint(attacker, 10_000 * ONE_USDC);
        usdc.mint(victim, 1_000 * ONE_USDC);

        vm.prank(attacker);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(victim);
        usdc.approve(address(vault), type(uint256).max);

        console.log("");
        console.log("Step 1: Attacker deposits minimal amount (1 wei)");
        // Step 1: Attacker deposits minimal amount
        vm.prank(attacker);
        uint256 attackerShares = vault.deposit(1, attacker);
        console.log("  Attacker deposited: 1 wei");
        console.log("  Attacker shares received:", attackerShares);
        console.log("  Vault total supply:", vault.totalSupply());
        console.log("  Vault total assets:", vault.totalAssets());

        console.log("");
        console.log("Step 2: Attacker donates 1000 USDC directly to vault");
        // Step 2: Attacker "donates" directly to vault to inflate share price
        vm.prank(attacker);
        usdc.transfer(address(vault), 1000 * ONE_USDC);
        console.log(
            "  Vault total assets after donation:",
            vault.totalAssets()
        );
        console.log("  Share price inflated!");
        console.log(
            "  Assets per share:",
            (vault.totalAssets() * 1e18) / vault.totalSupply()
        );

        console.log("");
        console.log("Step 3: Victim deposits 500 USDC");
        // Step 3: Victim deposits
        vm.prank(victim);
        uint256 victimShares = vault.deposit(500 * ONE_USDC, victim);
        console.log("  Victim deposited: 500 USDC");
        console.log("  Victim shares received:", victimShares);
        console.log("  Vault total supply:", vault.totalSupply());
        console.log("  Vault total assets:", vault.totalAssets());

        // With _decimalsOffset() = 3, victim should still get shares
        // The virtual shares/assets prevent the rounding attack
        assertGt(
            victimShares,
            0,
            "Victim should receive shares (attack mitigated)"
        );

        console.log("");
        console.log("Step 4: Check what victim can redeem");
        // Step 4: Check victim can redeem reasonable value
        uint256 victimRedeemable = vault.previewRedeem(victimShares);
        uint256 attackerRedeemable = vault.previewRedeem(attackerShares);
        console.log("  Victim can redeem:", victimRedeemable);
        console.log("  Attacker can redeem:", attackerRedeemable);
        console.log(
            "  Victim loss (if any):",
            500 * ONE_USDC > victimRedeemable
                ? 500 * ONE_USDC - victimRedeemable
                : 0
        );

        console.log("");
        console.log("Result: Attack mitigated by _decimalsOffset() = 3");
        console.log("  Virtual shares prevent rounding exploit");

        // Victim should get back most of their deposit (some loss due to attacker's donation is expected but not total loss)
        assertGt(
            victimRedeemable,
            400 * ONE_USDC,
            "Victim should redeem at least 80% of deposit"
        );
    }

    // ==================== Deposit Before Big Win/Loss Tests ====================

    function test_DepositBeforeBigPlayerWin_DilutionRisk() public {
        console.log(
            "=== TEST: Deposit Before Big Player Win (Dilution Risk) ==="
        );
        console.log(
            "Scenario: LP2 front-runs settlement to dilute LP1's loss exposure"
        );
        console.log("");

        // Scenario: LP1 deposits, player opens session
        // LP2 deposits right before player wins big
        // LP2 dilutes LP1's exposure but also shares the loss

        // LP1 deposits first
        vm.prank(lp1);
        vault.deposit(10_000 * ONE_USDC, lp1);
        uint256 lp1SharesBefore = vault.balanceOf(lp1);
        console.log("Step 1: LP1 deposits 10,000 USDC");
        console.log("  LP1 shares:", lp1SharesBefore);
        console.log("  Vault total assets:", vault.totalAssets());

        // Player opens session with 1000 USDC
        (uint256 seed, bytes32 sessionHash) = _newSession(player);
        vm.prank(owner);
        escrow.openSession(sessionHash, player, 1000 * ONE_USDC);
        console.log("");
        console.log("Step 2: Player opens session with 1,000 USDC");
        console.log("  LP1 is now exposed to potential 1,000 USDC loss");

        // Snapshot vault state before LP2 joins
        uint256 vaultAssetsBefore = vault.totalAssets();

        // LP2 deposits right before settlement (front-running scenario)
        vm.prank(lp2);
        vault.deposit(10_000 * ONE_USDC, lp2);
        uint256 lp2Shares = vault.balanceOf(lp2);
        console.log("");
        console.log("Step 3: LP2 front-runs and deposits 10,000 USDC");
        console.log("  LP2 shares:", lp2Shares);
        console.log("  Vault total assets:", vault.totalAssets());
        console.log("  LP2 now shares LP1's risk exposure!");

        // Player wins big: 1000 -> 2000 (1000 profit from vault)
        vm.prank(owner);
        escrow.closeSession(seed, player, 2000 * ONE_USDC);
        console.log("");
        console.log("Step 4: Player wins big (1000 -> 2000 USDC)");
        console.log("  Player profit: 1,000 USDC (paid by vault)");

        uint256 vaultAssetsAfter = vault.totalAssets();
        uint256 loss = vaultAssetsBefore + 10_000 * ONE_USDC - vaultAssetsAfter; // Expected 1000 USDC loss

        console.log("");
        console.log("=== RESULTS ===");
        console.log("Vault total loss:", loss);

        // Calculate each LP's share of assets
        uint256 lp1Value = vault.previewRedeem(lp1SharesBefore);
        uint256 lp2Value = vault.previewRedeem(lp2Shares);

        console.log("");
        console.log("LP1: deposited 10,000 USDC, now worth:", lp1Value);
        console.log("LP2: deposited 10,000 USDC, now worth:", lp2Value);

        // Both LPs should share the loss proportionally
        // LP2 joined after exposure was already taken, but shares loss
        // This demonstrates the dilution effect on LP1's perspective
        assertLt(lp1Value, 10_000 * ONE_USDC, "LP1 should have loss");
        assertLt(lp2Value, 10_000 * ONE_USDC, "LP2 should also share loss");

        // The loss should be split roughly 50/50 since equal deposits
        uint256 lp1Loss = 10_000 * ONE_USDC - lp1Value;
        uint256 lp2Loss = 10_000 * ONE_USDC - lp2Value;
        console.log("");
        console.log("LP1 loss:", lp1Loss);
        console.log("LP2 loss:", lp2Loss);
        console.log("");
        console.log("FINDING: LP2 shared loss that LP1 was fully exposed to");
        console.log("  Without LP2: LP1 would lose ~1000 USDC");
        console.log("  With LP2: Each LP loses ~500 USDC");
        console.log("  LP1's loss was diluted by LP2's deposit");

        // LP2 essentially "shared" the loss that LP1 was fully exposed to
        // This could be seen as unfair to LP1 who took on the risk
        assertApproxEqRel(
            lp1Loss,
            lp2Loss,
            0.01e18,
            "Losses should be roughly equal"
        );
    }

    function test_DepositBeforeBigHouseWin_ProfitDilution() public {
        console.log(
            "=== TEST: Deposit Before Big House Win (Profit Dilution) ==="
        );
        console.log(
            "Scenario: LP2 front-runs settlement to share LP1's profit"
        );
        console.log("");

        // Scenario: LP1 deposits, player opens session
        // LP2 deposits right before house wins big
        // LP2 shares the profit without taking the initial risk

        // LP1 deposits first
        vm.prank(lp1);
        vault.deposit(10_000 * ONE_USDC, lp1);
        uint256 lp1SharesBefore = vault.balanceOf(lp1);
        console.log("Step 1: LP1 deposits 10,000 USDC");
        console.log("  LP1 shares:", lp1SharesBefore);
        console.log("  Vault total assets:", vault.totalAssets());

        // Player opens session with 1000 USDC
        (uint256 seed, bytes32 sessionHash) = _newSession(player);
        vm.prank(owner);
        escrow.openSession(sessionHash, player, 1000 * ONE_USDC);
        console.log("");
        console.log("Step 2: Player opens session with 1,000 USDC");
        console.log("  LP1 takes on risk, but also potential reward");

        // Snapshot vault state before LP2 joins
        uint256 vaultAssetsBefore = vault.totalAssets();

        // LP2 deposits right before settlement (front-running scenario)
        vm.prank(lp2);
        vault.deposit(10_000 * ONE_USDC, lp2);
        uint256 lp2Shares = vault.balanceOf(lp2);
        console.log("");
        console.log("Step 3: LP2 front-runs and deposits 10,000 USDC");
        console.log("  LP2 shares:", lp2Shares);
        console.log("  Vault total assets:", vault.totalAssets());
        console.log("  LP2 will share profits without taking initial risk!");

        // House wins big: player loses everything (1000 -> 0)
        vm.prank(owner);
        escrow.closeSession(seed, player, 0);
        console.log("");
        console.log("Step 4: House wins big (player loses all 1000 USDC)");
        console.log("  Vault receives: 1,000 USDC from player loss");

        uint256 vaultAssetsAfter = vault.totalAssets();
        uint256 gain = vaultAssetsAfter -
            (vaultAssetsBefore + 10_000 * ONE_USDC); // Expected 1000 USDC gain

        console.log("");
        console.log("=== RESULTS ===");
        console.log("Vault total gain:", gain);

        // Calculate each LP's share of assets
        uint256 lp1Value = vault.previewRedeem(lp1SharesBefore);
        uint256 lp2Value = vault.previewRedeem(lp2Shares);

        console.log("");
        console.log("LP1: deposited 10,000 USDC, now worth:", lp1Value);
        console.log("LP2: deposited 10,000 USDC, now worth:", lp2Value);

        // Both LPs should share the profit proportionally
        assertGt(lp1Value, 10_000 * ONE_USDC, "LP1 should have profit");
        assertGt(lp2Value, 10_000 * ONE_USDC, "LP2 should also share profit");

        // The profit should be split roughly 50/50
        uint256 lp1Profit = lp1Value - 10_000 * ONE_USDC;
        uint256 lp2Profit = lp2Value - 10_000 * ONE_USDC;
        console.log("");
        console.log("LP1 profit:", lp1Profit);
        console.log("LP2 profit:", lp2Profit);
        console.log("");
        console.log("FINDING: LP2 gets profit without taking initial risk");
        console.log("  Without LP2: LP1 would profit ~1000 USDC");
        console.log("  With LP2: Each LP profits ~500 USDC");
        console.log("  This is the 'free rider' problem");

        // LP2 gets ~equal profit despite taking no initial risk
        // This is the "free rider" problem
        assertApproxEqRel(
            lp1Profit,
            lp2Profit,
            0.01e18,
            "Profits should be roughly equal"
        );
    }

    function test_WithdrawBeforeBigLoss_ExitLiquidity() public {
        console.log("=== TEST: Withdraw Before Big Loss (Exit Liquidity) ===");
        console.log(
            "Scenario: LP2 front-runs to exit before loss, LP1 absorbs all"
        );
        console.log("");

        // Scenario: Both LPs deposit, player opens session
        // LP2 withdraws right before house loses
        // LP2 exits before the loss, leaving LP1 to absorb more

        // Both LPs deposit
        vm.prank(lp1);
        vault.deposit(10_000 * ONE_USDC, lp1);
        vm.prank(lp2);
        vault.deposit(10_000 * ONE_USDC, lp2);

        uint256 lp1SharesBefore = vault.balanceOf(lp1);
        uint256 lp2SharesBefore = vault.balanceOf(lp2);

        console.log("Step 1: Both LPs deposit 10,000 USDC each");
        console.log("  LP1 shares:", lp1SharesBefore);
        console.log("  LP2 shares:", lp2SharesBefore);
        console.log("  Vault total assets:", vault.totalAssets());

        // Player opens session with 1000 USDC
        (uint256 seed, bytes32 sessionHash) = _newSession(player);
        vm.prank(owner);
        escrow.openSession(sessionHash, player, 1000 * ONE_USDC);
        console.log("");
        console.log("Step 2: Player opens session with 1,000 USDC");
        console.log("  Both LPs share the risk exposure");

        // LP2 withdraws before settlement (front-running exit)
        vm.prank(lp2);
        uint256 lp2Withdrawn = vault.redeem(lp2SharesBefore, lp2, lp2);
        console.log("");
        console.log("Step 3: LP2 front-runs and withdraws everything");
        console.log("  LP2 withdrew:", lp2Withdrawn);
        console.log(
            "  Vault total assets after withdrawal:",
            vault.totalAssets()
        );
        console.log("  LP1 is now ALONE bearing all the risk!");

        // Player wins: 1000 -> 2000 (1000 profit)
        vm.prank(owner);
        escrow.closeSession(seed, player, 2000 * ONE_USDC);
        console.log("");
        console.log("Step 4: Player wins big (1000 -> 2000 USDC)");
        console.log("  Player profit: 1,000 USDC (paid by vault)");

        // LP1 bears the entire loss now
        uint256 lp1Value = vault.previewRedeem(lp1SharesBefore);

        console.log("");
        console.log("=== RESULTS ===");
        console.log("LP2 escaped with:", lp2Withdrawn);
        console.log("LP2 profit/loss: 0 (got out clean)");
        console.log("");
        console.log("LP1: deposited 10,000 USDC, now worth:", lp1Value);

        // LP1 should bear the full 1000 USDC loss
        uint256 lp1Loss = 10_000 * ONE_USDC - lp1Value;
        console.log("LP1 loss:", lp1Loss);
        console.log("");
        console.log("FINDING: LP2 escaped, LP1 bears the entire loss");
        console.log("  If LP2 stayed: Each would lose ~500 USDC");
        console.log("  LP2 left: LP1 loses full ~1000 USDC");
        console.log("  LP1 became exit liquidity for LP2");

        // LP2 got out clean with their deposit
        assertApproxEqRel(
            lp2Withdrawn,
            10_000 * ONE_USDC,
            0.01e18,
            "LP2 withdrew full amount"
        );

        // LP1 bears the loss that would have been shared
        assertApproxEqRel(
            lp1Loss,
            1000 * ONE_USDC,
            0.01e18,
            "LP1 bears full loss"
        );
    }

    // ==================== Provably Fair Seed Verification Test ====================

    function test_ProvablyFair_SeedHashVerification() public {
        console.log("=== TEST: Provably Fair Seed/Hash Verification ===");
        console.log(
            "Verifying that sha256(seed, player) produces correct sessionHash"
        );
        console.log("");

        // LP deposits liquidity
        vm.prank(lp1);
        vault.deposit(10_000 * ONE_USDC, lp1);

        // Step 1: Generate seed off-chain (simulated here)
        uint256 seed = 123456789012345678901234567890; // Large random number
        console.log("Step 1: Generate seed off-chain");
        console.log("  Seed:", seed);

        // Step 2: Compute sessionHash off-chain using sha256(seed, player)
        bytes32 sessionHashOffchain = sha256(abi.encodePacked(seed, player));
        console.log("");
        console.log("Step 2: Compute sessionHash off-chain");
        console.log("  sessionHash = sha256(seed, player)");
        console.log("  sessionHash:", uint256(sessionHashOffchain));

        // Step 3: Verify contract computes same hash
        bytes32 sessionHashOnchain = escrow.computeSessionHash(seed, player);
        console.log("");
        console.log("Step 3: Verify contract computes same hash");
        console.log("  Contract computed:", uint256(sessionHashOnchain));
        assertEq(
            sessionHashOffchain,
            sessionHashOnchain,
            "Off-chain and on-chain hash should match"
        );
        console.log("  MATCH!");

        // Step 4: Open session with the committed hash
        console.log("");
        console.log("Step 4: Open session with committed sessionHash");
        vm.prank(owner);
        escrow.openSession(sessionHashOffchain, player, 100 * ONE_USDC);
        console.log("  Session opened successfully");
        console.log("  Stored sessionHash:", uint256(escrow.sessions(player)));
        assertEq(
            escrow.sessions(player),
            sessionHashOffchain,
            "Stored hash should match"
        );

        // Step 5: Close session by revealing seed
        console.log("");
        console.log("Step 5: Close session by revealing seed");
        console.log("  Revealing seed:", seed);
        uint256 playerBalanceBefore = usdc.balanceOf(player);

        vm.prank(owner);
        escrow.closeSession(seed, player, 120 * ONE_USDC); // Player won 20 USDC

        uint256 playerBalanceAfter = usdc.balanceOf(player);
        console.log("  Session closed successfully!");
        console.log(
            "  Player profit:",
            playerBalanceAfter - playerBalanceBefore + 100 * ONE_USDC
        );

        // Step 6: Verify session is cleared
        console.log("");
        console.log("Step 6: Verify session cleared");
        assertEq(
            escrow.sessions(player),
            bytes32(0),
            "Session should be cleared"
        );
        console.log("  Session cleared: true");

        console.log("");
        console.log("=== VERIFICATION COMPLETE ===");
        console.log("The provably fair mechanism works correctly:");
        console.log("  1. Backend commits hash upfront (cannot change seed)");
        console.log("  2. On close, seed is revealed for verification");
        console.log(
            "  3. Player can verify: sha256(seed, player) == committedHash"
        );
        console.log("  4. Player can then verify all game outcomes using seed");
    }

    function test_ProvablyFair_InvalidSeedReverts() public {
        console.log("=== TEST: Invalid Seed Reverts ===");
        console.log("");

        // LP deposits liquidity
        vm.prank(lp1);
        vault.deposit(10_000 * ONE_USDC, lp1);

        // Generate correct seed and hash
        uint256 correctSeed = 999888777666555444333222111;
        bytes32 sessionHash = sha256(abi.encodePacked(correctSeed, player));

        console.log("Correct seed:", correctSeed);
        console.log("Session hash:", uint256(sessionHash));

        // Open session
        vm.prank(owner);
        escrow.openSession(sessionHash, player, 100 * ONE_USDC);
        console.log("Session opened with correct hash");

        // Try to close with wrong seed
        uint256 wrongSeed = 111222333444555666777888999;
        console.log("");
        console.log("Attempting to close with wrong seed:", wrongSeed);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSignature("InvalidSeed()"));
        escrow.closeSession(wrongSeed, player, 100 * ONE_USDC);

        console.log("  Reverted with InvalidSeed() as expected!");
        console.log("");
        console.log("=== SECURITY CHECK PASSED ===");
        console.log("Backend cannot use different seed than committed");
    }
}
