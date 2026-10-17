import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/env'

export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  // Preview/staging deployments should not be indexed: set SITE_URL only on production.
  const isProductionHost = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === 'production' : true
  return {
    rules: isProductionHost
      ? [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] }]
      : [{ userAgent: '*', disallow: '/' }],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  }
}
