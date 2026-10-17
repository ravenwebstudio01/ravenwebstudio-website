import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ActionForm, SubmitButton } from '@/components/admin/action-form'
import { AuthCard } from '@/components/admin/auth-card'
import { TextField } from '@/components/admin/fields'
import { Notice } from '@/components/admin/ui'
import { getCurrentSession } from '@/lib/auth/session'
import { loginAction } from './actions'

export const metadata: Metadata = { title: 'Sign in' }

type Props = { searchParams: Promise<{ next?: string; reset?: string }> }

export default async function LoginPage({ searchParams }: Props) {
  if (await getCurrentSession()) redirect('/admin')
  const { next, reset } = await searchParams
  return (
    <AuthCard title="Sign in to the dashboard">
      {reset && (
        <div className="mb-5">
          <Notice tone="success">Your password was changed. Sign in with your new password.</Notice>
        </div>
      )}
      <ActionForm action={loginAction} className="space-y-5">
        <input type="hidden" name="next" value={typeof next === 'string' ? next : ''} />
        <TextField name="email" label="E-mail address" type="email" autoComplete="username" required maxLength={254} />
        <TextField name="password" label="Password" type="password" autoComplete="current-password" required maxLength={200} />
        <SubmitButton className="w-full">Sign in</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm">
        <Link href="/admin/forgot-password" className="text-link">
          Forgot your password?
        </Link>
      </p>
    </AuthCard>
  )
}
