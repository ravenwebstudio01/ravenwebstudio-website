import type { Metadata } from 'next'
import { asc } from 'drizzle-orm'
import { ActionButton, ActionForm, SubmitButton } from '@/components/admin/action-form'
import { SelectField, TextField } from '@/components/admin/fields'
import { PageHeader, Panel, Table, Td, Th } from '@/components/admin/ui'
import { requireAdminPage } from '@/lib/auth/guards'
import { ROLE_LABELS } from '@/lib/auth/permissions'
import { getDb } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { formatDateTime } from '@/lib/utils'
import { createUserAction, resetUserPasswordAction, updateUserAction } from './actions'

export const metadata: Metadata = { title: 'Users' }

const ROLE_OPTIONS = [
  { value: 'editor', label: 'Editor — manages website content' },
  { value: 'admin', label: 'Administrator — everything, including inquiries, offers, users and settings' },
]

export default async function UsersPage() {
  const { user: me } = await requireAdminPage('users:manage')
  const rows = await getDb()
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive, lastLoginAt: users.lastLoginAt })
    .from(users)
    .orderBy(asc(users.name))
  return (
    <>
      <PageHeader title="Users" description="There is no public sign-up. Accounts are created here or with the command-line tool." />
      <Table caption="Dashboard users">
        <thead>
          <tr>
            <Th>User</Th>
            <Th>Last sign-in</Th>
            <Th>Role and access</Th>
            <Th>
              <span className="sr-only">Password</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id}>
              <Td>
                <span className="font-semibold">{u.name}</span>
                {u.id === me.id && <span className="ml-2 text-sm text-slate">(you)</span>}
                <span className="block text-sm text-slate">{u.email}</span>
              </Td>
              <Td className="text-sm">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'}</Td>
              <Td>
                <ActionForm action={updateUserAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <label className="text-sm">
                    <span className="sr-only">Role for {u.name}</span>
                    <select name="role" defaultValue={u.role} className="input min-h-9 py-1.5 text-sm">
                      <option value="editor">{ROLE_LABELS.editor}</option>
                      <option value="admin">{ROLE_LABELS.admin}</option>
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="sr-only">Access for {u.name}</span>
                    <select name="isActive" defaultValue={String(u.isActive)} className="input min-h-9 py-1.5 text-sm">
                      <option value="true">Active</option>
                      <option value="false">Deactivated</option>
                    </select>
                  </label>
                  <SubmitButton variant="quiet">Save</SubmitButton>
                </ActionForm>
              </Td>
              <Td className="text-right">
                {u.id !== me.id && (
                  <ActionButton action={resetUserPasswordAction} hidden={{ id: u.id }} label="New password" confirmMessage={`Create a new temporary password for ${u.name}? They will be signed out.`} />
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Panel title="Add a user" className="mt-6">
        <ActionForm action={createUserAction} resetOnSuccess className="grid gap-4 md:grid-cols-2">
          <TextField name="name" label="Name" required maxLength={120} />
          <TextField name="email" label="E-mail" type="email" required maxLength={254} />
          <SelectField name="role" label="Role" defaultValue="editor" options={ROLE_OPTIONS} className="md:col-span-2" />
          <div>
            <SubmitButton>Create account</SubmitButton>
          </div>
        </ActionForm>
      </Panel>
    </>
  )
}
