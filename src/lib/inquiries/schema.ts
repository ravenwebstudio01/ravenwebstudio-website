/**
 * Inquiry form schema — shared by the browser (instant feedback) and the server
 * (authoritative validation). Keep it free of server-only imports.
 */
import { z } from '@/lib/zod'

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const INQUIRY_TYPES = [
  { value: 'project', label: 'A new website or project' },
  { value: 'existing_client', label: 'More work on an existing project' },
  { value: 'collaboration', label: 'A collaboration or partnership' },
  { value: 'general', label: 'Something else' },
] as const

export const INQUIRY_TYPE_LABELS: Record<string, string> = Object.fromEntries(INQUIRY_TYPES.map((t) => [t.value, t.label]))

export const TIMELINES = ['As soon as possible', 'Within 1–3 months', 'In 3–6 months', 'Later or flexible', 'Not sure yet'] as const

export const COUNTRIES = [
  'Albania', 'Andorra', 'Austria', 'Belgium', 'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia',
  'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland', 'Italy', 'Kosovo',
  'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malta', 'Moldova', 'Monaco', 'Montenegro', 'Netherlands',
  'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania', 'San Marino', 'Serbia', 'Slovakia', 'Slovenia', 'Spain',
  'Sweden', 'Switzerland', 'Ukraine', 'United Kingdom', 'Outside Europe',
] as const

const slug = z.string().regex(SLUG_RE, 'Invalid selection.')
const optionalSlug = z.union([z.literal(''), slug]).default('')

function normaliseUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function isHttpUrl(value: string): boolean {
  if (value === '') return true
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.')
  } catch {
    return false
  }
}

export const inquirySchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(120, 'Use at most 120 characters.'),
  email: z.string().trim().toLowerCase().max(254, 'Use at most 254 characters.').email('Enter a valid e-mail address, like name@company.eu.'),
  company: z.string().trim().max(160, 'Use at most 160 characters.').default(''),
  phone: z
    .string()
    .trim()
    .max(40, 'Use at most 40 characters.')
    .regex(/^[+()\d\s./-]*$/, 'Use digits, spaces and + ( ) - only.')
    .default(''),
  country: z.union([z.literal(''), z.enum(COUNTRIES)]).default(''),
  inquiryType: z.enum(['project', 'existing_client', 'collaboration', 'general'], { error: 'Choose what your inquiry is about.' }),
  clientStatus: z.enum(['new', 'existing']).default('new'),
  serviceSlugs: z.array(slug).max(15).default([]),
  wantsAdditionalServices: z.boolean().default(false),
  additionalServiceSlugs: z.array(slug).max(15).default([]),
  budgetTierSlug: optionalSlug,
  timeline: z.union([z.literal(''), z.enum(TIMELINES)]).default(''),
  description: z
    .string()
    .trim()
    .min(20, 'Tell us a little more about what you need (at least 20 characters).')
    .max(5000, 'Use at most 5,000 characters.'),
  websiteUrl: z
    .string()
    .max(500, 'Use at most 500 characters.')
    .transform(normaliseUrl)
    .refine(isHttpUrl, 'Enter a website address such as https://example.com.')
    .default(''),
  collaborationTypeSlug: optionalSlug,
  offerSlug: optionalSlug,
  offerCode: z
    .string()
    .trim()
    .toUpperCase()
    .max(40, 'Use at most 40 characters.')
    .regex(/^[A-Z0-9_-]*$/, 'Offer codes contain letters, numbers, - and _ only.')
    .default(''),
  privacyAcknowledged: z.literal(true, { error: 'Please confirm that you have read the privacy notice.' }),
})

export type InquiryInput = z.input<typeof inquirySchema>
export type InquiryData = z.output<typeof inquirySchema>

export const INQUIRY_FIELDS = [
  'name',
  'email',
  'company',
  'phone',
  'country',
  'inquiryType',
  'clientStatus',
  'serviceSlugs',
  'wantsAdditionalServices',
  'additionalServiceSlugs',
  'budgetTierSlug',
  'timeline',
  'description',
  'websiteUrl',
  'collaborationTypeSlug',
  'offerSlug',
  'offerCode',
  'privacyAcknowledged',
] as const

/** Converts submitted form data into the schema's input shape. */
export function inquiryInputFromFormData(fd: FormData): Record<string, unknown> {
  const str = (key: string) => {
    const value = fd.get(key)
    return typeof value === 'string' ? value : ''
  }
  const list = (key: string) => fd.getAll(key).filter((v): v is string => typeof v === 'string' && v !== '')
  return {
    name: str('name'),
    email: str('email'),
    company: str('company'),
    phone: str('phone'),
    country: str('country'),
    inquiryType: str('inquiryType') || undefined,
    clientStatus: str('clientStatus') || 'new',
    serviceSlugs: list('serviceSlugs'),
    wantsAdditionalServices: str('wantsAdditionalServices') === 'on',
    additionalServiceSlugs: list('additionalServiceSlugs'),
    budgetTierSlug: str('budgetTierSlug'),
    timeline: str('timeline'),
    description: str('description'),
    websiteUrl: str('websiteUrl'),
    collaborationTypeSlug: str('collaborationTypeSlug'),
    offerSlug: str('offerSlug'),
    offerCode: str('offerCode'),
    privacyAcknowledged: str('privacyAcknowledged') === 'on',
  }
}

/** Maps zod issues to the first message per field. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    if (!out[key]) out[key] = issue.message
  }
  return out
}
