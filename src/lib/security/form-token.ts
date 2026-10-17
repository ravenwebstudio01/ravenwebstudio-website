/**
 * Signed timestamp embedded in public forms. Bots that post instantly or replay
 * forged tokens are filtered out without CAPTCHAs or third-party scripts.
 */
import { hmacHex, safeEqual } from './crypto'

export const MIN_FILL_MS = 3_000
export const MAX_AGE_MS = 24 * 3600_000

export function issueFormToken(now: number = Date.now()): string {
  const ts = String(now)
  return `${ts}.${hmacHex(`form:${ts}`).slice(0, 32)}`
}

export type FormTokenCheck = 'ok' | 'too_fast' | 'expired' | 'invalid'

export function checkFormToken(token: string | null | undefined, now: number = Date.now()): FormTokenCheck {
  if (!token || !/^\d{10,16}\.[0-9a-f]{32}$/.test(token)) return 'invalid'
  const [ts, sig] = token.split('.') as [string, string]
  if (!safeEqual(sig, hmacHex(`form:${ts}`).slice(0, 32))) return 'invalid'
  const age = now - Number(ts)
  if (age < 0) return 'invalid'
  if (age < MIN_FILL_MS) return 'too_fast'
  if (age > MAX_AGE_MS) return 'expired'
  return 'ok'
}
