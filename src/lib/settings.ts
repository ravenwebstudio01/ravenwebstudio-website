/**
 * Site-wide settings stored as one validated JSON document (table site_settings).
 * Every field has a safe default so a fresh database renders correctly, and
 * invalid stored values fall back to defaults instead of breaking pages.
 */
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '@/lib/db'
import { siteSettings } from '@/lib/db/schema'
import { SUPPORTED_CURRENCIES } from '@/lib/money'

const socialLink = z.object({
  label: z.string().trim().min(1).max(40),
  url: z.string().trim().url().max(300).refine((u) => /^https:\/\//i.test(u), 'Use an https:// link.'),
})

export const GA_ID_PATTERN = /^G-[A-Z0-9]{4,16}$/

export const settingsSchema = z.object({
  businessName: z.string().trim().min(1).max(120).catch('RavenWebStudio'),
  legalName: z.string().trim().max(160).catch(''),
  contactEmail: z.union([z.literal(''), z.string().trim().email().max(254)]).catch(''),
  notificationEmail: z.union([z.literal(''), z.string().trim().email().max(254)]).catch(''),
  phone: z.string().trim().max(40).catch(''),
  address: z.string().trim().max(400).catch(''),
  vatNumber: z.string().trim().max(40).catch(''),
  companyRegistration: z.string().trim().max(120).catch(''),
  registeredCountry: z.string().trim().max(80).catch(''),
  socialLinks: z.array(socialLink).max(8).catch([]),
  defaultCurrency: z.enum(SUPPORTED_CURRENCIES).catch('EUR'),
  locale: z.string().trim().regex(/^[a-z]{2}(-[A-Z]{2})?$/).catch('en-IE'),
  acceptingProjects: z.boolean().catch(true),
  acceptingCollaborations: z.boolean().catch(true),
  availabilityNote: z.string().trim().max(160).catch(''),
  gaMeasurementId: z.union([z.literal(''), z.string().trim().regex(GA_ID_PATTERN)]).catch(''),
  searchConsoleVerification: z.union([z.literal(''), z.string().trim().regex(/^[A-Za-z0-9_-]{10,100}$/)]).catch(''),
  sendClientAcknowledgement: z.boolean().catch(true),
  notificationIncludeDetails: z.boolean().catch(true),
  inquiryRetentionMonths: z.number().int().min(1).max(120).catch(24),
  auditRetentionMonths: z.number().int().min(1).max(120).catch(12),
  logoMediaId: z.union([z.literal(''), z.string().uuid()]).catch(''),
})

export type SiteSettings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: SiteSettings = settingsSchema.parse({})

export function parseSettings(data: unknown): SiteSettings {
  return settingsSchema.parse(typeof data === 'object' && data !== null ? data : {})
}

export async function loadSettings(): Promise<SiteSettings> {
  const rows = await getDb().select({ data: siteSettings.data }).from(siteSettings).where(eq(siteSettings.id, 1)).limit(1)
  return parseSettings(rows[0]?.data)
}

export async function saveSettings(next: SiteSettings, userId: string | null): Promise<void> {
  await getDb()
    .insert(siteSettings)
    .values({ id: 1, data: next, updatedBy: userId })
    .onConflictDoUpdate({ target: siteSettings.id, set: { data: next, updatedAt: new Date(), updatedBy: userId } })
}
