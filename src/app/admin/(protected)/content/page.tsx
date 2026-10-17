import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader, Panel } from '@/components/admin/ui'
import { requireAdminPage } from '@/lib/auth/guards'
import { CONTENT_SECTIONS } from '@/lib/content/registry'
import { getDb } from '@/lib/db'
import { contentBlocks } from '@/lib/db/schema'
import { formatDateTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Page content' }

export default async function ContentIndexPage() {
  await requireAdminPage('content:manage')
  const stored = await getDb().select({ key: contentBlocks.key, updatedAt: contentBlocks.updatedAt, data: contentBlocks.data }).from(contentBlocks)
  const byKey = new Map(stored.map((s) => [s.key, s]))
  const groups = [...new Set(CONTENT_SECTIONS.map((s) => s.group))]
  return (
    <>
      <PageHeader title="Page content" description="Headlines, introductions, legal pages and search-engine texts. Sections you have not edited use the default text." />
      <div className="space-y-6">
        {groups.map((group) => (
          <Panel key={group} title={group}>
            <ul className="divide-y divide-line">
              {CONTENT_SECTIONS.filter((s) => s.group === group).map((section) => {
                const entry = byKey.get(section.key)
                const needsReview = 'reviewed' in section.fields && !(entry?.data as { reviewed?: boolean } | undefined)?.reviewed
                return (
                  <li key={section.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <Link href={`/admin/content/${section.key}`} className="font-semibold hover:text-sheen hover:underline">
                        {section.label}
                      </Link>
                      <span className="block text-sm text-slate">
                        {entry ? `Edited ${formatDateTime(entry.updatedAt)}` : 'Default text'}
                        {needsReview && <span className="ml-2 text-warning">Needs review before launch</span>}
                      </span>
                    </div>
                    <Link href={`/admin/content/${section.key}`} className="btn btn-quiet btn-sm">
                      Edit
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Panel>
        ))}
      </div>
    </>
  )
}
