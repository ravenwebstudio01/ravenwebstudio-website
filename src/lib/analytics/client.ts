'use client'

import { sanitiseParams, type AnalyticsEvent, type AnalyticsParams } from './events'

type GtagWindow = Window & {
  gtag?: (...args: unknown[]) => void
  __rwsAnalyticsEnabled?: boolean
}

/** Sends an event only if the visitor consented and GA is loaded; otherwise a no-op. */
export function track(event: AnalyticsEvent, params?: AnalyticsParams): void {
  if (typeof window === 'undefined') return
  const w = window as GtagWindow
  if (!w.__rwsAnalyticsEnabled || typeof w.gtag !== 'function') return
  w.gtag('event', event, sanitiseParams(params))
}

export function trackPageView(path: string): void {
  if (typeof window === 'undefined') return
  const w = window as GtagWindow
  if (!w.__rwsAnalyticsEnabled || typeof w.gtag !== 'function') return
  w.gtag('event', 'page_view', {
    page_path: path,
    page_location: `${window.location.origin}${path}`,
    page_title: document.title,
  })
}
