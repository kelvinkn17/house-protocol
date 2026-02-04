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
/// @dev LPs deposit USDH, get hUSDH shares. House funds deployed to custody for state channel games.
contract HouseVault is ERC4626, Ownable {
    using SafeERC20 for IERC20;

    // custody integration
    ICustody public custody;
    address public broker;
    uint256 public custodyBalance; // tracks USDH deployed to custody for house

    // risk management
    uint256 public maxExposurePercent = 5000; // 50% in bps
    uint256 public maxPayoutPerSession = 1000e6; // 1000 USDH (6 decimals)
    uint256 public totalExposure; // sum of active session max payouts

    // session tracking
    uint256 public nextSessionId;
    struct Session {
        address player;
        uint256 playerBet;
        uint256 maxPayout;
        bool active;
    }
    mapping(uint256 => Session) public sessions;

    // legacy escrow support
    address public escrow;

    event EscrowUpdated(address indexed oldEscrow, address indexed newEscrow);
    event CustodyUpdated(address indexed oldCustody, address indexed newCustody);
    event BrokerUpdated(address indexed oldBroker, address indexed newBroker);
    event DepositedToHouse(uint256 amount, uint256 newCustodyBalance);
    event WithdrawnFromHouse(uint256 amount, uint256 newCustodyBalance);
    event SessionRegistered(
        uint256 indexed sessionId,
        address indexed player,
        uint256 playerBet,
        uint256 maxPayout
    );
    event SessionClosed(
        uint256 indexed sessionId,
        bool playerWon,
        uint256 payout
    );
    event SessionSettled(
        address indexed player,
        uint256 amount,
        bool playerWon
    );

    error Unauthorized();
    error InsufficientLiquidity();
    error ZeroAddress();
    error ExposureLimitExceeded();
    error PayoutTooHigh();
    error InsufficientCustodyBalance();
    error SessionNotActive();
    error CustodyNotSet();
    error BrokerNotSet();

    modifier onlyEscrow() {
        if (msg.sender != escrow) revert Unauthorized();
        _;
    }

    /// @param _asset underlying asset (USDH) token address
    /// @param _owner vault owner
    /// @param _escrow legacy escrow contract (can be zero)
    /// @param _custody Nitrolite custody contract
    /// @param _broker broker address for state channel counterparty
    constructor(
        IERC20 _asset,
        address _owner,
        address _escrow,
        address _custody,
        address _broker
    ) ERC4626(_asset) ERC20("House USDH", "hUSDH") Ownable(_owner) {
        escrow = _escrow;
        custody = ICustody(_custody);
        broker = _broker;
    }

    function _decimalsOffset() internal pure override returns (uint8) {
        return 3;
    }

    // =========================================================================
    // TOTAL ASSETS OVERRIDE
    // =========================================================================

    /// @notice Total assets includes both vault balance and custody deployed funds
    /// @dev Critical for LP share pricing to reflect ALL house funds
    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this)) + custodyBalance;
    }

    // =========================================================================
    // ADMIN FUNCTIONS
    // =========================================================================

    /// @notice Update escrow contract address (legacy support)
    function setEscrow(address _escrow) external onlyOwner {
        if (_escrow == address(0)) revert ZeroAddress();
        emit EscrowUpdated(escrow, _escrow);
        escrow = _escrow;
    }

    /// @notice Update custody contract address
    function setCustody(address _custody) external onlyOwner {
        if (_custody == address(0)) revert ZeroAddress();
        emit CustodyUpdated(address(custody), _custody);
        custody = ICustody(_custody);
    }

    /// @notice Update broker address
    function setBroker(address _broker) external onlyOwner {
        if (_broker == address(0)) revert ZeroAddress();
        emit BrokerUpdated(broker, _broker);
        broker = _broker;
    }

    /// @notice Update risk parameters
    function setRiskParams(
        uint256 _maxExposurePercent,
        uint256 _maxPayoutPerSession
    ) external onlyOwner {
        maxExposurePercent = _maxExposurePercent;
        maxPayoutPerSession = _maxPayoutPerSession;
    }

    // =========================================================================
    // CUSTODY INTEGRATION
    // =========================================================================

    /// @notice Deposit vault funds to custody for broker's ledger balance
    /// @dev Only owner can move funds to custody. Broker uses these for state channel games.
    /// @param amount Amount of USDH to deposit to custody
    function depositToHouse(uint256 amount) external onlyOwner {
        if (address(custody) == address(0)) revert CustodyNotSet();
        if (broker == address(0)) revert BrokerNotSet();

        // check we have enough in vault (not counting already deployed funds)
        uint256 vaultBalance = IERC20(asset()).balanceOf(address(this));
        if (amount > vaultBalance) revert InsufficientLiquidity();

        // approve and deposit to custody for broker
        IERC20(asset()).safeIncreaseAllowance(address(custody), amount);
        custody.deposit(broker, asset(), amount);

        custodyBalance += amount;
        emit DepositedToHouse(amount, custodyBalance);
    }

    /// @notice Withdraw funds from custody back to vault
    /// @dev Only owner can recall funds. Broker must have available balance.
    /// @param amount Amount of USDH to withdraw from custody
    function withdrawFromHouse(uint256 amount) external onlyOwner {
        if (address(custody) == address(0)) revert CustodyNotSet();
        if (amount > custodyBalance) revert InsufficientCustodyBalance();

        // this will revert if broker doesn't have available balance
        // (ie funds locked in active channels)
        custody.withdraw(asset(), amount);

        custodyBalance -= amount;
        emit WithdrawnFromHouse(amount, custodyBalance);
    }

    // =========================================================================
    // SESSION MANAGEMENT (for risk tracking)
    // =========================================================================

    /// @notice Register a new game session for exposure tracking
    /// @dev Called by escrow when a session opens
    /// @param player Player address
    /// @param playerBet Amount player is betting
    /// @param maxPayout Maximum potential payout to player
    /// @return sessionId Unique session identifier
    function registerSession(
        address player,
        uint256 playerBet,
        uint256 maxPayout
    ) external onlyEscrow returns (uint256 sessionId) {
        // risk checks
        uint256 maxAllowed = (totalAssets() * maxExposurePercent) / 10000;
        if (totalExposure + maxPayout > maxAllowed)
            revert ExposureLimitExceeded();
        if (maxPayout > maxPayoutPerSession) revert PayoutTooHigh();
        if (maxPayout > custodyBalance - totalExposure)
            revert InsufficientCustodyBalance();

        sessionId = nextSessionId++;
        sessions[sessionId] = Session({
            player: player,
            playerBet: playerBet,
            maxPayout: maxPayout,
            active: true
        });

        totalExposure += maxPayout;
        emit SessionRegistered(sessionId, player, playerBet, maxPayout);
    }

    /// @notice Close a game session and update exposure
    /// @dev Called by escrow when session ends. Custody handles actual payouts.
    /// @param sessionId Session to close
    /// @param playerWon Whether player won
    /// @param payout Actual payout amount (0 if player lost)
    function closeSession(
        uint256 sessionId,
        bool playerWon,
        uint256 payout
    ) external onlyEscrow {
        Session storage s = sessions[sessionId];
        if (!s.active) revert SessionNotActive();

        s.active = false;
        totalExposure -= s.maxPayout;

        // update custody balance tracking based on outcome
        // note: actual fund movement happens in clearnode, this just tracks
        if (playerWon && payout > 0) {
            // house paid out, custody balance decreases
            // payout is from custody, player bet stays with house
            // net loss to house = payout - playerBet
            if (payout > s.playerBet) {
                custodyBalance -= (payout - s.playerBet);
            } else {
                custodyBalance += (s.playerBet - payout);
            }
        } else {
            // house won, player bet goes to custody balance
            custodyBalance += s.playerBet;
        }

        emit SessionClosed(sessionId, playerWon, payout);
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /// @notice Available balance for new sessions (custody minus active exposure)
    function availableForRisk() external view returns (uint256) {
        if (custodyBalance <= totalExposure) return 0;
        return custodyBalance - totalExposure;
    }

    /// @notice Maximum exposure allowed based on total assets
    function maxExposureAllowed() external view returns (uint256) {
        return (totalAssets() * maxExposurePercent) / 10000;
    }

    // =========================================================================
    // LEGACY ESCROW SUPPORT
    // =========================================================================

    /// @notice Settle a session, legacy escrow flow
    /// @param player player address
    /// @param amount settlement amount
    /// @param playerWon true = vault pays player, false = vault receives from escrow
    function settleSession(
        address player,
        uint256 amount,
        bool playerWon
    ) external onlyEscrow {
        if (playerWon) {
            uint256 vaultBalance = IERC20(asset()).balanceOf(address(this));
            if (amount > vaultBalance) revert InsufficientLiquidity();
            IERC20(asset()).safeTransfer(player, amount);
        } else {
            IERC20(asset()).safeTransferFrom(msg.sender, address(this), amount);
        }
        emit SessionSettled(player, amount, playerWon);
    }
}
