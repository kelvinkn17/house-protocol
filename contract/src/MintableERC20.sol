// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MintableERC20 is ERC20 {
    uint8 private immutable __decimals;

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    ) ERC20(_name, _symbol) {
        __decimals = _decimals;
    }

    /// @notice Override decimals
    function decimals() public view override returns (uint8) {
        return __decimals;
    }

    /// @notice Anyone can mint tokens (testing only!)
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
