import type { Metadata } from 'next'
import Link from 'next/link'
import { asc } from 'drizzle-orm'
import { MoveButtons, PublishToggle } from '@/components/admin/list-controls'
import { EmptyRow, PageHeader, SampleTag, StatusBadge, Table, Td, Th } from '@/components/admin/ui'
import { requireAdminPage } from '@/lib/auth/guards'
import { getDb } from '@/lib/db'
import { budgetTiers } from '@/lib/db/schema'
import { formatRange } from '@/lib/money'

export const metadata: Metadata = { title: 'Budgets and project types' }

export default async function BudgetsAdminPage() {
  await requireAdminPage('content:manage')
  const rows = await getDb().select().from(budgetTiers).orderBy(asc(budgetTiers.displayOrder), asc(budgetTiers.name))
  return (
    <>
      <PageHeader
        title="Budgets and project types"
        description="Categories shown on the Budgets page, the homepage and in the inquiry form. Amounts stay hidden until you tick “Show amounts”."
        actions={
          <Link href="/admin/budgets/new" className="btn btn-primary btn-sm">
            New category
          </Link>
        }
      />
      <Table caption="Budget categories">
        <thead>
          <tr>
            <Th>Order</Th>
            <Th>Category</Th>
            <Th>Budget</Th>
            <Th>Status</Th>
            <Th>
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={5}>No categories yet.</EmptyRow>}
          {rows.map((t, i) => {
            const range = formatRange(t.minAmount, t.maxAmount, t.currency)
            return (
              <tr key={t.id}>
                <Td>
                  <MoveButtons table="budgetTiers" id={t.id} first={i === 0} last={i === rows.length - 1} />
                </Td>
                <Td>
                  <Link href={`/admin/budgets/${t.id}`} className="font-semibold hover:text-sheen hover:underline">
                    {t.name}
                  </Link>
                </Td>
                <Td className="tabular">
                  {range ?? <span className="text-slate">Not set</span>}
                  {range && !t.showAmounts && <span className="block text-xs text-warning">Hidden on website</span>}
                </Td>
                <Td>
                  <span className="flex flex-wrap gap-1.5">
                    <StatusBadge status={t.status} />
                    <SampleTag show={t.isSample} />
                  </span>
                </Td>
                <Td className="text-right">
                  <PublishToggle table="budgetTiers" id={t.id} status={t.status} />
                </Td>
              </tr>
            )
          })}
        </tbody>
      </Table>
    </>
  )
}
