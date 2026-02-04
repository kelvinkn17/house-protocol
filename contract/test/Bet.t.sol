// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {HouseVault} from "../src/HouseVault.sol";
import {HouseEscrow} from "../src/HouseEscrow.sol";
import {MintableERC20} from "../src/MintableERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BetTest is Test {
    MintableERC20 public usdc;
    HouseVault public vault;
    HouseEscrow public escrow;

    // 5 LPs and 5 Players
    address[] public lps;
    address[] public players;

    address public owner;

    uint256 constant INITIAL_BALANCE = 100_000e6; // 100k USDC (6 decimals)

    // Game constants
    uint8 constant MAX_DOUBLE_OR_NOTHING_STEPS = 5;
    uint8 constant MAX_DEATH_STEPS = 10;

    // Multipliers (stored as basis points, 10000 = 1.00x)
    uint256 constant RPS_WIN_MULT = 16700; // 1.67x
    uint256 constant COINFLIP_MULT = 19500; // 1.95x
    uint256 constant DON_MULT = 19500; // 1.95x per level

    // Death tile multipliers (basis points)
    uint256 constant DEATH_MULT_2_TILES = 19000; // 1.90x
    uint256 constant DEATH_MULT_3_TILES = 14300; // 1.43x
    uint256 constant DEATH_MULT_4_TILES = 12700; // 1.27x
    uint256 constant DEATH_MULT_5_TILES = 11900; // 1.19x
    uint256 constant DEATH_MULT_6_TILES = 11400; // 1.14x
    uint256 constant DEATH_MULT_7_TILES = 11100; // 1.11x

    // Session tracking (simulating offchain state)
    struct Session {
        uint256 seed;
        bytes32 sessionHash;
        uint256 balance; // current balance in session
        uint256 round; // current round/action number
        bool active;
    }

    mapping(address => Session) public sessions;

    // Events for logging game results
    event GameResult(
        address indexed player,
        string game,
        uint256 wager,
        bool won,
        uint256 payout,
        uint256 newBalance
    );

    function setUp() public {
        owner = address(this);

        // Deploy contracts
        // Using dummy addresses for custody/broker since these tests focus on escrow flow
        address dummyCustody = address(0xdead);
        address dummyBroker = address(0xbeef);
        usdc = new MintableERC20("USD Coin", "USDC", 6);
        vault = new HouseVault(
            IERC20(address(usdc)),
            owner,
            address(0), // escrow set after
            dummyCustody,
            dummyBroker
        );
        escrow = new HouseEscrow(address(usdc), address(vault), owner);
        vault.setEscrow(address(escrow));

        // Setup LPs
        for (uint256 i = 0; i < 5; i++) {
            address lp = makeAddr(
                string(abi.encodePacked("LP", vm.toString(i + 1)))
            );
            lps.push(lp);
            usdc.mint(lp, INITIAL_BALANCE);

            // LP deposits into vault
            vm.startPrank(lp);
            usdc.approve(address(vault), INITIAL_BALANCE);
            vault.deposit(INITIAL_BALANCE, lp);
            vm.stopPrank();

            console.log("LP%s deposited %s USDC", i + 1, INITIAL_BALANCE / 1e6);
        }

        // Setup Players
        for (uint256 i = 0; i < 5; i++) {
            address player = makeAddr(
                string(abi.encodePacked("Player", vm.toString(i + 1)))
            );
            players.push(player);
            usdc.mint(player, INITIAL_BALANCE);

            console.log(
                "Player%s funded with %s USDC",
                i + 1,
                INITIAL_BALANCE / 1e6
            );
        }

        console.log("\n=== Setup Complete ===");
        console.log("Vault Total Assets: %s USDC", vault.totalAssets() / 1e6);
        console.log("");
    }

    // ============ Session Management ============

    function _openSession(
        address player,
        uint256 topUpAmount
    ) internal returns (bytes32 sessionHash) {
        // Generate random seed (in real system this would be secure random)
        uint256 seed = uint256(
            keccak256(
                abi.encodePacked(block.timestamp, player, block.prevrandao)
            )
        );

        sessionHash = sha256(abi.encodePacked(seed, player));

        // Player approves and escrow locks funds
        vm.startPrank(player);
        usdc.approve(address(escrow), topUpAmount);
        vm.stopPrank();

        // Owner opens session (simulating backend)
        escrow.openSession(sessionHash, player, topUpAmount);

        // Track session locally
        sessions[player] = Session({
            seed: seed,
            sessionHash: sessionHash,
            balance: topUpAmount,
            round: 0,
            active: true
        });

        console.log("Session opened, locked: %s USDC", topUpAmount / 1e6);
        console.log("  Seed: %s", seed);
        console.logBytes32(sessionHash);
        return sessionHash;
    }

    function _closeSession(
        address player
    ) internal returns (uint256 finalBalance) {
        Session storage session = sessions[player];
        require(session.active, "No active session");

        finalBalance = session.balance;

        // Close session on escrow
        escrow.closeSession(session.seed, player, finalBalance);

        session.active = false;
        console.log(
            "Session closed, final balance: %s USDC",
            finalBalance / 1e6
        );

        return finalBalance;
    }

    // ============ Random Number Generation ============

    /// @notice Get random number for a specific round in a session
    function _getRandomForRound(address player) internal returns (uint256) {
        Session storage session = sessions[player];
        uint256 random = uint256(
            keccak256(abi.encodePacked(session.sessionHash, session.round))
        );
        console.log(random);
        session.round++;
        return random;
    }

    // ============ Game: Rock Paper Scissors ============
    // 0 = Rock, 1 = Paper, 2 = Scissors
    // Rock beats Scissors, Scissors beats Paper, Paper beats Rock
    // Multiplier: 1.67x on win, 1x on tie, 0x on loss
    // Max bet: 1% of house liquidity

    enum RPSChoice {
        Rock,
        Paper,
        Scissors
    }
    enum RPSResult {
        Win,
        Lose,
        Tie
    }

    function _playRPS(
        address player,
        uint256 wager,
        RPSChoice playerChoice
    ) internal returns (RPSResult result, uint256 payout) {
        console.log(
            "Playing RPS: Player chose %s",
            _rpsChoiceToString(playerChoice)
        );
        Session storage session = sessions[player];
        require(session.active, "No active session");
        require(session.balance >= wager, "Insufficient balance");

        uint256 random = _getRandomForRound(player);
        uint256 mod = random % 3;
        RPSChoice houseChoice = RPSChoice(mod);

        console.log(
            "RPS: rand%%3 = %s -> House: %s",
            mod,
            _rpsChoiceToString(houseChoice)
        );

        if (playerChoice == houseChoice) {
            result = RPSResult.Tie;
            payout = wager; // Return wager on tie (1x)
        } else if (
            (playerChoice == RPSChoice.Rock &&
                houseChoice == RPSChoice.Scissors) ||
            (playerChoice == RPSChoice.Paper &&
                houseChoice == RPSChoice.Rock) ||
            (playerChoice == RPSChoice.Scissors &&
                houseChoice == RPSChoice.Paper)
        ) {
            result = RPSResult.Win;
            payout = (wager * RPS_WIN_MULT) / 10000; // 1.67x multiplier
            session.balance = session.balance - wager + payout;
        } else {
            result = RPSResult.Lose;
            payout = 0;
            session.balance -= wager;
        }

        emit GameResult(
            player,
            "RPS",
            wager,
            result == RPSResult.Win,
            payout,
            session.balance
        );
        return (result, payout);
    }

    function _rpsChoiceToString(
        RPSChoice choice
    ) internal pure returns (string memory) {
        if (choice == RPSChoice.Rock) return "Rock";
        if (choice == RPSChoice.Paper) return "Paper";
        return "Scissors";
    }

    // ============ Game: Coinflip ============
    // 50% chance, 1.95x multiplier on win, 0x on loss
    // Max bet: 2% of house liquidity

    function _playCoinflip(
        address player,
        uint256 wager
    ) internal returns (bool won, uint256 payout) {
        console.log("Playing Coinflip...");
        Session storage session = sessions[player];
        require(session.active, "No active session");
        require(session.balance >= wager, "Insufficient balance");

        uint256 random = _getRandomForRound(player);
        uint256 mod = random % 2;
        won = mod == 0; // 50% chance

        console.log("Coinflip: rand%%2 = %s -> %s", mod, won ? "WIN" : "LOSE");

        if (won) {
            payout = (wager * COINFLIP_MULT) / 10000; // 1.95x
            session.balance = session.balance - wager + payout;
            console.log("  Payout: %s USDC (x1.95)", payout / 1e6);
        } else {
            payout = 0;
            session.balance -= wager;
        }

        emit GameResult(
            player,
            "Coinflip",
            wager,
            won,
            payout,
            session.balance
        );
        return (won, payout);
    }

    // ============ Game: Double or Nothing ============
    // 50% chance per level, 1.95x multiplier per level
    // Max 5 levels (up to 28.18x), can cash out anytime
    // Max bet: 0.5% of house liquidity (initial)
    // All 5 outcomes pre-determined at game start

    struct DoubleOrNothingMap {
        bool[5] outcomes; // true = win, false = lose for each level
    }

    struct DoubleOrNothingState {
        uint256 initialWager;
        uint256 currentMultiplier; // stored as basis points (10000 = 1.00x)
        uint8 step;
        bool active;
    }

    mapping(address => DoubleOrNothingState) public donState;
    mapping(address => DoubleOrNothingMap) internal donMaps;

    function _startDoubleOrNothing(address player, uint256 wager) internal {
        Session storage session = sessions[player];
        require(session.active, "No active session");
        require(session.balance >= wager, "Insufficient balance");

        session.balance -= wager;

        // Pre-determine all 5 outcomes with independent randomness per level
        uint256 baseRandom = _getRandomForRound(player);
        DoubleOrNothingMap storage map = donMaps[player];
        console.log("DoN base random: %s", baseRandom);

        for (uint8 i = 0; i < 5; i++) {
            uint256 levelRandom = uint256(
                keccak256(abi.encodePacked(baseRandom, i))
            );
            map.outcomes[i] = (levelRandom % 2) == 0;
        }

        donState[player] = DoubleOrNothingState({
            initialWager: wager,
            currentMultiplier: 10000, // 1.00x
            step: 0,
            active: true
        });

        console.log("Double or Nothing started with %s USDC", wager / 1e6);
        console.log("  Outcomes:");
        console.log("    Level 1: %s", map.outcomes[0] ? "W" : "L");
        console.log("    Level 2: %s", map.outcomes[1] ? "W" : "L");
        console.log("    Level 3: %s", map.outcomes[2] ? "W" : "L");
        console.log("    Level 4: %s", map.outcomes[3] ? "W" : "L");
        console.log("    Level 5: %s", map.outcomes[4] ? "W" : "L");
    }

    function _flipDoubleOrNothing(
        address player
    ) internal returns (bool won, uint256 currentPayout) {
        console.log("Flipping Double or Nothing...");
        DoubleOrNothingState storage state = donState[player];
        DoubleOrNothingMap storage map = donMaps[player];
        require(state.active, "No active game");
        require(state.step < MAX_DOUBLE_OR_NOTHING_STEPS, "Max steps reached");

        won = map.outcomes[state.step];

        if (won) {
            state.currentMultiplier =
                (state.currentMultiplier * DON_MULT) /
                10000;
            state.step++;
            currentPayout =
                (state.initialWager * state.currentMultiplier) /
                10000;
            console.log(
                "  Level %s: WIN! x%s.%s",
                state.step,
                state.currentMultiplier / 10000,
                (state.currentMultiplier % 10000) / 100
            );
        } else {
            state.currentMultiplier = 0;
            state.active = false;
            currentPayout = 0;
            console.log("  Level %s: LOSE!", state.step + 1);
        }

        return (won, currentPayout);
    }

    function _cashOutDoubleOrNothing(
        address player
    ) internal returns (uint256 payout) {
        Session storage session = sessions[player];
        DoubleOrNothingState storage state = donState[player];
        require(state.active, "No active game");

        payout = (state.initialWager * state.currentMultiplier) / 10000;
        session.balance += payout;
        state.active = false;

        console.log(
            "  Cashed out: %s USDC (x%s.%s)",
            payout / 1e6,
            state.currentMultiplier / 10000,
            (state.currentMultiplier % 10000) / 100
        );
        emit GameResult(
            player,
            "DoubleOrNothing",
            state.initialWager,
            true,
            payout,
            session.balance
        );

        return payout;
    }

    /// @notice Get multiplier for double or nothing: 1.95^steps (in basis points)
    function _getDoubleOrNothingMultiplier(
        uint8 steps
    ) internal pure returns (uint256) {
        uint256 mult = 10000; // 1.00x
        for (uint8 i = 0; i < steps; i++) {
            mult = (mult * DON_MULT) / 10000;
        }
        return mult;
    }

    // ============ Game: Death (Mines) ============
    // Variable tiles (2-7), always 1 bomb per step
    // Map is pre-generated at game start (tiles + bomb positions for all 10 steps)
    // Max 10 levels, player can cash out anytime
    // Max bet: 0.2% of house liquidity
    //
    // Tile multipliers (per level):
    //   2 tiles: 1.90x (up to 613.11x at level 10)
    //   3 tiles: 1.43x
    //   4 tiles: 1.27x
    //   5 tiles: 1.19x
    //   6 tiles: 1.14x
    //   7 tiles: 1.11x (up to 2.84x at level 10)

    struct DeathMap {
        uint8[10] tiles; // number of tiles for each step (2-7)
        uint8[10] bombs; // bomb position for each step
    }

    struct DeathState {
        uint256 initialWager;
        uint256 multiplier; // stored as basis points (10000 = 1.00x)
        uint8 step;
        bool active;
    }

    mapping(address => DeathState) public deathState;
    mapping(address => DeathMap) internal deathMaps;

    /// @notice Get tile multiplier based on tile count (in basis points)
    function _getTileMultiplier(uint8 tiles) internal pure returns (uint256) {
        if (tiles == 2) return DEATH_MULT_2_TILES;
        if (tiles == 3) return DEATH_MULT_3_TILES;
        if (tiles == 4) return DEATH_MULT_4_TILES;
        if (tiles == 5) return DEATH_MULT_5_TILES;
        if (tiles == 6) return DEATH_MULT_6_TILES;
        if (tiles == 7) return DEATH_MULT_7_TILES;
        revert("Invalid tile count");
    }

    /// @notice Generate pre-determined map for death game
    function _generateDeathMap(
        address player
    ) internal returns (DeathMap memory map) {
        for (uint8 i = 0; i < MAX_DEATH_STEPS; i++) {
            uint256 random = _getRandomForRound(player);
            // Tiles between 2-7
            map.tiles[i] = uint8(2 + (random % 6));
            // Bomb position within tiles
            map.bombs[i] = uint8((random >> 8) % map.tiles[i]);
        }
        return map;
    }

    function _startDeath(address player, uint256 wager) internal {
        Session storage session = sessions[player];
        require(session.active, "No active session");
        require(session.balance >= wager, "Insufficient balance");

        session.balance -= wager;

        // Generate and store the map
        DeathMap memory map = _generateDeathMap(player);
        deathMaps[player] = map;

        deathState[player] = DeathState({
            initialWager: wager,
            multiplier: 10000, // 1.00x in basis points
            step: 0,
            active: true
        });

        console.log(
            "Death game started with %s USDC (10 level map)",
            wager / 1e6
        );
    }

    /// @notice Play a round of death - tile choice checked against pre-determined bomb
    function _playDeathRound(
        address player,
        uint8 tileChoice
    ) internal returns (bool survived, uint256 payout) {
        DeathState storage state = deathState[player];
        DeathMap storage map = deathMaps[player];
        require(state.active, "No active game");
        require(state.step < MAX_DEATH_STEPS, "Max steps reached");

        uint8 currentStep = state.step;
        uint8 tiles = map.tiles[currentStep];
        uint8 bomb = map.bombs[currentStep];

        require(tileChoice < tiles, "Invalid tile choice");

        survived = (tileChoice != bomb);

        if (survived) {
            state.step++;
            // Multiply by tile multiplier
            uint256 tileMult = _getTileMultiplier(tiles);
            state.multiplier = (state.multiplier * tileMult) / 10000;

            payout = (state.initialWager * state.multiplier) / 10000;
            console.log(
                "  Level %s (%s tiles): SURVIVED! Mult: %s",
                state.step,
                tiles,
                state.multiplier
            );
        } else {
            state.active = false;
            payout = 0;
            console.log(
                "  Level %s (%s tiles): DEATH!",
                currentStep + 1,
                tiles
            );
        }

        return (survived, payout);
    }

    function _cashOutDeath(address player) internal returns (uint256 payout) {
        Session storage session = sessions[player];
        DeathState storage state = deathState[player];
        require(state.active, "No active game");

        payout = (state.initialWager * state.multiplier) / 10000;
        session.balance += payout;
        state.active = false;

        console.log(
            "  Cashed out: %s USDC (x%s)",
            payout / 1e6,
            state.multiplier / 100
        );
        emit GameResult(
            player,
            "Death",
            state.initialWager,
            payout > state.initialWager,
            payout,
            session.balance
        );

        return payout;
    }

    /// @notice Get current potential payout without cashing out
    function _getDeathPayout(address player) internal view returns (uint256) {
        DeathState storage state = deathState[player];
        return (state.initialWager * state.multiplier) / 10000;
    }

    // ============ Story Tests ============

    function test_Story_Player1_LuckyStreak() public {
        console.log("\n========== STORY: Player 1 - Lucky Streak ==========\n");

        address player = players[0];
        uint256 initialBalance = usdc.balanceOf(player);
        console.log("Player1 starting with %s USDC\n", initialBalance / 1e6);

        // Open session with 10k USDC
        _openSession(player, 10_000e6);

        // Play some RPS
        console.log("\n--- Playing Rock Paper Scissors ---");
        (RPSResult result, ) = _playRPS(player, 1000e6, RPSChoice.Rock);
        console.log(
            "Round 1: Player chose Rock, result: %s",
            result == RPSResult.Win
                ? "WIN"
                : (result == RPSResult.Lose ? "LOSE" : "TIE")
        );

        (result, ) = _playRPS(player, 1000e6, RPSChoice.Paper);
        console.log(
            "Round 2: Player chose Paper, result: %s",
            result == RPSResult.Win
                ? "WIN"
                : (result == RPSResult.Lose ? "LOSE" : "TIE")
        );

        (result, ) = _playRPS(player, 1000e6, RPSChoice.Scissors);
        console.log(
            "Round 3: Player chose Scissors, result: %s",
            result == RPSResult.Win
                ? "WIN"
                : (result == RPSResult.Lose ? "LOSE" : "TIE")
        );

        console.log(
            "Session balance after RPS: %s USDC",
            sessions[player].balance / 1e6
        );

        // Try Double or Nothing
        console.log("\n--- Playing Double or Nothing ---");
        _startDoubleOrNothing(player, 500e6);

        bool won;
        for (uint8 i = 0; i < 3; i++) {
            (won, ) = _flipDoubleOrNothing(player);
            if (!won) break;
        }
        if (donState[player].active) {
            _cashOutDoubleOrNothing(player);
        }

        console.log(
            "Session balance after DoN: %s USDC",
            sessions[player].balance / 1e6
        );

        // Close session
        console.log("\n--- Closing Session ---");
        uint256 finalBalance = _closeSession(player);

        uint256 playerFinalUsdc = usdc.balanceOf(player);
        int256 netResult = int256(playerFinalUsdc) - int256(initialBalance);
        console.log("\nPlayer1 final USDC: %s", playerFinalUsdc / 1e6);
        console.log(
            "Net result: %s USDC",
            netResult > 0
                ? string(
                    abi.encodePacked("+", vm.toString(uint256(netResult) / 1e6))
                )
                : vm.toString(netResult / 1e6)
        );
    }

    function test_Story_Player2_DeathGame() public {
        console.log(
            "\n========== STORY: Player 2 - Death Game Master ==========\n"
        );

        address player = players[1];
        console.log(
            "Player2 starting with %s USDC\n",
            usdc.balanceOf(player) / 1e6
        );

        // Open session
        _openSession(player, 5_000e6);

        // Play Death game - map is pre-generated
        console.log("\n--- Playing Death (Mines) ---");
        _startDeath(player, 1000e6);

        bool survived;
        // Try to survive through multiple rounds (map is pre-determined)
        for (uint8 i = 0; i < 5; i++) {
            if (!deathState[player].active) break;

            // Always pick tile 0 for simplicity
            (survived, ) = _playDeathRound(player, 0);

            if (!survived) break;

            // Cash out after 3 successful rounds
            if (deathState[player].step >= 3 && deathState[player].active) {
                _cashOutDeath(player);
                break;
            }
        }

        console.log(
            "\nSession balance after Death: %s USDC",
            sessions[player].balance / 1e6
        );

        // Close session
        _closeSession(player);
    }

    function test_Story_Player3_HighRoller() public {
        console.log("\n========== STORY: Player 3 - High Roller ==========\n");

        address player = players[2];
        console.log(
            "Player3 starting with %s USDC\n",
            usdc.balanceOf(player) / 1e6
        );

        // Big session
        _openSession(player, 50_000e6);

        // Big RPS bets
        console.log("\n--- High Stakes RPS ---");
        for (uint8 i = 0; i < 5; i++) {
            RPSChoice choice = RPSChoice(i % 3);
            (RPSResult result, ) = _playRPS(player, 5000e6, choice);
            console.log(
                "Round %s: %s -> %s",
                i + 1,
                _rpsChoiceToString(choice),
                result == RPSResult.Win
                    ? "WIN"
                    : (result == RPSResult.Lose ? "LOSE" : "TIE")
            );

            if (sessions[player].balance < 5000e6) {
                console.log("Not enough balance to continue!");
                break;
            }
        }

        console.log(
            "\nFinal session balance: %s USDC",
            sessions[player].balance / 1e6
        );
        _closeSession(player);
    }

    function test_Story_Player4_CautiousGambler() public {
        console.log(
            "\n========== STORY: Player 4 - Cautious Gambler ==========\n"
        );

        address player = players[3];
        console.log(
            "Player4 starting with %s USDC\n",
            usdc.balanceOf(player) / 1e6
        );

        // Small session
        _openSession(player, 2_000e6);

        // Small bets, many rounds
        console.log("\n--- Small Stakes RPS (20 rounds) ---");
        uint256 wins = 0;
        uint256 losses = 0;
        uint256 ties = 0;

        for (uint8 i = 0; i < 20; i++) {
            if (sessions[player].balance < 100e6) break;

            RPSChoice choice = RPSChoice(
                uint256(keccak256(abi.encodePacked(i, player))) % 3
            );
            (RPSResult result, ) = _playRPS(player, 100e6, choice);

            if (result == RPSResult.Win) wins++;
            else if (result == RPSResult.Lose) losses++;
            else ties++;
        }

        console.log("Results: %s wins, %s losses, %s ties", wins, losses, ties);
        console.log(
            "Final session balance: %s USDC",
            sessions[player].balance / 1e6
        );

        _closeSession(player);
    }

    function test_Story_Player5_AllGames() public {
        console.log(
            "\n========== STORY: Player 5 - All Games Marathon ==========\n"
        );

        address player = players[4];
        uint256 startingUsdc = usdc.balanceOf(player);
        console.log("Player5 starting with %s USDC\n", startingUsdc / 1e6);

        // Open session
        _openSession(player, 20_000e6);

        // Round 1: RPS
        console.log("\n--- Round 1: RPS ---");
        for (uint8 i = 0; i < 3; i++) {
            if (sessions[player].balance < 500e6) break;
            _playRPS(player, 500e6, RPSChoice(i));
        }
        console.log(
            "Balance after RPS: %s USDC",
            sessions[player].balance / 1e6
        );

        // Round 2: Double or Nothing
        console.log("\n--- Round 2: Double or Nothing ---");
        if (sessions[player].balance >= 1000e6) {
            _startDoubleOrNothing(player, 1000e6);
            bool won = true;
            while (
                won &&
                donState[player].step < MAX_DOUBLE_OR_NOTHING_STEPS &&
                donState[player].active
            ) {
                (won, ) = _flipDoubleOrNothing(player);
            }
            if (donState[player].active) {
                _cashOutDoubleOrNothing(player);
            }
        }
        console.log(
            "Balance after DoN: %s USDC",
            sessions[player].balance / 1e6
        );

        // Round 3: Death
        console.log("\n--- Round 3: Death ---");
        if (sessions[player].balance >= 2000e6) {
            _startDeath(player, 2000e6);

            // Try to survive 3 rounds (map is pre-determined)
            for (uint8 i = 0; i < 3; i++) {
                if (!deathState[player].active) break;
                (bool survived, ) = _playDeathRound(player, 0);
                if (!survived) break;
            }

            if (deathState[player].active) {
                _cashOutDeath(player);
            }
        }
        console.log(
            "Balance after Death: %s USDC",
            sessions[player].balance / 1e6
        );

        // Close session
        console.log("\n--- Final Results ---");
        _closeSession(player);

        uint256 finalUsdc = usdc.balanceOf(player);
        int256 netResult = int256(finalUsdc) - int256(startingUsdc);

        console.log("Player5 final USDC: %s", finalUsdc / 1e6);
        if (netResult >= 0) {
            console.log("Net PROFIT: +%s USDC", uint256(netResult) / 1e6);
        } else {
            console.log("Net LOSS: -%s USDC", uint256(-netResult) / 1e6);
        }

        console.log("\nVault total assets: %s USDC", vault.totalAssets() / 1e6);
    }

    // ============ Multiplier Tests ============

    function test_Multipliers() public pure {
        console.log("\n========== Game Multiplier Reference ==========\n");

        console.log("RPS: 1.67x win, 1x tie, 0x loss");
        console.log("Coinflip: 1.95x win, 0x loss");

        console.log("\nDouble or Nothing (1.95x per level, max 5):");
        uint256 donMult = 10000;
        for (uint8 i = 1; i <= 5; i++) {
            donMult = (donMult * 19500) / 10000;
            console.log("  Level %s: %sx", i, donMult / 10000);
        }

        console.log("\nDeath (Mines) tile multipliers:");
        console.log("  2 tiles: 1.90x per level");
        console.log("  3 tiles: 1.43x per level");
        console.log("  4 tiles: 1.27x per level");
        console.log("  5 tiles: 1.19x per level");
        console.log("  6 tiles: 1.14x per level");
        console.log("  7 tiles: 1.11x per level");

        console.log("\nDeath max multipliers (10 levels, same tiles):");
        // 2 tiles: 1.90^10
        uint256 mult2 = 10000;
        for (uint8 i = 0; i < 10; i++) mult2 = (mult2 * 19000) / 10000;
        console.log("  2 tiles x10: %sx", mult2 / 100);
        // 7 tiles: 1.11^10
        uint256 mult7 = 10000;
        for (uint8 i = 0; i < 10; i++) mult7 = (mult7 * 11100) / 10000;
        console.log("  7 tiles x10: %sx", mult7 / 100);
    }
}
