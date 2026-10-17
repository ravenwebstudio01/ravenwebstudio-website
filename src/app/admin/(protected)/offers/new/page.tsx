import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/ui'
import { requireAdminPage } from '@/lib/auth/guards'
import { OfferEditor } from '../offer-editor'

export const metadata: Metadata = { title: 'New offer' }

export default async function NewOfferPage() {
  await requireAdminPage('offers:manage')
  return (
    <>
      <PageHeader title="New offer" back={{ href: '/admin/offers', label: 'Offers and discounts' }} />
      <OfferEditor offer={null} />
    </>
  )
}
