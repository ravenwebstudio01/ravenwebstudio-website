/**
 * Offer & discount engine.
 *
 * Pure and deterministic: given price lines (computed on the server from the
 * database), the client's status, any offer codes and the current time, it
 * decides which offers apply and how much each discounts. Nothing here trusts a
 * price or discount supplied by the browser.
 *
 * Rules
 * 1. An offer is considered only if it is published, inside its date window,
 *    matches the client type, has its code supplied (when it has one), is not
 *    marked "requires approval" (unless approved by an administrator), and its
 *    required services / minimum conditions are met.
 * 2. Non-stackable offers never combine with any other offer. Stackable offers
 *    combine with each other only.
 * 3. The engine compares (a) the single best non-stackable offer with (b) all
 *    eligible stackable offers together, and applies whichever discounts more.
 * 4. Stacked offers apply sequentially (priority, then id) to what remains of
 *    each line, so a line can never go below zero and percentages compound
 *    conservatively (10% then 5% = 14.5%).
 * 5. Each offer applies at most once.
 */

export type DiscountType = 'percentage' | 'fixed_amount'
export type DiscountScope = 'eligible_services' | 'order_total'
export type ClientEligibility = 'any' | 'new' | 'existing'
export type ClientStatus = 'new' | 'existing'

export type OfferRule = {
  id: string
  name: string
  status: 'draft' | 'published' | 'archived'
  discountType: DiscountType
  /** Basis points for percentage, minor units for fixed amounts. */
  discountValue: number
  currency: string
  discountScope: DiscountScope
  clientEligibility: ClientEligibility
  minSubtotal: number | null
  minServiceCount: number | null
  maxDiscount: number | null
  startsAt: Date | null
  endsAt: Date | null
  stackable: boolean
  requiresApproval: boolean
  code: string | null
  priority: number
  requiredServiceIds: string[]
  /** Empty list = every selected service is eligible. */
  eligibleServiceIds: string[]
}

export type PriceLine = {
  serviceId: string
  name: string
  amount: number
  currency: string
}

export type RejectReason =
  | 'not_published'
  | 'not_started'
  | 'expired'
  | 'client_not_eligible'
  | 'code_required'
  | 'requires_approval'
  | 'currency_mismatch'
  | 'missing_required_services'
  | 'below_min_service_count'
  | 'below_min_subtotal'
  | 'no_eligible_services'
  | 'not_combinable'

export type EvaluateOptions = {
  lines: PriceLine[]
  clientStatus: ClientStatus
  offers: OfferRule[]
  now: Date
  codes?: string[]
  /** Administrator context: offers that have been manually approved. */
  approvedOfferIds?: string[]
  /** Administrator calculator: evaluate drafts too. */
  ignoreStatus?: boolean
}

export type EvaluatedLine = PriceLine & { discount: number; net: number }

export type Evaluation =
  | {
      ok: true
      currency: string
      subtotal: number
      discountTotal: number
      total: number
      lines: EvaluatedLine[]
      applied: { offerId: string; name: string; amount: number }[]
      rejected: { offerId: string; name: string; reason: RejectReason }[]
    }
  | { ok: false; error: 'empty' | 'mixed_currency' | 'invalid_amount' }

export const REJECT_REASON_LABELS: Record<RejectReason, string> = {
  not_published: 'Offer is not published',
  not_started: 'Offer has not started yet',
  expired: 'Offer has expired',
  client_not_eligible: 'Not available for this client type',
  code_required: 'Requires an offer code',
  requires_approval: 'Requires manual approval',
  currency_mismatch: 'Offer currency differs from the price currency',
  missing_required_services: 'Required services are not selected',
  below_min_service_count: 'Not enough services selected',
  below_min_subtotal: 'Below the minimum order value',
  no_eligible_services: 'None of the selected services are eligible',
  not_combinable: 'Cannot be combined with a better offer',
}

function normaliseCode(code: string): string {
  return code.trim().toUpperCase()
}

function byPriority(a: OfferRule, b: OfferRule): number {
  if (b.priority !== a.priority) return b.priority - a.priority
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

function eligibleLineIndexes(offer: OfferRule, lines: PriceLine[]): number[] {
  if (offer.discountScope === 'order_total' || offer.eligibleServiceIds.length === 0) {
    return lines.map((_, i) => i)
  }
  const eligible = new Set(offer.eligibleServiceIds)
  return lines.flatMap((line, i) => (eligible.has(line.serviceId) ? [i] : []))
}

/** Discount amount for an offer given the current (remaining) base amount. */
function discountFor(offer: OfferRule, base: number): number {
  if (base <= 0) return 0
  let amount =
    offer.discountType === 'percentage'
      ? Math.round((base * offer.discountValue) / 10_000)
      : Math.min(offer.discountValue, base)
  if (offer.maxDiscount != null && offer.maxDiscount >= 0) amount = Math.min(amount, offer.maxDiscount)
  return Math.max(0, Math.min(amount, base))
}

/**
 * Splits `amount` across lines proportionally to their remaining value using the
 * largest-remainder method so the parts always sum exactly to `amount`.
 */
function allocate(amount: number, indexes: number[], remaining: number[]): Map<number, number> {
  const result = new Map<number, number>()
  const base = indexes.reduce((sum, i) => sum + (remaining[i] ?? 0), 0)
  if (amount <= 0 || base <= 0) return result
  const parts = indexes.map((i) => {
    const exact = (amount * (remaining[i] ?? 0)) / base
    return { i, floor: Math.floor(exact), frac: exact - Math.floor(exact) }
  })
  let leftover = amount - parts.reduce((sum, p) => sum + p.floor, 0)
  parts.sort((a, b) => b.frac - a.frac || a.i - b.i)
  for (const part of parts) {
    const extra = leftover > 0 && part.floor < (remaining[part.i] ?? 0) ? 1 : 0
    leftover -= extra
    result.set(part.i, part.floor + extra)
  }
  return result
}

function applySequentially(
  offers: OfferRule[],
  lines: PriceLine[],
): { total: number; perOffer: Map<string, number>; perLine: number[] } {
  const remaining = lines.map((l) => l.amount)
  const perOffer = new Map<string, number>()
  for (const offer of offers) {
    const indexes = eligibleLineIndexes(offer, lines)
    const base = indexes.reduce((sum, i) => sum + (remaining[i] ?? 0), 0)
    const amount = discountFor(offer, base)
    if (amount <= 0) continue
    for (const [i, part] of allocate(amount, indexes, remaining)) {
      remaining[i] = (remaining[i] ?? 0) - part
    }
    perOffer.set(offer.id, amount)
  }
  const perLine = lines.map((l, i) => l.amount - (remaining[i] ?? 0))
  const total = perLine.reduce((a, b) => a + b, 0)
  return { total, perOffer, perLine }
}

export function evaluateOffers(options: EvaluateOptions): Evaluation {
  const { clientStatus, now } = options

  // Deduplicate lines by service id (a service can only be ordered once here).
  const seen = new Set<string>()
  const lines: PriceLine[] = []
  for (const line of options.lines) {
    if (seen.has(line.serviceId)) continue
    seen.add(line.serviceId)
    lines.push(line)
  }

  if (lines.length === 0) return { ok: false, error: 'empty' }
  if (lines.some((l) => !Number.isInteger(l.amount) || l.amount < 0)) {
    return { ok: false, error: 'invalid_amount' }
  }
  const currency = lines[0]!.currency
  if (lines.some((l) => l.currency !== currency)) return { ok: false, error: 'mixed_currency' }

  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0)
  const selected = new Set(lines.map((l) => l.serviceId))
  const codes = new Set((options.codes ?? []).filter(Boolean).map(normaliseCode))
  const approved = new Set(options.approvedOfferIds ?? [])

  const rejected: { offerId: string; name: string; reason: RejectReason }[] = []
  const eligible: OfferRule[] = []
  const seenOffers = new Set<string>()

  for (const offer of options.offers) {
    if (seenOffers.has(offer.id)) continue
    seenOffers.add(offer.id)
    const reject = (reason: RejectReason) => rejected.push({ offerId: offer.id, name: offer.name, reason })

    if (!options.ignoreStatus && offer.status !== 'published') {
      reject('not_published')
      continue
    }
    if (offer.startsAt && offer.startsAt.getTime() > now.getTime()) {
      reject('not_started')
      continue
    }
    if (offer.endsAt && offer.endsAt.getTime() <= now.getTime()) {
      reject('expired')
      continue
    }
    if (offer.clientEligibility !== 'any' && offer.clientEligibility !== clientStatus) {
      reject('client_not_eligible')
      continue
    }
    if (offer.code && !codes.has(normaliseCode(offer.code))) {
      reject('code_required')
      continue
    }
    if (offer.requiresApproval && !approved.has(offer.id)) {
      reject('requires_approval')
      continue
    }
    if (offer.discountType === 'fixed_amount' && offer.currency !== currency) {
      reject('currency_mismatch')
      continue
    }
    if (!offer.requiredServiceIds.every((id) => selected.has(id))) {
      reject('missing_required_services')
      continue
    }
    if (offer.minServiceCount != null && lines.length < offer.minServiceCount) {
      reject('below_min_service_count')
      continue
    }
    if (offer.minSubtotal != null && subtotal < offer.minSubtotal) {
      reject('below_min_subtotal')
      continue
    }
    const base = eligibleLineIndexes(offer, lines).reduce((sum, i) => sum + lines[i]!.amount, 0)
    if (base <= 0 || discountFor(offer, base) <= 0) {
      reject('no_eligible_services')
      continue
    }
    eligible.push(offer)
  }

  const exclusive = eligible.filter((o) => !o.stackable).sort(byPriority)
  const stackable = eligible.filter((o) => o.stackable).sort(byPriority)

  // Option A: best single non-stackable offer.
  let bestExclusive: { offer: OfferRule; result: ReturnType<typeof applySequentially> } | null = null
  for (const offer of exclusive) {
    const result = applySequentially([offer], lines)
    if (!bestExclusive || result.total > bestExclusive.result.total) {
      bestExclusive = { offer, result }
    }
  }

  // Option B: all stackable offers together.
  const stacked = stackable.length > 0 ? applySequentially(stackable, lines) : null

  let chosen: { offers: OfferRule[]; result: ReturnType<typeof applySequentially> } | null = null
  if (bestExclusive && (!stacked || bestExclusive.result.total >= stacked.total)) {
    chosen = { offers: [bestExclusive.offer], result: bestExclusive.result }
  } else if (stacked) {
    chosen = { offers: stackable, result: stacked }
  }

  const chosenIds = new Set(chosen?.offers.map((o) => o.id) ?? [])
  for (const offer of eligible) {
    if (!chosenIds.has(offer.id)) {
      rejected.push({ offerId: offer.id, name: offer.name, reason: 'not_combinable' })
    }
  }

  const applied = (chosen?.offers ?? [])
    .map((o) => ({ offerId: o.id, name: o.name, amount: chosen!.result.perOffer.get(o.id) ?? 0 }))
    .filter((a) => a.amount > 0)

  const perLine = chosen?.result.perLine ?? lines.map(() => 0)
  const evaluatedLines: EvaluatedLine[] = lines.map((line, i) => ({
    ...line,
    discount: perLine[i] ?? 0,
    net: line.amount - (perLine[i] ?? 0),
  }))
  const discountTotal = applied.reduce((sum, a) => sum + a.amount, 0)

  return {
    ok: true,
    currency,
    subtotal,
    discountTotal,
    total: subtotal - discountTotal,
    lines: evaluatedLines,
    applied,
    rejected,
  }
}
