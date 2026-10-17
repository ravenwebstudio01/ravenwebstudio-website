import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import { PageHeader } from '@/components/admin/ui'
import { isUuid } from '@/lib/admin/form-data'
import { requireAdminPage } from '@/lib/auth/guards'
import { getDb } from '@/lib/db'
import { media, projectMedia, projects, projectServices } from '@/lib/db/schema'
import { toMediaView } from '@/lib/media/view'
import { ProjectEditor } from '../project-editor'

export const metadata: Metadata = { title: 'Edit project' }

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage('content:manage')
  const { id } = await params
  if (!isUuid(id)) notFound()
  const db = getDb()
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
  if (!project) notFound()
  const [links, galleryRows] = await Promise.all([
    db.select({ id: projectServices.serviceId }).from(projectServices).where(eq(projectServices.projectId, id)),
    db
      .select({ mediaId: projectMedia.mediaId, caption: projectMedia.caption, media })
      .from(projectMedia)
      .innerJoin(media, eq(media.id, projectMedia.mediaId))
      .where(eq(projectMedia.projectId, id))
      .orderBy(asc(projectMedia.displayOrder)),
  ])
  const gallery = galleryRows.flatMap((g) => {
    const view = toMediaView(g.media)
    return view ? [{ mediaId: g.mediaId, caption: g.caption, src: view.src, alt: view.alt }] : []
  })
  return (
    <>
      <PageHeader title={project.title} back={{ href: '/admin/projects', label: 'Portfolio projects' }} />
      <ProjectEditor project={project} serviceIds={links.map((l) => l.id)} gallery={gallery} />
    </>
  )
}
