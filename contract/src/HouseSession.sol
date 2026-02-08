// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICustody} from "./interfaces/ICustody.sol";

/// @title HouseSession
/// @notice Tracks provably fair game sessions. Players deposit to custody directly.
/// @dev App checks sessionExists() before allowing play. One active session per player.
contract HouseSession {
    address public immutable token;
    ICustody public immutable custody;
    address public immutable operator;

    /// @dev player => active sessionHash (0 if no active session)
    mapping(address => bytes32) public sessions;

    event SessionOpened(bytes32 indexed sessionHash, address indexed player);
    event SessionVerified(
        bytes32 indexed sessionHash,
        address indexed player,
        uint256 seed
    );

    error SessionAlreadyExists();
    error SessionNotActive();
    error ZeroAddress();
    error InvalidSessionHash();
    error InvalidSeed();
    error NotOperator();

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }

    constructor(address _token, address _custody, address _operator) {
        if (_token == address(0) || _custody == address(0) || _operator == address(0))
            revert ZeroAddress();
        token = _token;
        custody = ICustody(_custody);
        operator = _operator;
    }

    // =========================================================================
    // SESSION MANAGEMENT
    // =========================================================================

    /// @notice Opens a game session for a player
    /// @dev One active session per player. sessionHash = keccak256(seed, player)
    /// @param sessionHash unique session identifier
    /// @param player player address
    function openSession(bytes32 sessionHash, address player) external onlyOperator {
        if (sessionHash == bytes32(0)) revert InvalidSessionHash();
        if (player == address(0)) revert ZeroAddress();
        if (sessions[player] != bytes32(0)) revert SessionAlreadyExists();

        sessions[player] = sessionHash;

        emit SessionOpened(sessionHash, player);
    }

    /// @notice Verifies a game session by revealing the seed, then clears it
    /// @param seed random seed used to generate sessionHash
    /// @param player player address
    function verifySession(uint256 seed, address player) external onlyOperator {
        bytes32 storedHash = sessions[player];
        if (storedHash == bytes32(0)) revert SessionNotActive();

        bytes32 sessionHash = keccak256(abi.encodePacked(seed, player));
        if (sessionHash != storedHash) revert InvalidSeed();

        sessions[player] = bytes32(0);

        emit SessionVerified(sessionHash, player, seed);
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /// @notice Check if player has active session
    function sessionExists(address player) external view returns (bool) {
        return sessions[player] != bytes32(0);
    }

    /// @notice Get player's active session hash
    function getSessionHash(address player) external view returns (bytes32) {
        return sessions[player];
    }

    /// @notice Get player's balance in custody
    function getBalance(address player) external view returns (uint256) {
        address[] memory accounts = new address[](1);
        accounts[0] = player;
        address[] memory tokens = new address[](1);
        tokens[0] = token;
        uint256[][] memory bals = custody.getAccountsBalances(accounts, tokens);
        return bals[0][0];
    }
}
