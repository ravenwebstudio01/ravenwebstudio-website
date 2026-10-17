import { describe, expect, it } from 'vitest'
import { basisPointsToPercent, formatMoney, formatRange, minorToMajorString, parseMajorToMinor, parsePercentToBasisPoints } from '@/lib/money'
import { fillPlaceholders, safeExternalUrl, slugify } from '@/lib/utils'
import { can } from '@/lib/auth/permissions'
import { describeOffer, discountHeadline } from '@/lib/offers/describe'
import { escapeHtml, headerSafe, inquiryNotificationEmail } from '@/lib/email/templates'
import { sanitiseParams } from '@/lib/analytics/events'

describe('money', () => {
  it('parses administrator amounts into cents', () => {
    expect(parseMajorToMinor('1500')).toBe(150_000)
    expect(parseMajorToMinor('1 500,50')).toBe(150_050)
    expect(parseMajorToMinor('1,500.5')).toBe(150_050)
    expect(parseMajorToMinor('€2000')).toBe(200_000)
    expect(parseMajorToMinor('')).toBe(null)
    expect(parseMajorToMinor('12.345')).toBeNaN()
    expect(parseMajorToMinor('-5')).toBeNaN()
    expect(parseMajorToMinor('abc')).toBeNaN()
  })

  it('round-trips minor units to editable strings', () => {
    expect(minorToMajorString(150_000)).toBe('1500')
    expect(minorToMajorString(150_050)).toBe('1500.50')
    expect(minorToMajorString(null)).toBe('')
  })

  it('formats euro amounts and ranges', () => {
    expect(formatMoney(150_000, 'EUR', 'en-IE')).toBe('€1,500')
    expect(formatMoney(150_050, 'EUR', 'en-IE')).toBe('€1,500.50')
    expect(formatRange(100_000, 300_000, 'EUR', 'en-IE')).toBe('€1,000–€3,000')
    expect(formatRange(100_000, null, 'EUR', 'en-IE')).toBe('From €1,000')
    expect(formatRange(null, null, 'EUR')).toBe(null)
  })

  it('converts percentages and basis points', () => {
    expect(parsePercentToBasisPoints('10')).toBe(1000)
    expect(parsePercentToBasisPoints('12,5%')).toBe(1250)
    expect(parsePercentToBasisPoints('')).toBe(null)
    expect(parsePercentToBasisPoints('1000')).toBeNaN()
    expect(basisPointsToPercent(1250)).toBe('12.5')
    expect(basisPointsToPercent(1000)).toBe('10')
  })
})

describe('utils', () => {
  it('creates readable slugs including European characters', () => {
    expect(slugify('Website Redesigns')).toBe('website-redesigns')
    expect(slugify('Ünternehmen – Straße & Łódź')).toBe('unternehmen-strasse-lodz')
    expect(slugify('  --Hello__World--  ')).toBe('hello-world')
  })

  it('accepts only http(s) external URLs', () => {
    expect(safeExternalUrl('https://example.com/a')).toBe('https://example.com/a')
    expect(safeExternalUrl('javascript:alert(1)')).toBe(null)
    expect(safeExternalUrl('data:text/html,hi')).toBe(null)
    expect(safeExternalUrl('not a url')).toBe(null)
  })

  it('fills placeholders and marks missing values visibly', () => {
    expect(fillPlaceholders('Hi {{name}}, {{missing}}', { name: 'Ana' })).toBe('Hi Ana, [missing — to be completed]')
  })
})

describe('permissions', () => {
  it('limits editors to content management', () => {
    expect(can('editor', 'content:manage')).toBe(true)
    expect(can('editor', 'inquiries:read')).toBe(false)
    expect(can('editor', 'offers:manage')).toBe(false)
    expect(can('editor', 'users:manage')).toBe(false)
    expect(can('admin', 'users:manage')).toBe(true)
  })
})

describe('offer descriptions', () => {
  const base = {
    discountType: 'percentage' as const,
    discountValue: 1500,
    currency: 'EUR',
    discountScope: 'eligible_services' as const,
    clientEligibility: 'existing' as const,
    minSubtotal: 200_000,
    minServiceCount: null,
    maxDiscount: null,
    endsAt: null,
    stackable: false,
    requiresApproval: true,
    requiredServices: [{ name: 'Business websites' }],
    eligibleServices: [{ name: 'Website maintenance' }, { name: 'Technical SEO' }],
  }
  it('explains the discount in plain language', () => {
    expect(discountHeadline(base)).toBe('15% off')
    expect(discountHeadline({ ...base, discountType: 'fixed_amount', discountValue: 20_000 }, 'en-IE')).toBe('€200 off')
    const d = describeOffer(base, 'en-IE')
    expect(d.appliesTo).toBe('on Website maintenance and Technical SEO')
    expect(d.conditions).toContain('For existing clients')
    expect(d.conditions).toContain('When your project includes Business websites')
    expect(d.conditions).toContain('For projects from €2,000')
    expect(d.conditions).toContain('Cannot be combined with other offers')
    expect(d.conditions).toContain('Confirmed individually in your proposal')
  })
})

describe('e-mail templates', () => {
  it('escapes HTML and strips header injection', () => {
    expect(escapeHtml('<script>"x"&\'')).toBe('&lt;script&gt;&quot;x&quot;&amp;&#39;')
    expect(headerSafe('Hello\r\nBcc: evil@example.com')).toBe('Hello Bcc: evil@example.com')
  })

  it('never puts raw user HTML into notification e-mails', () => {
    const mail = inquiryNotificationEmail(
      {
        reference: 'RWS-2610-ABCDE',
        name: '<img src=x onerror=alert(1)>',
        email: 'a@b.eu',
        company: '',
        phone: '',
        country: '',
        inquiryType: 'Project',
        clientStatus: 'New client',
        services: [],
        additionalServices: [],
        budget: '',
        timeline: '',
        websiteUrl: '',
        collaborationType: '',
        offer: '',
        description: '</p><script>alert(1)</script>',
        estimate: '',
      },
      { businessName: 'RavenWebStudio', adminUrl: 'https://example.com/admin/inquiries/1', includeDetails: true },
    )
    expect(mail.html).not.toContain('<script>')
    expect(mail.html).not.toContain('<img src=x')
    expect(mail.subject).toBe('New inquiry RWS-2610-ABCDE: Project')
  })

  it('omits personal details when configured', () => {
    const mail = inquiryNotificationEmail(
      { reference: 'R', name: 'Secret Name', email: 'secret@example.com', company: '', phone: '', country: '', inquiryType: 'Project', clientStatus: '', services: [], additionalServices: [], budget: '', timeline: '', websiteUrl: '', collaborationType: '', offer: '', description: 'private', estimate: '' },
      { businessName: 'RWS', adminUrl: 'https://x.eu/admin', includeDetails: false },
    )
    expect(mail.text).not.toContain('Secret Name')
    expect(mail.text).not.toContain('secret@example.com')
    expect(mail.text).not.toContain('private')
  })
})

describe('analytics parameters', () => {
  it('drops values that look like personal data', () => {
    expect(sanitiseParams({ cta_id: 'hero', email: 'a@b.eu', phone: '0049123456789', 'Bad Key': 'x', count: 3 })).toEqual({ cta_id: 'hero', count: 3 })
  })
})
