import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/ui'
import { requireAdminPage } from '@/lib/auth/guards'
import { BudgetEditor } from '../budget-editor'

export const metadata: Metadata = { title: 'New budget category' }

export default async function NewBudgetPage() {
  await requireAdminPage('content:manage')
  return (
    <>
      <PageHeader title="New budget category" back={{ href: '/admin/budgets', label: 'Budgets and project types' }} />
      <BudgetEditor tier={null} />
    </>
  )
}
