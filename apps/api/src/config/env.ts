import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.string().url().default('https://aayu-aura-admin.onrender.com'),
  ADMIN_WEB_URL: z.string().url().default('http://localhost:4200'),
  CUSTOMER_WEB_URL: z.string().url().default('http://localhost:4300'),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default(
      [
        'http://localhost:4200',
        'http://127.0.0.1:4200',
        'http://localhost:4300',
        'http://127.0.0.1:4300',
        'https://aayu-aura-admin-admin-web.vercel.app',
        'https://aayu-aura-admin-web.vercel.app',
        'https://www.aayuaura.com',
      ].join(','),
    ),
  CORS_ALLOWED_ORIGIN_PATTERNS: z
    .string()
    .default('^https:\\/\\/aayu-aura.*\\.vercel\\.app$'),
  MONGODB_URI: z.string().min(1).default('mongodb+srv://dipakahirav07_db_user:oTspWlcUIyvUNLt1@cluster0.enio5oh.mongodb.net/aayu_and_aura_admin?appName=Cluster0'),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32)
    .default('development-access-secret-change-before-production'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32)
    .default('development-refresh-secret-change-before-production'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  COOKIE_SECRET: z.string().min(32).default('development-cookie-secret-change-before-prod'),
  LOG_LEVEL: z.string().default('info'),
});

export const env = envSchema.parse(process.env);

export const corsAllowedOrigins = env.CORS_ALLOWED_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsAllowedOriginPatterns = env.CORS_ALLOWED_ORIGIN_PATTERNS.split(',')
  .map((pattern) => pattern.trim())
  .filter(Boolean)
  .map((pattern) => new RegExp(pattern));

const trustedDeploymentOrigins = new Set([
  'https://aayu-aura-admin-admin-web.vercel.app',
  'https://aayu-aura-admin-web.vercel.app',
]);

export function isCorsOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  if (trustedDeploymentOrigins.has(origin)) return true;
  if (origin === env.ADMIN_WEB_URL) return true;
  if (origin === env.CUSTOMER_WEB_URL) return true;
  if (corsAllowedOrigins.includes(origin)) return true;
  return corsAllowedOriginPatterns.some((pattern) => pattern.test(origin));
}
