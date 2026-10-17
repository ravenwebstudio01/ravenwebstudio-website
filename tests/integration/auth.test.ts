import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { auditLogs, sessions, users } from '@/lib/db/schema'
import { attemptLogin, createPasswordResetToken, resetPasswordWithToken } from '@/lib/auth/login'
import { hashPassword } from '@/lib/auth/password'
import { hitRateLimit } from '@/lib/security/rate-limit'
import { resetDatabase } from './setup'

const PASSWORD = 'a long and unusual passphrase'

async function createUser(email = 'admin@studio.test', active = true) {
  const [u] = await getDb()
    .insert(users)
    .values({ email, name: 'Admin', role: 'admin', passwordHash: await hashPassword(PASSWORD), isActive: active })
    .returning()
  return u!
}

describe('login', () => {
  beforeEach(resetDatabase)

  it('signs in with correct credentials (case-insensitive e-mail) and audits it', async () => {
    await createUser()
    const result = await attemptLogin('Admin@Studio.test ', PASSWORD, { ip: '203.0.113.5' })
    expect(result.ok).toBe(true)
    const logs = await getDb().select().from(auditLogs)
    expect(logs.map((l) => l.action)).toContain('auth.login_succeeded')
    // IPs are stored pseudonymised only.
    expect(JSON.stringify(logs)).not.toContain('203.0.113.5')
  })

  it('rejects wrong passwords, unknown and inactive accounts with the same answer', async () => {
    await createUser()
    await createUser('inactive@studio.test', false)
    expect(await attemptLogin('admin@studio.test', 'wrong password!!', { ip: '1.1.1.1' })).toEqual({ ok: false, reason: 'invalid' })
    expect(await attemptLogin('nobody@studio.test', PASSWORD, { ip: '1.1.1.1' })).toEqual({ ok: false, reason: 'invalid' })
    expect(await attemptLogin('inactive@studio.test', PASSWORD, { ip: '1.1.1.1' })).toEqual({ ok: false, reason: 'invalid' })
  })

  it('throttles an account after repeated failures, even with the right password', async () => {
    const user = await createUser()
    for (let i = 0; i < 5; i++) await attemptLogin('admin@studio.test', `wrong-${i}-password`, { ip: `10.0.0.${i}` })
    const [row] = await getDb().select().from(users).where(eq(users.id, user.id))
    expect(row!.failedLoginCount).toBe(5)
    expect(row!.lockedUntil).not.toBe(null)
    expect(await attemptLogin('admin@studio.test', PASSWORD, { ip: '10.0.0.99' })).toEqual({ ok: false, reason: 'throttled' })
  })

  it('rate-limits by e-mail address across IPs', async () => {
    for (let i = 0; i < 10; i++) await attemptLogin('target@studio.test', 'whatever-password', { ip: `192.0.2.${i}` })
    expect(await attemptLogin('target@studio.test', 'whatever-password', { ip: '192.0.2.200' })).toEqual({ ok: false, reason: 'throttled' })
  })
})

describe('password reset', () => {
  beforeEach(resetDatabase)

  it('issues single-use tokens, enforces the policy and signs out all sessions', async () => {
    const user = await createUser()
    await getDb().insert(sessions).values({ id: 'a'.repeat(64), userId: user.id, expiresAt: new Date(Date.now() + 3600_000) })
    const created = await createPasswordResetToken('admin@studio.test', { ip: '1.2.3.4' })
    expect(created?.token).toBeTruthy()
    expect(await resetPasswordWithToken(created!.token, 'short', { ip: '1.2.3.4' })).toEqual({ ok: false, error: 'weak_password', problems: ['Use at least 12 characters.'] })
    expect(await resetPasswordWithToken(created!.token, 'another unusual passphrase', { ip: '1.2.3.4' })).toEqual({ ok: true })
    expect(await resetPasswordWithToken(created!.token, 'yet another passphrase!', { ip: '1.2.3.4' })).toEqual({ ok: false, error: 'invalid_token' })
    expect(await getDb().select().from(sessions).where(eq(sessions.userId, user.id))).toHaveLength(0)
    expect((await attemptLogin('admin@studio.test', 'another unusual passphrase', { ip: '1.2.3.4' })).ok).toBe(true)
  })

  it('does not reveal whether an account exists', async () => {
    expect(await createPasswordResetToken('ghost@studio.test', { ip: '1.2.3.4' })).toBe(null)
  })
})

describe('rate limiter', () => {
  beforeEach(resetDatabase)

  it('allows up to the limit within a window, then blocks', async () => {
    const results = []
    for (let i = 0; i < 4; i++) results.push(await hitRateLimit('test:key', 3, 60))
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false])
    expect(results[3]!.retryAfterSeconds).toBeGreaterThan(0)
  })
})
