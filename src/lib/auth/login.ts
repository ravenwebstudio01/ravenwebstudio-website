/**
 * Login and password-reset business logic (framework independent so it can be
 * integration-tested against a real database).
 */
import { and, eq, gt, isNull } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { passwordResetTokens, sessions, users } from '@/lib/db/schema'
import { audit } from '@/lib/audit'
import { hitRateLimits } from '@/lib/security/rate-limit'
import { pseudonymise, randomToken, sha256Hex } from '@/lib/security/crypto'
import { LOCKOUT_MAX_MS, LOCKOUT_THRESHOLD, RESET_TOKEN_TTL_MS } from './constants'
import { dummyPasswordHash, hashPassword, needsRehash, passwordProblems, verifyPassword } from './password'
import type { Role } from './permissions'

export type LoginResult =
  | { ok: true; user: { id: string; email: string; name: string; role: Role } }
  | { ok: false; reason: 'invalid' | 'throttled' }

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function attemptLogin(emailInput: string, password: string, meta: { ip: string }): Promise<LoginResult> {
  const email = normaliseEmail(emailInput)
  const limit = await hitRateLimits([
    { key: `login:ip:${pseudonymise(meta.ip, 'ip')}`, limit: 30, windowSeconds: 900 },
    { key: `login:email:${pseudonymise(email, 'email')}`, limit: 10, windowSeconds: 900 },
  ])
  if (!limit.allowed) {
    await audit({ actor: null, action: 'auth.login_throttled', details: { emailHash: pseudonymise(email, 'email') }, ip: meta.ip })
    return { ok: false, reason: 'throttled' }
  }

  const db = getDb()
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

  if (!user || !user.isActive) {
    // Spend the same time as a real verification to avoid account enumeration.
    await verifyPassword(password, await dummyPasswordHash())
    await audit({
      actor: null,
      action: 'auth.login_failed',
      details: { reason: user ? 'inactive' : 'unknown_account', emailHash: pseudonymise(email, 'email') },
      ip: meta.ip,
    })
    return { ok: false, reason: 'invalid' }
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    await audit({ actor: { id: user.id, email: user.email }, action: 'auth.login_locked', ip: meta.ip })
    return { ok: false, reason: 'throttled' }
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    const failed = user.failedLoginCount + 1
    const lockMs =
      failed >= LOCKOUT_THRESHOLD ? Math.min(2 ** (failed - LOCKOUT_THRESHOLD) * 60_000, LOCKOUT_MAX_MS) : 0
    await db
      .update(users)
      .set({ failedLoginCount: failed, lockedUntil: lockMs ? new Date(Date.now() + lockMs) : null })
      .where(eq(users.id, user.id))
    await audit({
      actor: { id: user.id, email: user.email },
      action: 'auth.login_failed',
      details: { reason: 'wrong_password', failedCount: failed },
      ip: meta.ip,
    })
    return { ok: false, reason: 'invalid' }
  }

  const update: Partial<typeof users.$inferInsert> = { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() }
  if (needsRehash(user.passwordHash)) update.passwordHash = await hashPassword(password)
  await db.update(users).set(update).where(eq(users.id, user.id))
  await audit({ actor: { id: user.id, email: user.email }, action: 'auth.login_succeeded', ip: meta.ip })
  return { ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } }
}

/** Creates a reset token for an active account. Returns null when no e-mail should be sent. */
export async function createPasswordResetToken(
  emailInput: string,
  meta: { ip: string },
): Promise<{ token: string; user: { id: string; email: string; name: string } } | null> {
  const email = normaliseEmail(emailInput)
  const limit = await hitRateLimits([
    { key: `reset:ip:${pseudonymise(meta.ip, 'ip')}`, limit: 10, windowSeconds: 3600 },
    { key: `reset:email:${pseudonymise(email, 'email')}`, limit: 3, windowSeconds: 3600 },
  ])
  if (!limit.allowed) return null

  const db = getDb()
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user || !user.isActive) return null

  const token = randomToken(32)
  await db.transaction(async (tx) => {
    // Only the newest link stays valid.
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id))
    await tx.insert(passwordResetTokens).values({
      tokenHash: sha256Hex(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    })
  })
  await audit({ actor: { id: user.id, email: user.email }, action: 'auth.password_reset_requested', ip: meta.ip })
  return { token, user: { id: user.id, email: user.email, name: user.name } }
}

export type ResetResult = { ok: true } | { ok: false; error: 'invalid_token' | 'weak_password'; problems?: string[] }

export async function resetPasswordWithToken(token: string, newPassword: string, meta: { ip: string }): Promise<ResetResult> {
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(token)) return { ok: false, error: 'invalid_token' }
  const db = getDb()
  const [row] = await db
    .select({ id: passwordResetTokens.id, userId: users.id, email: users.email, name: users.name })
    .from(passwordResetTokens)
    .innerJoin(users, eq(users.id, passwordResetTokens.userId))
    .where(
      and(
        eq(passwordResetTokens.tokenHash, sha256Hex(token)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
        eq(users.isActive, true),
      ),
    )
    .limit(1)
  if (!row) return { ok: false, error: 'invalid_token' }

  const problems = passwordProblems(newPassword, { email: row.email, name: row.name })
  if (problems.length > 0) return { ok: false, error: 'weak_password', problems }

  const passwordHash = await hashPassword(newPassword)
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash, passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null })
      .where(eq(users.id, row.userId))
    await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id))
    // Signing out everywhere after a reset protects against a compromised session.
    await tx.delete(sessions).where(eq(sessions.userId, row.userId))
  })
  await audit({ actor: { id: row.userId, email: row.email }, action: 'auth.password_reset_completed', ip: meta.ip })
  return { ok: true }
}
