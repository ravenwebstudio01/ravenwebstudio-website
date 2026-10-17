import { and, eq, type SQL } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { showSampleContent } from '@/lib/env'

/**
 * Public visibility rule shared by every content type:
 * published, and either real content or sample content explicitly enabled
 * (SHOW_SAMPLE_CONTENT=true in development/preview environments only).
 */
export function publiclyVisible(table: { status: AnyPgColumn; isSample: AnyPgColumn }): SQL {
  const published = eq(table.status, 'published')
  if (showSampleContent()) return published
  return and(published, eq(table.isSample, false))!
}
