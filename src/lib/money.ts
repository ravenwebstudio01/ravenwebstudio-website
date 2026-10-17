/**
 * Money helpers. All amounts are integers in minor units (e.g. cents).
 */

export const SUPPORTED_CURRENCIES = ['EUR', 'GBP', 'CHF', 'USD', 'SEK', 'DKK', 'NOK', 'PLN', 'CZK', 'RON', 'HUF', 'MDL'] as const
export type Currency = (typeof SUPPORTED_CURRENCIES)[number]

export const DEFAULT_LOCALE = 'en-IE'

export function isCurrency(value: string): value is Currency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value)
}

export function formatMoney(minor: number, currency: string, locale: string = DEFAULT_LOCALE): string {
  const major = minor / 100
  const whole = Number.isInteger(major)
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(major)
}

export function formatRange(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string,
  locale: string = DEFAULT_LOCALE,
): string | null {
  const hasMin = typeof min === 'number'
  const hasMax = typeof max === 'number'
  if (hasMin && hasMax) {
    if (min === max) return formatMoney(min, currency, locale)
    return `${formatMoney(min, currency, locale)}–${formatMoney(max, currency, locale)}`
  }
  if (hasMin) return `From ${formatMoney(min, currency, locale)}`
  if (hasMax) return `Up to ${formatMoney(max, currency, locale)}`
  return null
}

/**
 * Parses an administrator-entered amount ("1500", "1 500,50", "1500.5") into
 * minor units. Returns null for empty input and NaN for invalid input.
 */
export function parseMajorToMinor(input: string | null | undefined): number | null {
  if (input == null) return null
  const cleaned = input.replace(/[\s ']/g, '').replace(/[€$£]/g, '')
  if (cleaned === '') return null
  const normalised = /^\d+,\d{1,2}$/.test(cleaned) ? cleaned.replace(',', '.') : cleaned.replace(/,/g, '')
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(normalised)) return Number.NaN
  const [whole, fraction = ''] = normalised.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}

export function minorToMajorString(minor: number | null | undefined): string {
  if (minor == null) return ''
  const whole = Math.trunc(minor / 100)
  const cents = Math.abs(minor % 100)
  return cents === 0 ? String(whole) : `${whole}.${String(cents).padStart(2, '0')}`
}

/** Basis points → human percentage ("12.5"). */
export function basisPointsToPercent(bp: number): string {
  const value = bp / 100
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export function parsePercentToBasisPoints(input: string | null | undefined): number | null {
  if (input == null) return null
  const cleaned = input.replace(/[\s%]/g, '').replace(',', '.')
  if (cleaned === '') return null
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(cleaned)) return Number.NaN
  return Math.round(Number(cleaned) * 100)
}
