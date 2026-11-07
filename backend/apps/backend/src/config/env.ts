import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default('postgresql://postgres:postgrespassword@localhost:5432/sirkula_db'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  OPENWEATHER_API_KEY: z.string().default('mock-openweather-key'),
  GEMINI_API_KEY: z.string().default('mock-gemini-key'),
  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().optional(),
  AI_MODEL: z.string().default('ag/gemini-3.8-flash-high'),
  HMAC_SECRET_KEY: z.string().default('sirkula-super-secure-hmac-secret-key-32chars'),
  JWT_SECRET: z.string().default('sirkula-jwt-secret-key-minimum-32chars'),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

let cachedEnv: EnvConfig | null = null;

export function getEnv(): EnvConfig {
  if (cachedEnv) return cachedEnv;

  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Environment validation error:', result.error.format());
    throw new Error('Invalid environment configuration');
  }

  cachedEnv = result.data;
  return cachedEnv;
}
