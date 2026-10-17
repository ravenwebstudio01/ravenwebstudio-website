/**
 * Provider-agnostic SMTP delivery (Brevo, Postmark, Mailgun EU, Resend SMTP,
 * Amazon SES, a self-hosted relay...). Email is disabled until SMTP_HOST and
 * MAIL_FROM are configured; callers receive "not_configured" and record it, so
 * nothing pretends a message was sent.
 */
import nodemailer, { type Transporter } from 'nodemailer'
import { env, smtpConfigured } from '@/lib/env'

export type DeliveryResult = 'sent' | 'failed' | 'not_configured'

export type MailMessage = {
  to: string
  subject: string
  text: string
  html?: string
  replyTo?: string
}

let transporter: Transporter | undefined

function getTransport(): Transporter {
  if (!transporter) {
    const e = env()
    transporter = nodemailer.createTransport({
      host: e.SMTP_HOST,
      port: e.SMTP_PORT,
      secure: e.SMTP_SECURE,
      auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD ?? '' } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    })
  }
  return transporter
}

export async function sendMail(message: MailMessage): Promise<DeliveryResult> {
  if (!smtpConfigured()) return 'not_configured'
  try {
    await getTransport().sendMail({
      from: env().MAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      replyTo: message.replyTo,
    })
    return 'sent'
  } catch (error) {
    // Log the failure without recipient addresses or message content.
    console.error('[email] delivery failed:', (error as Error).message)
    return 'failed'
  }
}

/** Connection check used by the admin "send test email" action. */
export async function verifySmtp(): Promise<{ ok: boolean; message: string }> {
  if (!smtpConfigured()) return { ok: false, message: 'SMTP is not configured (SMTP_HOST and MAIL_FROM are required).' }
  try {
    await getTransport().verify()
    return { ok: true, message: 'SMTP connection verified.' }
  } catch (error) {
    return { ok: false, message: `SMTP connection failed: ${(error as Error).message}` }
  }
}
