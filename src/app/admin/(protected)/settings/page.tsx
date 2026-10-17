import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { ActionButton, ActionForm, SubmitButton } from '@/components/admin/action-form'
import { CheckboxField, SelectField, TextAreaField, TextField } from '@/components/admin/fields'
import { ImageUploader } from '@/components/admin/image-uploader'
import { Notice, PageHeader, Panel } from '@/components/admin/ui'
import { requireAdminPage } from '@/lib/auth/guards'
import { getDb } from '@/lib/db'
import { media } from '@/lib/db/schema'
import { env, smtpConfigured } from '@/lib/env'
import { toMediaView } from '@/lib/media/view'
import { SUPPORTED_CURRENCIES } from '@/lib/money'
import { loadSettings } from '@/lib/settings'
import { saveSettingsAction, sendTestEmailAction } from './actions'

export const metadata: Metadata = { title: 'Site settings' }

function StatusRow({ label, ok, detail }: { label: string; ok: boolean | 'warn'; detail: string }) {
  return (
    <li className="flex gap-3 py-2">
      <span aria-hidden="true" className={`mt-1.5 h-2.5 w-2.5 flex-none rounded-full ${ok === true ? 'bg-success' : ok === 'warn' ? 'bg-warning' : 'bg-danger'}`} />
      <span>
        <span className="font-semibold">{label}</span>
        <span className="block text-sm text-slate">{detail}</span>
      </span>
    </li>
  )
}

export default async function SettingsPage() {
  await requireAdminPage('settings:manage')
  const settings = await loadSettings()
  const e = env()
  const [logoRow] = settings.logoMediaId ? await getDb().select().from(media).where(eq(media.id, settings.logoMediaId)).limit(1) : []
  const logo = toMediaView(logoRow ?? null)
  const onVercel = process.env.VERCEL === '1'

  return (
    <>
      <PageHeader title="Site settings" description="Business details, contact information, notifications, analytics and data retention." />
      <ActionForm action={saveSettingsAction} className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel title="Business identity" description="Used in the footer, legal pages, e-mails and structured data. Leave fields empty until confirmed — nothing is invented.">
            <div className="grid gap-5 md:grid-cols-2">
              <TextField name="businessName" label="Business name" defaultValue={settings.businessName} required maxLength={120} />
              <TextField name="legalName" label="Registered legal name" defaultValue={settings.legalName} maxLength={160} />
              <TextField name="vatNumber" label="VAT ID" defaultValue={settings.vatNumber} maxLength={40} />
              <TextField name="companyRegistration" label="Company registration" defaultValue={settings.companyRegistration} maxLength={120} placeholder="Register and number" />
              <TextField name="registeredCountry" label="Country of registration" defaultValue={settings.registeredCountry} maxLength={80} />
              <TextAreaField name="address" label="Business address" defaultValue={settings.address} maxLength={400} rows={3} />
            </div>
            <div className="mt-5">
              <ImageUploader
                name="logoMediaId"
                label="Logo (optional — replaces the raven wordmark in the header)"
                initial={logo ? { id: logo.id, src: logo.src, width: logo.width, height: logo.height, alt: logo.alt } : null}
                hint="Use a wide PNG or WebP with a transparent background, at least 400 px wide."
              />
            </div>
          </Panel>
          <Panel title="Contact">
            <div className="grid gap-5 md:grid-cols-2">
              <TextField name="contactEmail" label="Public contact e-mail" type="email" defaultValue={settings.contactEmail} maxLength={254} hint="Shown on the website." />
              <TextField name="phone" label="Phone" defaultValue={settings.phone} maxLength={40} />
              <TextAreaField
                name="socialLinks"
                label="Social links"
                className="md:col-span-2"
                rows={4}
                defaultValue={settings.socialLinks.map((l) => `${l.label} | ${l.url}`).join('\n')}
                hint="One per line: Label | https://…"
              />
            </div>
          </Panel>
          <Panel title="Inquiry notifications">
            <div className="space-y-5">
              <TextField name="notificationEmail" label="Send new inquiries to" type="email" defaultValue={settings.notificationEmail} maxLength={254} hint="Private. Falls back to the public contact e-mail." />
              <CheckboxField name="notificationIncludeDetails" label="Include inquiry details in the notification e-mail" defaultChecked={settings.notificationIncludeDetails} hint="Untick to receive only the reference and a dashboard link (keeps personal data out of mailboxes)." />
              <CheckboxField name="sendClientAcknowledgement" label="Send an acknowledgement e-mail to the person who wrote" defaultChecked={settings.sendClientAcknowledgement} />
            </div>
          </Panel>
          <Panel title="Analytics and search engines">
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                name="gaMeasurementId"
                label="Google Analytics 4 measurement ID"
                defaultValue={settings.gaMeasurementId}
                maxLength={20}
                placeholder="G-XXXXXXXXXX"
                hint="Analytics loads only for visitors who allow it in the cookie banner. Leave empty to disable analytics and the banner."
              />
              <TextField
                name="searchConsoleVerification"
                label="Google Search Console verification"
                defaultValue={settings.searchConsoleVerification}
                maxLength={100}
                hint="From the “HTML tag” method: paste only the content value."
              />
            </div>
          </Panel>
          <Panel title="Regional and data retention">
            <div className="grid gap-5 md:grid-cols-2">
              <SelectField name="defaultCurrency" label="Default currency" defaultValue={settings.defaultCurrency} options={SUPPORTED_CURRENCIES.map((c) => ({ value: c, label: c }))} />
              <TextField name="locale" label="Number and date format" defaultValue={settings.locale} maxLength={5} hint="e.g. en-IE, de-DE, fr-FR" />
              <TextField name="inquiryRetentionMonths" label="Delete inquiries after (months)" defaultValue={settings.inquiryRetentionMonths} inputMode="numeric" />
              <TextField name="auditRetentionMonths" label="Delete audit log entries after (months)" defaultValue={settings.auditRetentionMonths} inputMode="numeric" />
            </div>
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Save">
            <SubmitButton>Save settings</SubmitButton>
          </Panel>
          <Panel title="Integrations" description="Configured through environment variables by whoever hosts the site.">
            <ul className="divide-y divide-line">
              <StatusRow
                label="E-mail delivery"
                ok={smtpConfigured() ? true : false}
                detail={smtpConfigured() ? `SMTP ${e.SMTP_HOST}:${e.SMTP_PORT}, sender ${e.MAIL_FROM}` : 'Not configured — inquiries are stored but no e-mails are sent.'}
              />
              <StatusRow
                label="Image storage"
                ok={e.STORAGE_DRIVER === 's3' ? true : onVercel ? false : 'warn'}
                detail={e.STORAGE_DRIVER === 's3' ? 'S3-compatible bucket' : onVercel ? 'Local disk does not persist on Vercel — configure S3 storage.' : 'Local disk — make sure the storage folder is backed up.'}
              />
              <StatusRow label="Analytics" ok={settings.gaMeasurementId || e.NEXT_PUBLIC_GA_MEASUREMENT_ID ? true : 'warn'} detail={settings.gaMeasurementId || e.NEXT_PUBLIC_GA_MEASUREMENT_ID ? 'GA4 enabled after consent' : 'Not configured (optional)'} />
              <StatusRow label="Scheduled clean-up" ok={e.CRON_SECRET ? true : 'warn'} detail={e.CRON_SECRET ? 'Cron secret set' : 'CRON_SECRET not set — retention clean-up will not run automatically.'} />
              <StatusRow label="Sample content" ok={e.SHOW_SAMPLE_CONTENT ? 'warn' : true} detail={e.SHOW_SAMPLE_CONTENT ? 'Sample records are visible (SHOW_SAMPLE_CONTENT=true). Disable in production.' : 'Sample records are hidden.'} />
            </ul>
          </Panel>
          {smtpConfigured() ? (
            <Panel title="Test e-mail">
              <p className="mb-3 text-sm text-slate">Sends a short test message to your own address.</p>
              <ActionButton action={sendTestEmailAction} label="Send test e-mail" />
            </Panel>
          ) : (
            <Notice tone="warning">Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD and MAIL_FROM to enable e-mail. See the README.</Notice>
          )}
        </div>
      </ActionForm>
    </>
  )
}
