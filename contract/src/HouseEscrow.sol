// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IHouseVault {
    function settleSession(address player, uint256 amount, bool playerWon) external;
}

/// @title HouseEscrow
/// @notice Holds player funds during offchain Yellow Network betting sessions
contract HouseEscrow is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    IHouseVault public vault;
    address public operator;

    /// @dev player => locked amount
    mapping(address => uint256) public sessions;

    event SessionOpened(address indexed player, uint256 lockedAmount);
    event SessionClosed(address indexed player, uint256 finalBalance, int256 playerDelta);
    event VaultUpdated(address indexed oldVault, address indexed newVault);
    event OperatorUpdated(
        address indexed oldOperator,
        address indexed newOperator
    );

    error SessionAlreadyExists();
    error SessionNotActive();
    error Unauthorized();
    error ZeroAmount();
    error ZeroAddress();

    modifier onlyOperator() {
        if (msg.sender != operator && msg.sender != owner()) {
            revert Unauthorized();
        }
        _;
    }

    /// @param _usdc USDC token address
    /// @param _vault HouseVault address
    /// @param _owner contract owner
    /// @param _operator Yellow Network operator address
    constructor(
        address _usdc,
        address _vault,
        address _owner,
        address _operator
    ) Ownable(_owner) {
        if (_usdc == address(0) || _vault == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
        vault = IHouseVault(_vault);
        operator = _operator;
    }

    /// @notice Opens a betting session, locking player funds
    /// @param player player address
    /// @param amount funds to lock (initial offchain balance)
    function openSession(address player, uint256 amount) external onlyOperator {
        if (amount == 0) revert ZeroAmount();
        if (sessions[player] > 0) revert SessionAlreadyExists();

        sessions[player] = amount;

        usdc.safeTransferFrom(player, address(this), amount);

        emit SessionOpened(player, amount);
    }

    /// @notice Closes session, settles funds based on Yellow Network result
    /// @param player player address
    /// @param finalBalance player's final balance after offchain session
    function closeSession(address player, uint256 finalBalance) external onlyOperator {
        uint256 lockedAmount = sessions[player];
        if (lockedAmount == 0) revert SessionNotActive();

        sessions[player] = 0;
        int256 playerDelta = int256(finalBalance) - int256(lockedAmount);

        if (finalBalance > lockedAmount) {
            // Player won: return locked + vault pays profit
            uint256 profit = finalBalance - lockedAmount;
            usdc.safeTransfer(player, lockedAmount);
            vault.settleSession(player, profit, true);
        } else if (finalBalance < lockedAmount) {
            // House won: return remaining to player, send loss to vault
            uint256 houseTake = lockedAmount - finalBalance;
            if (finalBalance > 0) {
                usdc.safeTransfer(player, finalBalance);
            }
            usdc.approve(address(vault), houseTake);
            vault.settleSession(player, houseTake, false);
        } else {
            // Break even
            usdc.safeTransfer(player, lockedAmount);
        }

        emit SessionClosed(player, finalBalance, playerDelta);
    }

    /// @notice Check if player has active session
    function sessionExists(address player) external view returns (bool) {
        return sessions[player] > 0;
    }

    /// @notice Get player's locked amount
    function getLockedAmount(address player) external view returns (uint256) {
        return sessions[player];
    }

    function setVault(address _vault) external onlyOwner {
        if (_vault == address(0)) revert ZeroAddress();
        emit VaultUpdated(address(vault), _vault);
        vault = IHouseVault(_vault);
    }

    function setOperator(address _operator) external onlyOwner {
        emit OperatorUpdated(operator, _operator);
        operator = _operator;
    }
}
