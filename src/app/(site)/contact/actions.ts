'use server'

import { after } from 'next/server'
import { z } from '@/lib/zod'
import { inquiryInputFromFormData, SLUG_RE } from '@/lib/inquiries/schema'
import { submitInquiry } from '@/lib/inquiries/service'
import { computeEstimate } from '@/lib/offers/estimate'
import { requestMeta } from '@/lib/request'
import { pseudonymise } from '@/lib/security/crypto'
import { hitRateLimit } from '@/lib/security/rate-limit'

export type InquiryFormState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  fieldErrors?: Record<string, string>
  reference?: string
  analytics?: { inquiry_type: string; client_status: string; service_count: number; has_budget: boolean } | null
}

export async function submitInquiryAction(formData: FormData): Promise<InquiryFormState> {
  try {
    const meta = await requestMeta()
    const result = await submitInquiry(inquiryInputFromFormData(formData), {
      ip: meta.ip,
      honeypot: String(formData.get('company_website') ?? ''),
      formToken: String(formData.get('formToken') ?? ''),
      sourcePath: String(formData.get('sourcePath') ?? '/contact'),
    })
    if (result.status === 'error') {
      return { status: 'error', message: result.message, fieldErrors: result.fieldErrors }
    }
    if (result.deliver) {
      const deliver = result.deliver
      // E-mails are sent after the response so visitors are not kept waiting.
      after(() => deliver().catch((error) => console.error('[inquiry] notification failed', (error as Error).message)))
    }
    return { status: 'success', reference: result.reference, analytics: result.analytics }
  } catch (error) {
    console.error('[inquiry] submission failed', (error as Error).message)
    return {
      status: 'error',
      message: 'Your inquiry could not be sent because of a technical problem on our side. Please try again in a moment.',
    }
  }
}

const estimateInput = z.object({
  serviceSlugs: z.array(z.string().regex(SLUG_RE)).max(15),
  clientStatus: z.enum(['new', 'existing']),
  offerCode: z.string().trim().toUpperCase().max(40).regex(/^[A-Z0-9_-]*$/),
})

export type EstimateView =
  | {
      ok: true
      currency: string
      subtotal: number
      discountTotal: number
      total: number
      lines: { name: string; amount: number }[]
      offers: { name: string; amount: number }[]
      recurring: { name: string; amount: number; currency: string; unit: 'month' | 'hour' }[]
    }
  | { ok: false; message: string; recurring?: { name: string; amount: number; currency: string; unit: 'month' | 'hour' }[] }

const UNAVAILABLE: Record<string, string> = {
  no_services: 'Choose at least one service to see an indicative estimate.',
  missing_prices: 'Some selected services are quoted individually, so we will include the price in your proposal.',
  mixed_currency: 'The selected services are priced in different currencies; we will include the price in your proposal.',
  only_recurring: 'The selected services are billed on a recurring basis — see the monthly prices below.',
}

export async function estimateAction(input: unknown): Promise<EstimateView> {
  const parsed = estimateInput.safeParse(input)
  if (!parsed.success) return { ok: false, message: 'Your selection could not be read. Reload the page and try again.' }
  const meta = await requestMeta()
  const limit = await hitRateLimit(`estimate:ip:${pseudonymise(meta.ip, 'ip')}`, 30, 600)
  if (!limit.allowed) return { ok: false, message: 'Too many estimate requests. Please wait a few minutes.' }

  const result = await computeEstimate({
    serviceSlugs: parsed.data.serviceSlugs,
    clientStatus: parsed.data.clientStatus,
    offerCode: parsed.data.offerCode || undefined,
  })
  if (!result.available) return { ok: false, message: UNAVAILABLE[result.reason] ?? UNAVAILABLE.no_services!, recurring: result.recurring }
  const s = result.snapshot
  return {
    ok: true,
    currency: s.currency,
    subtotal: s.subtotal,
    discountTotal: s.discountTotal,
    total: s.total,
    lines: s.lines.map((l) => ({ name: l.name, amount: l.amount })),
    offers: s.appliedOffers.map((o) => ({ name: o.name, amount: o.amount })),
    recurring: result.recurring,
  }
}
