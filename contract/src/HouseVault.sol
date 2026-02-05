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
import {ICustody} from "./interfaces/ICustody.sol";

/// @title HouseVault
/// @notice ERC4626 vault for house liquidity, integrates with Nitrolite Custody
/// @dev LPs deposit USDH, get hUSDH shares. Funds are deployed to custody for state channel games.
contract HouseVault is ERC4626, Ownable {
    using SafeERC20 for IERC20;

    ICustody public custody;

    event CustodyUpdated(
        address indexed oldCustody,
        address indexed newCustody
    );
    event SweptToCustody(
        address indexed caller,
        uint256 amount,
        uint256 shares
    );

    error CustodyNotSet();
    error NothingToSweep();
    error ZeroAddress();

    /// @param _asset underlying asset (USDH) token address
    /// @param _owner vault owner
    /// @param _custody Nitrolite custody contract
    constructor(
        IERC20 _asset,
        address _owner,
        address _custody
    ) ERC4626(_asset) ERC20("House USDH", "hUSDH") Ownable(_owner) {
        custody = ICustody(_custody);
    }

    function _decimalsOffset() internal pure override returns (uint8) {
        return 3;
    }

    // =========================================================================
    // TOTAL ASSETS
    // =========================================================================

    /// @notice Total assets includes both vault balance and custody deployed funds
    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this)) + getCustodyBalance();
    }

    /// @notice Get vault's balance in custody via ICustody
    function getCustodyBalance() public view returns (uint256) {
        if (address(custody) == address(0)) return 0;
        address[] memory accounts = new address[](1);
        accounts[0] = address(this);
        address[] memory tokens = new address[](1);
        tokens[0] = asset();
        uint256[][] memory balances = custody.getAccountsBalances(
            accounts,
            tokens
        );
        return balances[0][0];
    }

    // =========================================================================
    // OWNER ACTIONS
    // =========================================================================

    /// @notice Update custody contract address
    function setCustody(address _custody) external onlyOwner {
        if (_custody == address(0)) revert ZeroAddress();
        emit CustodyUpdated(address(custody), _custody);
        custody = ICustody(_custody);
    }

    // =========================================================================
    // SWEEP
    // =========================================================================

    /// @notice Sweep idle USDH in the vault to custody, minting shares to caller
    /// @dev Rescue for tokens sent via raw transfer instead of deposit()
    function sweepToCustody() external {
        if (address(custody) == address(0)) revert CustodyNotSet();
        uint256 idle = IERC20(asset()).balanceOf(address(this));
        if (idle == 0) revert NothingToSweep();

        uint256 shares = previewDeposit(idle);
        _mint(msg.sender, shares);

        IERC20(asset()).safeIncreaseAllowance(address(custody), idle);
        custody.deposit(address(this), asset(), idle);
        emit SweptToCustody(msg.sender, idle, shares);
    }

    // =========================================================================
    // ERC4626 HOOKS
    // =========================================================================

    /// @dev Auto-deposit to custody after LP deposit
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal override {
        super._deposit(caller, receiver, assets, shares);
        if (address(custody) != address(0)) {
            IERC20(asset()).safeIncreaseAllowance(address(custody), assets);
            custody.deposit(address(this), asset(), assets);
        }
    }

    /// @dev Auto-withdraw from custody before LP withdrawal
    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal override {
        if (address(custody) != address(0)) {
            uint256 vaultBalance = IERC20(asset()).balanceOf(address(this));
            if (vaultBalance < assets) {
                custody.withdraw(asset(), assets - vaultBalance);
            }
        }
        super._withdraw(caller, receiver, owner, assets, shares);
    }
}
