import { sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** Liveness + database readiness probe for uptime monitors and container health checks. */
export async function GET() {
  const started = Date.now()
  try {
    await getDb().execute(sql`select 1`)
    return Response.json(
      { status: 'ok', database: 'ok', latencyMs: Date.now() - started },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return Response.json({ status: 'degraded', database: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
