import type { Metadata } from 'next'
import Link from 'next/link'
import { ActionForm, SubmitButton } from '@/components/admin/action-form'
import { AuthCard } from '@/components/admin/auth-card'
import { TextField } from '@/components/admin/fields'
import { requestResetAction } from '../login/actions'

export const metadata: Metadata = { title: 'Reset password' }

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Reset your password" description="Enter the e-mail address of your dashboard account. We will send you a link to choose a new password.">
      <ActionForm action={requestResetAction} className="space-y-5" resetOnSuccess>
        <TextField name="email" label="E-mail address" type="email" autoComplete="username" required maxLength={254} />
        <SubmitButton className="w-full">Send reset link</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm">
        <Link href="/admin/login" className="text-link">
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  )
}
