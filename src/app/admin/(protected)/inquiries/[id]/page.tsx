import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import { ActionButton, ActionForm, SubmitButton } from '@/components/admin/action-form'
import { SelectField, TextAreaField } from '@/components/admin/fields'
import { PageHeader, Panel, StatusBadge, STATUS_LABELS } from '@/components/admin/ui'
import { isUuid } from '@/lib/admin/form-data'
import { requireAdminPage } from '@/lib/auth/guards'
import { can } from '@/lib/auth/permissions'
import { getDb } from '@/lib/db'
import { collaborationTypes, inquiries, inquiryNotes, inquiryServices, inquiryStatus, offers } from '@/lib/db/schema'
import { INQUIRY_TYPE_LABELS } from '@/lib/inquiries/schema'
import { formatMoney } from '@/lib/money'
import { formatDateTime, safeExternalUrl } from '@/lib/utils'
import { addInquiryNoteAction, deleteInquiryAction, updateInquiryStatusAction } from '../actions'

export const metadata: Metadata = { title: 'Inquiry' }

export default async function InquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireAdminPage('inquiries:read')
  const { id } = await params
  if (!isUuid(id)) notFound()
  const db = getDb()
  const [row] = await db
    .select({ inquiry: inquiries, collaboration: collaborationTypes.name, offer: offers.name })
    .from(inquiries)
    .leftJoin(collaborationTypes, eq(collaborationTypes.id, inquiries.collaborationTypeId))
    .leftJoin(offers, eq(offers.id, inquiries.offerId))
    .where(eq(inquiries.id, id))
    .limit(1)
  if (!row) notFound()
  const inquiry = row.inquiry
  const [svc, notes] = await Promise.all([
    db.select().from(inquiryServices).where(eq(inquiryServices.inquiryId, id)),
    db.select().from(inquiryNotes).where(eq(inquiryNotes.inquiryId, id)).orderBy(asc(inquiryNotes.createdAt)),
  ])
  const requested = svc.filter((s) => s.kind === 'requested').map((s) => s.serviceName)
  const additional = svc.filter((s) => s.kind === 'additional').map((s) => s.serviceName)
  const website = safeExternalUrl(inquiry.websiteUrl)
  const canManage = can(user.role, 'inquiries:manage')

  const facts: [string, React.ReactNode][] = [
    ['E-mail', <a key="e" href={`mailto:${inquiry.email}`} className="text-link">{inquiry.email}</a>],
    ['Company', inquiry.company || '—'],
    ['Phone', inquiry.phone ? <a key="p" href={`tel:${inquiry.phone.replace(/[^+\d]/g, '')}`} className="text-link">{inquiry.phone}</a> : '—'],
    ['Country or market', inquiry.country || '—'],
    ['Inquiry type', INQUIRY_TYPE_LABELS[inquiry.inquiryType]],
    ['Client', inquiry.clientStatus === 'existing' ? 'Existing client' : 'New client'],
    ['Collaboration type', row.collaboration ?? (inquiry.inquiryType === 'collaboration' ? 'Not specified' : '—')],
    ['Services', requested.length ? requested.join(', ') : '—'],
    ['Budget', inquiry.budgetLabel || '—'],
    ['Timeline', inquiry.timeline || '—'],
    ['Current website', website ? <a key="w" href={website} target="_blank" rel="noopener noreferrer nofollow" className="text-link">{inquiry.websiteUrl}</a> : '—'],
    ['Interested later in', inquiry.wantsAdditionalServices ? (additional.length ? additional.join(', ') : 'Yes (no services chosen)') : 'No'],
    ['Offer', row.offer ? `${row.offer}${inquiry.offerCode ? ` (code ${inquiry.offerCode})` : ''}` : inquiry.offerCode ? `Code ${inquiry.offerCode}` : '—'],
    ['Privacy notice acknowledged', inquiry.privacyAcknowledgedAt ? formatDateTime(inquiry.privacyAcknowledgedAt) : '—'],
    ['Notification e-mail', <StatusBadge key="n" status={inquiry.notificationStatus} />],
    ['Acknowledgement e-mail', <StatusBadge key="a" status={inquiry.acknowledgementStatus} />],
  ]

  return (
    <>
      <PageHeader
        title={inquiry.name}
        description={
          <>
            {inquiry.reference} · received {formatDateTime(inquiry.createdAt)}
          </>
        }
        back={{ href: '/admin/inquiries', label: 'Inquiries' }}
        actions={
          <a href={`/api/admin/inquiries/${inquiry.id}/export`} className="btn btn-quiet btn-sm bg-paper">
            Export data (JSON)
          </a>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel title="Message">
            <p className="whitespace-pre-wrap leading-relaxed">{inquiry.description}</p>
          </Panel>
          <Panel title="Details">
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm font-semibold text-slate">{label}</dt>
                  <dd className="mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          {inquiry.estimate && (
            <Panel title="Indicative estimate shown to the client" description={`Calculated on the server at submission (${formatDateTime(inquiry.estimate.computedAt)}).`}>
              <table className="w-full text-[0.9375rem]">
                <caption className="sr-only">Estimate</caption>
                <tbody>
                  {inquiry.estimate.lines.map((l) => (
                    <tr key={l.serviceId} className="border-b border-line">
                      <th scope="row" className="py-2 text-left font-normal">
                        {l.name}
                      </th>
                      <td className="tabular py-2 text-right">{formatMoney(l.amount, inquiry.estimate!.currency)}</td>
                    </tr>
                  ))}
                  {inquiry.estimate.appliedOffers.map((o) => (
                    <tr key={o.offerId} className="border-b border-line text-success">
                      <th scope="row" className="py-2 text-left font-semibold">
                        {o.name}
                      </th>
                      <td className="tabular py-2 text-right">−{formatMoney(o.amount, inquiry.estimate!.currency)}</td>
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" className="pt-3 text-left">
                      Total (from)
                    </th>
                    <td className="tabular pt-3 text-right font-bold">{formatMoney(inquiry.estimate.total, inquiry.estimate.currency)}</td>
                  </tr>
                </tbody>
              </table>
            </Panel>
          )}
          <Panel title="Internal notes" description="Visible to administrators only. Deleted together with the inquiry.">
            {notes.length === 0 ? (
              <p className="text-sm text-slate">No notes yet.</p>
            ) : (
              <ol className="space-y-4">
                {notes.map((n) => (
                  <li key={n.id} className="border-l-2 border-line pl-4">
                    <p className="text-sm text-slate">
                      {n.authorName || 'Unknown'} · {formatDateTime(n.createdAt)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{n.body}</p>
                  </li>
                ))}
              </ol>
            )}
            {canManage && (
              <ActionForm action={addInquiryNoteAction} resetOnSuccess className="mt-6 space-y-3">
                <input type="hidden" name="id" value={inquiry.id} />
                <TextAreaField name="body" label="Add a note" rows={3} maxLength={5000} />
                <SubmitButton>Add note</SubmitButton>
              </ActionForm>
            )}
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Status">
            <div className="mb-4">
              <StatusBadge status={inquiry.status} />
            </div>
            {canManage && (
              <ActionForm action={updateInquiryStatusAction} className="space-y-4">
                <input type="hidden" name="id" value={inquiry.id} />
                <SelectField name="status" label="Change status" defaultValue={inquiry.status} options={inquiryStatus.enumValues.map((s) => ({ value: s, label: STATUS_LABELS[s] ?? s }))} />
                <SubmitButton>Update status</SubmitButton>
              </ActionForm>
            )}
          </Panel>
          <Panel title="Reply">
            <a href={`mailto:${inquiry.email}?subject=${encodeURIComponent(`Re: your inquiry ${inquiry.reference}`)}`} className="btn btn-primary btn-sm">
              Reply by e-mail
            </a>
          </Panel>
          {can(user.role, 'inquiries:delete') && (
            <Panel title="Delete personal data" description="Permanently deletes this inquiry and its notes, e.g. on an erasure request. Export first if you need a copy.">
              <ActionButton
                action={deleteInquiryAction}
                hidden={{ id: inquiry.id }}
                label="Delete inquiry"
                variant="danger"
                confirmMessage={`Permanently delete inquiry ${inquiry.reference} from ${inquiry.name}? This cannot be undone.`}
              />
            </Panel>
          )}
        </div>
      </div>
    </>
  )
}
