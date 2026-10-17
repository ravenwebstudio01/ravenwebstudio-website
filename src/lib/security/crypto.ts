import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { sessionSecret } from '@/lib/env'

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export function hmacHex(value: string, secret: string = sessionSecret()): string {
  return createHmac('sha256', secret).update(value, 'utf8').digest('hex')
}

/** URL-safe random token with `bytes` bytes of entropy. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/**
 * Pseudonymised identifier for an IP address or e-mail address. Used for rate
 * limiting and audit logs so raw addresses are never stored.
 */
export function pseudonymise(value: string, purpose: string): string {
  return hmacHex(`${purpose}:${value.trim().toLowerCase()}`).slice(0, 32)
}
