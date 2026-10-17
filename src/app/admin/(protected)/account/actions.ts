'use server'

import { eq } from 'drizzle-orm'
import type { ActionResult } from '@/lib/admin/action-result'
import { ValidationError } from '@/lib/admin/action-result'
import { requireActionUser, AuthorizationError } from '@/lib/auth/guards'
import { audit } from '@/lib/audit'
import { hashPassword, passwordProblems, verifyPassword } from '@/lib/auth/password'
import { revokeUserSessions } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { requestMeta } from '@/lib/request'
import { hitRateLimit } from '@/lib/security/rate-limit'

// Any signed-in role may manage its own account (every role has media:upload).
const currentUser = () => requireActionUser('media:upload')

export async function changePasswordAction(fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await currentUser()
    const meta = await requestMeta()
    const current = String(fd.get('current') ?? '')
    const next = String(fd.get('password') ?? '')
    const confirm = String(fd.get('confirm') ?? '')
    const limit = await hitRateLimit(`pwchange:user:${ctx.user.id}`, 10, 3600)
    if (!limit.allowed) return { ok: false, message: 'Too many attempts. Try again later.' }
    if (next !== confirm) throw new ValidationError('The new passwords do not match.', { confirm: 'Repeat the same password.' })
    const problems = passwordProblems(next, { email: ctx.user.email, name: ctx.user.name })
    if (problems.length) throw new ValidationError('Choose a stronger password.', { password: problems.join(' ') })
    const [row] = await getDb().select({ hash: users.passwordHash }).from(users).where(eq(users.id, ctx.user.id))
    if (!row || !(await verifyPassword(current, row.hash))) {
      await audit({ actor: { id: ctx.user.id, email: ctx.user.email }, action: 'auth.password_change_failed', ip: meta.ip })
      throw new ValidationError('Your current password is incorrect.', { current: 'Incorrect password.' })
    }
    await getDb().update(users).set({ passwordHash: await hashPassword(next), passwordChangedAt: new Date() }).where(eq(users.id, ctx.user.id))
    await revokeUserSessions(ctx.user.id, ctx.sessionId)
    await audit({ actor: { id: ctx.user.id, email: ctx.user.email }, action: 'auth.password_changed', ip: meta.ip })
    return { ok: true, message: 'Password changed. Other devices were signed out.' }
  } catch (error) {
    if (error instanceof ValidationError) return { ok: false, message: error.message, fieldErrors: error.fieldErrors }
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    console.error('[account] password change failed', (error as Error).message)
    return { ok: false, message: 'The password could not be changed. Try again.' }
  }
}

export async function signOutOtherSessionsAction(): Promise<ActionResult> {
  try {
    const ctx = await currentUser()
    await revokeUserSessions(ctx.user.id, ctx.sessionId)
    const meta = await requestMeta()
    await audit({ actor: { id: ctx.user.id, email: ctx.user.email }, action: 'auth.other_sessions_revoked', ip: meta.ip })
    return { ok: true, message: 'All other sessions were signed out.' }
  } catch (error) {
    return { ok: false, message: error instanceof AuthorizationError ? error.message : 'Could not sign out other sessions.' }
  }
}
