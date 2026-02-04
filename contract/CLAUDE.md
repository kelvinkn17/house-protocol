# Contract Development Guidelines

## project structure

```
contract/
├── src/                # solidity source files
├── script/             # deployment scripts
├── test/               # test files
├── lib/                # dependencies (forge-std, etc.)
├── foundry.toml        # foundry configuration
└── .env.example        # env template
```

## commands

```bash
forge build             # compile contracts
forge test              # run tests
forge test -vvv         # run tests with verbosity
forge test --match-test testName  # run specific test
forge test --match-contract ContractTest  # run specific contract tests
forge fmt               # format code
forge clean             # clean artifacts

# local node
anvil                   # start local node

# deployment
forge script script/Counter.s.sol --rpc-url localhost --broadcast  # deploy to local
forge script script/Counter.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify  # deploy to sepolia
forge script script/Counter.s.sol --rpc-url $MAINNET_RPC_URL --broadcast --verify  # deploy to mainnet

# verification (standalone)
forge verify-contract <address> MyContract --chain sepolia
```

## environment setup

copy `.env.example` to `.env` and fill in:
- `DEPLOYER_PK` - private key without 0x prefix
- `ETHERSCAN_API_KEY` - for contract verification
- `SEPOLIA_RPC_URL` / `MAINNET_RPC_URL` - optional custom rpcs

load env before deploying:
```bash
source .env
```

## adding new contracts

1. create `.sol` file in `src/`
2. add deploy script in `script/` (naming: `MyContract.s.sol`)
3. add tests in `test/` (naming: `MyContract.t.sol`)
4. run `forge build` to compile

## testing pattern

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {MyContract} from "../src/MyContract.sol";

contract MyContractTest is Test {
    MyContract public myContract;

    function setUp() public {
        myContract = new MyContract();
    }

    function test_SomeFunction() public {
        // arrange, act, assert
        assertEq(myContract.value(), expected);
    }

    function testFuzz_SomeFunction(uint256 x) public {
        // fuzz testing
        myContract.setValue(x);
        assertEq(myContract.value(), x);
    }
}
```

## deployment pattern

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {MyContract} from "../src/MyContract.sol";

contract MyContractScript is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        MyContract myContract = new MyContract(/* args */);
        console.log("deployed to:", address(myContract));

        vm.stopBroadcast();
    }
}
```

## installing dependencies

```bash
forge install OpenZeppelin/openzeppelin-contracts  # install openzeppelin
forge install transmissions11/solmate              # install solmate
forge update                                        # update all deps
```

add remappings to `foundry.toml` or `remappings.txt`:
```
@openzeppelin/=lib/openzeppelin-contracts/
```
