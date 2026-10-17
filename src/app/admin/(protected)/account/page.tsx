import type { Metadata } from 'next'
import { and, eq, gt } from 'drizzle-orm'
import { ActionButton, ActionForm, SubmitButton } from '@/components/admin/action-form'
import { TextField } from '@/components/admin/fields'
import { PageHeader, Panel } from '@/components/admin/ui'
import { requireAdminPage } from '@/lib/auth/guards'
import { PASSWORD_MIN_LENGTH } from '@/lib/auth/password'
import { ROLE_LABELS } from '@/lib/auth/permissions'
import { getDb } from '@/lib/db'
import { sessions } from '@/lib/db/schema'
import { formatDateTime } from '@/lib/utils'
import { changePasswordAction, signOutOtherSessionsAction } from './actions'

export const metadata: Metadata = { title: 'My account' }

export default async function AccountPage() {
  const { user, sessionId } = await requireAdminPage()
  const active = await getDb()
    .select({ id: sessions.id, createdAt: sessions.createdAt, lastSeenAt: sessions.lastSeenAt, userAgent: sessions.userAgent })
    .from(sessions)
    .where(and(eq(sessions.userId, user.id), gt(sessions.expiresAt, new Date())))
  return (
    <>
      <PageHeader title="My account" description={`${user.name} · ${user.email} · ${ROLE_LABELS[user.role]}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Change password" description={`At least ${PASSWORD_MIN_LENGTH} characters. Other devices are signed out afterwards.`}>
          <ActionForm action={changePasswordAction} resetOnSuccess className="space-y-4">
            <TextField name="current" label="Current password" type="password" autoComplete="current-password" required maxLength={200} />
            <TextField name="password" label="New password" type="password" autoComplete="new-password" required maxLength={200} />
            <TextField name="confirm" label="Repeat new password" type="password" autoComplete="new-password" required maxLength={200} />
            <SubmitButton>Change password</SubmitButton>
          </ActionForm>
        </Panel>
        <Panel title="Signed-in devices">
          <ul className="divide-y divide-line text-sm">
            {active.map((s) => (
              <li key={s.id} className="py-2">
                <span className="font-semibold">{s.id === sessionId ? 'This device' : 'Other device'}</span>
                <span className="block text-slate">{s.userAgent?.slice(0, 90) || 'Unknown browser'}</span>
                <span className="block text-slate">Last active {formatDateTime(s.lastSeenAt)}</span>
              </li>
            ))}
          </ul>
          {active.length > 1 && (
            <div className="mt-4">
              <ActionButton action={signOutOtherSessionsAction} label="Sign out other devices" />
            </div>
          )}
        </Panel>
      </div>
    </>
  )
}
