import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { ConsentManager } from '@/components/site/consent-manager'
import { SiteFooter } from '@/components/site/site-footer'
import { SiteHeader } from '@/components/site/site-header'
import { JsonLd } from '@/components/site/bits'
import { getSettings } from '@/lib/content/queries'
import { getDb } from '@/lib/db'
import { media } from '@/lib/db/schema'
import { env } from '@/lib/env'
import { toMediaView } from '@/lib/media/view'
import { organizationJsonLd } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  const verification = settings.searchConsoleVerification || env().GOOGLE_SITE_VERIFICATION
  return {
    title: { default: settings.businessName, template: `%s | ${settings.businessName}` },
    openGraph: { siteName: settings.businessName, locale: 'en_GB', type: 'website' },
    ...(verification ? { verification: { google: verification } } : {}),
  }
}

async function loadLogo(id: string) {
  if (!id) return null
  const [row] = await getDb().select().from(media).where(eq(media.id, id)).limit(1)
  return toMediaView(row ?? null)
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, requestHeaders] = await Promise.all([getSettings(), headers()])
  const nonce = requestHeaders.get('x-nonce') ?? undefined
  const logo = await loadLogo(settings.logoMediaId)
  const gaId = settings.gaMeasurementId || env().NEXT_PUBLIC_GA_MEASUREMENT_ID || ''

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader businessName={settings.businessName} logo={logo} />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter settings={settings} analyticsEnabled={Boolean(gaId)} />
      <ConsentManager gaId={gaId} nonce={nonce} />
      <JsonLd data={organizationJsonLd(settings)} nonce={nonce} />
    </>
  )
}
