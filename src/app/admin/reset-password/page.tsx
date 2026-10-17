import type { Metadata } from 'next'
import Link from 'next/link'
import { ActionForm, SubmitButton } from '@/components/admin/action-form'
import { AuthCard } from '@/components/admin/auth-card'
import { TextField } from '@/components/admin/fields'
import { PASSWORD_MIN_LENGTH } from '@/lib/auth/password'
import { resetPasswordAction } from '../login/actions'

export const metadata: Metadata = { title: 'Choose a new password', referrer: 'no-referrer' }

type Props = { searchParams: Promise<{ token?: string }> }

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams
  if (!token) {
    return (
      <AuthCard title="Reset link missing" description="Open the link from your e-mail again, or request a new one.">
        <Link href="/admin/forgot-password" className="btn btn-primary btn-sm">
          Request a new link
        </Link>
      </AuthCard>
    )
  }
  return (
    <AuthCard title="Choose a new password" description={`Use at least ${PASSWORD_MIN_LENGTH} characters. A short sentence works well.`}>
      <ActionForm action={resetPasswordAction} className="space-y-5">
        <input type="hidden" name="token" value={token} />
        <TextField name="password" label="New password" type="password" autoComplete="new-password" required maxLength={200} />
        <TextField name="confirm" label="Repeat new password" type="password" autoComplete="new-password" required maxLength={200} />
        <SubmitButton className="w-full">Save new password</SubmitButton>
      </ActionForm>
    </AuthCard>
  )
}
