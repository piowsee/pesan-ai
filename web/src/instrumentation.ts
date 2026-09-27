import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),

  // Better-Auth
  BETTER_AUTH_SECRET: z.string().min(1, 'BETTER_AUTH_SECRET is required'),
  BETTER_AUTH_URL: z.string().url('BETTER_AUTH_URL must be a valid URL'),

  // encryption key (must be exactly 32 chars)
  ENCRYPTION_KEY: z
    .string()
    .length(32, 'ENCRYPTION_KEY must be exactly 32 characters'),

  // Webhook Token
  META_WEBHOOK_SECRET: z.string().min(1, 'META_WEBHOOK_SECRET is required'),

  // Our Meta App credentials
  NEXT_PUBLIC_META_APP_ID: z
    .string()
    .min(1, 'NEXT_PUBLIC_META_APP_ID is required'),
  META_APP_SECRET: z.string().min(1, 'META_APP_SECRET is required'),

  // Embedded Sign Up Config ID
  NEXT_PUBLIC_FACEBOOK_CONFIG_ID: z
    .string()
    .min(1, 'NEXT_PUBLIC_FACEBOOK_CONFIG_ID is required'),

  // Email App
  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
  SMTP_PORT: z.string().min(1, 'SMTP_PORT is required'),
  SMTP_USER: z.string().min(1, 'SMTP_USER is required'),
  SMTP_PASS: z.string().min(1, 'SMTP_PASS is required'),

  // Logger
  LOG_LEVEL: z.string().optional().default('info'),

  // Object Storage - S3 compatible
  BUCKET_NAME: z.string().min(1, 'BUCKET_NAME is required'),
  BUCKET_ENDPOINT: z.string().url('BUCKET_ENDPOINT must be a valid URL'),
  BUCKET_PATH: z.string().min(1, 'BUCKET_PATH is required'),
  BUCKET_ACCESS_KEY: z.string().min(1, 'BUCKET_ACCESS_KEY is required'),
  BUCKET_SECRET_KEY: z.string().min(1, 'BUCKET_SECRET_KEY is required'),
});

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
      console.error(
        'Invalid environment variables:',
        JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
      );
      process.exit(1);
    }
  }
}
