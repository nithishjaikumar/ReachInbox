import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z.string().default('4000'),

  DATABASE_URL: z.string(),

  REDIS_URL: z.string(),

  ELASTICSEARCH_URL: z.string(),
  ELASTICSEARCH_API_KEY: z.string(),

  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CALLBACK_URL: z.string(),

  SLACK_CLIENT_ID: z.string(),
  SLACK_CLIENT_SECRET: z.string(),
  SLACK_REDIRECT_URI: z.string(),

  ETHEREAL_HOST: z.string().default('smtp.ethereal.email'),
  ETHEREAL_PORT: z.coerce.number().default(587),
  ETHEREAL_USER: z.string().optional(),
  ETHEREAL_PASSWORD: z.string().optional(),

  SESSION_SECRET: z.string(),
  ENCRYPTION_KEY: z.string(),

  WORKER_CONCURRENCY: z.coerce.number().default(5),

  MIN_DELAY_BETWEEN_EMAILS_MS: z.coerce.number().default(2000),

  MAX_EMAILS_PER_HOUR_PER_SENDER: z.coerce.number().default(200),

  FRONTEND_URL: z.string().default('http://localhost:3000'),

  SLACK_NOTIFICATION_CHANNEL: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('Invalid environment variables', _env.error.format());
  process.exit(1);
}

export const env = _env.data;