'use server'

import { eq } from 'drizzle-orm'
import type { ActionResult } from '@/lib/admin/action-result'
import { ValidationError } from '@/lib/admin/action-result'
import { optionalId, str } from '@/lib/admin/form-data'
import { runAction } from '@/lib/admin/run-action'
import { audit } from '@/lib/audit'
import { getDb } from '@/lib/db'
import { media, projectMedia, projects, services } from '@/lib/db/schema'
import { loadSettings } from '@/lib/settings'
import { storage } from '@/lib/storage'

export async function updateAltAction(fd: FormData): Promise<ActionResult> {
  return runAction('content:manage', async () => {
    const id = optionalId(fd, 'id')
    const alt = str(fd, 'alt').slice(0, 300)
    if (!id) return { ok: false, message: 'Missing image.' }
    if (!alt) throw new ValidationError('Describe the image.', { alt: 'Alternative text is required.' })
    await getDb().update(media).set({ altText: alt }).where(eq(media.id, id))
    return { ok: true, message: 'Saved.' }
  })
}

export async function deleteMediaAction(fd: FormData): Promise<ActionResult> {
  return runAction('content:manage', async (ctx) => {
    const id = optionalId(fd, 'id')
    if (!id) return { ok: false, message: 'Missing image.' }
    const db = getDb()
    const [inServices, inProjects, inGalleries, settings] = await Promise.all([
      db.select({ id: services.id }).from(services).where(eq(services.imageId, id)).limit(1),
      db.select({ id: projects.id }).from(projects).where(eq(projects.coverMediaId, id)).limit(1),
      db.select({ id: projectMedia.projectId }).from(projectMedia).where(eq(projectMedia.mediaId, id)).limit(1),
      loadSettings(),
    ])
    if (inServices.length || inProjects.length || inGalleries.length || settings.logoMediaId === id) {
      return { ok: false, message: 'This image is still used on the website. Remove it from the page first.' }
    }
    const [row] = await db.delete(media).where(eq(media.id, id)).returning()
    if (!row) return { ok: false, message: 'Image not found.' }
    for (const variant of row.variants) {
      try {
        await storage().delete(variant.key)
      } catch (error) {
        console.error('[media] could not delete stored file', (error as Error).message)
      }
    }
    await audit({ actor: ctx.actor, action: 'media.deleted', entityType: 'media', entityId: id, ip: ctx.ip })
    return { ok: true, message: 'Image deleted.' }
  })
}

