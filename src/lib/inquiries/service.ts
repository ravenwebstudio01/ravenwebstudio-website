/**
 * Inquiry submission: anti-abuse checks, validation, reference resolution,
 * server-side estimate, storage and (deferred) e-mail notifications.
 */
import { randomInt } from 'node:crypto'
import { and, eq, gt, inArray, isNull, lte, or } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import {
  budgetTiers,
  collaborationTypes,
  inquiries,
  inquiryServices,
  offers,
  services,
  type EstimateSnapshot,
} from '@/lib/db/schema'
import { publiclyVisible } from '@/lib/content/visibility'
import { isUniqueViolation } from '@/lib/db/errors'
import { sendMail, type DeliveryResult } from '@/lib/email/mailer'
import { inquiryAcknowledgementEmail, inquiryNotificationEmail } from '@/lib/email/templates'
import { siteUrl } from '@/lib/env'
import { formatMoney, formatRange } from '@/lib/money'
import { computeEstimate } from '@/lib/offers/estimate'
import { pseudonymise } from '@/lib/security/crypto'
import { checkFormToken } from '@/lib/security/form-token'
import { hitRateLimits } from '@/lib/security/rate-limit'
import { loadSettings } from '@/lib/settings'
import { INQUIRY_TYPE_LABELS, fieldErrorsFrom, inquirySchema } from './schema'

export type SubmitMeta = {
  ip: string
  honeypot: string
  formToken: string
  sourcePath: string
}

export type SubmitResult =
  | {
      status: 'success'
      reference: string
      /** Sends notification e-mails; run after the response (next/server `after`). */
      deliver: (() => Promise<void>) | null
      analytics: { inquiry_type: string; client_status: string; service_count: number; has_budget: boolean } | null
    }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string> }

const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function newReference(now: Date = new Date()): string {
  const yymm = `${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  let suffix = ''
  for (let i = 0; i < 5; i++) suffix += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)]
  return `RWS-${yymm}-${suffix}`
}

function silentSuccess(): SubmitResult {
  // Bots get an ordinary-looking success so they do not adapt; nothing is stored.
  return { status: 'success', reference: newReference(), deliver: null, analytics: null }
}

function looksLikeSpam(text: string): boolean {
  const links = text.match(/https?:\/\/|www\./gi)?.length ?? 0
  return links > 4
}

export async function submitInquiry(raw: Record<string, unknown>, meta: SubmitMeta): Promise<SubmitResult> {
  if (meta.honeypot.trim() !== '') return silentSuccess()
  const token = checkFormToken(meta.formToken)
  if (token === 'too_fast') return silentSuccess()
  if (token === 'expired' || token === 'invalid') {
    return { status: 'error', message: 'This form has expired. Reload the page and send it again — your text is kept in the form.' }
  }

  const parsed = inquirySchema.safeParse(raw)
  if (!parsed.success) {
    return { status: 'error', message: 'Some details need your attention.', fieldErrors: fieldErrorsFrom(parsed.error) }
  }
  const data = parsed.data

  const limit = await hitRateLimits([
    { key: `inquiry:ip:${pseudonymise(meta.ip, 'ip')}`, limit: 5, windowSeconds: 600 },
    { key: `inquiry:ipday:${pseudonymise(meta.ip, 'ip')}`, limit: 20, windowSeconds: 86_400 },
    { key: `inquiry:email:${pseudonymise(data.email, 'email')}`, limit: 3, windowSeconds: 3600 },
  ])
  if (!limit.allowed) {
    return {
      status: 'error',
      message: `We received several messages from you in a short time. Please try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
    }
  }

  const db = getDb()
  const now = new Date()
  const settings = await loadSettings()

  // Resolve references against published content only.
  const allSlugs = [...new Set([...data.serviceSlugs, ...data.additionalServiceSlugs])]
  const serviceRows = allSlugs.length
    ? await db
        .select({ id: services.id, slug: services.slug, name: services.name })
        .from(services)
        .where(and(inArray(services.slug, allSlugs), publiclyVisible(services)))
    : []
  const bySlug = new Map(serviceRows.map((s) => [s.slug, s]))
  const requested = data.serviceSlugs.flatMap((s) => (bySlug.has(s) ? [bySlug.get(s)!] : []))
  const additional = data.wantsAdditionalServices
    ? data.additionalServiceSlugs.filter((s) => !data.serviceSlugs.includes(s)).flatMap((s) => (bySlug.has(s) ? [bySlug.get(s)!] : []))
    : []

  let budgetTierId: string | null = null
  let budgetLabel = ''
  if (data.budgetTierSlug) {
    const [tier] = await db
      .select()
      .from(budgetTiers)
      .where(and(eq(budgetTiers.slug, data.budgetTierSlug), publiclyVisible(budgetTiers)))
      .limit(1)
    if (tier) {
      budgetTierId = tier.id
      const range = tier.showAmounts ? formatRange(tier.minAmount, tier.maxAmount, tier.currency, settings.locale) : null
      budgetLabel = range ? `${tier.name} (${range})` : tier.name
    }
  }

  let collaborationTypeId: string | null = null
  let collaborationLabel = ''
  if (data.inquiryType === 'collaboration' && data.collaborationTypeSlug) {
    const [type] = await db
      .select({ id: collaborationTypes.id, name: collaborationTypes.name })
      .from(collaborationTypes)
      .where(and(eq(collaborationTypes.slug, data.collaborationTypeSlug), publiclyVisible(collaborationTypes)))
      .limit(1)
    if (type) {
      collaborationTypeId = type.id
      collaborationLabel = type.name
    }
  }

  const activeOffer = and(
    publiclyVisible(offers),
    or(isNull(offers.startsAt), lte(offers.startsAt, now)),
    or(isNull(offers.endsAt), gt(offers.endsAt, now)),
  )
  let offerId: string | null = null
  let offerLabel = ''
  if (data.offerCode) {
    const [coded] = await db
      .select({ id: offers.id, name: offers.name })
      .from(offers)
      .where(and(eq(offers.code, data.offerCode), activeOffer))
      .limit(1)
    if (!coded) {
      return {
        status: 'error',
        message: 'Some details need your attention.',
        fieldErrors: { offerCode: 'This offer code is not valid or has expired. Remove it to send your inquiry.' },
      }
    }
    offerId = coded.id
    offerLabel = `${coded.name} (code ${data.offerCode})`
  } else if (data.offerSlug) {
    const [offer] = await db
      .select({ id: offers.id, name: offers.name })
      .from(offers)
      .where(and(eq(offers.slug, data.offerSlug), isNull(offers.code), activeOffer))
      .limit(1)
    if (offer) {
      offerId = offer.id
      offerLabel = offer.name
    }
  }

  let estimate: EstimateSnapshot | null = null
  if (requested.length > 0) {
    const result = await computeEstimate({
      serviceSlugs: requested.map((s) => s.slug),
      clientStatus: data.clientStatus,
      offerCode: data.offerCode || undefined,
      now,
    })
    if (result.available) estimate = result.snapshot
  }

  const isSpam = looksLikeSpam(data.description)

  let reference = ''
  let inquiryId = ''
  for (let attempt = 0; attempt < 5 && !inquiryId; attempt++) {
    reference = newReference(now)
    try {
      inquiryId = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(inquiries)
          .values({
            reference,
            status: isSpam ? 'spam' : 'new',
            inquiryType: data.inquiryType,
            name: data.name,
            email: data.email,
            company: data.company,
            phone: data.phone,
            country: data.country,
            budgetTierId,
            budgetLabel,
            timeline: data.timeline,
            description: data.description,
            clientStatus: data.clientStatus,
            collaborationTypeId,
            wantsAdditionalServices: data.wantsAdditionalServices,
            websiteUrl: data.websiteUrl,
            offerId,
            offerCode: data.offerCode,
            estimate,
            sourcePath: meta.sourcePath.slice(0, 300),
            privacyAcknowledgedAt: now,
            notificationStatus: isSpam ? 'skipped' : 'pending',
            acknowledgementStatus: isSpam || !settings.sendClientAcknowledgement ? 'skipped' : 'pending',
          })
          .returning({ id: inquiries.id })
        const links = [
          ...requested.map((s) => ({ inquiryId: row!.id, serviceId: s.id, serviceName: s.name, kind: 'requested' as const })),
          ...additional.map((s) => ({ inquiryId: row!.id, serviceId: s.id, serviceName: s.name, kind: 'additional' as const })),
        ]
        if (links.length) await tx.insert(inquiryServices).values(links)
        return row!.id
      })
    } catch (error) {
      // Retry only on a reference collision (unique violation).
      if (!isUniqueViolation(error)) throw error
    }
  }
  if (!inquiryId) throw new Error('Could not allocate an inquiry reference.')

  if (isSpam) return { status: 'success', reference, deliver: null, analytics: null }

  const estimateText = estimate
    ? `${formatMoney(estimate.total, estimate.currency, settings.locale)} (subtotal ${formatMoney(estimate.subtotal, estimate.currency, settings.locale)}, discounts ${formatMoney(estimate.discountTotal, estimate.currency, settings.locale)})`
    : ''

  const deliver = async () => {
    const recipient = settings.notificationEmail || settings.contactEmail
    let notification: DeliveryResult = 'not_configured'
    if (recipient) {
      const mail = inquiryNotificationEmail(
        {
          reference,
          name: data.name,
          email: data.email,
          company: data.company,
          phone: data.phone,
          country: data.country,
          inquiryType: INQUIRY_TYPE_LABELS[data.inquiryType] ?? data.inquiryType,
          clientStatus: data.clientStatus === 'existing' ? 'Existing client' : 'New client',
          services: requested.map((s) => s.name),
          additionalServices: additional.map((s) => s.name),
          budget: budgetLabel,
          timeline: data.timeline,
          websiteUrl: data.websiteUrl,
          collaborationType: collaborationLabel,
          offer: offerLabel,
          description: data.description,
          estimate: estimateText,
        },
        {
          businessName: settings.businessName,
          adminUrl: `${siteUrl()}/admin/inquiries/${inquiryId}`,
          includeDetails: settings.notificationIncludeDetails,
        },
      )
      notification = await sendMail({ to: recipient, ...mail, replyTo: data.email })
    }
    let acknowledgement: DeliveryResult | 'skipped' = 'skipped'
    if (settings.sendClientAcknowledgement) {
      const mail = inquiryAcknowledgementEmail(
        { reference, name: data.name },
        { businessName: settings.businessName, contactEmail: settings.contactEmail },
      )
      acknowledgement = await sendMail({ to: data.email, ...mail, replyTo: settings.contactEmail || undefined })
    }
    await db
      .update(inquiries)
      .set({ notificationStatus: notification, acknowledgementStatus: acknowledgement })
      .where(eq(inquiries.id, inquiryId))
  }

  return {
    status: 'success',
    reference,
    deliver,
    analytics: {
      inquiry_type: data.inquiryType,
      client_status: data.clientStatus,
      service_count: requested.length,
      has_budget: Boolean(budgetTierId),
    },
  }
}
