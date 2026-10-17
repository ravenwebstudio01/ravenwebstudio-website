import type { Metadata } from 'next'
import Link from 'next/link'
import { asc, eq } from 'drizzle-orm'
import { MoveButtons, PublishToggle } from '@/components/admin/list-controls'
import { EmptyRow, PageHeader, SampleTag, StatusBadge, Table, Td, Th } from '@/components/admin/ui'
import { requireAdminPage } from '@/lib/auth/guards'
import { getDb } from '@/lib/db'
import { projectCategories, projects } from '@/lib/db/schema'

export const metadata: Metadata = { title: 'Portfolio projects' }

export default async function ProjectsAdminPage() {
  await requireAdminPage('content:manage')
  const rows = await getDb()
    .select({
      id: projects.id,
      title: projects.title,
      slug: projects.slug,
      status: projects.status,
      isSample: projects.isSample,
      featured: projects.featured,
      category: projectCategories.name,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .leftJoin(projectCategories, eq(projectCategories.id, projects.categoryId))
    .orderBy(asc(projects.displayOrder), asc(projects.title))

  return (
    <>
      <PageHeader
        title="Portfolio projects"
        description="Only publish projects your clients have approved. Client names and results appear only when you confirm them on each project."
        actions={
          <Link href="/admin/projects/new" className="btn btn-primary btn-sm">
            New project
          </Link>
        }
      />
      <Table caption="Portfolio projects">
        <thead>
          <tr>
            <Th>Order</Th>
            <Th>Project</Th>
            <Th>Category</Th>
            <Th>Status</Th>
            <Th>
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <EmptyRow colSpan={5}>
              No projects yet. The website shows a “case studies on their way” message until you publish the first one.
            </EmptyRow>
          )}
          {rows.map((p, i) => (
            <tr key={p.id}>
              <Td>
                <MoveButtons table="projects" id={p.id} first={i === 0} last={i === rows.length - 1} />
              </Td>
              <Td>
                <Link href={`/admin/projects/${p.id}`} className="font-semibold hover:text-sheen hover:underline">
                  {p.title}
                </Link>
                {p.featured && <span className="ml-2 pill bg-sheen-soft text-sheen-strong">Featured</span>}
                <span className="block text-sm text-slate">/work/{p.slug}</span>
              </Td>
              <Td>{p.category ?? '—'}</Td>
              <Td>
                <span className="flex flex-wrap gap-1.5">
                  <StatusBadge status={p.status} />
                  <SampleTag show={p.isSample} />
                </span>
              </Td>
              <Td className="whitespace-nowrap text-right">
                <span className="inline-flex gap-2">
                  <Link href={`/admin/projects/${p.id}/preview`} className="btn btn-quiet btn-sm">
                    Preview
                  </Link>
                  <PublishToggle table="projects" id={p.id} status={p.status} />
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  )
}
