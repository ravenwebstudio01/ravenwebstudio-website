import type { Metadata } from 'next'
import { asc } from 'drizzle-orm'
import { ActionButton, ActionForm, SubmitButton } from '@/components/admin/action-form'
import { CheckboxField, TextField } from '@/components/admin/fields'
import { EmptyRow, PageHeader, Panel, Table, Td, Th } from '@/components/admin/ui'
import { requireAdminPage } from '@/lib/auth/guards'
import { getDb } from '@/lib/db'
import { redirects } from '@/lib/db/schema'
import { addRedirectAction, deleteRedirectAction } from './actions'

export const metadata: Metadata = { title: 'Redirects' }

export default async function RedirectsPage() {
  await requireAdminPage('content:manage')
  const rows = await getDb().select().from(redirects).orderBy(asc(redirects.fromPath))
  return (
    <>
      <PageHeader
        title="Redirects"
        description="Keep old links working. Redirects for renamed services and projects are created automatically; add others here (for example after migrating from an old website)."
      />
      <Panel title="Add a redirect" className="mb-6">
        <ActionForm action={addRedirectAction} resetOnSuccess className="grid gap-4 md:grid-cols-[1fr_1fr_1fr] md:items-end">
          <TextField name="fromPath" label="Old path" placeholder="/old-page" maxLength={300} />
          <TextField name="toPath" label="New path" placeholder="/services" maxLength={300} />
          <TextField name="note" label="Note (optional)" maxLength={200} />
          <CheckboxField name="permanent" label="Permanent (308)" defaultChecked />
          <div>
            <SubmitButton>Add redirect</SubmitButton>
          </div>
        </ActionForm>
        <p className="mt-3 text-sm text-slate">Redirects apply to service and project addresses that no longer exist (/services/… and /work/…).</p>
      </Panel>
      <Table caption="Redirects">
        <thead>
          <tr>
            <Th>From</Th>
            <Th>To</Th>
            <Th>Type</Th>
            <Th>Note</Th>
            <Th>
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={5}>No redirects.</EmptyRow>}
          {rows.map((r) => (
            <tr key={r.id}>
              <Td className="font-mono text-sm">{r.fromPath}</Td>
              <Td className="font-mono text-sm">{r.toPath}</Td>
              <Td>{r.permanent ? 'Permanent' : 'Temporary'}</Td>
              <Td className="text-sm text-slate">{r.note}</Td>
              <Td className="text-right">
                <ActionButton action={deleteRedirectAction} hidden={{ id: r.id }} label="Remove" confirmMessage={`Remove the redirect from ${r.fromPath}?`} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  )
}
