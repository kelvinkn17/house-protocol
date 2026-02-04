// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract HouseVault is ERC4626, Ownable {
    address public operator;

    mapping(bytes32 => uint256) public channelAllocations;
    uint256 public totalAllocated;

    uint256 public maxAllocationPercent = 8000;
    uint256 public maxPerChannel;              

    event ChannelAllocated(bytes32 indexed channelId, uint256 amount);
    event ChannelSettled(bytes32 indexed channelId, uint256 returned, int256 pnl);
    event OperatorUpdated(address indexed oldOperator, address indexed newOperator);

    error NotOperator();
    error ChannelExists();
    error ChannelNotFound();
    error InsufficientLiquidity();
    error ExceedsMaxPerChannel();
    error InvalidPercent();

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }

    constructor(
        IERC20 _asset,
        string memory _name,
        string memory _symbol,
        address _operator
    ) ERC4626(_asset) ERC20(_name, _symbol) Ownable(msg.sender) {
        operator = _operator;
    }

    function allocateToChannel(
        bytes32 channelId,
        uint256 amount
    ) external onlyOperator {
        if (channelAllocations[channelId] != 0) revert ChannelExists();
        if (amount > availableLiquidity()) revert InsufficientLiquidity();
        if (maxPerChannel != 0 && amount > maxPerChannel) revert ExceedsMaxPerChannel();

        channelAllocations[channelId] = amount;
        totalAllocated += amount;

        SafeERC20.safeTransfer(IERC20(asset()), operator, amount);

        emit ChannelAllocated(channelId, amount);
    }

    function settleChannel(
        bytes32 channelId,
        uint256 returnAmount
    ) external onlyOperator {
        uint256 allocated = channelAllocations[channelId];
        if (allocated == 0) revert ChannelNotFound();

        int256 pnl = int256(returnAmount) - int256(allocated);

        totalAllocated -= allocated;
        delete channelAllocations[channelId];

        if (returnAmount > 0) {
            SafeERC20.safeTransferFrom(IERC20(asset()), operator, address(this), returnAmount);
        }

        emit ChannelSettled(channelId, returnAmount, pnl);
    }

    function availableLiquidity() public view returns (uint256) {
        uint256 total = totalAssets();
        uint256 maxAllocatable = (total * maxAllocationPercent) / 10000;

        if (totalAllocated >= maxAllocatable) return 0;
        return maxAllocatable - totalAllocated;
    }

    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this)) + totalAllocated;
    }

    function setOperator(address _operator) external onlyOwner {
        emit OperatorUpdated(operator, _operator);
        operator = _operator;
    }

    function setMaxPerChannel(uint256 _max) external onlyOwner {
        maxPerChannel = _max;
    }

    function setMaxAllocationPercent(uint256 _percent) external onlyOwner {
        if (_percent > 10000) revert InvalidPercent();
        maxAllocationPercent = _percent;
    }
}
