import { asc } from 'drizzle-orm'
import { ActionButton, ActionForm, SubmitButton } from '@/components/admin/action-form'
import { PublishingFields, SlugField } from '@/components/admin/content-fields'
import { CheckboxField, CheckboxListField, SelectField, TextAreaField, TextField } from '@/components/admin/fields'
import { Panel } from '@/components/admin/ui'
import { getDb } from '@/lib/db'
import { budgetTiers, services } from '@/lib/db/schema'
import { minorToMajorString, SUPPORTED_CURRENCIES } from '@/lib/money'
import { deleteBudgetTierAction, saveBudgetTierAction } from './actions'

type Tier = typeof budgetTiers.$inferSelect

export async function BudgetEditor({ tier, serviceIds = [] }: { tier: Tier | null; serviceIds?: string[] }) {
  const allServices = await getDb().select({ id: services.id, name: services.name }).from(services).orderBy(asc(services.displayOrder))
  return (
    <ActionForm action={saveBudgetTierAction} className="grid gap-6 xl:grid-cols-[1fr_20rem]">
      {tier && <input type="hidden" name="id" value={tier.id} />}
      <div className="space-y-6">
        <Panel title="Category">
          <div className="space-y-5">
            <TextField name="name" label="Name" defaultValue={tier?.name} required maxLength={120} />
            <SlugField defaultValue={tier?.slug ?? ''} prefix="/contact?budget=" />
            <TextAreaField name="description" label="Description" defaultValue={tier?.description} maxLength={600} rows={3} />
            <div className="grid gap-5 md:grid-cols-2">
              <TextAreaField name="typicalFeatures" label="Typical features (one per line)" defaultValue={tier?.typicalFeatures.join('\n')} rows={5} />
              <TextAreaField name="suitableFor" label="Suitable for (one per line)" defaultValue={tier?.suitableFor.join('\n')} rows={5} />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <TextField name="timeline" label="Typical timeline" defaultValue={tier?.timeline} maxLength={120} placeholder="e.g. 3–5 weeks" />
              <TextField name="ctaLabel" label="Button label" defaultValue={tier?.ctaLabel} maxLength={60} placeholder="Start with this budget" />
            </div>
          </div>
        </Panel>
        <Panel title="Budget" description="Use your real price ranges. Nothing is shown publicly until “Show amounts on the website” is ticked.">
          <div className="grid gap-5 md:grid-cols-2">
            <TextField name="minAmount" label="Minimum" defaultValue={minorToMajorString(tier?.minAmount)} inputMode="decimal" />
            <TextField name="maxAmount" label="Maximum (optional)" defaultValue={minorToMajorString(tier?.maxAmount)} inputMode="decimal" />
            <TextField name="startingPrice" label="Starting price (optional)" defaultValue={minorToMajorString(tier?.startingPrice)} inputMode="decimal" hint="Shown when no range is set." />
            <SelectField name="currency" label="Currency" defaultValue={tier?.currency ?? 'EUR'} options={SUPPORTED_CURRENCIES.map((c) => ({ value: c, label: c }))} />
          </div>
          <CheckboxField className="mt-5" name="showAmounts" label="Show amounts on the website" defaultChecked={tier?.showAmounts ?? false} />
        </Panel>
        <Panel title="Relevant services">
          <CheckboxListField name="serviceIds" label="Services typical for this category" options={allServices.map((s) => ({ value: s.id, label: s.name }))} defaultValues={serviceIds} />
        </Panel>
      </div>
      <div className="space-y-6">
        <Panel title="Publishing">
          <PublishingFields status={tier?.status ?? 'draft'} isSample={tier?.isSample ?? false} />
          <div className="mt-6">
            <SubmitButton>{tier ? 'Save changes' : 'Create category'}</SubmitButton>
          </div>
        </Panel>
        {tier && (
          <Panel title="Danger zone">
            <p className="mb-3 text-sm text-slate">Past inquiries keep the category name they selected.</p>
            <ActionButton action={deleteBudgetTierAction} hidden={{ id: tier.id }} label="Delete category" variant="danger" confirmMessage={`Delete “${tier.name}”?`} />
          </Panel>
        )}
      </div>
    </ActionForm>
  )
}
