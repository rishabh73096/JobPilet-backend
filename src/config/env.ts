import { z } from 'zod'
import dotenv from 'dotenv'
dotenv.config()

// process.env values are always strings — an unset .env var comes through as '',
// not undefined, which breaks `.optional()` combined with format validators like
// `.url()`. Normalize blank strings to undefined before those run.
const optionalUrl = z.preprocess(
  (val) => (val === '' ? undefined : val),
  z.string().url().optional()
)

const schema = z.object({
  PORT: z.string().default('4000'),
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  REDIS_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string(),
  RESEND_API_KEY: z.string(),
  EMAIL_FROM: z.string().email(),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  FRONTEND_URL: z.string().url(),
  API_URL: z.string().url(),
  SENTRY_DSN: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),
  RESUME_CDN_URL: optionalUrl,
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)  // Server won't start with missing config
}

export const env = parsed.data
