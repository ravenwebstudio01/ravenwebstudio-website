import { asc } from 'drizzle-orm'
import { ActionButton, ActionForm, SubmitButton } from '@/components/admin/action-form'
import { PublishingFields, SlugField } from '@/components/admin/content-fields'
import { CheckboxField, CheckboxListField, RadioField, SelectField, TextAreaField, TextField } from '@/components/admin/fields'
import { Notice, Panel } from '@/components/admin/ui'
import { toDateInput } from '@/lib/admin/form-data'
import { getDb } from '@/lib/db'
import { offers, services } from '@/lib/db/schema'
import { basisPointsToPercent, minorToMajorString, SUPPORTED_CURRENCIES } from '@/lib/money'
import { deleteOfferAction, saveOfferAction } from './actions'

type Offer = typeof offers.$inferSelect

export async function OfferEditor({ offer, requiredIds = [], eligibleIds = [] }: { offer: Offer | null; requiredIds?: string[]; eligibleIds?: string[] }) {
  const allServices = await getDb().select({ id: services.id, name: services.name }).from(services).orderBy(asc(services.displayOrder))
  const serviceOptions = allServices.map((s) => ({ value: s.id, label: s.name }))
  const value = offer ? (offer.discountType === 'percentage' ? basisPointsToPercent(offer.discountValue) : minorToMajorString(offer.discountValue)) : ''

  return (
    <ActionForm action={saveOfferAction} className="grid gap-6 xl:grid-cols-[1fr_20rem]">
      {offer && <input type="hidden" name="id" value={offer.id} />}
      <div className="space-y-6">
        <Panel title="Offer">
          <div className="space-y-5">
            <TextField name="name" label="Name" defaultValue={offer?.name} required maxLength={120} />
            <SlugField defaultValue={offer?.slug ?? ''} prefix="/offers#" />
            <TextAreaField name="summary" label="Summary" defaultValue={offer?.summary} maxLength={300} rows={2} hint="One or two sentences in plain language." />
            <TextAreaField name="description" label="Details (optional)" defaultValue={offer?.description} maxLength={10000} rows={5} mono hint="Markdown supported." />
          </div>
        </Panel>

        <Panel title="Discount">
          <div className="grid gap-5 md:grid-cols-2">
            <RadioField
              name="discountType"
              label="Type"
              defaultValue={offer?.discountType ?? 'percentage'}
              options={[
                { value: 'percentage', label: 'Percentage', hint: 'e.g. 10 for 10%' },
                { value: 'fixed_amount', label: 'Fixed amount', hint: 'e.g. 200 for €200 off' },
              ]}
            />
            <div className="space-y-5">
              <TextField name="discountValue" label="Value" defaultValue={value} required inputMode="decimal" />
              <SelectField name="currency" label="Currency (fixed amounts)" defaultValue={offer?.currency ?? 'EUR'} options={SUPPORTED_CURRENCIES.map((c) => ({ value: c, label: c }))} />
            </div>
            <RadioField
              name="discountScope"
              label="Applies to"
              defaultValue={offer?.discountScope ?? 'eligible_services'}
              options={[
                { value: 'eligible_services', label: 'Eligible services only', hint: 'Choose them below; none selected means all selected services.' },
                { value: 'order_total', label: 'The whole project total' },
              ]}
            />
            <TextField name="maxDiscount" label="Maximum discount (optional)" defaultValue={minorToMajorString(offer?.maxDiscount)} inputMode="decimal" />
          </div>
        </Panel>

        <Panel title="Eligibility">
          <div className="space-y-5">
            <RadioField
              name="clientEligibility"
              label="Who can use it"
              defaultValue={offer?.clientEligibility ?? 'any'}
              options={[
                { value: 'any', label: 'New and existing clients' },
                { value: 'new', label: 'New clients only' },
                { value: 'existing', label: 'Existing clients only' },
              ]}
            />
            <div className="grid gap-5 md:grid-cols-2">
              <CheckboxListField name="requiredServiceIds" label="Required services (all must be ordered)" options={serviceOptions} defaultValues={requiredIds} />
              <CheckboxListField name="eligibleServiceIds" label="Discounted services" options={serviceOptions} defaultValues={eligibleIds} />
              <TextField name="minSubtotal" label="Minimum project value (optional)" defaultValue={minorToMajorString(offer?.minSubtotal)} inputMode="decimal" />
              <TextField name="minServiceCount" label="Minimum number of services (optional)" defaultValue={offer?.minServiceCount ?? ''} inputMode="numeric" />
              <TextField name="startsAt" label="Starts on (optional)" type="date" defaultValue={toDateInput(offer?.startsAt, 'start')} hint="From 00:00 UTC." />
              <TextField name="endsAt" label="Ends on (optional)" type="date" defaultValue={toDateInput(offer?.endsAt, 'end')} hint="Until the end of this day (UTC)." />
            </div>
          </div>
        </Panel>

        <Panel title="Combining and approval">
          <div className="space-y-5">
            <CheckboxField
              name="stackable"
              label="Can be combined with other combinable offers"
              defaultChecked={offer?.stackable ?? false}
              hint="Unticked offers never combine with anything. The calculator always picks the better of the best single offer or all combinable offers together."
            />
            <CheckboxField
              name="requiresApproval"
              label="Requires manual approval"
              defaultChecked={offer?.requiresApproval ?? false}
              hint="Never applied automatically to estimates; you apply it in the offer calculator when preparing a proposal."
            />
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                name="code"
                label="Private offer code (optional)"
                defaultValue={offer?.code ?? ''}
                maxLength={40}
                hint="Offers with a code are hidden from the Offers page and apply only when the code is entered."
              />
              <TextField name="priority" label="Priority" defaultValue={offer?.priority ?? 0} inputMode="numeric" hint="Higher numbers apply first when combining." />
            </div>
          </div>
        </Panel>

        <Panel title="Terms">
          <TextAreaField name="terms" label="Terms and conditions (optional)" defaultValue={offer?.terms} rows={5} maxLength={10000} mono hint="Shown on the Offers page. Markdown supported." />
        </Panel>
      </div>
      <div className="space-y-6">
        <Panel title="Publishing">
          <PublishingFields status={offer?.status ?? 'draft'} isSample={offer?.isSample ?? false} />
          <div className="mt-6">
            <SubmitButton>{offer ? 'Save changes' : 'Create offer'}</SubmitButton>
          </div>
        </Panel>
        <Notice>Publishing an offer makes it an official promotion on the website. Test it in the offer calculator first.</Notice>
        {offer && (
          <Panel title="Danger zone">
            <p className="mb-3 text-sm text-slate">Past inquiries keep a record of the offer name at the time.</p>
            <ActionButton action={deleteOfferAction} hidden={{ id: offer.id }} label="Delete offer" variant="danger" confirmMessage={`Delete “${offer.name}”?`} />
          </Panel>
        )}
      </div>
    </ActionForm>
  )
}
