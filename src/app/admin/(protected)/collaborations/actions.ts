'use server'

import { eq } from 'drizzle-orm'
import type { ActionResult } from '@/lib/admin/action-result'
import { ValidationError } from '@/lib/admin/action-result'
import { bool, optionalId, str } from '@/lib/admin/form-data'
import { parseOrThrow, runAction } from '@/lib/admin/run-action'
import { collaborationSchema } from '@/lib/admin/schemas'
import { audit } from '@/lib/audit'
import { getDb } from '@/lib/db'
import { collaborationTypes } from '@/lib/db/schema'
import { loadSettings, saveSettings } from '@/lib/settings'
import { slugify } from '@/lib/utils'

export async function saveCollaborationAction(fd: FormData): Promise<ActionResult> {
  return runAction('content:manage', async (ctx) => {
    const id = optionalId(fd, 'id')
    const name = str(fd, 'name')
    const values = parseOrThrow(collaborationSchema, {
      name,
      slug: str(fd, 'slug') || slugify(name),
      summary: str(fd, 'summary'),
      description: str(fd, 'description'),
      status: str(fd, 'status') || 'draft',
      isSample: bool(fd, 'isSample'),
    })
    const db = getDb()
    let rowId = id
    if (id) {
      const updated = await db.update(collaborationTypes).set(values).where(eq(collaborationTypes.id, id)).returning({ id: collaborationTypes.id })
      if (!updated.length) throw new ValidationError('This collaboration type no longer exists.')
    } else {
      const [row] = await db.insert(collaborationTypes).values(values).returning({ id: collaborationTypes.id })
      rowId = row!.id
    }
    await audit({ actor: ctx.actor, action: id ? 'collaboration.updated' : 'collaboration.created', entityType: 'collaboration', entityId: rowId!, ip: ctx.ip })
    return id ? { ok: true, message: 'Saved.' } : { ok: true, message: 'Created.', redirectTo: `/admin/collaborations/${rowId}` }
  })
}

export async function deleteCollaborationAction(fd: FormData): Promise<ActionResult> {
  return runAction('content:manage', async (ctx) => {
    const id = optionalId(fd, 'id')
    if (!id) return { ok: false, message: 'Missing item.' }
    await getDb().delete(collaborationTypes).where(eq(collaborationTypes.id, id))
    await audit({ actor: ctx.actor, action: 'collaboration.deleted', entityType: 'collaboration', entityId: id, ip: ctx.ip })
    return { ok: true, message: 'Deleted.', redirectTo: '/admin/collaborations' }
  })
}

export async function setAvailabilityAction(fd: FormData): Promise<ActionResult> {
  return runAction('settings:manage', async (ctx) => {
    const settings = await loadSettings()
    const next = {
      ...settings,
      acceptingCollaborations: bool(fd, 'acceptingCollaborations'),
      acceptingProjects: bool(fd, 'acceptingProjects'),
      availabilityNote: str(fd, 'availabilityNote').slice(0, 160),
    }
    await saveSettings(next, ctx.user.id)
    await audit({
      actor: ctx.actor,
      action: 'settings.availability_updated',
      details: { acceptingCollaborations: next.acceptingCollaborations, acceptingProjects: next.acceptingProjects },
      ip: ctx.ip,
    })
    return { ok: true, message: 'Availability updated.' }
  })
}
