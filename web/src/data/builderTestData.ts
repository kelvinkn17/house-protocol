// dummy data for builder dashboard demos
// only used when VITE_BUILDERS_TEST=true

const now = Date.now()
const day = 86400000

export const TEST_BUILDER = {
  id: 'builder_test_001',
  name: 'Kwek Labs',
  website: 'https://kwek.dev',
  email: 'team@kwek.dev',
  walletAddress: '0x1234...abcd',
  totalRevenue: 1512.52,
  totalGames: 2,
  activeGames: 2,
  createdAt: new Date(now - 30 * day).toISOString(),
}

export const TEST_GAMES = [
  {
    id: 'game_001',
    slug: 'lucky-flip',
    name: 'Lucky Flip',
    gameType: 'pick-one',
    description: 'Classic coinflip with a twist. Pick heads or tails, double your money.',
    isActive: true,
    houseEdgeBps: 200,
    totalVolume: 24350,
    totalRevenue: 1087.24,
    totalBets: 31,
    createdAt: new Date(now - 21 * day).toISOString(),
  },
  {
    id: 'game_002',
    slug: 'dice-royale',
    name: 'Dice Royale',
    gameType: 'pick-number',
    description: 'Roll the dice, set your target. Higher risk, bigger reward.',
    isActive: true,
    houseEdgeBps: 250,
    totalVolume: 8720,
    totalRevenue: 425.28,
    totalBets: 11,
    createdAt: new Date(now - 14 * day).toISOString(),
  },
]

export const TEST_API_KEYS = [
  {
    id: 'key_live_001',
    environment: 'live',
    prefix: 'hp_live_9f3k',
    isActive: true,
    createdAt: new Date(now - 14 * day).toISOString(),
    lastUsedAt: new Date(now - 1 * day).toISOString(),
  },
  {
    id: 'key_test_001',
    environment: 'test',
    prefix: 'hp_test_x7m2',
    isActive: true,
    createdAt: new Date(now - 28 * day).toISOString(),
    lastUsedAt: new Date(now - 3 * day).toISOString(),
  },
]

export const isBuilderTestMode = () =>
  import.meta.env.VITE_BUILDERS_TEST === 'true'
