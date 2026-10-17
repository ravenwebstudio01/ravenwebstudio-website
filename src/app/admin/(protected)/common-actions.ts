'use server'

import { asc, eq } from 'drizzle-orm'
import { str } from '@/lib/admin/form-data'
import { runAction } from '@/lib/admin/run-action'
import type { ActionResult } from '@/lib/admin/action-result'
import { audit } from '@/lib/audit'
import type { Permission } from '@/lib/auth/permissions'
import { getDb } from '@/lib/db'
import { budgetTiers, collaborationTypes, offers, projectCategories, projects, serviceCategories, services } from '@/lib/db/schema'

/**
 * Generic list operations (publish/unpublish, reorder) for every orderable
 * content table. The table is chosen from a fixed whitelist, never from raw input.
 */
const TABLES = {
  services: { table: services, label: services.name, permission: 'content:manage', publishable: true },
  projects: { table: projects, label: projects.title, permission: 'content:manage', publishable: true },
  budgetTiers: { table: budgetTiers, label: budgetTiers.name, permission: 'content:manage', publishable: true },
  collaborationTypes: { table: collaborationTypes, label: collaborationTypes.name, permission: 'content:manage', publishable: true },
  offers: { table: offers, label: offers.name, permission: 'offers:manage', publishable: true },
  serviceCategories: { table: serviceCategories, label: serviceCategories.name, permission: 'content:manage', publishable: false },
  projectCategories: { table: projectCategories, label: projectCategories.name, permission: 'content:manage', publishable: false },
} as const

type TableKey = keyof typeof TABLES

function resolve(key: string) {
  if (!(key in TABLES)) throw new Error('Unknown table')
  return TABLES[key as TableKey]
}

export async function setStatusAction(fd: FormData): Promise<ActionResult> {
  const entry = resolve(str(fd, 'table'))
  const id = str(fd, 'id')
  const status = str(fd, 'status')
  if (!entry.publishable || !['draft', 'published', 'archived'].includes(status)) return { ok: false, message: 'Invalid status.' }
  return runAction(entry.permission as Permission, async (ctx) => {
    const t = entry.table as unknown as typeof services
    const values: Record<string, unknown> = { status }
    if (status === 'published' && 'publishedAt' in t) values.publishedAt = new Date()
    const updated = await getDb().update(t).set(values as Partial<typeof services.$inferInsert>).where(eq(t.id, id)).returning({ id: t.id })
    if (updated.length === 0) return { ok: false, message: 'Item not found.' }
    await audit({ actor: ctx.actor, action: `content.${status}`, entityType: str(fd, 'table'), entityId: id, ip: ctx.ip })
    return { ok: true, message: status === 'published' ? 'Published.' : status === 'draft' ? 'Moved to drafts.' : 'Archived.' }
  })
}

export async function moveAction(fd: FormData): Promise<ActionResult> {
  const entry = resolve(str(fd, 'table'))
  const id = str(fd, 'id')
  const direction = str(fd, 'direction') === 'up' ? -1 : 1
  return runAction(entry.permission as Permission, async () => {
    const t = entry.table as unknown as typeof services
    const db = getDb()
    const rows = await db.select({ id: t.id }).from(t).orderBy(asc(t.displayOrder), asc(entry.label))
    const index = rows.findIndex((r) => r.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= rows.length) return { ok: true }
    ;[rows[index], rows[target]] = [rows[target]!, rows[index]!]
    await db.transaction(async (tx) => {
      for (let i = 0; i < rows.length; i++) {
        await tx.update(t).set({ displayOrder: i + 1 }).where(eq(t.id, rows[i]!.id))
      }
    })
    return { ok: true, message: 'Order updated.' }
  })
}
