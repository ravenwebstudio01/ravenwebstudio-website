'use server'

import type { ActionResult } from '@/lib/admin/action-result'
import { bool, int, optionalId, str } from '@/lib/admin/form-data'
import { parseOrThrow, runAction } from '@/lib/admin/run-action'
import { audit } from '@/lib/audit'
import { sendMail, verifySmtp } from '@/lib/email/mailer'
import { testEmail } from '@/lib/email/templates'
import { loadSettings, saveSettings } from '@/lib/settings'
import { SUPPORTED_CURRENCIES } from '@/lib/money'
import { z } from 'zod'

// Strict version of the settings schema for editing: invalid input is reported,
// not silently replaced with defaults.
const editSchema = z.object({
  businessName: z.string().trim().min(1, 'Enter the business name.').max(120),
  legalName: z.string().trim().max(160),
  contactEmail: z.union([z.literal(''), z.string().trim().email('Enter a valid e-mail address.').max(254)]),
  notificationEmail: z.union([z.literal(''), z.string().trim().email('Enter a valid e-mail address.').max(254)]),
  phone: z.string().trim().max(40),
  address: z.string().trim().max(400),
  vatNumber: z.string().trim().max(40),
  companyRegistration: z.string().trim().max(120),
  registeredCountry: z.string().trim().max(80),
  socialLinks: z
    .array(
      z.object({
        label: z.string().trim().min(1, 'Each social link needs a label before the |.').max(40),
        url: z
          .string()
          .trim()
          .max(300)
          .regex(/^https:\/\/[^\s]+\.[^\s]+$/, 'Social links must be full https:// addresses, written as Label | https://…'),
      }),
    )
    .max(8, 'At most 8 social links.'),
  defaultCurrency: z.enum(SUPPORTED_CURRENCIES),
  locale: z.string().trim().regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Use a locale such as en-IE or de-DE.'),
  gaMeasurementId: z.union([z.literal(''), z.string().trim().regex(/^G-[A-Z0-9]{4,16}$/, 'GA4 IDs look like G-XXXXXXXXXX.')]),
  searchConsoleVerification: z.union([z.literal(''), z.string().trim().regex(/^[A-Za-z0-9_-]{10,100}$/, 'Paste only the content value of the meta tag.')]),
  sendClientAcknowledgement: z.boolean(),
  notificationIncludeDetails: z.boolean(),
  inquiryRetentionMonths: z.number({ error: 'Enter a number of months.' }).int().min(1).max(120),
  auditRetentionMonths: z.number({ error: 'Enter a number of months.' }).int().min(1).max(120),
  logoMediaId: z.union([z.literal(''), z.string().uuid()]),
})

function parseSocialLinks(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split('|')
      return { label: (label ?? '').trim(), url: rest.join('|').trim() }
    })
}

export async function saveSettingsAction(fd: FormData): Promise<ActionResult> {
  return runAction('settings:manage', async (ctx) => {
    const current = await loadSettings()
    const data = parseOrThrow(editSchema, {
      businessName: str(fd, 'businessName'),
      legalName: str(fd, 'legalName'),
      contactEmail: str(fd, 'contactEmail'),
      notificationEmail: str(fd, 'notificationEmail'),
      phone: str(fd, 'phone'),
      address: str(fd, 'address'),
      vatNumber: str(fd, 'vatNumber'),
      companyRegistration: str(fd, 'companyRegistration'),
      registeredCountry: str(fd, 'registeredCountry'),
      socialLinks: parseSocialLinks(str(fd, 'socialLinks')),
      defaultCurrency: str(fd, 'defaultCurrency') || 'EUR',
      locale: str(fd, 'locale') || 'en-IE',
      gaMeasurementId: str(fd, 'gaMeasurementId').toUpperCase(),
      searchConsoleVerification: str(fd, 'searchConsoleVerification'),
      sendClientAcknowledgement: bool(fd, 'sendClientAcknowledgement'),
      notificationIncludeDetails: bool(fd, 'notificationIncludeDetails'),
      inquiryRetentionMonths: int(fd, 'inquiryRetentionMonths'),
      auditRetentionMonths: int(fd, 'auditRetentionMonths'),
      logoMediaId: optionalId(fd, 'logoMediaId') ?? '',
    })
    await saveSettings({ ...current, ...data }, ctx.user.id)
    const changed = Object.keys(data).filter((k) => JSON.stringify((current as Record<string, unknown>)[k]) !== JSON.stringify((data as Record<string, unknown>)[k]))
    await audit({ actor: ctx.actor, action: 'settings.updated', details: { changed }, ip: ctx.ip })
    return { ok: true, message: 'Settings saved.' }
  })
}

export async function sendTestEmailAction(): Promise<ActionResult> {
  return runAction('settings:manage', async (ctx) => {
    const check = await verifySmtp()
    if (!check.ok) return { ok: false, message: check.message }
    const settings = await loadSettings()
    const mail = testEmail({ businessName: settings.businessName })
    const result = await sendMail({ to: ctx.user.email, ...mail })
    await audit({ actor: ctx.actor, action: 'settings.test_email', details: { result }, ip: ctx.ip })
    return result === 'sent'
      ? { ok: true, message: `Test e-mail sent to ${ctx.user.email}. Check that it arrived (including spam).` }
      : { ok: false, message: 'The SMTP server refused the message. Check the server log and your provider settings.' }
  })
}
