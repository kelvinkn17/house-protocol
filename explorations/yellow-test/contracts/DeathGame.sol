// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title DeathGame
/// @notice Minimal event-only contract for Death Game exploration
/// @dev No token logic, purely observational. Real version would have access control.
contract DeathGame {
    event GameStarted(bytes32 indexed gameId, address indexed player, uint256 virtualBet);

    event TilePicked(
        bytes32 indexed gameId,
        uint8 row,
        uint8 tilesInRow,
        uint8 playerChoice,
        uint8 bombPosition,
        bool survived,
        uint256 currentMultiplier // scaled by 1e4
    );

    event GameEnded(
        bytes32 indexed gameId,
        address indexed player,
        bool won,
        uint8 rowsCompleted,
        uint256 finalMultiplier, // scaled by 1e4
        uint256 virtualPayout
    );

    // Anyone can emit for testing. Real version would have access control.
    function logGameStart(bytes32 gameId, address player, uint256 virtualBet) external {
        emit GameStarted(gameId, player, virtualBet);
    }

    function logTilePick(
        bytes32 gameId,
        uint8 row,
        uint8 tilesInRow,
        uint8 playerChoice,
        uint8 bombPosition,
        bool survived,
        uint256 currentMultiplier
    ) external {
        emit TilePicked(gameId, row, tilesInRow, playerChoice, bombPosition, survived, currentMultiplier);
    }

    function logGameEnd(
        bytes32 gameId,
        address player,
        bool won,
        uint8 rowsCompleted,
        uint256 finalMultiplier,
        uint256 virtualPayout
    ) external {
        emit GameEnded(gameId, player, won, rowsCompleted, finalMultiplier, virtualPayout);
    }
}
