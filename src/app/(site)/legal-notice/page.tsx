import type { Metadata } from 'next'
import { LegalPage } from '@/components/site/legal-page'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Legal notice',
  description: 'Provider identification and company details.',
  path: '/legal-notice',
})

export default function LegalNoticePage() {
  return <LegalPage contentKey="legal.notice" title="Legal notice" />
}
