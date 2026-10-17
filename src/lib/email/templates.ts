/**
 * Plain, escaped e-mail templates. All dynamic values pass through `escapeHtml`
 * for the HTML part; the text part is the primary content.
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Strips CR/LF so user input can never inject e-mail headers via the subject. */
export function headerSafe(value: string, max = 120): string {
  return value.replace(/[\r\n]+/g, ' ').trim().slice(0, max)
}

function layout(title: string, bodyHtml: string, businessName: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:24px;background:#f2f3f6;font-family:Arial,Helvetica,sans-serif;color:#1c2133">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px">
<tr><td style="padding:28px 32px;border-bottom:1px solid #d6d9e2;font-weight:bold;font-size:16px">${escapeHtml(businessName)}</td></tr>
<tr><td style="padding:28px 32px;font-size:15px;line-height:1.6">${bodyHtml}</td></tr>
</table></body></html>`
}

export type InquiryEmailData = {
  reference: string
  name: string
  email: string
  company: string
  phone: string
  country: string
  inquiryType: string
  clientStatus: string
  services: string[]
  additionalServices: string[]
  budget: string
  timeline: string
  websiteUrl: string
  collaborationType: string
  offer: string
  description: string
  estimate: string
}

export function inquiryNotificationEmail(
  data: InquiryEmailData,
  opts: { businessName: string; adminUrl: string; includeDetails: boolean },
) {
  const subject = headerSafe(`New inquiry ${data.reference}: ${data.inquiryType}`)
  const rows: [string, string][] = opts.includeDetails
    ? [
        ['Reference', data.reference],
        ['Type', data.inquiryType],
        ['Client', data.clientStatus],
        ['Name', data.name],
        ['E-mail', data.email],
        ['Company', data.company],
        ['Phone', data.phone],
        ['Country / market', data.country],
        ['Services', data.services.join(', ')],
        ['Interested later in', data.additionalServices.join(', ')],
        ['Budget', data.budget],
        ['Timeline', data.timeline],
        ['Website', data.websiteUrl],
        ['Collaboration', data.collaborationType],
        ['Offer', data.offer],
        ['Indicative estimate', data.estimate],
      ]
    : [['Reference', data.reference], ['Type', data.inquiryType]]
  const filled = rows.filter(([, v]) => v && v.trim() !== '')
  const text = [
    `A new inquiry was submitted on the website.`,
    '',
    ...filled.map(([k, v]) => `${k}: ${v}`),
    ...(opts.includeDetails ? ['', 'Message:', data.description] : []),
    '',
    `Open in the dashboard: ${opts.adminUrl}`,
  ].join('\n')
  const html = layout(
    subject,
    `<p>A new inquiry was submitted on the website.</p>
<table role="presentation" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">
${filled.map(([k, v]) => `<tr><td style="color:#4a5068;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join('\n')}
</table>
${opts.includeDetails ? `<p style="margin-top:20px;color:#4a5068">Message</p><p style="white-space:pre-wrap">${escapeHtml(data.description)}</p>` : ''}
<p style="margin-top:24px"><a href="${escapeHtml(opts.adminUrl)}" style="color:#5546c8">Open in the dashboard</a></p>`,
    opts.businessName,
  )
  return { subject, text, html }
}

export function inquiryAcknowledgementEmail(data: { reference: string; name: string }, opts: { businessName: string; contactEmail: string }) {
  const subject = headerSafe(`We received your inquiry (${data.reference})`)
  const contactLine = opts.contactEmail ? `If you need to add anything, reply to this e-mail or write to ${opts.contactEmail}.` : 'If you need to add anything, simply reply to this e-mail.'
  const text = [
    `Hello ${data.name},`,
    '',
    `Thank you for contacting ${opts.businessName}. We received your inquiry and will reply personally.`,
    `Your reference is ${data.reference}.`,
    '',
    contactLine,
    '',
    `${opts.businessName}`,
  ].join('\n')
  const html = layout(
    subject,
    `<p>Hello ${escapeHtml(data.name)},</p>
<p>Thank you for contacting ${escapeHtml(opts.businessName)}. We received your inquiry and will reply personally.</p>
<p>Your reference is <strong>${escapeHtml(data.reference)}</strong>.</p>
<p>${escapeHtml(contactLine)}</p>`,
    opts.businessName,
  )
  return { subject, text, html }
}

export function passwordResetEmail(data: { name: string; url: string; minutes: number }, opts: { businessName: string }) {
  const subject = headerSafe(`Reset your ${opts.businessName} dashboard password`)
  const text = [
    `Hello ${data.name},`,
    '',
    `Someone asked to reset the password for your dashboard account. If it was you, open this link within ${data.minutes} minutes:`,
    data.url,
    '',
    'If you did not ask for this, ignore this e-mail. Your password stays the same.',
  ].join('\n')
  const html = layout(
    subject,
    `<p>Hello ${escapeHtml(data.name)},</p>
<p>Someone asked to reset the password for your dashboard account. If it was you, use the link below within ${data.minutes} minutes.</p>
<p><a href="${escapeHtml(data.url)}" style="color:#5546c8">Choose a new password</a></p>
<p style="color:#4a5068">If you did not ask for this, ignore this e-mail. Your password stays the same.</p>`,
    opts.businessName,
  )
  return { subject, text, html }
}

export function testEmail(opts: { businessName: string }) {
  const subject = headerSafe(`${opts.businessName}: test e-mail`)
  const text = 'This is a test message from your website dashboard. E-mail delivery is working.'
  return { subject, text, html: layout(subject, `<p>${escapeHtml(text)}</p>`, opts.businessName) }
}
