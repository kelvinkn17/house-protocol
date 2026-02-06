import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  server: {
    SERVER_URL: z.string().url().optional(),
  },

  clientPrefix: 'VITE_',

  client: {
    VITE_APP_TITLE: z.string().min(1).optional(),
    VITE_API_URL: z.string().url().optional(),
    VITE_PRIVY_APP_ID: z.string().min(1),
    VITE_HOUSE_VAULT_ADDRESS: z.string().min(1).optional(),
    VITE_USDH_TOKEN_ADDRESS: z.string().min(1).optional(),
    VITE_NITROLITE_CUSTODY_ADDRESS: z.string().min(1).optional(),
  },

  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
})
