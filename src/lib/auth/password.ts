/**
 * Password hashing with scrypt (Node.js built-in, no native dependencies).
 *
 * Parameters follow the OWASP Password Storage Cheat Sheet minimum for scrypt
 * (N=2^17, r=8, p=1). Parameters are stored with each hash so they can be raised
 * later; `needsRehash` reports hashes created with weaker settings.
 */
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'

const N = 2 ** 17
const R = 8
const P = 1
const KEY_LENGTH = 64
const SALT_BYTES = 16
const MAX_MEMORY = 256 * 1024 * 1024

export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 200

function scrypt(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password.normalize('NFKC'), salt, KEY_LENGTH, { N: n, r, p, maxmem: MAX_MEMORY }, (err, key) =>
      err ? reject(err) : resolve(key),
    )
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const key = await scrypt(password, salt, N, R, P)
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, n, r, p, saltB64, keyB64] = parts as [string, string, string, string, string, string]
  const expected = Buffer.from(keyB64, 'base64')
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), Number(n), Number(r), Number(p))
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function needsRehash(stored: string): boolean {
  const parts = stored.split('$')
  return parts[0] !== 'scrypt' || Number(parts[1]) < N || Number(parts[2]) < R
}

/**
 * Hash used to equalise timing when a login is attempted for an unknown e-mail
 * address, so response time does not reveal which accounts exist.
 */
let dummyHash: Promise<string> | undefined
export function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'))
  return dummyHash
}

const COMMON_PASSWORDS = new Set([
  'password1234',
  'password12345',
  'qwertyuiop12',
  '123456789012',
  '1234567890123',
  'administrator',
  'letmein12345',
  'welcome12345',
  'ravenwebstudio',
  'ravenwebstudio1',
  'changeme1234',
])

/** Returns a list of human-readable problems; empty when the password is acceptable. */
export function passwordProblems(password: string, context: { email?: string; name?: string } = {}): string[] {
  const problems: string[] = []
  if (password.length < PASSWORD_MIN_LENGTH) problems.push(`Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  if (password.length > PASSWORD_MAX_LENGTH) problems.push(`Use at most ${PASSWORD_MAX_LENGTH} characters.`)
  const lower = password.toLowerCase()
  if (COMMON_PASSWORDS.has(lower)) problems.push('This password is too common.')
  if (/^(.)\1+$/.test(password)) problems.push('Avoid repeating a single character.')
  const local = context.email?.split('@')[0]?.toLowerCase()
  if (local && local.length >= 4 && lower.includes(local)) problems.push('Do not include your e-mail address.')
  return problems
}
