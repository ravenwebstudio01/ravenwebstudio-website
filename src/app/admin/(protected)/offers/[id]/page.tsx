import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { PageHeader } from '@/components/admin/ui'
import { isUuid } from '@/lib/admin/form-data'
import { requireAdminPage } from '@/lib/auth/guards'
import { getDb } from '@/lib/db'
import { offers, offerServices } from '@/lib/db/schema'
import { OfferEditor } from '../offer-editor'

export const metadata: Metadata = { title: 'Edit offer' }

export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage('offers:manage')
  const { id } = await params
  if (!isUuid(id)) notFound()
  const db = getDb()
  const [offer] = await db.select().from(offers).where(eq(offers.id, id)).limit(1)
  if (!offer) notFound()
  const links = await db.select().from(offerServices).where(eq(offerServices.offerId, id))
  return (
    <>
      <PageHeader title={offer.name} back={{ href: '/admin/offers', label: 'Offers and discounts' }} />
      <OfferEditor
        offer={offer}
        requiredIds={links.filter((l) => l.role === 'required').map((l) => l.serviceId)}
        eligibleIds={links.filter((l) => l.role === 'eligible').map((l) => l.serviceId)}
      />
    </>
  )
}
