import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { PageHeader } from '@/components/admin/ui'
import { isUuid } from '@/lib/admin/form-data'
import { requireAdminPage } from '@/lib/auth/guards'
import { getDb } from '@/lib/db'
import { serviceRelations, services } from '@/lib/db/schema'
import { ServiceEditor } from '../service-editor'

export const metadata: Metadata = { title: 'Edit service' }

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage('content:manage')
  const { id } = await params
  if (!isUuid(id)) notFound()
  const db = getDb()
  const [service] = await db.select().from(services).where(eq(services.id, id)).limit(1)
  if (!service) notFound()
  const related = await db.select({ id: serviceRelations.relatedServiceId }).from(serviceRelations).where(eq(serviceRelations.serviceId, id))
  return (
    <>
      <PageHeader title={service.name} back={{ href: '/admin/services', label: 'Services' }} />
      <ServiceEditor service={service} relatedIds={related.map((r) => r.id)} />
    </>
  )
}
