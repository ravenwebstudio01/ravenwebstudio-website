'use server'

import { randomBytes } from 'node:crypto'
import { and, eq, ne } from 'drizzle-orm'
import { z } from '@/lib/zod'
import type { ActionResult } from '@/lib/admin/action-result'
import { ValidationError } from '@/lib/admin/action-result'
import { optionalId, str } from '@/lib/admin/form-data'
import { parseOrThrow, runAction } from '@/lib/admin/run-action'
import { audit } from '@/lib/audit'
import { normaliseEmail } from '@/lib/auth/login'
import { hashPassword } from '@/lib/auth/password'
import { revokeUserSessions } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { users } from '@/lib/db/schema'

const createSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name.').max(120),
  email: z.string().trim().email('Enter a valid e-mail address.').max(254),
  role: z.enum(['admin', 'editor']),
})

function temporaryPassword(): string {
  return randomBytes(15).toString('base64url')
}

async function activeAdminCount(excludeId?: string): Promise<number> {
  const rows = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, 'admin'), eq(users.isActive, true), excludeId ? ne(users.id, excludeId) : undefined))
  return rows.length
}

export async function createUserAction(fd: FormData): Promise<ActionResult> {
  return runAction('users:manage', async (ctx) => {
    const data = parseOrThrow(createSchema, { name: str(fd, 'name'), email: normaliseEmail(str(fd, 'email')), role: str(fd, 'role') })
    const password = temporaryPassword()
    const [row] = await getDb()
      .insert(users)
      .values({ ...data, passwordHash: await hashPassword(password) })
      .returning({ id: users.id })
    await audit({ actor: ctx.actor, action: 'user.created', entityType: 'user', entityId: row!.id, details: { role: data.role }, ip: ctx.ip })
    return {
      ok: true,
      message: `Account created for ${data.email}. Temporary password (shown once): ${password} — share it privately and ask them to change it under “My account”.`,
    }
  })
}

export async function updateUserAction(fd: FormData): Promise<ActionResult> {
  return runAction('users:manage', async (ctx) => {
    const id = optionalId(fd, 'id')
    const role = str(fd, 'role')
    const active = str(fd, 'isActive') === 'true'
    if (!id || !['admin', 'editor'].includes(role)) throw new ValidationError('Invalid request.')
    if (id === ctx.user.id && (role !== 'admin' || !active)) {
      return { ok: false, message: 'You cannot remove your own administrator access. Ask another administrator.' }
    }
    if ((role !== 'admin' || !active) && (await activeAdminCount(id)) === 0) {
      return { ok: false, message: 'At least one active administrator is required.' }
    }
    await getDb().update(users).set({ role: role as 'admin' | 'editor', isActive: active }).where(eq(users.id, id))
    if (!active) await revokeUserSessions(id)
    await audit({ actor: ctx.actor, action: 'user.updated', entityType: 'user', entityId: id, details: { role, active }, ip: ctx.ip })
    return { ok: true, message: active ? 'User updated.' : 'User deactivated and signed out everywhere.' }
  })
}

export async function resetUserPasswordAction(fd: FormData): Promise<ActionResult> {
  return runAction('users:manage', async (ctx) => {
    const id = optionalId(fd, 'id')
    if (!id) throw new ValidationError('Invalid request.')
    if (id === ctx.user.id) return { ok: false, message: 'Change your own password under “My account”.' }
    const password = temporaryPassword()
    const updated = await getDb()
      .update(users)
      .set({ passwordHash: await hashPassword(password), passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null })
      .where(eq(users.id, id))
      .returning({ email: users.email })
    if (!updated.length) return { ok: false, message: 'User not found.' }
    await revokeUserSessions(id)
    await audit({ actor: ctx.actor, action: 'user.password_reset_by_admin', entityType: 'user', entityId: id, ip: ctx.ip })
    return { ok: true, message: `New temporary password for ${updated[0]!.email} (shown once): ${password}` }
  })
}
