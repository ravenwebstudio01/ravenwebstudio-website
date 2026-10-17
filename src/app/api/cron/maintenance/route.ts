import { env } from '@/lib/env'
import { runMaintenance } from '@/lib/maintenance'
import { safeEqual } from '@/lib/security/crypto'

export const dynamic = 'force-dynamic'

/**
 * Daily housekeeping (data retention, expired sessions, rate-limit rows).
 * Vercel Cron calls this with "Authorization: Bearer $CRON_SECRET".
 */
export async function GET(request: Request) {
  const secret = env().CRON_SECRET
  const header = request.headers.get('authorization') ?? ''
  if (!secret || !safeEqual(header, `Bearer ${secret}`)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const report = await runMaintenance()
    return Response.json({ status: 'ok', report })
  } catch (error) {
    console.error('[cron] maintenance failed', (error as Error).message)
    return Response.json({ status: 'error' }, { status: 500 })
  }
}
