// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title USDH - House USD Token
/// @notice Public mint token for hackathon demo. Anyone can mint for testing.
contract USDH is ERC20 {
    constructor() ERC20("House USD", "USDH") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mint tokens to any address. Public for testing purposes.
    /// @param to Address to mint tokens to
    /// @param amount Amount of tokens to mint (6 decimals)
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
