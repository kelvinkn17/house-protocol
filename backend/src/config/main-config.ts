/**
 * Centralized configuration for the application
 * All commonly used environment variables should be defined here
 */

// Validate required environment variables on startup
const requiredEnvVars: string[] = ['DATABASE_URL', 'JWT_SECRET', 'PRIVY_APP_ID', 'PRIVY_APP_SECRET', 'OPERATOR_PRIVATE_KEY'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`FATAL: Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// App Configuration
export const APP_PORT: number = Number(process.env.APP_PORT) || 3700;
export const NODE_ENV: string = process.env.NODE_ENV || 'development';
export const IS_DEV: boolean = NODE_ENV === 'development';
export const IS_PROD: boolean = NODE_ENV === 'production';

// Database
export const DATABASE_URL: string = process.env.DATABASE_URL as string;

// Authentication (legacy JWT, still used for internal tokens if needed)
export const JWT_SECRET: string = process.env.JWT_SECRET as string;
export const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';

// Privy Configuration
export const PRIVY_APP_ID: string = process.env.PRIVY_APP_ID as string;
export const PRIVY_APP_SECRET: string = process.env.PRIVY_APP_SECRET as string;

// Vault / Chain Configuration
export const SEPOLIA_RPC_URL: string = process.env.SEPOLIA_RPC_URL || '';
export const HOUSE_VAULT_ADDRESS: string = process.env.HOUSE_VAULT_ADDRESS || '';
export const HOUSE_SESSION_ADDRESS: string = process.env.HOUSE_SESSION_ADDRESS || '';
export const USDH_TOKEN_ADDRESS: string = process.env.USDH_TOKEN_ADDRESS || '';
export const NITROLITE_CUSTODY_ADDRESS: string = process.env.NITROLITE_CUSTODY_ADDRESS || '';
export const BROKER_ADDRESS: string = process.env.BROKER_ADDRESS || '';
export const OPERATOR_PRIVATE_KEY: string = process.env.OPERATOR_PRIVATE_KEY || '';
export const ETHERSCAN_API_KEY: string = process.env.ETHERSCAN_API_KEY || '';

// Error Log Configuration
export const ERROR_LOG_MAX_RECORDS: number = 10000;
export const ERROR_LOG_CLEANUP_INTERVAL: string = '0 * * * *'; // Every hour

// Export all as default object for convenience
export default {
  APP_PORT,
  NODE_ENV,
  IS_DEV,
  IS_PROD,
  DATABASE_URL,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  PRIVY_APP_ID,
  PRIVY_APP_SECRET,
  ERROR_LOG_MAX_RECORDS,
  ERROR_LOG_CLEANUP_INTERVAL,
};
