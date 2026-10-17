import type { Metadata } from 'next'
import { asc } from 'drizzle-orm'
import { ActionButton, ActionForm, SubmitButton } from '@/components/admin/action-form'
import { TextField } from '@/components/admin/fields'
import { MoveButtons } from '@/components/admin/list-controls'
import { PageHeader, Panel } from '@/components/admin/ui'
import { requireAdminPage } from '@/lib/auth/guards'
import { getDb } from '@/lib/db'
import { projectCategories, serviceCategories } from '@/lib/db/schema'
import { deleteCategoryAction, saveCategoryAction } from './actions'

export const metadata: Metadata = { title: 'Categories' }

type Category = { id: string; name: string; slug: string; description: string }

function CategoryList({ kind, rows, table }: { kind: 'service' | 'project'; rows: Category[]; table: string }) {
  return (
    <div className="space-y-4">
      {rows.length === 0 && <p className="text-sm text-slate">No categories yet.</p>}
      <ul className="space-y-3">
        {rows.map((c, i) => (
          <li key={c.id} className="rounded-[var(--radius-control)] border border-line p-4">
            <ActionForm action={saveCategoryAction} className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end">
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="id" value={c.id} />
              <TextField name="name" label="Name" defaultValue={c.name} maxLength={120} />
              <TextField name="slug" label="Slug" defaultValue={c.slug} maxLength={120} />
              <TextField name="description" label="Description" defaultValue={c.description} maxLength={500} />
              <SubmitButton variant="quiet">Save</SubmitButton>
            </ActionForm>
            <div className="mt-3 flex flex-wrap gap-2">
              <MoveButtons table={table} id={c.id} first={i === 0} last={i === rows.length - 1} />
              <ActionButton action={deleteCategoryAction} hidden={{ kind, id: c.id }} label="Delete" confirmMessage={`Delete category “${c.name}”?`} />
            </div>
          </li>
        ))}
      </ul>
      <ActionForm action={saveCategoryAction} resetOnSuccess className="grid gap-3 rounded-[var(--radius-control)] border border-dashed border-line p-4 md:grid-cols-[1fr_2fr_auto] md:items-end">
        <input type="hidden" name="kind" value={kind} />
        <TextField name="name" label="New category name" maxLength={120} />
        <TextField name="description" label="Description (optional)" maxLength={500} />
        <SubmitButton>Add category</SubmitButton>
      </ActionForm>
    </div>
  )
}

export default async function CategoriesPage() {
  await requireAdminPage('content:manage')
  const db = getDb()
  const [svc, proj] = await Promise.all([
    db.select().from(serviceCategories).orderBy(asc(serviceCategories.displayOrder), asc(serviceCategories.name)),
    db.select().from(projectCategories).orderBy(asc(projectCategories.displayOrder), asc(projectCategories.name)),
  ])
  return (
    <>
      <PageHeader title="Categories" description="Group services on the Services page and filter projects on the Work page." />
      <div className="space-y-6">
        <Panel title="Service categories">
          <CategoryList kind="service" rows={svc} table="serviceCategories" />
        </Panel>
        <Panel title="Portfolio categories">
          <CategoryList kind="project" rows={proj} table="projectCategories" />
        </Panel>
      </div>
    </>
  )
}
