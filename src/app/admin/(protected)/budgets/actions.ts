'use server'

import { eq } from 'drizzle-orm'
import type { ActionResult } from '@/lib/admin/action-result'
import { ValidationError } from '@/lib/admin/action-result'
import { bool, ids, lines, money, optionalId, str } from '@/lib/admin/form-data'
import { parseOrThrow, runAction } from '@/lib/admin/run-action'
import { budgetTierSchema } from '@/lib/admin/schemas'
import { audit } from '@/lib/audit'
import { getDb } from '@/lib/db'
import { budgetTiers, budgetTierServices } from '@/lib/db/schema'
import { slugify } from '@/lib/utils'

export async function saveBudgetTierAction(fd: FormData): Promise<ActionResult> {
  return runAction('content:manage', async (ctx) => {
    const id = optionalId(fd, 'id')
    const name = str(fd, 'name')
    const data = parseOrThrow(budgetTierSchema, {
      name,
      slug: str(fd, 'slug') || slugify(name),
      description: str(fd, 'description'),
      minAmount: money(fd, 'minAmount'),
      maxAmount: money(fd, 'maxAmount'),
      startingPrice: money(fd, 'startingPrice'),
      currency: str(fd, 'currency') || 'EUR',
      showAmounts: bool(fd, 'showAmounts'),
      typicalFeatures: lines(fd, 'typicalFeatures'),
      suitableFor: lines(fd, 'suitableFor'),
      timeline: str(fd, 'timeline'),
      ctaLabel: str(fd, 'ctaLabel'),
      serviceIds: ids(fd, 'serviceIds'),
      status: str(fd, 'status') || 'draft',
      isSample: bool(fd, 'isSample'),
    })
    const { serviceIds, ...values } = data
    const db = getDb()
    let tierId = id
    await db.transaction(async (tx) => {
      if (id) {
        const updated = await tx.update(budgetTiers).set(values).where(eq(budgetTiers.id, id)).returning({ id: budgetTiers.id })
        if (!updated.length) throw new ValidationError('This category no longer exists.')
      } else {
        const [row] = await tx.insert(budgetTiers).values(values).returning({ id: budgetTiers.id })
        tierId = row!.id
      }
      await tx.delete(budgetTierServices).where(eq(budgetTierServices.tierId, tierId!))
      if (serviceIds.length) await tx.insert(budgetTierServices).values(serviceIds.map((serviceId) => ({ tierId: tierId!, serviceId })))
    })
    await audit({
      actor: ctx.actor,
      action: id ? 'budget_tier.updated' : 'budget_tier.created',
      entityType: 'budget_tier',
      entityId: tierId!,
      details: { showAmounts: values.showAmounts, minAmount: values.minAmount, maxAmount: values.maxAmount, status: values.status },
      ip: ctx.ip,
    })
    return id ? { ok: true, message: 'Budget category saved.' } : { ok: true, message: 'Budget category created.', redirectTo: `/admin/budgets/${tierId}` }
  })
}

export async function deleteBudgetTierAction(fd: FormData): Promise<ActionResult> {
  return runAction('content:manage', async (ctx) => {
    const id = optionalId(fd, 'id')
    if (!id) return { ok: false, message: 'Missing category.' }
    const deleted = await getDb().delete(budgetTiers).where(eq(budgetTiers.id, id)).returning({ id: budgetTiers.id })
    if (!deleted.length) return { ok: false, message: 'Category not found.' }
    await audit({ actor: ctx.actor, action: 'budget_tier.deleted', entityType: 'budget_tier', entityId: id, ip: ctx.ip })
    return { ok: true, message: 'Budget category deleted.', redirectTo: '/admin/budgets' }
  })
}
