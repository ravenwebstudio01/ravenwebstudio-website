import { basisPointsToPercent, formatMoney } from '@/lib/money'
import { formatDate } from '@/lib/utils'

export type DescribableOffer = {
  discountType: 'percentage' | 'fixed_amount'
  discountValue: number
  currency: string
  discountScope: 'eligible_services' | 'order_total'
  clientEligibility: 'any' | 'new' | 'existing'
  minSubtotal: number | null
  minServiceCount: number | null
  maxDiscount: number | null
  endsAt: Date | null
  stackable: boolean
  requiresApproval: boolean
  requiredServices: { name: string }[]
  eligibleServices: { name: string }[]
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** "10% off" / "€200 off" */
export function discountHeadline(offer: Pick<DescribableOffer, 'discountType' | 'discountValue' | 'currency'>, locale?: string): string {
  return offer.discountType === 'percentage'
    ? `${basisPointsToPercent(offer.discountValue)}% off`
    : `${formatMoney(offer.discountValue, offer.currency, locale)} off`
}

/** Plain-language description of where the discount applies and its conditions. */
export function describeOffer(offer: DescribableOffer, locale?: string): { appliesTo: string; conditions: string[] } {
  const eligible = offer.eligibleServices.map((s) => s.name)
  const appliesTo =
    offer.discountScope === 'order_total' || eligible.length === 0
      ? 'on the whole project'
      : `on ${joinNames(eligible)}`

  const conditions: string[] = []
  if (offer.requiredServices.length) conditions.push(`When your project includes ${joinNames(offer.requiredServices.map((s) => s.name))}`)
  if (offer.clientEligibility === 'existing') conditions.push('For existing clients')
  if (offer.clientEligibility === 'new') conditions.push('For new clients')
  if (offer.minServiceCount) conditions.push(`When you combine at least ${offer.minServiceCount} services`)
  if (offer.minSubtotal) conditions.push(`For projects from ${formatMoney(offer.minSubtotal, offer.currency, locale)}`)
  if (offer.maxDiscount) conditions.push(`Maximum discount ${formatMoney(offer.maxDiscount, offer.currency, locale)}`)
  if (offer.endsAt) conditions.push(`Available until ${formatDate(offer.endsAt)}`)
  conditions.push(offer.stackable ? 'Can be combined with other combinable offers' : 'Cannot be combined with other offers')
  if (offer.requiresApproval) conditions.push('Confirmed individually in your proposal')
  return { appliesTo, conditions }
}
