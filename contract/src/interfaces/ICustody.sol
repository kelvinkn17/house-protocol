// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ICustody
/// @notice Interface for Nitrolite Custody contract (deposit/withdraw for state channels)
/// @dev Based on nitrolite local IDeposit.sol, adapted for house protocol integration
interface ICustody {
    /// @notice Emitted when tokens are deposited into the contract
    event Deposited(
        address indexed wallet,
        address indexed token,
        uint256 amount
    );

    /// @notice Emitted when tokens are withdrawn from the contract
    event Withdrawn(
        address indexed wallet,
        address indexed token,
        uint256 amount
    );

    /// @notice Gets the balances of multiple accounts for multiple tokens
    /// @param accounts Array of account addresses to check balances for
    /// @param tokens Array of token addresses (use address(0) for native tokens)
    /// @return 2D array of balances, outer array = accounts, inner array = tokens
    function getAccountsBalances(
        address[] calldata accounts,
        address[] calldata tokens
    ) external view returns (uint256[][] memory);

    /// @notice Deposits tokens into custody for an account's ledger balance
    /// @dev For native tokens, value should be sent with the transaction
    /// @param account Address whose ledger balance increases
    /// @param token Token address (use address(0) for native tokens)
    /// @param amount Amount of tokens to deposit
    function deposit(
        address account,
        address token,
        uint256 amount
    ) external payable;

    /// @notice Withdraws tokens from caller's ledger balance
    /// @dev Can only withdraw available (not locked in channels) funds
    /// @param token Token address (use address(0) for native tokens)
    /// @param amount Amount of tokens to withdraw
    function withdraw(address token, uint256 amount) external;
}
