import { and, asc, inArray, type SQL } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { offers, offerServices } from '@/lib/db/schema'
import { publiclyVisible } from '@/lib/content/visibility'
import type { OfferRule } from './engine'

export type LoadedOffer = OfferRule & { slug: string; isSample: boolean }

/** Loads offers (with their service links) as engine rules. */
export async function loadOfferRules(opts: { publicOnly: boolean; ids?: string[] }): Promise<LoadedOffer[]> {
  const db = getDb()
  const conditions: SQL[] = []
  if (opts.publicOnly) conditions.push(publiclyVisible(offers))
  if (opts.ids) {
    if (opts.ids.length === 0) return []
    conditions.push(inArray(offers.id, opts.ids))
  }
  const rows = await db
    .select()
    .from(offers)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(offers.displayOrder))
  if (rows.length === 0) return []
  const links = await db
    .select()
    .from(offerServices)
    .where(inArray(offerServices.offerId, rows.map((r) => r.id)))
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    status: r.status,
    isSample: r.isSample,
    discountType: r.discountType,
    discountValue: r.discountValue,
    currency: r.currency,
    discountScope: r.discountScope,
    clientEligibility: r.clientEligibility,
    minSubtotal: r.minSubtotal,
    minServiceCount: r.minServiceCount,
    maxDiscount: r.maxDiscount,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    stackable: r.stackable,
    requiresApproval: r.requiresApproval,
    code: r.code,
    priority: r.priority,
    requiredServiceIds: links.filter((l) => l.offerId === r.id && l.role === 'required').map((l) => l.serviceId),
    eligibleServiceIds: links.filter((l) => l.offerId === r.id && l.role === 'eligible').map((l) => l.serviceId),
  }))
}
