import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/ui'
import { requireAdminPage } from '@/lib/auth/guards'
import { ProjectEditor } from '../project-editor'

export const metadata: Metadata = { title: 'New project' }

export default async function NewProjectPage() {
  await requireAdminPage('content:manage')
  return (
    <>
      <PageHeader title="New project" description="Save the basics first; screenshots can be added once the project exists." back={{ href: '/admin/projects', label: 'Portfolio projects' }} />
      <ProjectEditor project={null} />
    </>
  )
}
