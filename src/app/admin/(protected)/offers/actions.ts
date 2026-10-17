'use server'

import { eq, inArray } from 'drizzle-orm'
import type { ActionResult } from '@/lib/admin/action-result'
import { ValidationError } from '@/lib/admin/action-result'
import { bool, dateUtc, ids, int, money, optionalId, percent, str } from '@/lib/admin/form-data'
import { parseOrThrow, runAction } from '@/lib/admin/run-action'
import { offerSchema } from '@/lib/admin/schemas'
import { audit } from '@/lib/audit'
import { getDb } from '@/lib/db'
import { offers, offerServices, services } from '@/lib/db/schema'
import { evaluateOffers, REJECT_REASON_LABELS, type PriceLine } from '@/lib/offers/engine'
import { loadOfferRules } from '@/lib/offers/load'
import { slugify } from '@/lib/utils'

export async function saveOfferAction(fd: FormData): Promise<ActionResult> {
  return runAction('offers:manage', async (ctx) => {
    const id = optionalId(fd, 'id')
    const name = str(fd, 'name')
    const discountType = str(fd, 'discountType') === 'fixed_amount' ? 'fixed_amount' : 'percentage'
    const data = parseOrThrow(offerSchema, {
      name,
      slug: str(fd, 'slug') || slugify(name),
      summary: str(fd, 'summary'),
      description: str(fd, 'description'),
      discountType,
      discountValue: discountType === 'percentage' ? percent(fd, 'discountValue') : money(fd, 'discountValue'),
      currency: str(fd, 'currency') || 'EUR',
      discountScope: str(fd, 'discountScope') || 'eligible_services',
      clientEligibility: str(fd, 'clientEligibility') || 'any',
      minSubtotal: money(fd, 'minSubtotal'),
      minServiceCount: int(fd, 'minServiceCount'),
      maxDiscount: money(fd, 'maxDiscount'),
      startsAt: dateUtc(fd, 'startsAt', 'start'),
      endsAt: dateUtc(fd, 'endsAt', 'end'),
      stackable: bool(fd, 'stackable'),
      requiresApproval: bool(fd, 'requiresApproval'),
      code: str(fd, 'code').toUpperCase(),
      priority: int(fd, 'priority') ?? 0,
      terms: str(fd, 'terms'),
      requiredServiceIds: ids(fd, 'requiredServiceIds'),
      eligibleServiceIds: ids(fd, 'eligibleServiceIds'),
      status: str(fd, 'status') || 'draft',
      isSample: bool(fd, 'isSample'),
    })
    const { requiredServiceIds, eligibleServiceIds, code, ...rest } = data
    const values = { ...rest, code: code || null }
    const db = getDb()
    let offerId = id
    await db.transaction(async (tx) => {
      if (id) {
        const updated = await tx.update(offers).set(values).where(eq(offers.id, id)).returning({ id: offers.id })
        if (!updated.length) throw new ValidationError('This offer no longer exists.')
      } else {
        const [row] = await tx.insert(offers).values(values).returning({ id: offers.id })
        offerId = row!.id
      }
      await tx.delete(offerServices).where(eq(offerServices.offerId, offerId!))
      const links = [
        ...requiredServiceIds.map((serviceId) => ({ offerId: offerId!, serviceId, role: 'required' as const })),
        ...eligibleServiceIds.map((serviceId) => ({ offerId: offerId!, serviceId, role: 'eligible' as const })),
      ]
      if (links.length) await tx.insert(offerServices).values(links)
    })
    await audit({
      actor: ctx.actor,
      action: id ? 'offer.updated' : 'offer.created',
      entityType: 'offer',
      entityId: offerId!,
      details: { status: values.status, discountType: values.discountType, discountValue: values.discountValue, stackable: values.stackable },
      ip: ctx.ip,
    })
    return id ? { ok: true, message: 'Offer saved.' } : { ok: true, message: 'Offer created.', redirectTo: `/admin/offers/${offerId}` }
  })
}

export async function deleteOfferAction(fd: FormData): Promise<ActionResult> {
  return runAction('offers:manage', async (ctx) => {
    const id = optionalId(fd, 'id')
    if (!id) return { ok: false, message: 'Missing offer.' }
    await getDb().delete(offers).where(eq(offers.id, id))
    await audit({ actor: ctx.actor, action: 'offer.deleted', entityType: 'offer', entityId: id, ip: ctx.ip })
    return { ok: true, message: 'Offer deleted.', redirectTo: '/admin/offers' }
  })
}

/**
 * Offer calculator for proposals: prices can be overridden per service (as
 * agreed with the client), drafts can be included, and offers needing manual
 * approval apply only when ticked. Every number is computed on the server.
 */
export async function calculateOffersAction(fd: FormData): Promise<ActionResult> {
  return runAction('offers:manage', async () => {
    const serviceIds = ids(fd, 'serviceIds')
    if (serviceIds.length === 0) throw new ValidationError('Select at least one service.', { serviceIds: 'Select at least one service.' })
    const rows = await getDb().select().from(services).where(inArray(services.id, serviceIds))
    const lines: PriceLine[] = []
    const errors: Record<string, string> = {}
    for (const row of rows) {
      const override = money(fd, `price_${row.id}`)
      const amount = override ?? row.priceFrom
      if (amount == null || Number.isNaN(amount)) {
        errors[`price_${row.id}`] = `Enter a price for ${row.name}.`
        continue
      }
      lines.push({ serviceId: row.id, name: row.name, amount, currency: row.currency })
    }
    if (Object.keys(errors).length) throw new ValidationError('Enter a price for every selected service.', errors)
    const includeDrafts = bool(fd, 'includeDrafts')
    const offerRules = await loadOfferRules({ publicOnly: false })
    const result = evaluateOffers({
      lines,
      clientStatus: str(fd, 'clientStatus') === 'existing' ? 'existing' : 'new',
      offers: offerRules.filter((o) => o.status !== 'archived'),
      codes: str(fd, 'codes')
        .split(/[\s,]+/)
        .filter(Boolean),
      approvedOfferIds: ids(fd, 'approvedOfferIds'),
      ignoreStatus: includeDrafts,
      now: new Date(),
    })
    if (!result.ok) {
      const messages = { empty: 'Select at least one service.', mixed_currency: 'All services must use the same currency.', invalid_amount: 'Prices must be valid amounts.' }
      return { ok: false, message: messages[result.error] }
    }
    return {
      ok: true,
      message: 'Calculated.',
      data: {
        currency: result.currency,
        subtotal: result.subtotal,
        discountTotal: result.discountTotal,
        total: result.total,
        lines: result.lines.map((l) => ({ name: l.name, amount: l.amount, discount: l.discount, net: l.net })),
        applied: result.applied,
        rejected: result.rejected.map((r) => ({ name: r.name, reason: REJECT_REASON_LABELS[r.reason] })),
      },
    }
  })
}
