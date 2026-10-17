import type { Metadata } from 'next'
import Link from 'next/link'
import { RavenMark, Wordmark } from '@/components/brand/raven-mark'
import { NAV_ITEMS } from '@/components/site/nav-items'

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="shell flex h-[4.5rem] items-center">
          <Link href="/" aria-label="Home">
            <Wordmark name="RavenWebStudio" />
          </Link>
        </div>
      </header>
      <main id="main" className="shell flex flex-1 flex-col justify-center py-20">
        <RavenMark className="h-16 w-auto self-start opacity-90" />
        <p className="mt-8 text-sm font-bold text-sheen">Error 404</p>
        <h1 className="mt-2 text-h1 max-w-[18ch] font-extrabold">This page has flown off.</h1>
        <p className="mt-5 max-w-xl text-lede text-slate">
          The address may be mistyped, or the page was moved or unpublished. These pages are a good place to continue:
        </p>
        <ul className="mt-8 flex flex-wrap gap-3">
          <li>
            <Link href="/" className="btn btn-primary btn-sm">
              Homepage
            </Link>
          </li>
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="btn btn-quiet btn-sm">
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/contact" className="btn btn-quiet btn-sm">
              Contact
            </Link>
          </li>
        </ul>
      </main>
    </div>
  )
}
