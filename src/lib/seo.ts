import type { Metadata } from 'next'
import { siteUrl } from '@/lib/env'
import type { SiteSettings } from '@/lib/settings'

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`
}

export function pageMetadata(opts: {
  title: string
  description: string
  path: string
  absoluteTitle?: boolean
  noindex?: boolean
  image?: { url: string; width: number; height: number; alt: string } | null
}): Metadata {
  return {
    title: opts.absoluteTitle ? { absolute: opts.title } : opts.title,
    description: opts.description,
    alternates: { canonical: opts.path },
    robots: opts.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: opts.title,
      description: opts.description,
      url: opts.path,
      type: 'website',
      ...(opts.image ? { images: [opts.image] } : {}),
    },
    twitter: { card: 'summary_large_image', title: opts.title, description: opts.description },
  }
}

/** Organization structured data using only facts configured in Settings. */
export function organizationJsonLd(settings: SiteSettings): Record<string, unknown> {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl()}/#organization`,
    name: settings.businessName,
    url: siteUrl(),
    logo: absoluteUrl('/icon.svg'),
  }
  if (settings.legalName) data.legalName = settings.legalName
  if (settings.contactEmail) data.email = settings.contactEmail
  if (settings.phone) data.telephone = settings.phone
  if (settings.vatNumber) data.vatID = settings.vatNumber
  if (settings.address) data.address = { '@type': 'PostalAddress', streetAddress: settings.address.replace(/\n+/g, ', ') }
  if (settings.socialLinks.length) data.sameAs = settings.socialLinks.map((l) => l.url)
  return data
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}
