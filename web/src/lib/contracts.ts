import { createPublicClient, http, parseAbi, type Address } from 'viem'
import { sepolia } from 'viem/chains'

export const VAULT_ADDRESS = (import.meta.env.VITE_HOUSE_VAULT_ADDRESS || '') as Address
export const USDH_ADDRESS = (import.meta.env.VITE_USDH_TOKEN_ADDRESS || '') as Address
export const CUSTODY_ADDRESS = (import.meta.env.VITE_NITROLITE_CUSTODY_ADDRESS || '') as Address
export const SEPOLIA_CHAIN_ID = 11155111

// Nitrolite custody: deposit USDH before opening a state channel session
export const CUSTODY_ABI = parseAbi([
  'function deposit(address account, address token, uint256 amount) payable',
  'function withdraw(address token, uint256 amount)',
])

// ERC-4626 vault: deposit, withdraw, and read functions
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
  'function decimals() view returns (uint8)',
])

let _publicClient: ReturnType<typeof createPublicClient> | null = null

export function getPublicClient() {
  if (!_publicClient) {
    _publicClient = createPublicClient({
      chain: sepolia,
      transport: http(),
    })
  }
  return _publicClient
}
