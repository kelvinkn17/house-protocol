#!/bin/bash
set -e

source .env

# HouseVault on Sepolia
CONTRACT_ADDRESS="0x4ce1DE2054da21DB659a90E04aee1f599e3027cE"
USDH="0x25FfCCE632a03898c2ecB0EF9bb6a86177a363Ed"
CUSTODY="0xEC94b4039237ac9490377FDB8A65e884eD6154A0"
OPERATOR="0x7952a3087B0f48F427CcA652fe0EEf1a2d516A62"
OWNER=$(cast wallet address "$DEPLOYER_PK")

CHAIN_ID="11155111"  # Sepolia
ETHERSCAN_API="https://api.etherscan.io/v2/api?chainid=$CHAIN_ID"


echo "=== Verifying HouseVault on Sepolia ==="
echo "Contract:  $CONTRACT_ADDRESS"
echo "Owner:     $OWNER"
echo "USDH:      $USDH"
echo "Custody:   $CUSTODY"
echo "Operator:  $OPERATOR"

# Build standard JSON input
forge build

# Get compiler version
SOLC_VERSION=$(forge config --json | jq -r '.solc' | sed 's/^/v/' | sed 's/$/.+commit.e4b80663/')

# Get the standard JSON input for the contract
STANDARD_JSON=$(forge verify-contract "$CONTRACT_ADDRESS" src/HouseVault.sol:HouseVault --show-standard-json-input 2>/dev/null)

# ABI-encode constructor args
CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address,address,address,address)" "$USDH" "$OWNER" "$CUSTODY" "$OPERATOR" | sed 's/^0x//')

echo "Solc version: $SOLC_VERSION"
echo "Submitting verification request..."

RESPONSE=$(curl -s -X POST "$ETHERSCAN_API" \
  -d "apikey=$ETHERSCAN_API_KEY" \
  -d "module=contract" \
  -d "action=verifysourcecode" \
  -d "contractaddress=$CONTRACT_ADDRESS" \
  -d "sourceCode=$(echo "$STANDARD_JSON" | jq -c '.' | jq -sRr @uri)" \
  -d "codeformat=solidity-standard-json-input" \
  -d "contractname=src/HouseVault.sol:HouseVault" \
  -d "compilerversion=$SOLC_VERSION" \
  -d "constructorArguments=$CONSTRUCTOR_ARGS")

echo "Response: $RESPONSE"

GUID=$(echo "$RESPONSE" | jq -r '.result')
STATUS=$(echo "$RESPONSE" | jq -r '.status')

if [ "$STATUS" != "1" ]; then
  echo "Submission failed: $GUID"
  exit 1
fi

echo "GUID: $GUID"
echo "Polling verification status..."

while true; do
  sleep 5
  CHECK=$(curl -s -G "$ETHERSCAN_API" \
    --data-urlencode "chainid=$CHAIN_ID" \
    --data-urlencode "apikey=$ETHERSCAN_API_KEY" \
    --data-urlencode "module=contract" \
    --data-urlencode "action=checkverifystatus" \
    --data-urlencode "guid=$GUID")

  RESULT=$(echo "$CHECK" | jq -r '.result')
  echo "Status: $RESULT"

  if [ "$RESULT" = "Pass - Verified" ]; then
    echo "Contract verified successfully!"
    break
  elif echo "$RESULT" | grep -qi "fail"; then
    echo "Verification failed: $RESULT"
    exit 1
  fi
done
