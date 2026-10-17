import type { Metadata } from 'next'
import Link from 'next/link'
import { count, desc } from 'drizzle-orm'
import { EmptyRow, PageHeader, Table, Td, Th } from '@/components/admin/ui'
import { requireAdminPage } from '@/lib/auth/guards'
import { getDb } from '@/lib/db'
import { auditLogs } from '@/lib/db/schema'
import { formatDateTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Audit log' }

const PAGE_SIZE = 50

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdminPage('audit:read')
  const page = Math.max(1, Number.parseInt((await searchParams).page ?? '1', 10) || 1)
  const db = getDb()
  const [rows, totals] = await Promise.all([
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(auditLogs),
  ])
  const pages = Math.max(1, Math.ceil((totals[0]?.total ?? 0) / PAGE_SIZE))
  return (
    <>
      <PageHeader title="Audit log" description="Security and content events. IP addresses are stored only as pseudonymised hashes. Entries are deleted after the retention period in Site settings." />
      <Table caption="Audit log">
        <thead>
          <tr>
            <Th>Time</Th>
            <Th>Actor</Th>
            <Th>Action</Th>
            <Th>Item</Th>
            <Th>Details</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={5}>No events yet.</EmptyRow>}
          {rows.map((r) => (
            <tr key={r.id}>
              <Td className="whitespace-nowrap text-sm">{formatDateTime(r.createdAt)}</Td>
              <Td className="text-sm">{r.actorEmail || <span className="text-slate">System / anonymous</span>}</Td>
              <Td className="font-mono text-sm">{r.action}</Td>
              <Td className="text-sm">
                {r.entityType}
                {r.entityId && <span className="block max-w-[14rem] truncate text-slate">{r.entityId}</span>}
              </Td>
              <Td className="max-w-xs break-words font-mono text-xs text-slate">{Object.keys(r.details).length ? JSON.stringify(r.details) : ''}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={`/admin/audit?page=${page - 1}`} className="btn btn-quiet btn-sm">Newer</Link> : <span />}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages ? <Link href={`/admin/audit?page=${page + 1}`} className="btn btn-quiet btn-sm">Older</Link> : <span />}
        </nav>
      )}
    </>
  )
}
