import { asc, eq, ne } from 'drizzle-orm'
import { ActionButton, ActionForm, SubmitButton } from '@/components/admin/action-form'
import { PublishingFields, SeoFields, SlugField } from '@/components/admin/content-fields'
import { CheckboxField, CheckboxListField, SelectField, TextAreaField, TextField } from '@/components/admin/fields'
import { ImageUploader } from '@/components/admin/image-uploader'
import { Panel } from '@/components/admin/ui'
import { SERVICE_ICONS } from '@/components/site/service-icon'
import { getDb } from '@/lib/db'
import { media, serviceCategories, services } from '@/lib/db/schema'
import { toMediaView } from '@/lib/media/view'
import { minorToMajorString, SUPPORTED_CURRENCIES } from '@/lib/money'
import { deleteServiceAction, saveServiceAction } from './actions'

type Service = typeof services.$inferSelect

export async function ServiceEditor({ service, relatedIds = [] }: { service: Service | null; relatedIds?: string[] }) {
  const db = getDb()
  const [categories, others, imageRow] = await Promise.all([
    db.select().from(serviceCategories).orderBy(asc(serviceCategories.displayOrder)),
    db
      .select({ id: services.id, name: services.name })
      .from(services)
      .where(service ? ne(services.id, service.id) : undefined)
      .orderBy(asc(services.displayOrder)),
    service?.imageId ? db.select().from(media).where(eq(media.id, service.imageId)).limit(1) : Promise.resolve([]),
  ])
  const image = toMediaView(imageRow[0] ?? null)

  return (
    <ActionForm action={saveServiceAction} className="grid gap-6 xl:grid-cols-[1fr_20rem]">
      {service && <input type="hidden" name="id" value={service.id} />}
      <div className="space-y-6">
        <Panel title="Basics">
          <div className="space-y-5">
            <TextField name="name" label="Name" defaultValue={service?.name} required maxLength={120} />
            <SlugField defaultValue={service?.slug ?? ''} prefix="/services/" />
            <TextAreaField name="shortDescription" label="Short description" defaultValue={service?.shortDescription} required maxLength={300} rows={3} hint="Shown in lists and as the page introduction." />
            <TextAreaField
              name="description"
              label="Detailed description"
              defaultValue={service?.description}
              rows={10}
              maxLength={20000}
              mono
              hint="Markdown: ## headings, **bold**, - lists, [links](https://…). HTML is not rendered."
            />
          </div>
        </Panel>
        <Panel title="Features and deliverables">
          <div className="grid gap-5 md:grid-cols-2">
            <TextAreaField name="features" label="Features (one per line)" defaultValue={service?.features.join('\n')} rows={7} />
            <TextAreaField name="deliverables" label="Deliverables (one per line)" defaultValue={service?.deliverables.join('\n')} rows={7} />
          </div>
        </Panel>
        <Panel title="Price and timeline" description="Prices stay private until you tick “Show price on the website”. They are starting points used for indicative estimates.">
          <div className="grid gap-5 md:grid-cols-2">
            <TextField name="priceFrom" label="Starting price" defaultValue={minorToMajorString(service?.priceFrom)} inputMode="decimal" placeholder="e.g. 1500" />
            <TextField name="priceTo" label="Upper price (optional)" defaultValue={minorToMajorString(service?.priceTo)} inputMode="decimal" />
            <SelectField name="currency" label="Currency" defaultValue={service?.currency ?? 'EUR'} options={SUPPORTED_CURRENCIES.map((c) => ({ value: c, label: c }))} />
            <SelectField
              name="priceUnit"
              label="Billed"
              defaultValue={service?.priceUnit ?? 'project'}
              options={[
                { value: 'project', label: 'Per project (one-off)' },
                { value: 'month', label: 'Per month' },
                { value: 'hour', label: 'Per hour' },
              ]}
            />
            <TextField name="timeline" label="Typical timeline" defaultValue={service?.timeline} maxLength={120} placeholder="e.g. 4–6 weeks" />
          </div>
          <CheckboxField className="mt-5" name="showPrice" label="Show price on the website" defaultChecked={service?.showPrice ?? false} />
        </Panel>
        <Panel title="Related services">
          <CheckboxListField name="relatedIds" label="Shown as “Often combined with”" options={others.map((o) => ({ value: o.id, label: o.name }))} defaultValues={relatedIds} />
        </Panel>
        <Panel title="Search engines">
          <SeoFields title={service?.seoTitle ?? ''} description={service?.seoDescription ?? ''} fallbackHint="Defaults to the service name." />
        </Panel>
      </div>
      <div className="space-y-6">
        <Panel title="Publishing">
          <PublishingFields status={service?.status ?? 'draft'} isSample={service?.isSample ?? false} />
          <div className="mt-6 flex flex-wrap gap-2">
            <SubmitButton>{service ? 'Save changes' : 'Create service'}</SubmitButton>
            {service?.status === 'published' && (
              <a href={`/services/${service.slug}`} target="_blank" rel="noopener" className="btn btn-quiet btn-sm">
                View
              </a>
            )}
          </div>
        </Panel>
        <Panel title="Presentation">
          <div className="space-y-5">
            <SelectField name="categoryId" label="Category" defaultValue={service?.categoryId ?? ''} options={[{ value: '', label: 'No category' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} />
            <SelectField name="icon" label="Icon" defaultValue={service?.icon ?? 'layout'} options={Object.keys(SERVICE_ICONS).map((k) => ({ value: k, label: k }))} />
            <ImageUploader name="imageId" label="Image (optional)" initial={image ? { id: image.id, src: image.src, width: image.width, height: image.height, alt: image.alt } : null} />
          </div>
        </Panel>
        {service && (
          <Panel title="Danger zone">
            <p className="mb-3 text-sm text-slate">Deleting removes the service from the website, offers and budget categories. Past inquiries keep its name.</p>
            <ActionButton action={deleteServiceAction} hidden={{ id: service.id }} label="Delete service" variant="danger" confirmMessage={`Delete “${service.name}”? This cannot be undone.`} />
          </Panel>
        )}
      </div>
    </ActionForm>
  )
}
