import type { Metadata } from 'next'
import Link from 'next/link'
import { and, asc, count, desc, eq, gte, ilike, lt, or, type SQL } from 'drizzle-orm'
import { EmptyRow, PageHeader, StatusBadge, STATUS_LABELS, Table, Td, Th } from '@/components/admin/ui'
import { requireAdminPage } from '@/lib/auth/guards'
import { getDb } from '@/lib/db'
import { inquiries, inquiryStatus } from '@/lib/db/schema'
import { INQUIRY_TYPE_LABELS } from '@/lib/inquiries/schema'
import { formatDateTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Inquiries' }

const PAGE_SIZE = 25

type SP = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdminPage('inquiries:read')
  const sp = await searchParams
  const status = one(sp.status)
  const type = one(sp.type)
  const client = one(sp.client)
  const additional = one(sp.additional)
  const q = one(sp.q).trim().slice(0, 100)
  const from = one(sp.from)
  const to = one(sp.to)
  const sort = one(sp.sort) === 'oldest' ? 'oldest' : 'newest'
  const page = Math.max(1, Number.parseInt(one(sp.page) || '1', 10) || 1)

  const conditions: SQL[] = []
  if ((inquiryStatus.enumValues as readonly string[]).includes(status)) conditions.push(eq(inquiries.status, status as never))
  else if (status !== 'all') conditions.push(or(eq(inquiries.status, 'new'), eq(inquiries.status, 'in_review'), eq(inquiries.status, 'contacted'), eq(inquiries.status, 'proposal_sent'))!)
  if (['project', 'existing_client', 'collaboration', 'general'].includes(type)) conditions.push(eq(inquiries.inquiryType, type as never))
  if (client === 'new' || client === 'existing') conditions.push(eq(inquiries.clientStatus, client))
  if (additional === '1') conditions.push(eq(inquiries.wantsAdditionalServices, true))
  if (q) {
    const pattern = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`
    conditions.push(or(ilike(inquiries.name, pattern), ilike(inquiries.email, pattern), ilike(inquiries.company, pattern), ilike(inquiries.reference, pattern))!)
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) conditions.push(gte(inquiries.createdAt, new Date(`${from}T00:00:00Z`)))
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    const end = new Date(`${to}T00:00:00Z`)
    end.setUTCDate(end.getUTCDate() + 1)
    conditions.push(lt(inquiries.createdAt, end))
  }
  const where = conditions.length ? and(...conditions) : undefined
  const db = getDb()
  const [rows, total] = await Promise.all([
    db
      .select({
        id: inquiries.id,
        reference: inquiries.reference,
        name: inquiries.name,
        company: inquiries.company,
        inquiryType: inquiries.inquiryType,
        clientStatus: inquiries.clientStatus,
        status: inquiries.status,
        budgetLabel: inquiries.budgetLabel,
        wantsAdditionalServices: inquiries.wantsAdditionalServices,
        createdAt: inquiries.createdAt,
      })
      .from(inquiries)
      .where(where)
      .orderBy(sort === 'oldest' ? asc(inquiries.createdAt) : desc(inquiries.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(inquiries).where(where).then((r) => r[0]?.total ?? 0),
  ])
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const params = new URLSearchParams(Object.entries({ status, type, client, additional, q, from, to, sort }).filter(([, v]) => v) as [string, string][])
  const pageHref = (p: number) => {
    const next = new URLSearchParams(params)
    next.set('page', String(p))
    return `/admin/inquiries?${next.toString()}`
  }

  return (
    <>
      <PageHeader title="Inquiries" description={`${total} matching ${total === 1 ? 'inquiry' : 'inquiries'}. Open inquiries are shown by default.`} />
      <form method="get" className="mb-6 grid gap-3 rounded-[var(--radius-panel)] border border-line bg-paper p-4 md:grid-cols-4">
        <label className="text-sm font-semibold">
          Search
          <input name="q" defaultValue={q} placeholder="Name, e-mail, company, reference" className="input mt-1" />
        </label>
        <label className="text-sm font-semibold">
          Status
          <select name="status" defaultValue={status} className="input mt-1">
            <option value="">Open (default)</option>
            <option value="all">All</option>
            {inquiryStatus.enumValues.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s] ?? s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Type
          <select name="type" defaultValue={type} className="input mt-1">
            <option value="">All types</option>
            {Object.entries(INQUIRY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Client
          <select name="client" defaultValue={client} className="input mt-1">
            <option value="">New and existing</option>
            <option value="new">New clients</option>
            <option value="existing">Existing clients</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          From
          <input type="date" name="from" defaultValue={from} className="input mt-1" />
        </label>
        <label className="text-sm font-semibold">
          To
          <input type="date" name="to" defaultValue={to} className="input mt-1" />
        </label>
        <label className="text-sm font-semibold">
          Sort
          <select name="sort" defaultValue={sort} className="input mt-1">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
        <div className="flex items-end gap-3">
          <label className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="additional" value="1" defaultChecked={additional === '1'} className="check mt-0" />
            Wants more services
          </label>
        </div>
        <div className="flex gap-2 md:col-span-4">
          <button type="submit" className="btn btn-primary btn-sm">
            Apply filters
          </button>
          <Link href="/admin/inquiries" className="btn btn-quiet btn-sm">
            Reset
          </Link>
        </div>
      </form>

      <Table caption="Inquiries">
        <thead>
          <tr>
            <Th>Received</Th>
            <Th>From</Th>
            <Th>Type</Th>
            <Th>Budget</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={5}>No inquiries match these filters.</EmptyRow>}
          {rows.map((r) => (
            <tr key={r.id}>
              <Td className="whitespace-nowrap text-sm">
                {formatDateTime(r.createdAt)}
                <span className="block text-slate">{r.reference}</span>
              </Td>
              <Td>
                <Link href={`/admin/inquiries/${r.id}`} className="font-semibold hover:text-sheen hover:underline">
                  {r.name}
                </Link>
                {r.company && <span className="block text-sm text-slate">{r.company}</span>}
              </Td>
              <Td className="text-sm">
                {INQUIRY_TYPE_LABELS[r.inquiryType]}
                <span className="block text-slate">{r.clientStatus === 'existing' ? 'Existing client' : 'New client'}</span>
                {r.wantsAdditionalServices && <span className="block text-glint">Interested in more services</span>}
              </Td>
              <Td className="text-sm">{r.budgetLabel || '—'}</Td>
              <Td>
                <StatusBadge status={r.status} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="btn btn-quiet btn-sm">
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={pageHref(page + 1)} className="btn btn-quiet btn-sm">
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  )
}
