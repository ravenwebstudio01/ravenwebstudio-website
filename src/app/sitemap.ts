import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/env'
import { getPublishedProjects, getPublishedServices } from '@/lib/content/queries'

export const dynamic = 'force-dynamic'

/** Only published, public content is listed; drafts and unpublished projects drop out immediately. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const [services, projects] = await Promise.all([getPublishedServices(), getPublishedProjects()])
  const staticPages = ['', '/services', '/work', '/pricing', '/offers', '/about', '/contact', '/privacy', '/cookies', '/legal-notice']
  return [
    ...staticPages.map((path) => ({
      url: `${base}${path}`,
      changeFrequency: 'monthly' as const,
      priority: path === '' ? 1 : path === '/privacy' || path === '/cookies' || path === '/legal-notice' ? 0.2 : 0.7,
    })),
    ...services.map((s) => ({ url: `${base}/services/${s.slug}`, lastModified: s.updatedAt, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...projects.map((p) => ({ url: `${base}/work/${p.slug}`, lastModified: p.updatedAt, changeFrequency: 'yearly' as const, priority: 0.5 })),
  ]
}
