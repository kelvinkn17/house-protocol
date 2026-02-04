// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IHouseVault {
    function settleSession(
        address player,
        uint256 amount,
        bool playerWon
    ) external;
}

/// @title HouseEscrow
/// @notice Holds player funds during offchain Yellow Network betting sessions
contract HouseEscrow is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    IHouseVault public vault;

    /// @dev player => active sessionHash (0 if no active session)
    mapping(address => bytes32) public sessions;

    /// @dev sessionHash => locked amount
    mapping(bytes32 => uint256) public balances;

    event SessionOpened(
        bytes32 indexed sessionHash,
        address indexed player,
        uint256 lockedAmount
    );
    event SessionClosed(
        bytes32 indexed sessionHash,
        address indexed player,
        uint256 seed,
        uint256 finalBalance,
        int256 playerDelta
    );
    event VaultUpdated(address indexed oldVault, address indexed newVault);

    error SessionAlreadyExists();
    error SessionNotActive();
    error ZeroAmount();
    error ZeroAddress();
    error InvalidSessionHash();
    error InvalidSeed();

    /// @param _usdc USDC token address
    /// @param _vault HouseVault address
    /// @param _owner contract owner (also operator)
    constructor(address _usdc, address _vault, address _owner) Ownable(_owner) {
        if (_usdc == address(0) || _vault == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
        vault = IHouseVault(_vault);
    }

    /// @notice Opens a betting session, locking player funds
    /// @param sessionHash unique session identifier (sha256(seed, player))
    /// @param player player address
    /// @param amount funds to lock (initial offchain balance)
    function openSession(
        bytes32 sessionHash,
        address player,
        uint256 amount
    ) external onlyOwner {
        if (sessionHash == bytes32(0)) revert InvalidSessionHash();
        if (player == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (sessions[player] != bytes32(0)) revert SessionAlreadyExists();

        sessions[player] = sessionHash;
        balances[sessionHash] = amount;

        usdc.safeTransferFrom(player, address(this), amount);

        emit SessionOpened(sessionHash, player, amount);
    }

    /// @notice Closes session, settles funds based on Yellow Network result
    /// @dev Reveals the seed for provably fair verification
    /// @param seed random seed that was used to generate sessionHash
    /// @param player player address (used with seed to compute sessionHash)
    /// @param finalBalance player's final balance after offchain session
    function closeSession(
        uint256 seed,
        address player,
        uint256 finalBalance
    ) external onlyOwner {
        // Verify player has active session
        bytes32 storedHash = sessions[player];
        if (storedHash == bytes32(0)) revert SessionNotActive();

        // Compute sessionHash from seed and player, verify it matches
        bytes32 sessionHash = sha256(abi.encodePacked(seed, player));
        if (sessionHash != storedHash) revert InvalidSeed();

        uint256 lockedAmount = balances[sessionHash];

        // Clear session
        sessions[player] = bytes32(0);
        balances[sessionHash] = 0;

        int256 playerDelta = int256(finalBalance) - int256(lockedAmount);

        if (finalBalance >= lockedAmount) {
            // Player won or break even: return locked + vault pays profit if any
            usdc.safeTransfer(player, lockedAmount);
            uint256 profit = finalBalance - lockedAmount;
            if (profit > 0) {
                vault.settleSession(player, profit, true);
            }
        } else {
            // House won: return remaining to player, send loss to vault
            uint256 houseTake = lockedAmount - finalBalance;
            if (finalBalance > 0) {
                usdc.safeTransfer(player, finalBalance);
            }
            usdc.approve(address(vault), houseTake);
            vault.settleSession(player, houseTake, false);
        }

        // Emit seed for provably fair verification
        emit SessionClosed(sessionHash, player, seed, finalBalance, playerDelta);
    }

    /// @notice Check if player has active session
    function sessionExists(address player) external view returns (bool) {
        return sessions[player] != bytes32(0);
    }

    /// @notice Get player's active session hash
    function getSessionHash(address player) external view returns (bytes32) {
        return sessions[player];
    }

    /// @notice Get player's locked amount
    function getLockedAmount(address player) external view returns (uint256) {
        bytes32 sessionHash = sessions[player];
        return balances[sessionHash];
    }

    /// @notice Compute sessionHash from seed and player (for verification)
    /// @param seed random seed
    /// @param player player address
    /// @return sessionHash the computed session hash
    function computeSessionHash(
        uint256 seed,
        address player
    ) external pure returns (bytes32) {
        return sha256(abi.encodePacked(seed, player));
    }

    function setVault(address _vault) external onlyOwner {
        if (_vault == address(0)) revert ZeroAddress();
        emit VaultUpdated(address(vault), _vault);
        vault = IHouseVault(_vault);
    }
}
