import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { PageHeader } from '@/components/admin/ui'
import { isUuid } from '@/lib/admin/form-data'
import { requireAdminPage } from '@/lib/auth/guards'
import { getDb } from '@/lib/db'
import { budgetTiers, budgetTierServices } from '@/lib/db/schema'
import { BudgetEditor } from '../budget-editor'

export const metadata: Metadata = { title: 'Edit budget category' }

export default async function EditBudgetPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage('content:manage')
  const { id } = await params
  if (!isUuid(id)) notFound()
  const db = getDb()
  const [tier] = await db.select().from(budgetTiers).where(eq(budgetTiers.id, id)).limit(1)
  if (!tier) notFound()
  const links = await db.select({ id: budgetTierServices.serviceId }).from(budgetTierServices).where(eq(budgetTierServices.tierId, id))
  return (
    <>
      <PageHeader title={tier.name} back={{ href: '/admin/budgets', label: 'Budgets and project types' }} />
      <BudgetEditor tier={tier} serviceIds={links.map((l) => l.id)} />
    </>
  )
}
