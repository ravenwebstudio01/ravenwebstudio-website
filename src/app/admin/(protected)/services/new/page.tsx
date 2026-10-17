import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/ui'
import { requireAdminPage } from '@/lib/auth/guards'
import { ServiceEditor } from '../service-editor'

export const metadata: Metadata = { title: 'New service' }

export default async function NewServicePage() {
  await requireAdminPage('content:manage')
  return (
    <>
      <PageHeader title="New service" back={{ href: '/admin/services', label: 'Services' }} />
      <ServiceEditor service={null} />
    </>
  )
}
