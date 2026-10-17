import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/ui'
import { requireAdminPage } from '@/lib/auth/guards'
import { CollaborationEditor } from '../editor'

export const metadata: Metadata = { title: 'New collaboration type' }

export default async function NewCollaborationPage() {
  await requireAdminPage('content:manage')
  return (
    <>
      <PageHeader title="New collaboration type" back={{ href: '/admin/collaborations', label: 'Collaborations' }} />
      <CollaborationEditor item={null} />
    </>
  )
}
