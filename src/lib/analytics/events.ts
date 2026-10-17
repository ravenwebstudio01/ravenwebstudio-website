/**
 * Analytics event catalogue (GA4). Names are snake_case verbs/nouns and match
 * docs/ANALYTICS.md. Parameters never contain personal data: no names, e-mail
 * addresses, phone numbers, free-text form contents or inquiry references.
 */
export const ANALYTICS_EVENTS = {
  cta_click: 'Click on a primary call to action (param: cta_id, location)',
  service_inquiry_click: 'Click on "Ask about this service" (param: service_slug)',
  budget_tier_select: 'Choosing a budget category CTA (param: tier_slug, location)',
  offer_cta_click: 'Click on an offer call to action (param: offer_slug)',
  collaboration_cta_click: 'Click on a collaboration call to action (param: location)',
  project_view: 'Portfolio project page viewed (param: project_slug)',
  inquiry_form_start: 'First interaction with the inquiry form',
  inquiry_form_submit: 'Inquiry form submitted (before server validation)',
  inquiry_form_error: 'Inquiry submission failed (param: error_type)',
  estimate_request: 'Indicative estimate calculated (param: service_count, has_offer)',
  generate_lead: 'Inquiry stored successfully — mark as key event (params: inquiry_type, client_status, service_count, has_budget)',
} as const

export type AnalyticsEvent = keyof typeof ANALYTICS_EVENTS
export type AnalyticsParams = Record<string, string | number | boolean>

export const CONSENT_COOKIE = 'rws_consent'
export const CONSENT_MAX_AGE_SECONDS = 182 * 24 * 3600

/** Rejects parameter values that look like personal data. */
export function sanitiseParams(params: AnalyticsParams = {}): AnalyticsParams {
  const out: AnalyticsParams = {}
  for (const [key, value] of Object.entries(params)) {
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(key)) continue
    if (typeof value === 'string') {
      if (value.includes('@') || /\d{6,}/.test(value) || value.length > 100) continue
      out[key] = value
    } else {
      out[key] = value
    }
  }
  return out
}
