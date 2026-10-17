'use server'

import { eq } from 'drizzle-orm'
import type { ActionResult } from '@/lib/admin/action-result'
import { ValidationError } from '@/lib/admin/action-result'
import { bool, ids, lines, money, optionalId, str } from '@/lib/admin/form-data'
import { clearRedirectFrom, recordSlugChange } from '@/lib/admin/redirects'
import { parseOrThrow, runAction } from '@/lib/admin/run-action'
import { serviceSchema } from '@/lib/admin/schemas'
import { audit } from '@/lib/audit'
import { getDb } from '@/lib/db'
import { serviceRelations, services } from '@/lib/db/schema'
import { slugify } from '@/lib/utils'

export async function saveServiceAction(fd: FormData): Promise<ActionResult> {
  return runAction('content:manage', async (ctx) => {
    const id = optionalId(fd, 'id')
    const name = str(fd, 'name')
    const data = parseOrThrow(serviceSchema, {
      name,
      slug: str(fd, 'slug') || slugify(name),
      shortDescription: str(fd, 'shortDescription'),
      description: str(fd, 'description'),
      categoryId: optionalId(fd, 'categoryId'),
      features: lines(fd, 'features'),
      deliverables: lines(fd, 'deliverables'),
      priceFrom: money(fd, 'priceFrom'),
      priceTo: money(fd, 'priceTo'),
      currency: str(fd, 'currency') || 'EUR',
      priceUnit: str(fd, 'priceUnit') || 'project',
      showPrice: bool(fd, 'showPrice'),
      timeline: str(fd, 'timeline'),
      icon: str(fd, 'icon') || 'layout',
      imageId: optionalId(fd, 'imageId'),
      status: str(fd, 'status') || 'draft',
      isSample: bool(fd, 'isSample'),
      seoTitle: str(fd, 'seoTitle'),
      seoDescription: str(fd, 'seoDescription'),
      relatedIds: ids(fd, 'relatedIds'),
    })
    const { relatedIds, ...values } = data
    const db = getDb()
    let serviceId = id
    await db.transaction(async (tx) => {
      if (id) {
        const [existing] = await tx.select({ slug: services.slug, status: services.status, publishedAt: services.publishedAt }).from(services).where(eq(services.id, id))
        if (!existing) throw new ValidationError('This service no longer exists.')
        await tx
          .update(services)
          .set({ ...values, publishedAt: values.status === 'published' ? (existing.publishedAt ?? new Date()) : existing.publishedAt })
          .where(eq(services.id, id))
        if (existing.slug !== values.slug && existing.status === 'published') {
          await recordSlugChange(tx, `/services/${existing.slug}`, `/services/${values.slug}`)
        }
      } else {
        const [row] = await tx
          .insert(services)
          .values({ ...values, publishedAt: values.status === 'published' ? new Date() : null })
          .returning({ id: services.id })
        serviceId = row!.id
      }
      await clearRedirectFrom(tx, `/services/${values.slug}`)
      await tx.delete(serviceRelations).where(eq(serviceRelations.serviceId, serviceId!))
      const related = relatedIds.filter((r) => r !== serviceId)
      if (related.length) {
        await tx.insert(serviceRelations).values(related.map((relatedServiceId) => ({ serviceId: serviceId!, relatedServiceId })))
      }
    })
    await audit({ actor: ctx.actor, action: id ? 'service.updated' : 'service.created', entityType: 'service', entityId: serviceId!, details: { status: values.status, slug: values.slug }, ip: ctx.ip })
    return id ? { ok: true, message: 'Service saved.' } : { ok: true, message: 'Service created.', redirectTo: `/admin/services/${serviceId}` }
  })
}

export async function deleteServiceAction(fd: FormData): Promise<ActionResult> {
  return runAction('content:manage', async (ctx) => {
    const id = optionalId(fd, 'id')
    if (!id) return { ok: false, message: 'Missing service.' }
    const deleted = await getDb().delete(services).where(eq(services.id, id)).returning({ slug: services.slug })
    if (!deleted.length) return { ok: false, message: 'Service not found.' }
    await audit({ actor: ctx.actor, action: 'service.deleted', entityType: 'service', entityId: id, details: { slug: deleted[0]!.slug }, ip: ctx.ip })
    return { ok: true, message: 'Service deleted.', redirectTo: '/admin/services' }
  })
}
