'use server'

import { eq } from 'drizzle-orm'
import type { ActionResult } from '@/lib/admin/action-result'
import { optionalId, str } from '@/lib/admin/form-data'
import { parseOrThrow, runAction } from '@/lib/admin/run-action'
import { categorySchema } from '@/lib/admin/schemas'
import { audit } from '@/lib/audit'
import { getDb } from '@/lib/db'
import { projectCategories, serviceCategories } from '@/lib/db/schema'
import { slugify } from '@/lib/utils'

function table(kind: string) {
  return kind === 'project' ? projectCategories : serviceCategories
}

export async function saveCategoryAction(fd: FormData): Promise<ActionResult> {
  return runAction('content:manage', async (ctx) => {
    const kind = str(fd, 'kind') === 'project' ? 'project' : 'service'
    const t = table(kind) as typeof serviceCategories
    const id = optionalId(fd, 'id')
    const name = str(fd, 'name')
    const values = parseOrThrow(categorySchema, { name, slug: str(fd, 'slug') || slugify(name), description: str(fd, 'description') })
    const db = getDb()
    if (id) await db.update(t).set(values).where(eq(t.id, id))
    else {
      const existing = await db.select({ id: t.id }).from(t)
      await db.insert(t).values({ ...values, displayOrder: existing.length + 1 })
    }
    await audit({ actor: ctx.actor, action: id ? 'category.updated' : 'category.created', entityType: `${kind}_category`, entityId: id ?? values.slug, ip: ctx.ip })
    return { ok: true, message: id ? 'Category saved.' : 'Category added.' }
  })
}

export async function deleteCategoryAction(fd: FormData): Promise<ActionResult> {
  return runAction('content:manage', async (ctx) => {
    const kind = str(fd, 'kind') === 'project' ? 'project' : 'service'
    const t = table(kind) as typeof serviceCategories
    const id = optionalId(fd, 'id')
    if (!id) return { ok: false, message: 'Missing category.' }
    await getDb().delete(t).where(eq(t.id, id))
    await audit({ actor: ctx.actor, action: 'category.deleted', entityType: `${kind}_category`, entityId: id, ip: ctx.ip })
    return { ok: true, message: 'Category deleted. Items in it are now uncategorised.' }
  })
}
