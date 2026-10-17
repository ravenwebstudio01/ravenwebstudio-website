'use server'

import { and, asc, eq } from 'drizzle-orm'
import type { ActionResult } from '@/lib/admin/action-result'
import { ValidationError } from '@/lib/admin/action-result'
import { bool, ids, lines, optionalId, str } from '@/lib/admin/form-data'
import { clearRedirectFrom, recordSlugChange } from '@/lib/admin/redirects'
import { parseOrThrow, runAction } from '@/lib/admin/run-action'
import { projectSchema } from '@/lib/admin/schemas'
import { audit } from '@/lib/audit'
import { getDb } from '@/lib/db'
import { media, projectMedia, projects, projectServices } from '@/lib/db/schema'
import { slugify } from '@/lib/utils'

export async function saveProjectAction(fd: FormData): Promise<ActionResult> {
  return runAction('content:manage', async (ctx) => {
    const id = optionalId(fd, 'id')
    const title = str(fd, 'title')
    const data = parseOrThrow(projectSchema, {
      title,
      slug: str(fd, 'slug') || slugify(title),
      clientName: str(fd, 'clientName'),
      clientNameApproved: bool(fd, 'clientNameApproved'),
      summary: str(fd, 'summary'),
      description: str(fd, 'description'),
      categoryId: optionalId(fd, 'categoryId'),
      projectUrl: str(fd, 'projectUrl'),
      technologies: lines(fd, 'technologies'),
      completedOn: str(fd, 'completedOn'),
      goals: str(fd, 'goals'),
      deliverables: lines(fd, 'deliverables'),
      results: str(fd, 'results'),
      resultsVerified: bool(fd, 'resultsVerified'),
      featured: bool(fd, 'featured'),
      coverMediaId: optionalId(fd, 'coverMediaId'),
      serviceIds: ids(fd, 'serviceIds'),
      status: str(fd, 'status') || 'draft',
      isSample: bool(fd, 'isSample'),
      seoTitle: str(fd, 'seoTitle'),
      seoDescription: str(fd, 'seoDescription'),
    })
    const { serviceIds, completedOn, ...rest } = data
    const values = { ...rest, completedOn: completedOn || null }
    const db = getDb()
    let projectId = id
    await db.transaction(async (tx) => {
      if (id) {
        const [existing] = await tx.select({ slug: projects.slug, status: projects.status, publishedAt: projects.publishedAt }).from(projects).where(eq(projects.id, id))
        if (!existing) throw new ValidationError('This project no longer exists.')
        await tx
          .update(projects)
          .set({ ...values, publishedAt: values.status === 'published' ? (existing.publishedAt ?? new Date()) : existing.publishedAt })
          .where(eq(projects.id, id))
        if (existing.slug !== values.slug && existing.status === 'published') {
          await recordSlugChange(tx, `/work/${existing.slug}`, `/work/${values.slug}`)
        }
      } else {
        const [row] = await tx
          .insert(projects)
          .values({ ...values, publishedAt: values.status === 'published' ? new Date() : null })
          .returning({ id: projects.id })
        projectId = row!.id
      }
      await clearRedirectFrom(tx, `/work/${values.slug}`)
      await tx.delete(projectServices).where(eq(projectServices.projectId, projectId!))
      if (serviceIds.length) await tx.insert(projectServices).values(serviceIds.map((serviceId) => ({ projectId: projectId!, serviceId })))
    })
    await audit({ actor: ctx.actor, action: id ? 'project.updated' : 'project.created', entityType: 'project', entityId: projectId!, details: { status: values.status, slug: values.slug }, ip: ctx.ip })
    const note = values.clientName && !values.clientNameApproved ? ' The client name stays hidden until you confirm permission.' : ''
    return id ? { ok: true, message: `Project saved.${note}` } : { ok: true, message: 'Project created.', redirectTo: `/admin/projects/${projectId}` }
  })
}

export async function deleteProjectAction(fd: FormData): Promise<ActionResult> {
  return runAction('content:manage', async (ctx) => {
    const id = optionalId(fd, 'id')
    if (!id) return { ok: false, message: 'Missing project.' }
    const deleted = await getDb().delete(projects).where(eq(projects.id, id)).returning({ slug: projects.slug })
    if (!deleted.length) return { ok: false, message: 'Project not found.' }
    await audit({ actor: ctx.actor, action: 'project.deleted', entityType: 'project', entityId: id, details: { slug: deleted[0]!.slug }, ip: ctx.ip })
    return { ok: true, message: 'Project deleted.', redirectTo: '/admin/projects' }
  })
}

export async function addProjectImageAction(fd: FormData): Promise<ActionResult> {
  return runAction('content:manage', async (ctx) => {
    const projectId = optionalId(fd, 'projectId')
    const mediaId = optionalId(fd, 'mediaId')
    if (!projectId || !mediaId) return { ok: false, message: 'Missing image.' }
    const db = getDb()
    const existing = await db.select({ order: projectMedia.displayOrder }).from(projectMedia).where(eq(projectMedia.projectId, projectId)).orderBy(asc(projectMedia.displayOrder))
    await db
      .insert(projectMedia)
      .values({ projectId, mediaId, displayOrder: (existing.at(-1)?.order ?? 0) + 1, caption: str(fd, 'caption').slice(0, 200) })
      .onConflictDoNothing()
    await audit({ actor: ctx.actor, action: 'project.image_added', entityType: 'project', entityId: projectId, details: { mediaId }, ip: ctx.ip })
    return { ok: true, message: 'Image added.' }
  })
}

export async function updateProjectImageAction(fd: FormData): Promise<ActionResult> {
  return runAction('content:manage', async () => {
    const projectId = optionalId(fd, 'projectId')
    const mediaId = optionalId(fd, 'mediaId')
    if (!projectId || !mediaId) return { ok: false, message: 'Missing image.' }
    const caption = str(fd, 'caption').slice(0, 200)
    const alt = str(fd, 'alt').slice(0, 300)
    if (!alt) throw new ValidationError('Describe the image.', { alt: 'Alternative text is required.' })
    const db = getDb()
    await db.update(projectMedia).set({ caption }).where(and(eq(projectMedia.projectId, projectId), eq(projectMedia.mediaId, mediaId)))
    await db.update(media).set({ altText: alt }).where(eq(media.id, mediaId))
    return { ok: true, message: 'Image details saved.' }
  })
}

export async function removeProjectImageAction(fd: FormData): Promise<ActionResult> {
  return runAction('content:manage', async (ctx) => {
    const projectId = optionalId(fd, 'projectId')
    const mediaId = optionalId(fd, 'mediaId')
    if (!projectId || !mediaId) return { ok: false, message: 'Missing image.' }
    await getDb().delete(projectMedia).where(and(eq(projectMedia.projectId, projectId), eq(projectMedia.mediaId, mediaId)))
    await audit({ actor: ctx.actor, action: 'project.image_removed', entityType: 'project', entityId: projectId, details: { mediaId }, ip: ctx.ip })
    return { ok: true, message: 'Image removed from the project. It stays in the media library.' }
  })
}

export async function moveProjectImageAction(fd: FormData): Promise<ActionResult> {
  return runAction('content:manage', async () => {
    const projectId = optionalId(fd, 'projectId')
    const mediaId = optionalId(fd, 'mediaId')
    const direction = str(fd, 'direction') === 'up' ? -1 : 1
    if (!projectId || !mediaId) return { ok: false, message: 'Missing image.' }
    const db = getDb()
    const rows = await db.select({ mediaId: projectMedia.mediaId }).from(projectMedia).where(eq(projectMedia.projectId, projectId)).orderBy(asc(projectMedia.displayOrder))
    const index = rows.findIndex((r) => r.mediaId === mediaId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= rows.length) return { ok: true }
    ;[rows[index], rows[target]] = [rows[target]!, rows[index]!]
    await db.transaction(async (tx) => {
      for (let i = 0; i < rows.length; i++) {
        await tx.update(projectMedia).set({ displayOrder: i + 1 }).where(and(eq(projectMedia.projectId, projectId), eq(projectMedia.mediaId, rows[i]!.mediaId)))
      }
    })
    return { ok: true }
  })
}
