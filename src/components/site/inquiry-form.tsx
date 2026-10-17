'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from 'react'
import { estimateAction, submitInquiryAction, type EstimateView, type InquiryFormState } from '@/app/(site)/contact/actions'
import { track } from '@/lib/analytics/client'
import { COUNTRIES, fieldErrorsFrom, INQUIRY_TYPES, inquiryInputFromFormData, inquirySchema, TIMELINES } from '@/lib/inquiries/schema'
import { formatMoney } from '@/lib/money'
import { cx } from '@/lib/utils'

export type InquiryFormOptions = {
  services: { slug: string; name: string }[]
  hasPricedServices: boolean
  budgetTiers: { slug: string; label: string }[]
  collaborationTypes: { slug: string; name: string }[]
  offers: { slug: string; name: string }[]
}

export type InquiryFormDefaults = {
  serviceSlug?: string
  budgetSlug?: string
  offerSlug?: string
  inquiryType?: string
}

type Props = {
  options: InquiryFormOptions
  defaults: InquiryFormDefaults
  formToken: string
  locale: string
  successTitle: string
  successBody: string
}

const FIELD_ORDER = [
  'name',
  'email',
  'company',
  'phone',
  'country',
  'inquiryType',
  'collaborationTypeSlug',
  'clientStatus',
  'serviceSlugs',
  'budgetTierSlug',
  'timeline',
  'websiteUrl',
  'description',
  'additionalServiceSlugs',
  'offerSlug',
  'offerCode',
  'privacyAcknowledged',
]

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  email: 'E-mail',
  company: 'Company',
  phone: 'Phone',
  country: 'Country or market',
  inquiryType: 'What is your inquiry about?',
  collaborationTypeSlug: 'Type of collaboration',
  clientStatus: 'Have you worked with us before?',
  serviceSlugs: 'Services',
  budgetTierSlug: 'Budget',
  timeline: 'Timeline',
  websiteUrl: 'Current website',
  description: 'Project description',
  additionalServiceSlugs: 'Services you may need later',
  offerSlug: 'Offer',
  offerCode: 'Offer code',
  privacyAcknowledged: 'Privacy notice',
}

function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
        {required ? <span className="text-danger"> *</span> : <span className="font-normal text-slate"> (optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <span id={`${id}-hint`} className="field-hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="field-error">
          {error}
        </span>
      )}
    </div>
  )
}

function describedBy(id: string, error?: string, hint?: string) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined
}

export function InquiryForm({ options, defaults, formToken, locale, successTitle, successBody }: Props) {
  const uid = useId()
  const id = (name: string) => `${uid}-${name}`
  const formRef = useRef<HTMLFormElement>(null)
  const summaryRef = useRef<HTMLDivElement>(null)
  const successRef = useRef<HTMLHeadingElement>(null)
  const started = useRef(false)

  const [state, setState] = useState<InquiryFormState>({ status: 'idle' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()
  const [inquiryType, setInquiryType] = useState(defaults.inquiryType ?? 'project')
  const [wantsMore, setWantsMore] = useState(false)
  const [estimate, setEstimate] = useState<EstimateView | null>(null)
  const [estimating, startEstimate] = useTransition()

  useEffect(() => {
    if (state.status === 'success') successRef.current?.focus()
  }, [state.status])

  const errorEntries = FIELD_ORDER.filter((f) => errors[f]).map((f) => [f, errors[f]!] as const)

  function focusSummary() {
    requestAnimationFrame(() => summaryRef.current?.focus())
  }

  function onStart() {
    if (started.current) return
    started.current = true
    track('inquiry_form_start')
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    track('inquiry_form_submit')

    const parsed = inquirySchema.safeParse(inquiryInputFromFormData(formData))
    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error))
      setState({ status: 'error', message: 'Some details need your attention.' })
      track('inquiry_form_error', { error_type: 'validation' })
      focusSummary()
      return
    }

    startTransition(async () => {
      const result = await submitInquiryAction(formData)
      setState(result)
      setErrors(result.fieldErrors ?? {})
      if (result.status === 'success') {
        if (result.analytics) track('generate_lead', result.analytics)
        form.reset()
        setEstimate(null)
        setWantsMore(false)
      } else {
        track('inquiry_form_error', { error_type: result.fieldErrors ? 'validation' : 'server' })
        focusSummary()
      }
    })
  }

  function requestEstimate() {
    const form = formRef.current
    if (!form) return
    const fd = new FormData(form)
    const serviceSlugs = fd.getAll('serviceSlugs').map(String)
    const offerCode = String(fd.get('offerCode') ?? '')
    startEstimate(async () => {
      const result = await estimateAction({
        serviceSlugs,
        clientStatus: String(fd.get('clientStatus') ?? 'new'),
        offerCode,
      })
      setEstimate(result)
      track('estimate_request', { service_count: serviceSlugs.length, has_offer: Boolean(offerCode || fd.get('offerSlug')) })
    })
  }

  if (state.status === 'success') {
    return (
      <div className="rounded-[var(--radius-panel)] border-2 border-success bg-success-soft p-8" role="status">
        <h2 ref={successRef} tabIndex={-1} className="text-h3 font-bold outline-none">
          {successTitle}
        </h2>
        <p className="mt-3 text-slate">{successBody}</p>
        <p className="mt-5 text-lg">
          Your reference: <strong className="tabular">{state.reference}</strong>
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/" className="btn btn-primary btn-sm">
            Back to the homepage
          </Link>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setState({ status: 'idle' })}>
            Send another inquiry
          </button>
        </div>
      </div>
    )
  }

  const err = (name: string) => errors[name]

  return (
    <form ref={formRef} onSubmit={onSubmit} onInput={onStart} noValidate aria-describedby={`${uid}-required-note`} className="space-y-10">
      <p id={`${uid}-required-note`} className="text-[0.9375rem] text-slate">
        Fields marked <span className="text-danger">*</span> are required.
      </p>

      {state.status === 'error' && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-[var(--radius-panel)] border-2 border-danger bg-danger-soft p-5 outline-none">
          <p className="font-bold">{state.message}</p>
          {errorEntries.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {errorEntries.map(([field, message]) => (
                <li key={field}>
                  <a href={`#${id(field)}`} className="font-semibold underline">
                    {FIELD_LABELS[field] ?? field}
                  </a>
                  : {message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <input type="hidden" name="formToken" value={formToken} />
      <input type="hidden" name="sourcePath" value="/contact" />
      {/* Honeypot: hidden from people and assistive technology; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={id('company_website')}>Leave this field empty</label>
        <input id={id('company_website')} name="company_website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <fieldset className="space-y-5">
        <legend className="mb-1 text-xl font-bold">About you</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={id('name')} label="Name" required error={err('name')}>
            <input
              id={id('name')}
              name="name"
              className="input"
              autoComplete="name"
              maxLength={120}
              required
              aria-invalid={Boolean(err('name'))}
              aria-describedby={describedBy(id('name'), err('name'))}
            />
          </Field>
          <Field id={id('email')} label="E-mail" required error={err('email')}>
            <input
              id={id('email')}
              name="email"
              type="email"
              className="input"
              autoComplete="email"
              maxLength={254}
              required
              aria-invalid={Boolean(err('email'))}
              aria-describedby={describedBy(id('email'), err('email'))}
            />
          </Field>
          <Field id={id('company')} label="Company" error={err('company')}>
            <input id={id('company')} name="company" className="input" autoComplete="organization" maxLength={160} aria-invalid={Boolean(err('company'))} />
          </Field>
          <Field id={id('phone')} label="Phone" error={err('phone')} hint="Only if you prefer a call.">
            <input
              id={id('phone')}
              name="phone"
              type="tel"
              className="input"
              autoComplete="tel"
              maxLength={40}
              aria-invalid={Boolean(err('phone'))}
              aria-describedby={describedBy(id('phone'), err('phone'), 'hint')}
            />
          </Field>
          <Field id={id('country')} label="Country or market" error={err('country')}>
            <select id={id('country')} name="country" className="input" defaultValue="" autoComplete="country-name">
              <option value="">Select…</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="mb-1 text-xl font-bold">Your project</legend>

        <div role="radiogroup" aria-labelledby={id('inquiryType-label')} aria-describedby={describedBy(id('inquiryType'), err('inquiryType'))}>
          <p id={id('inquiryType-label')} className="field-label">
            What is your inquiry about?<span className="text-danger"> *</span>
          </p>
          <div id={id('inquiryType')} tabIndex={-1} className="grid gap-3 sm:grid-cols-2">
            {INQUIRY_TYPES.map((t) => (
              <label
                key={t.value}
                className={cx(
                  'flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border-[1.5px] p-4 transition-colors',
                  inquiryType === t.value ? 'border-sheen bg-sheen-soft' : 'border-line hover:border-slate',
                )}
              >
                <input
                  type="radio"
                  name="inquiryType"
                  value={t.value}
                  className="check"
                  defaultChecked={(defaults.inquiryType ?? 'project') === t.value}
                  onChange={() => setInquiryType(t.value)}
                />
                <span className="font-semibold">{t.label}</span>
              </label>
            ))}
          </div>
          {err('inquiryType') && (
            <span id={`${id('inquiryType')}-error`} className="field-error">
              {err('inquiryType')}
            </span>
          )}
        </div>

        {inquiryType === 'collaboration' && options.collaborationTypes.length > 0 && (
          <Field id={id('collaborationTypeSlug')} label="Type of collaboration" error={err('collaborationTypeSlug')}>
            <select id={id('collaborationTypeSlug')} name="collaborationTypeSlug" className="input" defaultValue="">
              <option value="">Select…</option>
              {options.collaborationTypes.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div role="radiogroup" aria-labelledby={id('clientStatus-label')}>
          <p id={id('clientStatus-label')} className="field-label">
            Have you worked with us before?
          </p>
          <div id={id('clientStatus')} className="flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex items-center gap-2.5">
              <input type="radio" name="clientStatus" value="new" className="check mt-0" defaultChecked={defaults.inquiryType !== 'existing_client'} />
              No, I am a new client
            </label>
            <label className="flex items-center gap-2.5">
              <input type="radio" name="clientStatus" value="existing" className="check mt-0" defaultChecked={defaults.inquiryType === 'existing_client'} />
              Yes, I am an existing client
            </label>
          </div>
        </div>

        {options.services.length > 0 && (
          <fieldset>
            <legend className="field-label">
              Which services are you interested in? <span className="font-normal text-slate">(optional)</span>
            </legend>
            <div id={id('serviceSlugs')} className="grid gap-2 sm:grid-cols-2">
              {options.services.map((s) => (
                <label key={s.slug} className="flex items-start gap-2.5 rounded-[var(--radius-control)] px-1 py-1.5">
                  <input type="checkbox" name="serviceSlugs" value={s.slug} className="check" defaultChecked={defaults.serviceSlug === s.slug} />
                  <span>{s.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          {options.budgetTiers.length > 0 && (
            <Field id={id('budgetTierSlug')} label="Budget" error={err('budgetTierSlug')}>
              <select id={id('budgetTierSlug')} name="budgetTierSlug" className="input" defaultValue={defaults.budgetSlug ?? ''}>
                <option value="">Not sure yet</option>
                {options.budgetTiers.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field id={id('timeline')} label="Timeline" error={err('timeline')}>
            <select id={id('timeline')} name="timeline" className="input" defaultValue="">
              <option value="">Select…</option>
              {TIMELINES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field id={id('websiteUrl')} label="Current website" error={err('websiteUrl')} hint="If you already have one.">
          <input
            id={id('websiteUrl')}
            name="websiteUrl"
            type="url"
            inputMode="url"
            className="input"
            placeholder="https://"
            maxLength={500}
            aria-invalid={Boolean(err('websiteUrl'))}
            aria-describedby={describedBy(id('websiteUrl'), err('websiteUrl'), 'hint')}
          />
        </Field>

        <Field
          id={id('description')}
          label="Tell us about your project"
          required
          error={err('description')}
          hint="Goals, audience, must-have features, examples you like — whatever helps us understand."
        >
          <textarea
            id={id('description')}
            name="description"
            className="input"
            rows={7}
            maxLength={5000}
            required
            aria-invalid={Boolean(err('description'))}
            aria-describedby={describedBy(id('description'), err('description'), 'hint')}
          />
        </Field>
      </fieldset>

      {options.services.length > 0 && (
        <fieldset className="space-y-4">
          <legend className="mb-1 text-xl font-bold">Later on</legend>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="wantsAdditionalServices" className="check" onChange={(e) => setWantsMore(e.target.checked)} />
            <span>I may need more services after this project (for example maintenance, SEO or new features).</span>
          </label>
          {wantsMore && (
            <div id={id('additionalServiceSlugs')} className="grid gap-2 pl-8 sm:grid-cols-2">
              {options.services.map((s) => (
                <label key={s.slug} className="flex items-start gap-2.5 py-1">
                  <input type="checkbox" name="additionalServiceSlugs" value={s.slug} className="check" />
                  <span>{s.name}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
      )}

      {(options.offers.length > 0 || options.hasPricedServices) && (
        <fieldset className="space-y-5">
          <legend className="mb-1 text-xl font-bold">Offers and estimate</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            {options.offers.length > 0 && (
              <Field id={id('offerSlug')} label="Offer you are interested in" error={err('offerSlug')}>
                <select id={id('offerSlug')} name="offerSlug" className="input" defaultValue={defaults.offerSlug ?? ''}>
                  <option value="">None</option>
                  {options.offers.map((o) => (
                    <option key={o.slug} value={o.slug}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field id={id('offerCode')} label="Offer code" error={err('offerCode')} hint="Only if we gave you one.">
              <input
                id={id('offerCode')}
                name="offerCode"
                className="input uppercase"
                maxLength={40}
                autoComplete="off"
                aria-invalid={Boolean(err('offerCode'))}
                aria-describedby={describedBy(id('offerCode'), err('offerCode'), 'hint')}
              />
            </Field>
          </div>

          {options.hasPricedServices && (
            <div className="rounded-[var(--radius-panel)] bg-mist p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-md text-[0.9375rem] text-slate">
                  See an indicative estimate for the selected services, including offers you qualify for.
                </p>
                <button type="button" className="btn btn-quiet btn-sm bg-paper" onClick={requestEstimate} disabled={estimating}>
                  {estimating ? 'Calculating…' : 'Show estimate'}
                </button>
              </div>
              <div aria-live="polite">{estimate && <EstimatePanel estimate={estimate} locale={locale} />}</div>
            </div>
          )}
        </fieldset>
      )}

      <div>
        <label className="flex items-start gap-3">
          <input
            id={id('privacyAcknowledged')}
            type="checkbox"
            name="privacyAcknowledged"
            className="check"
            required
            aria-invalid={Boolean(err('privacyAcknowledged'))}
            aria-describedby={describedBy(id('privacyAcknowledged'), err('privacyAcknowledged'))}
          />
          <span>
            I have read the{' '}
            <Link href="/privacy" className="text-link" target="_blank">
              privacy notice<span className="sr-only"> (opens in a new tab)</span>
            </Link>{' '}
            and understand my details are used to reply to this inquiry.<span className="text-danger"> *</span>
          </span>
        </label>
        {err('privacyAcknowledged') && (
          <span id={`${id('privacyAcknowledged')}-error`} className="field-error">
            {err('privacyAcknowledged')}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <button type="submit" className="btn btn-primary" disabled={pending} aria-disabled={pending}>
          {pending ? 'Sending…' : 'Send inquiry'}
        </button>
        <p className="text-sm text-slate">Your details are used only to reply to this inquiry.</p>
      </div>
    </form>
  )
}

function EstimatePanel({ estimate, locale }: { estimate: EstimateView; locale: string }) {
  const unit = { month: 'per month', hour: 'per hour' } as const
  return (
    <div className="mt-4 border-t border-line pt-4 text-[0.9688rem]">
      {estimate.ok ? (
        <>
          <table className="w-full">
            <caption className="sr-only">Indicative estimate</caption>
            <tbody>
              {estimate.lines.map((l) => (
                <tr key={l.name}>
                  <th scope="row" className="py-1 text-left font-normal">
                    {l.name}
                  </th>
                  <td className="tabular py-1 text-right">from {formatMoney(l.amount, estimate.currency, locale)}</td>
                </tr>
              ))}
              {estimate.offers.map((o) => (
                <tr key={o.name} className="text-success">
                  <th scope="row" className="py-1 text-left font-semibold">
                    {o.name}
                  </th>
                  <td className="tabular py-1 text-right font-semibold">−{formatMoney(o.amount, estimate.currency, locale)}</td>
                </tr>
              ))}
              <tr className="border-t border-line">
                <th scope="row" className="pt-2 text-left font-bold">
                  Indicative total
                </th>
                <td className="tabular pt-2 text-right text-lg font-bold">from {formatMoney(estimate.total, estimate.currency, locale)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-sm text-slate">Starting prices, before VAT where applicable. Your written proposal confirms the final scope and price.</p>
        </>
      ) : (
        <p className="text-slate">{estimate.message}</p>
      )}
      {estimate.recurring && estimate.recurring.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {estimate.recurring.map((r) => (
            <li key={r.name}>
              {r.name}: from {formatMoney(r.amount, r.currency, locale)} {unit[r.unit]} (billed separately)
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
