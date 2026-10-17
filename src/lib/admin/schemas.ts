/** Server-side validation for dashboard forms. */
import { z } from '@/lib/zod'
import { SUPPORTED_CURRENCIES } from '@/lib/money'
import { SLUG_PATTERN } from '@/lib/utils'
import { SERVICE_ICONS } from '@/components/site/service-icon'

const amount = z.number({ error: 'Enter an amount like 1500 or 1500.50.' }).int().min(0).max(100_000_000).nullable()
const uuidNullable = z.string().uuid().nullable()
const slug = z
  .string()
  .min(1, 'Enter a URL slug.')
  .max(120)
  .regex(SLUG_PATTERN, 'Use lowercase letters, numbers and single hyphens, e.g. business-websites.')
const status = z.enum(['draft', 'published', 'archived'])
const lineList = (max: number, itemMax = 160) => z.array(z.string().max(itemMax, `Each line can have at most ${itemMax} characters.`)).max(max, `At most ${max} lines.`)
const seoTitle = z.string().max(70, 'At most 70 characters.')
const seoDescription = z.string().max(170, 'At most 170 characters.')

export const serviceSchema = z
  .object({
    name: z.string().min(2, 'Enter a name.').max(120),
    slug,
    shortDescription: z.string().min(10, 'Write at least a short sentence (10+ characters).').max(300),
    description: z.string().max(20_000),
    categoryId: uuidNullable,
    features: lineList(20),
    deliverables: lineList(20),
    priceFrom: amount,
    priceTo: amount,
    currency: z.enum(SUPPORTED_CURRENCIES),
    priceUnit: z.enum(['project', 'month', 'hour']),
    showPrice: z.boolean(),
    timeline: z.string().max(120),
    icon: z.enum(Object.keys(SERVICE_ICONS) as [string, ...string[]]),
    imageId: uuidNullable,
    status,
    isSample: z.boolean(),
    seoTitle,
    seoDescription,
    relatedIds: z.array(z.string().uuid()).max(10),
  })
  .superRefine((v, ctx) => {
    if (v.priceFrom != null && v.priceTo != null && v.priceTo < v.priceFrom) {
      ctx.addIssue({ code: 'custom', path: ['priceTo'], message: 'The upper price must be at least the starting price.' })
    }
    if (v.showPrice && v.priceFrom == null && v.priceTo == null) {
      ctx.addIssue({ code: 'custom', path: ['showPrice'], message: 'Enter a price before showing it publicly.' })
    }
  })

export const projectSchema = z.object({
  title: z.string().min(2, 'Enter a title.').max(160),
  slug,
  clientName: z.string().max(160),
  clientNameApproved: z.boolean(),
  summary: z.string().max(300),
  description: z.string().max(30_000),
  categoryId: uuidNullable,
  projectUrl: z
    .string()
    .max(500)
    .refine((v) => v === '' || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v), 'Enter a full address starting with https://'),
  technologies: lineList(20, 60),
  completedOn: z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date picker.')]),
  goals: z.string().max(10_000),
  deliverables: lineList(30),
  results: z.string().max(10_000),
  resultsVerified: z.boolean(),
  featured: z.boolean(),
  coverMediaId: uuidNullable,
  serviceIds: z.array(z.string().uuid()).max(20),
  status,
  isSample: z.boolean(),
  seoTitle,
  seoDescription,
})

export const budgetTierSchema = z
  .object({
    name: z.string().min(2, 'Enter a name.').max(120),
    slug,
    description: z.string().max(600),
    minAmount: amount,
    maxAmount: amount,
    startingPrice: amount,
    currency: z.enum(SUPPORTED_CURRENCIES),
    showAmounts: z.boolean(),
    typicalFeatures: lineList(10),
    suitableFor: lineList(10, 80),
    timeline: z.string().max(120),
    ctaLabel: z.string().max(60),
    serviceIds: z.array(z.string().uuid()).max(20),
    status,
    isSample: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.minAmount != null && v.maxAmount != null && v.maxAmount < v.minAmount) {
      ctx.addIssue({ code: 'custom', path: ['maxAmount'], message: 'The maximum must be at least the minimum.' })
    }
    if (v.showAmounts && v.minAmount == null && v.maxAmount == null && v.startingPrice == null) {
      ctx.addIssue({ code: 'custom', path: ['showAmounts'], message: 'Enter a range or starting price before showing amounts publicly.' })
    }
  })

export const collaborationSchema = z.object({
  name: z.string().min(2, 'Enter a name.').max(120),
  slug,
  summary: z.string().max(300),
  description: z.string().max(10_000),
  status,
  isSample: z.boolean(),
})

export const offerSchema = z
  .object({
    name: z.string().min(2, 'Enter a name.').max(120),
    slug,
    summary: z.string().max(300),
    description: z.string().max(10_000),
    discountType: z.enum(['percentage', 'fixed_amount']),
    discountValue: z.number({ error: 'Enter the discount value.' }).int().positive('The discount must be greater than zero.'),
    currency: z.enum(SUPPORTED_CURRENCIES),
    discountScope: z.enum(['eligible_services', 'order_total']),
    clientEligibility: z.enum(['any', 'new', 'existing']),
    minSubtotal: amount,
    minServiceCount: z.number({ error: 'Enter a whole number.' }).int().min(1).max(20).nullable(),
    maxDiscount: amount,
    startsAt: z.date({ error: 'Use the date picker.' }).nullable(),
    endsAt: z.date({ error: 'Use the date picker.' }).nullable(),
    stackable: z.boolean(),
    requiresApproval: z.boolean(),
    code: z.union([z.literal(''), z.string().regex(/^[A-Z0-9_-]{3,40}$/, 'Use 3–40 letters, numbers, - or _.')]),
    priority: z.number({ error: 'Enter a whole number.' }).int().min(-1000).max(1000),
    terms: z.string().max(10_000),
    requiredServiceIds: z.array(z.string().uuid()).max(20),
    eligibleServiceIds: z.array(z.string().uuid()).max(20),
    status,
    isSample: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.discountType === 'percentage' && v.discountValue > 10_000) {
      ctx.addIssue({ code: 'custom', path: ['discountValue'], message: 'A percentage cannot exceed 100%.' })
    }
    if (v.startsAt && Number.isNaN(v.startsAt.getTime())) ctx.addIssue({ code: 'custom', path: ['startsAt'], message: 'Invalid date.' })
    if (v.endsAt && Number.isNaN(v.endsAt.getTime())) ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'Invalid date.' })
    if (v.startsAt && v.endsAt && v.endsAt <= v.startsAt) {
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'The end date must be after the start date.' })
    }
    if (v.discountScope === 'eligible_services' && v.eligibleServiceIds.length === 0 && v.requiredServiceIds.length === 0) {
      // allowed: applies to every selected service — no issue
    }
  })

export const categorySchema = z.object({
  name: z.string().min(2, 'Enter a name.').max(120),
  slug,
  description: z.string().max(500),
})

export const redirectSchema = z.object({
  fromPath: z
    .string()
    .max(300)
    .regex(/^\/[^\s?#]*$/, 'Use a path starting with /, e.g. /old-page.')
    .refine((v) => !v.startsWith('/admin') && !v.startsWith('/api') && !v.startsWith('//'), 'This path cannot be redirected.'),
  toPath: z
    .string()
    .max(300)
    .regex(/^\/(?!\/)[^\s]*$/, 'Use a path on this website starting with /, e.g. /services.'),
  permanent: z.boolean(),
  note: z.string().max(200),
})
