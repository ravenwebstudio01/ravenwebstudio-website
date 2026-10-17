import type { Metadata } from 'next'
import { LegalPage } from '@/components/site/legal-page'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Privacy notice',
  description: 'How personal data is processed when you use this website or contact us.',
  path: '/privacy',
})

export default function PrivacyPage() {
  return <LegalPage contentKey="legal.privacy" title="Privacy notice" />
}
