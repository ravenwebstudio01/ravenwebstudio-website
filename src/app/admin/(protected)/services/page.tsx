import type { Metadata } from 'next'
import Link from 'next/link'
import { asc, eq } from 'drizzle-orm'
import { MoveButtons, PublishToggle } from '@/components/admin/list-controls'
import { EmptyRow, PageHeader, SampleTag, StatusBadge, Table, Td, Th } from '@/components/admin/ui'
import { requireAdminPage } from '@/lib/auth/guards'
import { getDb } from '@/lib/db'
import { serviceCategories, services } from '@/lib/db/schema'
import { formatMoney } from '@/lib/money'

export const metadata: Metadata = { title: 'Services' }

export default async function ServicesAdminPage() {
  await requireAdminPage('content:manage')
  const rows = await getDb()
    .select({
      id: services.id,
      name: services.name,
      slug: services.slug,
      status: services.status,
      isSample: services.isSample,
      priceFrom: services.priceFrom,
      currency: services.currency,
      showPrice: services.showPrice,
      priceUnit: services.priceUnit,
      category: serviceCategories.name,
    })
    .from(services)
    .leftJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
    .orderBy(asc(services.displayOrder), asc(services.name))

  return (
    <>
      <PageHeader
        title="Services"
        description="Services appear on the Services page, the homepage and in the inquiry form. Order here is the order on the website."
        actions={
          <Link href="/admin/services/new" className="btn btn-primary btn-sm">
            New service
          </Link>
        }
      />
      <Table caption="Services">
        <thead>
          <tr>
            <Th>Order</Th>
            <Th>Service</Th>
            <Th>Category</Th>
            <Th>Starting price</Th>
            <Th>Status</Th>
            <Th>
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={6}>No services yet. Create the first one.</EmptyRow>}
          {rows.map((s, i) => (
            <tr key={s.id}>
              <Td>
                <MoveButtons table="services" id={s.id} first={i === 0} last={i === rows.length - 1} />
              </Td>
              <Td>
                <Link href={`/admin/services/${s.id}`} className="font-semibold hover:text-sheen hover:underline">
                  {s.name}
                </Link>
                <span className="block text-sm text-slate">/services/{s.slug}</span>
              </Td>
              <Td>{s.category ?? '—'}</Td>
              <Td className="tabular">
                {s.priceFrom != null ? (
                  <>
                    {formatMoney(s.priceFrom, s.currency)}
                    {s.priceUnit !== 'project' && ` / ${s.priceUnit}`}
                    {!s.showPrice && <span className="block text-xs text-warning">Hidden on website</span>}
                  </>
                ) : (
                  <span className="text-slate">Not set</span>
                )}
              </Td>
              <Td>
                <span className="flex flex-wrap gap-1.5">
                  <StatusBadge status={s.status} />
                  <SampleTag show={s.isSample} />
                </span>
              </Td>
              <Td className="text-right">
                <PublishToggle table="services" id={s.id} status={s.status} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  )
}
