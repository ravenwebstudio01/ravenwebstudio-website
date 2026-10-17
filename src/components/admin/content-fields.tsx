import { CheckboxField, SelectField, TextAreaField, TextField } from './fields'

/** Publication status + sample flag, shared by every content type. */
export function PublishingFields({ status, isSample }: { status: string; isSample: boolean }) {
  return (
    <div className="space-y-5">
      <SelectField
        name="status"
        label="Status"
        defaultValue={status}
        options={[
          { value: 'draft', label: 'Draft — not visible on the website' },
          { value: 'published', label: 'Published — visible on the website' },
          { value: 'archived', label: 'Archived — hidden, kept for reference' },
        ]}
      />
      <CheckboxField
        name="isSample"
        label="Sample content"
        defaultChecked={isSample}
        hint="Placeholder created for development. Sample items are hidden on the live site; untick once the text is reviewed and true."
      />
    </div>
  )
}

export function SeoFields({ title, description, fallbackHint }: { title: string; description: string; fallbackHint: string }) {
  return (
    <div className="space-y-5">
      <TextField name="seoTitle" label="Search title" defaultValue={title} maxLength={70} hint={`Optional. ${fallbackHint} Aim for 50–60 characters.`} />
      <TextAreaField name="seoDescription" label="Search description" defaultValue={description} maxLength={170} rows={3} hint="Optional. Shown under the title in search results. Aim for 120–160 characters." />
    </div>
  )
}

export function SlugField({ defaultValue, prefix }: { defaultValue: string; prefix: string }) {
  return (
    <TextField
      name="slug"
      label="URL slug"
      defaultValue={defaultValue}
      maxLength={120}
      hint={`Address: ${prefix}<slug>. Leave empty to generate it from the name. Changing it later keeps old links working through a redirect.`}
    />
  )
}
