'use client'

import Link from 'next/link'
import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { CONSENT_COOKIE, CONSENT_MAX_AGE_SECONDS } from '@/lib/analytics/events'
import { track, trackPageView } from '@/lib/analytics/client'

type Choice = 'granted' | 'denied' | null

function readChoice(): Choice {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
  const value = match?.split('=')[1]
  return value === 'granted' || value === 'denied' ? value : null
}

function writeChoice(choice: 'granted' | 'denied') {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE}=${choice}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`
}

function clearAnalyticsCookies() {
  const host = window.location.hostname
  const domains = ['', host, `.${host}`, `.${host.split('.').slice(-2).join('.')}`]
  for (const cookie of document.cookie.split('; ')) {
    const name = cookie.split('=')[0]
    if (!name || !(name === '_ga' || name.startsWith('_ga_') || name === '_gid')) continue
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/${domain ? `; Domain=${domain}` : ''}`
    }
  }
}

export const OPEN_CONSENT_EVENT = 'rws:open-consent'

function PageViews() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const first = useRef(true)
  useEffect(() => {
    // The initial page view is sent by the GA init script; this covers client-side navigation.
    if (first.current) {
      first.current = false
      return
    }
    // Only the path is sent; query strings could contain campaign or form data.
    trackPageView(pathname)
  }, [pathname, searchParams])
  return null
}

/** Delegated click tracking for elements with data-track="event_name". */
function ClickTracking() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-track]')
      if (!target) return
      const name = target.dataset.track as Parameters<typeof track>[0]
      const params: Record<string, string> = {}
      for (const [key, value] of Object.entries(target.dataset)) {
        if (key.startsWith('track') && key !== 'track' && value) {
          const param = key.slice(5).replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`).replace(/^_/, '')
          params[param] = value
        }
      }
      track(name, params)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])
  return null
}

/**
 * Consent banner and consent-gated Google Analytics 4.
 * GA's script is not requested at all until the visitor allows analytics
 * ("basic" consent mode), and withdrawing consent deletes GA cookies.
 * When no measurement ID is configured, nothing optional is set and no banner shows.
 */
export function ConsentManager({ gaId, nonce }: { gaId: string; nonce?: string }) {
  const [choice, setChoice] = useState<Choice>(null)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    // Reading the cookie must happen after hydration (it is client-only state).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChoice(readChoice())
    setReady(true)
    const reopen = () => {
      setOpen(true)
      requestAnimationFrame(() => headingRef.current?.focus())
    }
    window.addEventListener(OPEN_CONSENT_EVENT, reopen)
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen)
  }, [])

  const decide = useCallback(
    (next: 'granted' | 'denied') => {
      const previous = choice
      writeChoice(next)
      setChoice(next)
      setOpen(false)
      if (next === 'denied' && previous === 'granted') {
        clearAnalyticsCookies()
        window.location.reload()
      }
    },
    [choice],
  )

  if (!gaId || !ready) return null
  const showBanner = open || choice === null

  return (
    <>
      {choice === 'granted' && (
        <>
          <Script id="ga-init" nonce={nonce} strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
gtag('js',new Date());
gtag('config',${JSON.stringify(gaId)},{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});
window.__rwsAnalyticsEnabled=true;
gtag('event','page_view',{page_path:location.pathname,page_location:location.origin+location.pathname,page_title:document.title});`}
          </Script>
          <Script
            id="ga-lib"
            nonce={nonce}
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`}
          />
          <Suspense fallback={null}>
            <PageViews />
          </Suspense>
          <ClickTracking />
        </>
      )}

      {showBanner && (
        <section
          aria-labelledby="consent-title"
          className="fixed inset-x-3 bottom-3 z-50 rounded-[var(--radius-panel)] border border-line bg-paper p-5 shadow-[0_18px_48px_-18px_rgba(28,33,51,0.45)] sm:left-auto sm:right-5 sm:bottom-5 sm:max-w-md"
        >
          <h2 id="consent-title" ref={headingRef} tabIndex={-1} className="text-lg font-bold tracking-tight">
            Analytics cookies
          </h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-slate">
            With your permission we use Google Analytics to see which pages help visitors. It stays off unless you allow it,
            and you can change your mind any time under “Cookie settings”.{' '}
            <Link href="/cookies" className="text-link">
              Cookie policy
            </Link>
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => decide('granted')}>
              Allow analytics
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => decide('denied')}>
              Reject
            </button>
          </div>
        </section>
      )}
    </>
  )
}

export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}>
      Cookie settings
    </button>
  )
}
