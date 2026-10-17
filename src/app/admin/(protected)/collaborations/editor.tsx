import { ActionButton, ActionForm, SubmitButton } from '@/components/admin/action-form'
import { PublishingFields, SlugField } from '@/components/admin/content-fields'
import { TextAreaField, TextField } from '@/components/admin/fields'
import { Panel } from '@/components/admin/ui'
import type { collaborationTypes } from '@/lib/db/schema'
import { deleteCollaborationAction, saveCollaborationAction } from './actions'

type Row = typeof collaborationTypes.$inferSelect

export function CollaborationEditor({ item }: { item: Row | null }) {
  return (
    <ActionForm action={saveCollaborationAction} className="grid gap-6 xl:grid-cols-[1fr_20rem]">
      {item && <input type="hidden" name="id" value={item.id} />}
      <Panel title="Details">
        <div className="space-y-5">
          <TextField name="name" label="Name" defaultValue={item?.name} required maxLength={120} />
          <SlugField defaultValue={item?.slug ?? ''} prefix="/contact?type=collaboration&collab=" />
          <TextAreaField name="summary" label="Summary" defaultValue={item?.summary} maxLength={300} rows={3} />
          <TextAreaField name="description" label="Description" defaultValue={item?.description} maxLength={10000} rows={8} mono hint="Markdown supported." />
        </div>
      </Panel>
      <div className="space-y-6">
        <Panel title="Publishing">
          <PublishingFields status={item?.status ?? 'draft'} isSample={item?.isSample ?? false} />
          <div className="mt-6">
            <SubmitButton>{item ? 'Save changes' : 'Create'}</SubmitButton>
          </div>
        </Panel>
        {item && (
          <Panel title="Danger zone">
            <ActionButton action={deleteCollaborationAction} hidden={{ id: item.id }} label="Delete" variant="danger" confirmMessage={`Delete “${item.name}”?`} />
          </Panel>
        )}
      </div>
    </ActionForm>
  )
}
