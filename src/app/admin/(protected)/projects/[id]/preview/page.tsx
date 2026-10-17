import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ProjectDetail } from '@/components/site/project-detail'
import { StatusBadge } from '@/components/admin/ui'
import { isUuid } from '@/lib/admin/form-data'
import { requireAdminPage } from '@/lib/auth/guards'
import { getProjectDetail } from '@/lib/content/queries'

export const metadata: Metadata = { title: 'Preview project', robots: { index: false, follow: false } }

/** Renders the project exactly as the public page would, including drafts. */
export default async function PreviewProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage('content:manage')
  const { id } = await params
  if (!isUuid(id)) notFound()
  const project = await getProjectDetail({ id }, { preview: true })
  if (!project) notFound()
  return (
    <div className="-mx-5 -my-8 lg:-mx-10">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-warning bg-warning-soft px-6 py-3 text-sm">
        <span className="flex items-center gap-2 font-semibold">
          Preview <StatusBadge status={project.status} />
          {project.status !== 'published' && <span className="font-normal">Visitors cannot see this page yet.</span>}
        </span>
        <Link href={`/admin/projects/${project.id}`} className="btn btn-quiet btn-sm bg-paper">
          Back to editing
        </Link>
      </div>
      <div className="bg-paper">
        <ProjectDetail project={project} />
      </div>
    </div>
  )
}
