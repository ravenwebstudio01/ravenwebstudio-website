import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { PageHeader } from '@/components/admin/ui'
import { isUuid } from '@/lib/admin/form-data'
import { requireAdminPage } from '@/lib/auth/guards'
import { getDb } from '@/lib/db'
import { collaborationTypes } from '@/lib/db/schema'
import { CollaborationEditor } from '../editor'

export const metadata: Metadata = { title: 'Edit collaboration type' }

export default async function EditCollaborationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage('content:manage')
  const { id } = await params
  if (!isUuid(id)) notFound()
  const [item] = await getDb().select().from(collaborationTypes).where(eq(collaborationTypes.id, id)).limit(1)
  if (!item) notFound()
  return (
    <>
      <PageHeader title={item.name} back={{ href: '/admin/collaborations', label: 'Collaborations' }} />
      <CollaborationEditor item={item} />
    </>
  )
}
