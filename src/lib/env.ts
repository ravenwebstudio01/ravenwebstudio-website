/**
 * Centralised, validated access to environment variables.
 *
 * Values are parsed lazily so that `next build` does not fail when runtime-only
 * secrets are absent. Anything secret must never be prefixed with NEXT_PUBLIC_.
 */
import { z } from '@/lib/zod'

const bool = z
  .enum(['true', 'false', '1', '0', ''])
  .optional()
  .transform((v) => v === 'true' || v === '1')

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== '' ? v.trim() : undefined))

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SITE_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: optionalString,
  DATABASE_SSL: z.enum(['disable', 'require', 'verify']).default('disable'),
  DATABASE_CA_CERT: optionalString,
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
  SESSION_SECRET: optionalString,
  COOKIE_SECURE: optionalString,
  TRUST_PROXY: bool,
  SHOW_SAMPLE_CONTENT: bool,
  // Email (SMTP, any provider)
  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: bool,
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,
  MAIL_FROM: optionalString,
  // Storage
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./storage'),
  S3_ENDPOINT: optionalString,
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: optionalString,
  S3_ACCESS_KEY_ID: optionalString,
  S3_SECRET_ACCESS_KEY: optionalString,
  MEDIA_PUBLIC_BASE_URL: optionalString,
  // Analytics / search (admin settings take precedence when set)
  NEXT_PUBLIC_GA_MEASUREMENT_ID: optionalString,
  GOOGLE_SITE_VERIFICATION: optionalString,
  // Scheduled jobs
  CRON_SECRET: optionalString,
})

export type Env = z.infer<typeof envSchema>

let cached: Env | undefined

export function env(): Env {
  if (!cached) {
    const parsed = envSchema.safeParse(process.env)
    if (!parsed.success) {
      const fields = parsed.error.issues.map((i) => i.path.join('.')).join(', ')
      throw new Error(`Invalid environment configuration: ${fields}`)
    }
    cached = parsed.data
  }
  return cached
}

export function isProduction(): boolean {
  return env().NODE_ENV === 'production'
}

/** Secret used for HMAC operations (IP hashing, form tokens). */
export function sessionSecret(): string {
  const secret = env().SESSION_SECRET
  if (secret && secret.length >= 32) return secret
  if (isProduction()) {
    throw new Error('SESSION_SECRET must be set to at least 32 characters in production.')
  }
  // Development-only fallback so the app runs without configuration.
  return 'development-only-insecure-secret-change-me-0000'
}

export function siteUrl(): string {
  return env().SITE_URL.replace(/\/+$/, '')
}

export function smtpConfigured(): boolean {
  const e = env()
  return Boolean(e.SMTP_HOST && e.MAIL_FROM)
}

export function showSampleContent(): boolean {
  return env().SHOW_SAMPLE_CONTENT
}

/** For tests only. */
export function resetEnvCache() {
  cached = undefined
}
