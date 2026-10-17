import Link from 'next/link'
import { Wordmark } from '@/components/brand/raven-mark'
import type { SiteSettings } from '@/lib/settings'
import { CookieSettingsButton } from './consent-manager'
import { NAV_ITEMS } from './nav-items'

export function SiteFooter({ settings, analyticsEnabled }: { settings: SiteSettings; analyticsEnabled: boolean }) {
  const year = new Date().getFullYear()
  const owner = settings.legalName || settings.businessName
  return (
    <footer className="on-dark bg-plumage text-paper">
      <div className="shell grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Wordmark name={settings.businessName} tone="light" />
          <p className="mt-4 max-w-xs text-[0.9375rem] leading-relaxed text-slate-on-dark">
            Websites and web development for businesses across Europe.
          </p>
          {settings.availabilityNote && (
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-on-dark">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-glint" />
              {settings.availabilityNote}
            </p>
          )}
        </div>

        <nav aria-label="Footer">
          <h2 className="text-sm font-bold text-slate-on-dark">Studio</h2>
          <ul className="mt-4 space-y-2.5">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-[0.9688rem] hover:text-sheen-on-dark hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/contact" className="text-[0.9688rem] hover:text-sheen-on-dark hover:underline">
                Contact
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-bold text-slate-on-dark">Legal</h2>
          <ul className="mt-4 space-y-2.5 text-[0.9688rem]">
            <li>
              <Link href="/privacy" className="hover:text-sheen-on-dark hover:underline">
                Privacy notice
              </Link>
            </li>
            <li>
              <Link href="/cookies" className="hover:text-sheen-on-dark hover:underline">
                Cookie policy
              </Link>
            </li>
            <li>
              <Link href="/legal-notice" className="hover:text-sheen-on-dark hover:underline">
                Legal notice
              </Link>
            </li>
            {analyticsEnabled && (
              <li>
                <CookieSettingsButton className="cursor-pointer text-left hover:text-sheen-on-dark hover:underline" />
              </li>
            )}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-on-dark">Contact</h2>
          <address className="mt-4 space-y-2.5 text-[0.9688rem] not-italic">
            {settings.contactEmail ? (
              <p>
                <a href={`mailto:${settings.contactEmail}`} className="hover:text-sheen-on-dark hover:underline">
                  {settings.contactEmail}
                </a>
              </p>
            ) : (
              <p>
                <Link href="/contact" className="hover:text-sheen-on-dark hover:underline">
                  Send us a message
                </Link>
              </p>
            )}
            {settings.phone && (
              <p>
                <a href={`tel:${settings.phone.replace(/[^+\d]/g, '')}`} className="hover:text-sheen-on-dark hover:underline">
                  {settings.phone}
                </a>
              </p>
            )}
            {settings.address && <p className="whitespace-pre-line text-slate-on-dark">{settings.address}</p>}
          </address>
          {settings.socialLinks.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[0.9375rem]">
              {settings.socialLinks.map((link) => (
                <li key={link.url}>
                  <a href={link.url} rel="noopener noreferrer me" target="_blank" className="hover:text-sheen-on-dark hover:underline">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-plumage-line">
        <div className="shell flex flex-col gap-2 py-6 text-sm text-slate-on-dark sm:flex-row sm:justify-between">
          <p>
            © {year} {owner}
            {settings.vatNumber ? `, VAT ${settings.vatNumber}` : ''}
          </p>
          <a href="#main" className="hover:text-paper hover:underline">
            Back to top
          </a>
        </div>
      </div>
    </footer>
  )
}
