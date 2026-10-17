import type { Metadata } from 'next'
import Link from 'next/link'
import { asc } from 'drizzle-orm'
import { ActionForm, SubmitButton } from '@/components/admin/action-form'
import { CheckboxField, TextField } from '@/components/admin/fields'
import { MoveButtons, PublishToggle } from '@/components/admin/list-controls'
import { EmptyRow, PageHeader, Panel, SampleTag, StatusBadge, Table, Td, Th } from '@/components/admin/ui'
import { requireAdminPage } from '@/lib/auth/guards'
import { can } from '@/lib/auth/permissions'
import { getDb } from '@/lib/db'
import { collaborationTypes } from '@/lib/db/schema'
import { loadSettings } from '@/lib/settings'
import { setAvailabilityAction } from './actions'

export const metadata: Metadata = { title: 'Collaborations' }

export default async function CollaborationsAdminPage() {
  const { user } = await requireAdminPage('content:manage')
  const [rows, settings] = await Promise.all([
    getDb().select().from(collaborationTypes).orderBy(asc(collaborationTypes.displayOrder), asc(collaborationTypes.name)),
    loadSettings(),
  ])
  return (
    <>
      <PageHeader
        title="Collaborations"
        description="Collaboration types listed on the About page and offered in the inquiry form."
        actions={
          <Link href="/admin/collaborations/new" className="btn btn-primary btn-sm">
            New collaboration type
          </Link>
        }
      />
      {can(user.role, 'settings:manage') && (
        <Panel title="Availability" description="Shown on the homepage, the About page and the contact page." className="mb-6">
          <ActionForm action={setAvailabilityAction} className="space-y-4">
            <CheckboxField name="acceptingCollaborations" label="We are currently open to new collaborations" defaultChecked={settings.acceptingCollaborations} />
            <CheckboxField name="acceptingProjects" label="We are currently accepting new client projects" defaultChecked={settings.acceptingProjects} />
            <TextField name="availabilityNote" label="Availability note (optional)" defaultValue={settings.availabilityNote} maxLength={160} hint="e.g. “Booking projects from March 2027”. Shown in the footer and when not accepting projects." />
            <SubmitButton>Save availability</SubmitButton>
          </ActionForm>
        </Panel>
      )}
      <Table caption="Collaboration types">
        <thead>
          <tr>
            <Th>Order</Th>
            <Th>Type</Th>
            <Th>Status</Th>
            <Th>
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={4}>No collaboration types yet.</EmptyRow>}
          {rows.map((c, i) => (
            <tr key={c.id}>
              <Td>
                <MoveButtons table="collaborationTypes" id={c.id} first={i === 0} last={i === rows.length - 1} />
              </Td>
              <Td>
                <Link href={`/admin/collaborations/${c.id}`} className="font-semibold hover:text-sheen hover:underline">
                  {c.name}
                </Link>
                {c.summary && <span className="block text-sm text-slate">{c.summary}</span>}
              </Td>
              <Td>
                <span className="flex flex-wrap gap-1.5">
                  <StatusBadge status={c.status} />
                  <SampleTag show={c.isSample} />
                </span>
              </Td>
              <Td className="text-right">
                <PublishToggle table="collaborationTypes" id={c.id} status={c.status} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  )
}
