import 'server-only'
import { headers } from 'next/headers'
import { env } from '@/lib/env'

/**
 * Best-effort client IP. Forwarding headers are only trusted behind a known
 * proxy (Vercel sets VERCEL=1; self-hosted deployments behind a reverse proxy
 * set TRUST_PROXY=true). Otherwise the value is "unknown".
 */
export function clientIpFromHeaders(h: Headers): string {
  const trusted = env().TRUST_PROXY || process.env.VERCEL === '1'
  if (trusted) {
    const forwarded = h.get('x-forwarded-for')
    if (forwarded) {
      const first = forwarded.split(',')[0]?.trim()
      if (first) return first.slice(0, 64)
    }
    const real = h.get('x-real-ip')
    if (real) return real.trim().slice(0, 64)
  }
  return 'unknown'
}

export async function requestMeta(): Promise<{ ip: string; userAgent: string }> {
  const h = await headers()
  return { ip: clientIpFromHeaders(h), userAgent: (h.get('user-agent') ?? '').slice(0, 300) }
}
