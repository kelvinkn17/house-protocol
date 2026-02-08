// contract ABIs and factory for public client
// no import.meta.env, addresses come from HouseConfig

import { createPublicClient, http, parseAbi, type Address } from 'viem'
import { sepolia } from 'viem/chains'

export const SEPOLIA_CHAIN_ID = 11155111

export const CUSTODY_ABI = parseAbi([
  'function deposit(address account, address token, uint256 amount) payable',
  'function withdraw(address token, uint256 amount)',
  'function getAccountsBalances(address[] accounts, address[] tokens) view returns (uint256[][])',
])

export const VAULT_ABI = parseAbi([
  'function deposit(uint256 assets, address receiver) returns (uint256)',
  'function redeem(uint256 shares, address receiver, address owner) returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function convertToAssets(uint256 shares) view returns (uint256)',
  'function convertToShares(uint256 assets) view returns (uint256)',
  'function previewDeposit(uint256 assets) view returns (uint256)',
  'function previewRedeem(uint256 shares) view returns (uint256)',
  'function decimals() view returns (uint8)',
])

export const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
])

export const HOUSE_SESSION_ABI = parseAbi([
  'function sessionExists(address player) view returns (bool)',
  'function getSessionHash(address player) view returns (bytes32)',
])

export const USDH_MINT_ABI = parseAbi([
  'function mint(address to, uint256 amount)',
])

let _publicClient: ReturnType<typeof createPublicClient> | null = null

export function getPublicClient(rpcUrl?: string) {
  if (!_publicClient) {
    _publicClient = createPublicClient({
      chain: sepolia,
      transport: http(rpcUrl),
    })
  }
  return _publicClient
}
