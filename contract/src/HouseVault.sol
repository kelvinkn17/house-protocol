// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {
    ERC4626
} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title HouseVault
/// @notice ERC4626 vault for house liquidity - LPs deposit USDC, get hUSDC shares
/// @dev Risk management handled offchain by Yellow Network
contract HouseVault is ERC4626, Ownable {
    using SafeERC20 for IERC20;

    address public escrow;

    event EscrowUpdated(address indexed oldEscrow, address indexed newEscrow);
    event SessionSettled(
        address indexed player,
        uint256 amount,
        bool playerWon
    );

    error Unauthorized();
    error InsufficientLiquidity();
    error ZeroAddress();

    modifier onlyEscrow() {
        if (msg.sender != escrow) revert Unauthorized();
        _;
    }

    /// @param _usdc USDC token address
    /// @param _owner vault owner
    /// @param _escrow escrow contract address
    constructor(
        IERC20 _usdc,
        address _owner,
        address _escrow
    ) ERC4626(_usdc) ERC20("House USDC", "hUSDC") Ownable(_owner) {
        escrow = _escrow;
    }

    function _decimalsOffset() internal pure override returns (uint8) {
        return 3;
    }

    /// @notice Update escrow contract address
    function setEscrow(address _escrow) external onlyOwner {
        if (_escrow == address(0)) revert ZeroAddress();
        emit EscrowUpdated(escrow, _escrow);
        escrow = _escrow;
    }

    /// @notice Settle a session - called by escrow after offchain betting completes
    /// @param player player address
    /// @param amount settlement amount
    /// @param playerWon true = vault pays player, false = vault receives from escrow
    function settleSession(
        address player,
        uint256 amount,
        bool playerWon
    ) external onlyEscrow {
        if (playerWon) {
            if (amount > totalAssets()) revert InsufficientLiquidity();
            IERC20(asset()).safeTransfer(player, amount);
        } else {
            IERC20(asset()).safeTransferFrom(msg.sender, address(this), amount);
        }
        emit SessionSettled(player, amount, playerWon);
    }
}
