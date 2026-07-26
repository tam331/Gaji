import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_NAME: z.string().default('Gaji'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3003'),
  DRIZZLE_DATABASE_URL: z.string().url().optional(),
  STELLAR_NETWORK: z.enum(['testnet', 'public', 'futurenet']).default('testnet'),
  STELLAR_HORIZON_URL: z.string().url().default('https://horizon-testnet.stellar.org'),
  STELLAR_NETWORK_PASSPHRASE: z.string().default('Test SDF Network ; September 2015'),
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 chars')
    .default('gaji-demo-session-secret-change-before-production'),
  DEMO_MODE: z.coerce.boolean().default(true),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.issues);
  // Don't throw during build
}

export const env = parsed.success
  ? parsed.data
  : ({
      NODE_ENV: 'development',
      NEXT_PUBLIC_APP_NAME: 'Gaji',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3003',
      DRIZZLE_DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/stellar_agent_c',
      STELLAR_NETWORK: 'testnet' as const,
      STELLAR_HORIZON_URL: 'https://horizon-testnet.stellar.org',
      STELLAR_NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
      SESSION_SECRET: 'gaji-session-secret-stellar-apac-hackathon-2025',
      DEMO_MODE: true,
    } as z.infer<typeof envSchema>);
