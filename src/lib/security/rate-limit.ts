/**
 * Fixed-window rate limiting backed by PostgreSQL.
 *
 * Using the existing database keeps limits consistent across serverless
 * instances without adding Redis. Each hit is a single atomic upsert.
 * Keys must not contain raw personal data — pass pseudonymised values.
 */
import { lt, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { rateLimits } from '@/lib/db/schema'

export type RateLimitResult = { allowed: boolean; count: number; limit: number; retryAfterSeconds: number }

export async function hitRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const windowMs = windowSeconds * 1000
  const now = Date.now()
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs)
  const rows = await getDb()
    .insert(rateLimits)
    .values({ key: key.slice(0, 200), windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count })
  const count = rows[0]?.count ?? 1
  const retryAfterSeconds = Math.max(1, Math.ceil((windowStart.getTime() + windowMs - now) / 1000))
  return { allowed: count <= limit, count, limit, retryAfterSeconds }
}

/** Checks several limits; all are counted, the request is allowed only if every one allows it. */
export async function hitRateLimits(
  checks: { key: string; limit: number; windowSeconds: number }[],
): Promise<RateLimitResult> {
  const results = await Promise.all(checks.map((c) => hitRateLimit(c.key, c.limit, c.windowSeconds)))
  const blocked = results.filter((r) => !r.allowed)
  if (blocked.length === 0) return results[0] ?? { allowed: true, count: 0, limit: 0, retryAfterSeconds: 0 }
  return blocked.reduce((a, b) => (a.retryAfterSeconds >= b.retryAfterSeconds ? a : b))
}

export async function purgeExpiredRateLimits(olderThanHours = 48): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanHours * 3600_000)
  const deleted = await getDb().delete(rateLimits).where(lt(rateLimits.windowStart, cutoff)).returning({ key: rateLimits.key })
  return deleted.length
}
