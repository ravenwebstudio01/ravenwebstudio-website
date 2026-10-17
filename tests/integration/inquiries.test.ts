import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { inquiries, inquiryServices, offers, offerServices, services } from '@/lib/db/schema'
import { submitInquiry } from '@/lib/inquiries/service'
import { computeEstimate } from '@/lib/offers/estimate'
import { issueFormToken } from '@/lib/security/form-token'
import { runMaintenance } from '@/lib/maintenance'
import { getPublishedServices } from '@/lib/content/queries'
import { resetDatabase } from './setup'

const meta = (ip = '198.51.100.7') => ({ ip, honeypot: '', formToken: issueFormToken(Date.now() - 10_000), sourcePath: '/contact' })

const input = (overrides: Record<string, unknown> = {}) => ({
  name: 'Jonas Berg',
  email: 'jonas@example.se',
  inquiryType: 'project',
  clientStatus: 'new',
  description: 'We would like a new multilingual website for our architecture practice.',
  privacyAcknowledged: true,
  ...overrides,
})

async function seedCatalogue() {
  const db = getDb()
  const [web] = await db
    .insert(services)
    .values({ slug: 'business-websites', name: 'Business websites', status: 'published', priceFrom: 300_000, showPrice: true })
    .returning()
  const [care] = await db
    .insert(services)
    .values({ slug: 'maintenance', name: 'Maintenance', status: 'published', priceFrom: 9_000, showPrice: true, priceUnit: 'month' })
    .returning()
  const [seo] = await db.insert(services).values({ slug: 'seo', name: 'Technical SEO', status: 'published', priceFrom: 80_000, showPrice: true }).returning()
  const [hiddenPrice] = await db.insert(services).values({ slug: 'custom', name: 'Custom', status: 'published', priceFrom: 1, showPrice: false }).returning()
  await db.insert(services).values({ slug: 'draft-service', name: 'Draft', status: 'draft', priceFrom: 100, showPrice: true })
  await db.insert(services).values({ slug: 'sample-service', name: 'Sample', status: 'published', isSample: true })
  const [bundle] = await db
    .insert(offers)
    .values({ slug: 'seo-bundle', name: 'SEO bundle', discountType: 'percentage', discountValue: 2000, status: 'published' })
    .returning()
  await db.insert(offerServices).values([
    { offerId: bundle!.id, serviceId: web!.id, role: 'required' },
    { offerId: bundle!.id, serviceId: seo!.id, role: 'eligible' },
  ])
  const [coded] = await db
    .insert(offers)
    .values({ slug: 'partner', name: 'Partner code', discountType: 'fixed_amount', discountValue: 50_000, code: 'PARTNER50', status: 'published', stackable: true })
    .returning()
  return { web: web!, care: care!, seo: seo!, hiddenPrice: hiddenPrice!, bundle: bundle!, coded: coded! }
}

describe('inquiry submission', () => {
  beforeEach(resetDatabase)

  it('stores a valid inquiry with services, budget-free defaults and a server-side estimate', async () => {
    const { bundle } = await seedCatalogue()
    const result = await submitInquiry(
      input({ serviceSlugs: ['business-websites', 'seo', 'draft-service'], wantsAdditionalServices: true, additionalServiceSlugs: ['maintenance'] }),
      meta(),
    )
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.reference).toMatch(/^RWS-\d{4}-[A-Z2-9]{5}$/)
    const [row] = await getDb().select().from(inquiries).where(eq(inquiries.reference, result.reference))
    expect(row!.email).toBe('jonas@example.se')
    expect(row!.status).toBe('new')
    expect(row!.privacyAcknowledgedAt).not.toBe(null)
    expect(row!.estimate?.subtotal).toBe(380_000)
    expect(row!.estimate?.appliedOffers).toEqual([{ offerId: bundle.id, name: 'SEO bundle', amount: 16_000 }])
    expect(row!.estimate?.total).toBe(364_000)
    const links = await getDb().select().from(inquiryServices).where(eq(inquiryServices.inquiryId, row!.id))
    // Draft services are ignored; additional interest is stored separately.
    expect(links.map((l) => `${l.kind}:${l.serviceName}`).sort()).toEqual(['additional:Maintenance', 'requested:Business websites', 'requested:Technical SEO'])
  })

  it('applies private offer codes and rejects invalid codes with a field error', async () => {
    await seedCatalogue()
    const bad = await submitInquiry(input({ offerCode: 'NOPE' }), meta())
    expect(bad.status).toBe('error')
    if (bad.status === 'error') expect(bad.fieldErrors?.offerCode).toBeTruthy()
    const good = await submitInquiry(input({ serviceSlugs: ['business-websites'], offerCode: 'partner50' }), meta('198.51.100.8'))
    expect(good.status).toBe('success')
    const [row] = await getDb().select().from(inquiries).where(eq(inquiries.offerCode, 'PARTNER50'))
    expect(row!.estimate?.discountTotal).toBe(50_000)
  })

  it('silently drops bot submissions (honeypot or too fast) without storing them', async () => {
    const honeypot = await submitInquiry(input(), { ...meta(), honeypot: 'http://spam.example' })
    const tooFast = await submitInquiry(input(), { ...meta(), formToken: issueFormToken(Date.now()) })
    expect(honeypot.status).toBe('success')
    expect(tooFast.status).toBe('success')
    expect(await getDb().select().from(inquiries)).toHaveLength(0)
  })

  it('rejects forged tokens and invalid input', async () => {
    const forged = await submitInquiry(input(), { ...meta(), formToken: 'forged' })
    expect(forged.status).toBe('error')
    const invalid = await submitInquiry(input({ email: 'not-an-email', description: 'hi' }), meta())
    expect(invalid.status).toBe('error')
    if (invalid.status === 'error') {
      expect(Object.keys(invalid.fieldErrors ?? {}).sort()).toEqual(['description', 'email'])
    }
    expect(await getDb().select().from(inquiries)).toHaveLength(0)
  })

  it('limits repeated submissions from one address', async () => {
    const results = []
    for (let i = 0; i < 4; i++) results.push(await submitInquiry(input({ email: `p${i}@example.com` }), meta('203.0.113.50')))
    for (let i = 0; i < 2; i++) results.push(await submitInquiry(input({ email: `q${i}@example.com` }), meta('203.0.113.50')))
    expect(results.slice(0, 5).every((r) => r.status === 'success')).toBe(true)
    expect(results[5]!.status).toBe('error')
  })

  it('flags link-stuffed messages as spam without notifying anyone', async () => {
    const r = await submitInquiry(input({ description: 'Buy now http://a.example http://b.example http://c.example http://d.example http://e.example' }), meta())
    expect(r.status).toBe('success')
    if (r.status === 'success') expect(r.deliver).toBe(null)
    const [row] = await getDb().select().from(inquiries)
    expect(row!.status).toBe('spam')
  })

  it('records "not configured" when e-mail is unavailable, instead of pretending to send', async () => {
    const r = await submitInquiry(input(), meta())
    if (r.status !== 'success' || !r.deliver) throw new Error('expected deliverable inquiry')
    await r.deliver()
    const [row] = await getDb().select().from(inquiries)
    expect(row!.notificationStatus).toBe('not_configured')
    expect(row!.acknowledgementStatus).toBe('not_configured')
  })
})

describe('estimates and visibility', () => {
  beforeEach(resetDatabase)

  it('never sums recurring prices with one-off prices and refuses hidden prices', async () => {
    await seedCatalogue()
    const recurringOnly = await computeEstimate({ serviceSlugs: ['maintenance'], clientStatus: 'new' })
    expect(recurringOnly).toEqual({ available: false, reason: 'only_recurring', recurring: [{ name: 'Maintenance', amount: 9_000, currency: 'EUR', unit: 'month' }] })
    const hidden = await computeEstimate({ serviceSlugs: ['business-websites', 'custom'], clientStatus: 'new' })
    expect(hidden.available).toBe(false)
    if (!hidden.available) expect(hidden.reason).toBe('missing_prices')
  })

  it('hides drafts and sample content from public queries in production mode', async () => {
    await seedCatalogue()
    const slugs = (await getPublishedServices()).map((s) => s.slug)
    expect(slugs).toContain('business-websites')
    expect(slugs).not.toContain('draft-service')
    expect(slugs).not.toContain('sample-service')
  })
})

describe('data retention', () => {
  beforeEach(resetDatabase)

  it('deletes inquiries older than the retention period', async () => {
    const db = getDb()
    const old = new Date()
    old.setUTCMonth(old.getUTCMonth() - 30)
    await db.insert(inquiries).values([
      { reference: 'RWS-OLD', inquiryType: 'general', name: 'Old', email: 'old@example.com', description: 'old inquiry text here', createdAt: old },
      { reference: 'RWS-NEW', inquiryType: 'general', name: 'New', email: 'new@example.com', description: 'new inquiry text here' },
    ])
    const report = await runMaintenance()
    expect(report.inquiriesDeleted).toBe(1)
    const left = await db.select({ reference: inquiries.reference }).from(inquiries)
    expect(left.map((l) => l.reference)).toEqual(['RWS-NEW'])
  })
})
