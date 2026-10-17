import { describe, expect, it } from 'vitest'
import { CONTENT_SECTIONS, resolveSection, sectionDefinition, sectionSchema } from '@/lib/content/registry'
import { inquiryInputFromFormData, inquirySchema } from '@/lib/inquiries/schema'
import { checkFormToken, issueFormToken } from '@/lib/security/form-token'
import { DEFAULT_SETTINGS, parseSettings } from '@/lib/settings'
import { offerSchema, redirectSchema } from '@/lib/admin/schemas'

const valid = {
  name: 'Ana Popescu',
  email: 'Ana@Example.EU',
  inquiryType: 'project',
  description: 'We need a new website for our dental clinic in Cluj with online booking.',
  websiteUrl: 'clinic.example.eu',
  privacyAcknowledged: true,
}

describe('inquiry schema', () => {
  it('accepts a minimal valid inquiry and normalises values', () => {
    const r = inquirySchema.parse(valid)
    expect(r.email).toBe('ana@example.eu')
    expect(r.websiteUrl).toBe('https://clinic.example.eu')
    expect(r.clientStatus).toBe('new')
    expect(r.serviceSlugs).toEqual([])
  })

  it('requires the essentials with clear messages', () => {
    const r = inquirySchema.safeParse({ ...valid, name: '', email: 'nope', description: 'short', privacyAcknowledged: false })
    expect(r.success).toBe(false)
    const fields = r.success ? [] : r.error.issues.map((i) => i.path[0])
    expect(fields).toContain('name')
    expect(fields).toContain('email')
    expect(fields).toContain('description')
    expect(fields).toContain('privacyAcknowledged')
  })

  it('rejects unsafe or malformed references', () => {
    expect(inquirySchema.safeParse({ ...valid, serviceSlugs: ['../etc'] }).success).toBe(false)
    expect(inquirySchema.safeParse({ ...valid, websiteUrl: 'javascript:alert(1)' }).success).toBe(false)
    expect(inquirySchema.safeParse({ ...valid, offerCode: 'DROP TABLE;' }).success).toBe(false)
    expect(inquirySchema.safeParse({ ...valid, country: 'Atlantis' }).success).toBe(false)
  })

  it('reads multi-value form data', () => {
    const fd = new FormData()
    fd.set('name', 'A B')
    fd.append('serviceSlugs', 'business-websites')
    fd.append('serviceSlugs', 'technical-seo')
    fd.set('privacyAcknowledged', 'on')
    fd.set('wantsAdditionalServices', 'on')
    const input = inquiryInputFromFormData(fd)
    expect(input.serviceSlugs).toEqual(['business-websites', 'technical-seo'])
    expect(input.privacyAcknowledged).toBe(true)
    expect(input.wantsAdditionalServices).toBe(true)
    expect(input.inquiryType).toBe(undefined)
  })
})

describe('form token', () => {
  it('detects bots that submit instantly, expired and forged tokens', () => {
    const now = Date.now()
    expect(checkFormToken(issueFormToken(now - 10_000), now)).toBe('ok')
    expect(checkFormToken(issueFormToken(now - 500), now)).toBe('too_fast')
    expect(checkFormToken(issueFormToken(now - 25 * 3600_000), now)).toBe('expired')
    expect(checkFormToken(`${now - 10_000}.${'0'.repeat(32)}`, now)).toBe('invalid')
    expect(checkFormToken('garbage', now)).toBe('invalid')
    expect(checkFormToken(null, now)).toBe('invalid')
  })
})

describe('content registry', () => {
  it('has unique keys and defaults that pass their own validation', () => {
    const keys = CONTENT_SECTIONS.map((s) => s.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const section of CONTENT_SECTIONS) {
      const result = sectionSchema(section).safeParse(section.defaults)
      expect(result.success).toBe(true)
    }
  })

  it('merges stored values over defaults and ignores invalid or unknown fields', () => {
    const def = sectionDefinition('home.hero')!
    const merged = resolveSection<Record<string, unknown>>(def, { headline: 'New headline', intro: 'x'.repeat(5000), injected: '<script>' })
    expect(merged.headline).toBe('New headline')
    expect(merged.intro).toBe(def.defaults.intro)
    expect('injected' in merged).toBe(false)
  })
})

describe('settings', () => {
  it('falls back to safe defaults for missing or invalid values', () => {
    expect(DEFAULT_SETTINGS.businessName).toBe('RavenWebStudio')
    expect(DEFAULT_SETTINGS.contactEmail).toBe('')
    const s = parseSettings({ contactEmail: 'not-an-email', gaMeasurementId: '<script>', inquiryRetentionMonths: 6 })
    expect(s.contactEmail).toBe('')
    expect(s.gaMeasurementId).toBe('')
    expect(s.inquiryRetentionMonths).toBe(6)
  })
})

describe('admin schemas', () => {
  const offer = {
    name: 'Bundle',
    slug: 'bundle',
    summary: '',
    description: '',
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
    code: '',
    priority: 0,
    terms: '',
    requiredServiceIds: [],
    eligibleServiceIds: [],
    status: 'draft',
    isSample: false,
  }
  it('validates offers', () => {
    expect(offerSchema.safeParse(offer).success).toBe(true)
    expect(offerSchema.safeParse({ ...offer, discountValue: 12_000 }).success).toBe(false)
    expect(offerSchema.safeParse({ ...offer, discountValue: Number.NaN }).success).toBe(false)
    expect(offerSchema.safeParse({ ...offer, startsAt: new Date('2026-02-01'), endsAt: new Date('2026-01-01') }).success).toBe(false)
    expect(offerSchema.safeParse({ ...offer, code: 'bad code' }).success).toBe(false)
  })

  it('only allows internal redirect targets', () => {
    expect(redirectSchema.safeParse({ fromPath: '/old', toPath: '/new', permanent: true, note: '' }).success).toBe(true)
    expect(redirectSchema.safeParse({ fromPath: '/old', toPath: '//evil.example', permanent: true, note: '' }).success).toBe(false)
    expect(redirectSchema.safeParse({ fromPath: '/old', toPath: 'https://evil.example', permanent: true, note: '' }).success).toBe(false)
    expect(redirectSchema.safeParse({ fromPath: '/admin', toPath: '/', permanent: true, note: '' }).success).toBe(false)
  })
})
