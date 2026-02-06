import { encodePacked, sha256 } from "viem";

const playerAddress = "0x24C4B9DeF461F9B7DfC1f72D09662C8F0E2825d3" as const;
const seed = 123456789n;

const hash = sha256(
    encodePacked(["uint256", "address"], [seed, playerAddress])
);

console.log("Player:", playerAddress);
console.log("Seed:", seed.toString());
console.log("SHA256 Hash:", hash);
