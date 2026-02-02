// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract HelloWorld {
    string public message;

    event MessageChanged(string oldMessage, string newMessage);

    constructor(string memory _message) {
        message = _message;
    }

    // update the stored message
    function setMessage(string memory _message) external {
        string memory oldMessage = message;
        message = _message;
        emit MessageChanged(oldMessage, _message);
    }
}
