'use client'

import { useState } from 'react'
import { ActionForm, SubmitButton } from '@/components/admin/action-form'
import { CheckboxField, CheckboxListField, FieldError, RadioField, TextField } from '@/components/admin/fields'
import type { ActionResult } from '@/lib/admin/action-result'
import { formatMoney, minorToMajorString } from '@/lib/money'

type Result = {
  currency: string
  subtotal: number
  discountTotal: number
  total: number
  lines: { name: string; amount: number; discount: number; net: number }[]
  applied: { offerId: string; name: string; amount: number }[]
  rejected: { name: string; reason: string }[]
}

export function OfferCalculator({
  action,
  services,
  approvalOffers,
}: {
  action: (fd: FormData) => Promise<ActionResult>
  services: { id: string; name: string; priceFrom: number | null; currency: string }[]
  approvalOffers: { id: string; name: string }[]
}) {
  const [result, setResult] = useState<Result | null>(null)
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <ActionForm action={action} onSuccess={(res) => setResult((res.data as Result) ?? null)} className="space-y-6 rounded-[var(--radius-panel)] border border-line bg-paper p-6">
        <CheckboxListField name="serviceIds" label="Services in the proposal" options={services.map((s) => ({ value: s.id, label: s.name }))} />
        <FieldError name="serviceIds" />
        <fieldset>
          <legend className="field-label">Agreed prices (leave empty to use the starting price)</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {services.map((s) => (
              <TextField
                key={s.id}
                name={`price_${s.id}`}
                label={`${s.name} (${s.currency})`}
                inputMode="decimal"
                placeholder={s.priceFrom != null ? minorToMajorString(s.priceFrom) : 'No starting price'}
              />
            ))}
          </div>
        </fieldset>
        <RadioField
          name="clientStatus"
          label="Client"
          defaultValue="new"
          options={[
            { value: 'new', label: 'New client' },
            { value: 'existing', label: 'Existing client' },
          ]}
        />
        <TextField name="codes" label="Offer codes (optional)" hint="Separate several codes with spaces." />
        {approvalOffers.length > 0 && (
          <CheckboxListField name="approvedOfferIds" label="Manually approved offers to apply" options={approvalOffers.map((o) => ({ value: o.id, label: o.name }))} />
        )}
        <CheckboxField name="includeDrafts" label="Include draft offers (to test them before publishing)" />
        <SubmitButton>Calculate</SubmitButton>
      </ActionForm>

      <section aria-live="polite" className="rounded-[var(--radius-panel)] border border-line bg-paper p-6">
        <h2 className="text-lg font-bold">Result</h2>
        {!result ? (
          <p className="mt-3 text-slate">Choose services and calculate to see which offers apply and why others do not.</p>
        ) : (
          <div className="mt-4 space-y-6">
            <table className="w-full text-[0.9375rem]">
              <caption className="sr-only">Price breakdown</caption>
              <thead>
                <tr className="border-b border-line text-left text-sm text-slate">
                  <th scope="col" className="py-2">Service</th>
                  <th scope="col" className="py-2 text-right">Price</th>
                  <th scope="col" className="py-2 text-right">Discount</th>
                  <th scope="col" className="py-2 text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {result.lines.map((l) => (
                  <tr key={l.name} className="border-b border-line">
                    <th scope="row" className="py-2 text-left font-normal">
                      {l.name}
                    </th>
                    <td className="tabular py-2 text-right">{formatMoney(l.amount, result.currency)}</td>
                    <td className="tabular py-2 text-right text-success">{l.discount ? `−${formatMoney(l.discount, result.currency)}` : '—'}</td>
                    <td className="tabular py-2 text-right">{formatMoney(l.net, result.currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className="pt-3 text-left">
                    Total
                  </th>
                  <td className="tabular pt-3 text-right">{formatMoney(result.subtotal, result.currency)}</td>
                  <td className="tabular pt-3 text-right text-success">−{formatMoney(result.discountTotal, result.currency)}</td>
                  <td className="tabular pt-3 text-right text-lg font-bold">{formatMoney(result.total, result.currency)}</td>
                </tr>
              </tfoot>
            </table>
            <div>
              <h3 className="font-bold">Applied offers</h3>
              {result.applied.length === 0 ? (
                <p className="text-sm text-slate">None.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-[0.9375rem]">
                  {result.applied.map((a) => (
                    <li key={a.offerId}>
                      {a.name}: −{formatMoney(a.amount, result.currency)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {result.rejected.length > 0 && (
              <div>
                <h3 className="font-bold">Not applied</h3>
                <ul className="mt-2 space-y-1 text-[0.9375rem]">
                  {result.rejected.map((r) => (
                    <li key={r.name}>
                      {r.name} — <span className="text-slate">{r.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
