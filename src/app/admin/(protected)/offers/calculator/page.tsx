import type { Metadata } from 'next'
import { and, asc, eq, ne } from 'drizzle-orm'
import { PageHeader } from '@/components/admin/ui'
import { requireAdminPage } from '@/lib/auth/guards'
import { getDb } from '@/lib/db'
import { offers, services } from '@/lib/db/schema'
import { calculateOffersAction } from '../actions'
import { OfferCalculator } from './calculator'

export const metadata: Metadata = { title: 'Offer calculator' }

export default async function OfferCalculatorPage() {
  await requireAdminPage('offers:manage')
  const db = getDb()
  const [serviceRows, approvalOffers] = await Promise.all([
    db
      .select({ id: services.id, name: services.name, priceFrom: services.priceFrom, currency: services.currency })
      .from(services)
      .where(ne(services.status, 'archived'))
      .orderBy(asc(services.displayOrder)),
    db
      .select({ id: offers.id, name: offers.name })
      .from(offers)
      .where(and(eq(offers.requiresApproval, true), ne(offers.status, 'archived')))
      .orderBy(asc(offers.name)),
  ])
  return (
    <>
      <PageHeader
        title="Offer calculator"
        description="Check which discounts apply to a proposal. Uses the same rules as the website’s estimates, including stacking limits and date windows."
        back={{ href: '/admin/offers', label: 'Offers and discounts' }}
      />
      <OfferCalculator action={calculateOffersAction} services={serviceRows} approvalOffers={approvalOffers} />
    </>
  )
}
