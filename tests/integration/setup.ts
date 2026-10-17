import path from 'node:path'
import { afterAll, beforeAll } from 'vitest'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'

// Integration tests run against a dedicated database (never the development one).
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
process.env.SESSION_SECRET ??= 'integration-test-secret-0123456789abcdefghij'
process.env.SHOW_SAMPLE_CONTENT = 'false'
// Keep e-mail out of integration tests unless a test opts in.
delete process.env.SMTP_HOST

const { closeDb, getDb } = await import('@/lib/db')

beforeAll(async () => {
  await migrate(getDb(), { migrationsFolder: path.join(process.cwd(), 'drizzle') })
})

afterAll(async () => {
  await closeDb()
})

export async function resetDatabase() {
  await getDb().execute(sql`
    TRUNCATE TABLE
      inquiry_notes, inquiry_services, inquiries, offer_services, offers, budget_tier_services, budget_tiers,
      collaboration_types, project_media, project_services, projects, project_categories, service_relations,
      services, service_categories, media, content_blocks, site_settings, redirects, audit_logs, rate_limits,
      password_reset_tokens, sessions, users
    RESTART IDENTITY CASCADE
  `)
}
