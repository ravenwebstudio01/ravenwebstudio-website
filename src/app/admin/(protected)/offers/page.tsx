import type { Metadata } from 'next'
import Link from 'next/link'
import { asc } from 'drizzle-orm'
import { MoveButtons, PublishToggle } from '@/components/admin/list-controls'
import { EmptyRow, PageHeader, SampleTag, StatusBadge, Table, Td, Th } from '@/components/admin/ui'
import { requireAdminPage } from '@/lib/auth/guards'
import { getDb } from '@/lib/db'
import { offers } from '@/lib/db/schema'
import { discountHeadline } from '@/lib/offers/describe'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Offers and discounts' }

function windowLabel(startsAt: Date | null, endsAt: Date | null): { label: string; state: 'active' | 'scheduled' | 'ended' } {
  const now = Date.now()
  if (startsAt && startsAt.getTime() > now) return { label: `Starts ${formatDate(startsAt)}`, state: 'scheduled' }
  if (endsAt && endsAt.getTime() <= now) return { label: `Ended ${formatDate(new Date(endsAt.getTime() - 1))}`, state: 'ended' }
  if (endsAt) return { label: `Until ${formatDate(new Date(endsAt.getTime() - 1))}`, state: 'active' }
  return { label: 'No end date', state: 'active' }
}

export default async function OffersAdminPage() {
  await requireAdminPage('offers:manage')
  const rows = await getDb().select().from(offers).orderBy(asc(offers.displayOrder), asc(offers.name))
  return (
    <>
      <PageHeader
        title="Offers and discounts"
        description="Published offers without a code appear on the Offers page. Discounts are always calculated on the server from these rules."
        actions={
          <>
            <Link href="/admin/offers/calculator" className="btn btn-quiet btn-sm bg-paper">
              Offer calculator
            </Link>
            <Link href="/admin/offers/new" className="btn btn-primary btn-sm">
              New offer
            </Link>
          </>
        }
      />
      <Table caption="Offers">
        <thead>
          <tr>
            <Th>Order</Th>
            <Th>Offer</Th>
            <Th>Discount</Th>
            <Th>Dates</Th>
            <Th>Rules</Th>
            <Th>Status</Th>
            <Th>
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={7}>No offers yet.</EmptyRow>}
          {rows.map((o, i) => {
            const window = windowLabel(o.startsAt, o.endsAt)
            return (
              <tr key={o.id}>
                <Td>
                  <MoveButtons table="offers" id={o.id} first={i === 0} last={i === rows.length - 1} />
                </Td>
                <Td>
                  <Link href={`/admin/offers/${o.id}`} className="font-semibold hover:text-sheen hover:underline">
                    {o.name}
                  </Link>
                  {o.code && <span className="block text-sm text-slate">Code {o.code} (not listed publicly)</span>}
                </Td>
                <Td className="tabular">{discountHeadline(o)}</Td>
                <Td>
                  <span className={window.state === 'ended' ? 'text-danger' : window.state === 'scheduled' ? 'text-warning' : ''}>{window.label}</span>
                </Td>
                <Td className="text-sm">
                  {o.stackable ? 'Combinable' : 'Exclusive'}
                  {o.requiresApproval && <span className="block text-warning">Manual approval</span>}
                  {o.clientEligibility !== 'any' && <span className="block">{o.clientEligibility === 'existing' ? 'Existing clients' : 'New clients'}</span>}
                </Td>
                <Td>
                  <span className="flex flex-wrap gap-1.5">
                    <StatusBadge status={o.status} />
                    <SampleTag show={o.isSample} />
                  </span>
                </Td>
                <Td className="text-right">
                  <PublishToggle table="offers" id={o.id} status={o.status} />
                </Td>
              </tr>
            )
          })}
        </tbody>
      </Table>
    </>
  )
}
