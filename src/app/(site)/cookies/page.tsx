import type { Metadata } from 'next'
import { LegalPage } from '@/components/site/legal-page'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Cookie policy',
  description: 'Which cookies this website uses and how to change your choice.',
  path: '/cookies',
})

export default function CookiesPage() {
  return <LegalPage contentKey="legal.cookies" title="Cookie policy" />
}
