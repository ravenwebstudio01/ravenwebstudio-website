import Link from 'next/link'
import { Wordmark } from '@/components/brand/raven-mark'
import type { MediaView } from '@/lib/media/view'
import { MobileNav } from './mobile-nav'
import { NAV_ITEMS } from './nav-items'
import { NavLink } from './nav-link'

export function SiteHeader({ businessName, logo }: { businessName: string; logo: MediaView | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/85">
      <div className="shell flex h-[4.5rem] items-center justify-between gap-6">
        <Link href="/" className="shrink-0 rounded-sm" aria-label={`${businessName} — home`}>
          {logo ? (
            <img src={logo.src} srcSet={logo.srcSet} sizes="200px" alt="" width={logo.width} height={logo.height} className="h-9 w-auto" />
          ) : (
            <Wordmark name={businessName} />
          )}
        </Link>
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/contact"
            className="btn btn-primary btn-sm hidden sm:inline-flex"
            data-track="cta_click"
            data-track-cta-id="header_contact"
            data-track-location="header"
          >
            Start a project
          </Link>
          <MobileNav ctaLabel="Start a project" />
        </div>
      </div>
    </header>
  )
}
