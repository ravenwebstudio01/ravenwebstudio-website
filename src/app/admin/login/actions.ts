'use server'

import type { ActionResult } from '@/lib/admin/action-result'
import { str } from '@/lib/admin/form-data'
import { audit } from '@/lib/audit'
import { attemptLogin, createPasswordResetToken, resetPasswordWithToken } from '@/lib/auth/login'
import { createSession, destroyCurrentSession, getCurrentSession } from '@/lib/auth/session'
import { RESET_TOKEN_TTL_MS } from '@/lib/auth/constants'
import { sendMail } from '@/lib/email/mailer'
import { passwordResetEmail } from '@/lib/email/templates'
import { siteUrl, smtpConfigured } from '@/lib/env'
import { requestMeta } from '@/lib/request'
import { loadSettings } from '@/lib/settings'

function safeNext(value: string): string {
  return value.startsWith('/admin') && !value.startsWith('//') && !value.includes('\\') ? value : '/admin'
}

export async function loginAction(fd: FormData): Promise<ActionResult> {
  const email = str(fd, 'email')
  const password = String(fd.get('password') ?? '')
  if (!email || !password) {
    return {
      ok: false,
      message: 'Enter your e-mail address and password.',
      fieldErrors: { ...(email ? {} : { email: 'Enter your e-mail address.' }), ...(password ? {} : { password: 'Enter your password.' }) },
    }
  }
  if (email.length > 254 || password.length > 200) return { ok: false, message: 'E-mail address or password is incorrect.' }
  try {
    const meta = await requestMeta()
    const result = await attemptLogin(email, password, { ip: meta.ip })
    if (!result.ok) {
      return {
        ok: false,
        message:
          result.reason === 'throttled'
            ? 'Too many sign-in attempts. Wait a few minutes, then try again.'
            : 'E-mail address or password is incorrect.',
      }
    }
    await createSession(result.user.id, meta)
    return { ok: true, message: 'Signed in.', redirectTo: safeNext(str(fd, 'next')) }
  } catch (error) {
    console.error('[auth] login failed', (error as Error).message)
    return { ok: false, message: 'Signing in is temporarily unavailable. Please try again shortly.' }
  }
}

export async function logoutAction(): Promise<ActionResult> {
  const session = await getCurrentSession()
  const meta = await requestMeta()
  await destroyCurrentSession()
  if (session) await audit({ actor: { id: session.user.id, email: session.user.email }, action: 'auth.logout', ip: meta.ip })
  return { ok: true, message: 'Signed out.', redirectTo: '/admin/login' }
}

export async function requestResetAction(fd: FormData): Promise<ActionResult> {
  const email = str(fd, 'email')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'Enter the e-mail address of your dashboard account.', fieldErrors: { email: 'Enter a valid e-mail address.' } }
  }
  const generic = smtpConfigured()
    ? 'If an account exists for that address, we have sent a link to reset the password. It is valid for 30 minutes.'
    : 'If an account exists for that address, an administrator needs to reset the password: e-mail delivery is not configured on this site.'
  try {
    const meta = await requestMeta()
    const created = await createPasswordResetToken(email, { ip: meta.ip })
    if (created && smtpConfigured()) {
      const settings = await loadSettings()
      const url = `${siteUrl()}/admin/reset-password?token=${encodeURIComponent(created.token)}`
      const mail = passwordResetEmail({ name: created.user.name, url, minutes: RESET_TOKEN_TTL_MS / 60_000 }, { businessName: settings.businessName })
      await sendMail({ to: created.user.email, ...mail })
    }
  } catch (error) {
    console.error('[auth] reset request failed', (error as Error).message)
  }
  // Same answer whether or not the account exists.
  return { ok: true, message: generic }
}

export async function resetPasswordAction(fd: FormData): Promise<ActionResult> {
  const token = str(fd, 'token')
  const password = String(fd.get('password') ?? '')
  const confirm = String(fd.get('confirm') ?? '')
  if (password !== confirm) return { ok: false, message: 'The passwords do not match.', fieldErrors: { confirm: 'Repeat the same password.' } }
  const meta = await requestMeta()
  const result = await resetPasswordWithToken(token, password, { ip: meta.ip })
  if (!result.ok) {
    if (result.error === 'weak_password') {
      return { ok: false, message: 'Choose a stronger password.', fieldErrors: { password: result.problems?.join(' ') ?? 'Too weak.' } }
    }
    return { ok: false, message: 'This reset link is invalid or has expired. Request a new one.' }
  }
  return { ok: true, message: 'Your password was changed. Sign in with the new password.', redirectTo: '/admin/login?reset=1' }
}
