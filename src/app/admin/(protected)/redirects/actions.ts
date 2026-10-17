'use server'

import { eq } from 'drizzle-orm'
import type { ActionResult } from '@/lib/admin/action-result'
import { bool, optionalId, str } from '@/lib/admin/form-data'
import { parseOrThrow, runAction } from '@/lib/admin/run-action'
import { redirectSchema } from '@/lib/admin/schemas'
import { audit } from '@/lib/audit'
import { getDb } from '@/lib/db'
import { redirects } from '@/lib/db/schema'

export async function addRedirectAction(fd: FormData): Promise<ActionResult> {
  return runAction('content:manage', async (ctx) => {
    const values = parseOrThrow(redirectSchema, {
      fromPath: str(fd, 'fromPath'),
      toPath: str(fd, 'toPath'),
      permanent: bool(fd, 'permanent'),
      note: str(fd, 'note'),
    })
    if (values.fromPath === values.toPath) return { ok: false, message: 'A page cannot redirect to itself.', fieldErrors: { toPath: 'Choose a different target.' } }
    await getDb().insert(redirects).values(values)
    await audit({ actor: ctx.actor, action: 'redirect.created', entityType: 'redirect', entityId: values.fromPath, details: { toPath: values.toPath }, ip: ctx.ip })
    return { ok: true, message: 'Redirect added.' }
  })
}

export async function deleteRedirectAction(fd: FormData): Promise<ActionResult> {
  return runAction('content:manage', async (ctx) => {
    const id = optionalId(fd, 'id')
    if (!id) return { ok: false, message: 'Missing redirect.' }
    await getDb().delete(redirects).where(eq(redirects.id, id))
    await audit({ actor: ctx.actor, action: 'redirect.deleted', entityType: 'redirect', entityId: id, ip: ctx.ip })
    return { ok: true, message: 'Redirect removed.' }
  })
}
