import { describe, expect, it } from 'vitest'
import { evaluateOffers, type OfferRule, type PriceLine } from '@/lib/offers/engine'

const NOW = new Date('2026-06-01T12:00:00Z')

function offer(overrides: Partial<OfferRule> & { id: string }): OfferRule {
  return {
    name: overrides.id,
    status: 'published',
    discountType: 'percentage',
    discountValue: 1000,
    currency: 'EUR',
    discountScope: 'eligible_services',
    clientEligibility: 'any',
    minSubtotal: null,
    minServiceCount: null,
    maxDiscount: null,
    startsAt: null,
    endsAt: null,
    stackable: false,
    requiresApproval: false,
    code: null,
    priority: 0,
    requiredServiceIds: [],
    eligibleServiceIds: [],
    ...overrides,
  }
}

const website: PriceLine = { serviceId: 'web', name: 'Business website', amount: 300_000, currency: 'EUR' }
const maintenance: PriceLine = { serviceId: 'care', name: 'Maintenance', amount: 60_000, currency: 'EUR' }
const seo: PriceLine = { serviceId: 'seo', name: 'Technical SEO', amount: 90_000, currency: 'EUR' }

function run(offers: OfferRule[], lines: PriceLine[] = [website, maintenance], extra: object = {}) {
  const result = evaluateOffers({ lines, clientStatus: 'new', offers, now: NOW, ...extra })
  if (!result.ok) throw new Error(`unexpected error ${result.error}`)
  return result
}

describe('evaluateOffers', () => {
  it('returns subtotal with no offers', () => {
    const r = run([])
    expect(r.subtotal).toBe(360_000)
    expect(r.discountTotal).toBe(0)
    expect(r.total).toBe(360_000)
  })

  it('applies a percentage discount only to eligible services', () => {
    const r = run([offer({ id: 'bundle', discountValue: 2000, requiredServiceIds: ['web'], eligibleServiceIds: ['care'] })])
    expect(r.discountTotal).toBe(12_000)
    expect(r.lines.find((l) => l.serviceId === 'care')?.net).toBe(48_000)
    expect(r.lines.find((l) => l.serviceId === 'web')?.discount).toBe(0)
  })

  it('applies order-total scope across all lines', () => {
    const r = run([offer({ id: 'total', discountScope: 'order_total', discountValue: 500 })])
    expect(r.discountTotal).toBe(18_000)
    expect(r.lines.reduce((s, l) => s + l.discount, 0)).toBe(18_000)
  })

  it('caps fixed discounts at the eligible base and at maxDiscount', () => {
    const fixed = run([offer({ id: 'fixed', discountType: 'fixed_amount', discountValue: 100_000, eligibleServiceIds: ['care'] })])
    expect(fixed.discountTotal).toBe(60_000)
    const capped = run([offer({ id: 'cap', discountValue: 5000, maxDiscount: 25_000 })])
    expect(capped.discountTotal).toBe(25_000)
  })

  it('never stacks a non-stackable offer with others and picks the best option', () => {
    const r = run([
      offer({ id: 'a', discountValue: 1000, stackable: false }),
      offer({ id: 'b', discountValue: 500, stackable: true }),
      offer({ id: 'c', discountValue: 300, stackable: true }),
    ])
    // A = 10% of 360000 = 36000; B+C sequential = 18000 + 3% of 342000 = 10260 -> 28260
    expect(r.applied.map((a) => a.offerId)).toEqual(['a'])
    expect(r.discountTotal).toBe(36_000)
    expect(r.rejected.filter((x) => x.reason === 'not_combinable').map((x) => x.offerId).sort()).toEqual(['b', 'c'])
  })

  it('stacks stackable offers sequentially when that is better', () => {
    const r = run([
      offer({ id: 'a', discountValue: 500, stackable: false }),
      offer({ id: 'b', discountValue: 1000, stackable: true }),
      offer({ id: 'c', discountValue: 500, stackable: true }),
    ])
    // B+C = 36000 + 5% of 324000 = 16200 -> 52200 > A (18000)
    expect(r.applied.map((a) => a.offerId).sort()).toEqual(['b', 'c'])
    expect(r.discountTotal).toBe(52_200)
    expect(r.total).toBe(307_800)
  })

  it('applies each offer at most once even if listed twice', () => {
    const o = offer({ id: 'dup', discountValue: 1000, stackable: true })
    const r = run([o, o])
    expect(r.applied).toHaveLength(1)
    expect(r.discountTotal).toBe(36_000)
  })

  it('respects date windows, status and client eligibility', () => {
    const r = run([
      offer({ id: 'future', startsAt: new Date('2026-07-01T00:00:00Z') }),
      offer({ id: 'past', endsAt: new Date('2026-05-01T00:00:00Z') }),
      offer({ id: 'draft', status: 'draft' }),
      offer({ id: 'existing', clientEligibility: 'existing' }),
    ])
    expect(r.discountTotal).toBe(0)
    const reasons = Object.fromEntries(r.rejected.map((x) => [x.offerId, x.reason]))
    expect(reasons).toEqual({
      future: 'not_started',
      past: 'expired',
      draft: 'not_published',
      existing: 'client_not_eligible',
    })
  })

  it('treats the end date as exclusive', () => {
    const r = run([offer({ id: 'edge', endsAt: NOW })])
    expect(r.rejected[0]?.reason).toBe('expired')
  })

  it('requires codes case-insensitively', () => {
    const coded = offer({ id: 'coded', code: 'RAVEN10' })
    expect(run([coded]).discountTotal).toBe(0)
    expect(run([coded], undefined, { codes: ['raven10'] }).discountTotal).toBe(36_000)
  })

  it('does not auto-apply offers that need manual approval', () => {
    const manual = offer({ id: 'manual', requiresApproval: true })
    expect(run([manual]).rejected[0]?.reason).toBe('requires_approval')
    expect(run([manual], undefined, { approvedOfferIds: ['manual'] }).discountTotal).toBe(36_000)
  })

  it('checks minimum subtotal, service count and required services', () => {
    const r = run([
      offer({ id: 'min-total', minSubtotal: 1_000_000 }),
      offer({ id: 'min-count', minServiceCount: 3 }),
      offer({ id: 'needs-seo', requiredServiceIds: ['seo'] }),
    ])
    const reasons = Object.fromEntries(r.rejected.map((x) => [x.offerId, x.reason]))
    expect(reasons).toEqual({
      'min-total': 'below_min_subtotal',
      'min-count': 'below_min_service_count',
      'needs-seo': 'missing_required_services',
    })
    expect(run([offer({ id: 'needs-seo', requiredServiceIds: ['seo'] })], [website, maintenance, seo]).applied).toHaveLength(1)
  })

  it('rejects fixed offers in another currency and mixed-currency carts', () => {
    expect(run([offer({ id: 'gbp', discountType: 'fixed_amount', discountValue: 5000, currency: 'GBP' })]).rejected[0]?.reason).toBe(
      'currency_mismatch',
    )
    const mixed = evaluateOffers({
      lines: [website, { ...maintenance, currency: 'GBP' }],
      clientStatus: 'new',
      offers: [],
      now: NOW,
    })
    expect(mixed).toEqual({ ok: false, error: 'mixed_currency' })
  })

  it('keeps per-line discounts exact and never negative', () => {
    const lines: PriceLine[] = [
      { serviceId: 'a', name: 'A', amount: 333, currency: 'EUR' },
      { serviceId: 'b', name: 'B', amount: 333, currency: 'EUR' },
      { serviceId: 'c', name: 'C', amount: 334, currency: 'EUR' },
    ]
    const r = run(
      [
        offer({ id: 'x', discountType: 'fixed_amount', discountValue: 999, stackable: true }),
        offer({ id: 'y', discountType: 'fixed_amount', discountValue: 999, stackable: true }),
      ],
      lines,
    )
    expect(r.discountTotal).toBe(1000)
    expect(r.total).toBe(0)
    for (const line of r.lines) expect(line.net).toBeGreaterThanOrEqual(0)
    expect(r.lines.reduce((s, l) => s + l.discount, 0)).toBe(r.discountTotal)
  })

  it('rejects empty carts and invalid amounts', () => {
    expect(evaluateOffers({ lines: [], clientStatus: 'new', offers: [], now: NOW })).toEqual({ ok: false, error: 'empty' })
    expect(
      evaluateOffers({ lines: [{ ...website, amount: 10.5 }], clientStatus: 'new', offers: [], now: NOW }),
    ).toEqual({ ok: false, error: 'invalid_amount' })
  })
})
