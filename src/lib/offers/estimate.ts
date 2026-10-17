/**
 * Indicative estimates for the public inquiry form.
 *
 * Prices come only from the database (published services whose prices are
 * marked public). Recurring services (per month/hour) are listed separately and
 * never summed with one-off project prices.
 */
import { and, inArray } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { services } from '@/lib/db/schema'
import type { EstimateSnapshot } from '@/lib/db/schema'
import { publiclyVisible } from '@/lib/content/visibility'
import { evaluateOffers, type ClientStatus } from './engine'
import { loadOfferRules } from './load'

export type EstimateResult =
  | {
      available: true
      snapshot: EstimateSnapshot
      recurring: { name: string; amount: number; currency: string; unit: 'month' | 'hour' }[]
    }
  | {
      available: false
      reason: 'no_services' | 'missing_prices' | 'mixed_currency' | 'only_recurring'
      recurring: { name: string; amount: number; currency: string; unit: 'month' | 'hour' }[]
    }

export async function computeEstimate(input: {
  serviceSlugs: string[]
  clientStatus: ClientStatus
  offerCode?: string
  now?: Date
}): Promise<EstimateResult> {
  const slugs = [...new Set(input.serviceSlugs)].slice(0, 15)
  if (slugs.length === 0) return { available: false, reason: 'no_services', recurring: [] }

  const rows = await getDb()
    .select({
      id: services.id,
      slug: services.slug,
      name: services.name,
      priceFrom: services.priceFrom,
      currency: services.currency,
      priceUnit: services.priceUnit,
      showPrice: services.showPrice,
    })
    .from(services)
    .where(and(inArray(services.slug, slugs), publiclyVisible(services)))

  const priced = rows.filter((r) => r.showPrice && r.priceFrom != null)
  const recurring = priced
    .filter((r) => r.priceUnit !== 'project')
    .map((r) => ({ name: r.name, amount: r.priceFrom!, currency: r.currency, unit: r.priceUnit as 'month' | 'hour' }))
  const oneOff = priced.filter((r) => r.priceUnit === 'project')
  const unpriced = rows.length - priced.length + (slugs.length - rows.length)

  if (unpriced > 0) return { available: false, reason: 'missing_prices', recurring }
  if (oneOff.length === 0) return { available: false, reason: 'only_recurring', recurring }

  const result = evaluateOffers({
    lines: oneOff.map((r) => ({ serviceId: r.id, name: r.name, amount: r.priceFrom!, currency: r.currency })),
    clientStatus: input.clientStatus,
    offers: await loadOfferRules({ publicOnly: true }),
    codes: input.offerCode ? [input.offerCode] : [],
    now: input.now ?? new Date(),
  })
  if (!result.ok) {
    return { available: false, reason: result.error === 'mixed_currency' ? 'mixed_currency' : 'no_services', recurring }
  }
  return {
    available: true,
    recurring,
    snapshot: {
      currency: result.currency,
      subtotal: result.subtotal,
      discountTotal: result.discountTotal,
      total: result.total,
      lines: result.lines.map((l) => ({ serviceId: l.serviceId, name: l.name, amount: l.amount })),
      appliedOffers: result.applied,
      computedAt: new Date().toISOString(),
    },
  }
}
