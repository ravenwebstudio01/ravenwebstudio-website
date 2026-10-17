import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { ActionButton, ActionForm, SubmitButton } from '@/components/admin/action-form'
import { CheckboxField, ItemsField, TextAreaField, TextField } from '@/components/admin/fields'
import { Notice, PageHeader, Panel } from '@/components/admin/ui'
import { requireAdminPage } from '@/lib/auth/guards'
import { resolveSection, sectionDefinition, type ContentItem } from '@/lib/content/registry'
import { getDb } from '@/lib/db'
import { contentBlocks } from '@/lib/db/schema'
import { resetContentAction, saveContentAction } from '../actions'

export const metadata: Metadata = { title: 'Edit page content' }

export default async function EditContentPage({ params }: { params: Promise<{ key: string }> }) {
  await requireAdminPage('content:manage')
  const { key } = await params
  const def = sectionDefinition(decodeURIComponent(key))
  if (!def) notFound()
  const [stored] = await getDb().select().from(contentBlocks).where(eq(contentBlocks.key, def.key)).limit(1)
  const values = resolveSection<Record<string, unknown>>(def, stored?.data)

  return (
    <>
      <PageHeader title={`${def.group}: ${def.label}`} back={{ href: '/admin/content', label: 'Page content' }} />
      {def.description && (
        <div className="mb-6">
          <Notice tone={def.group === 'Legal' ? 'warning' : 'info'}>{def.description}</Notice>
        </div>
      )}
      <Panel>
        <ActionForm action={saveContentAction} className="space-y-6">
          <input type="hidden" name="key" value={def.key} />
          {Object.entries(def.fields).map(([name, field]) => {
            switch (field.type) {
              case 'text':
                return <TextField key={name} name={name} label={field.label} defaultValue={String(values[name] ?? '')} maxLength={field.max} hint={field.help} required={!field.optional} />
              case 'textarea':
                return <TextAreaField key={name} name={name} label={field.label} defaultValue={String(values[name] ?? '')} maxLength={field.max} rows={field.rows} hint={field.help} required={!field.optional} />
              case 'markdown':
                return <TextAreaField key={name} name={name} label={field.label} defaultValue={String(values[name] ?? '')} maxLength={field.max} rows={field.rows ?? 12} hint={field.help ?? 'Markdown supported. HTML is not rendered.'} mono required={!field.optional} />
              case 'list':
                return <TextAreaField key={name} name={name} label={field.label} defaultValue={((values[name] as string[]) ?? []).join('\n')} rows={Math.max(3, field.maxItems)} hint={field.help ?? 'One per line.'} />
              case 'items':
                return <ItemsField key={name} name={name} label={field.label} defaultItems={(values[name] as ContentItem[]) ?? []} maxItems={field.maxItems} titleMax={field.titleMax} bodyMax={field.bodyMax} />
              case 'boolean':
                return <CheckboxField key={name} name={name} label={field.label} defaultChecked={Boolean(values[name])} hint={field.help} />
            }
          })}
          <SubmitButton>Save</SubmitButton>
        </ActionForm>
      </Panel>
      {stored && (
        <div className="mt-6">
          <ActionButton action={resetContentAction} hidden={{ key: def.key }} label="Restore default text" confirmMessage="Replace your text with the default version?" />
        </div>
      )}
    </>
  )
}
