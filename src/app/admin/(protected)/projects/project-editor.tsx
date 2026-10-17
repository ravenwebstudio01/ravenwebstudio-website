import Link from 'next/link'
import { asc, eq } from 'drizzle-orm'
import { ActionButton, ActionForm, SubmitButton } from '@/components/admin/action-form'
import { PublishingFields, SeoFields, SlugField } from '@/components/admin/content-fields'
import { CheckboxField, CheckboxListField, SelectField, TextAreaField, TextField } from '@/components/admin/fields'
import { ImageUploader } from '@/components/admin/image-uploader'
import { Panel } from '@/components/admin/ui'
import { getDb } from '@/lib/db'
import { media, projectCategories, projects, services } from '@/lib/db/schema'
import { toMediaView } from '@/lib/media/view'
import {
  addProjectImageAction,
  deleteProjectAction,
  moveProjectImageAction,
  removeProjectImageAction,
  saveProjectAction,
  updateProjectImageAction,
} from './actions'
import { ProjectGallery } from './gallery'

type Project = typeof projects.$inferSelect

export async function ProjectEditor({
  project,
  serviceIds = [],
  gallery = [],
}: {
  project: Project | null
  serviceIds?: string[]
  gallery?: { mediaId: string; src: string; alt: string; caption: string }[]
}) {
  const db = getDb()
  const [categories, allServices, coverRow] = await Promise.all([
    db.select().from(projectCategories).orderBy(asc(projectCategories.displayOrder)),
    db.select({ id: services.id, name: services.name }).from(services).orderBy(asc(services.displayOrder)),
    project?.coverMediaId ? db.select().from(media).where(eq(media.id, project.coverMediaId)).limit(1) : Promise.resolve([]),
  ])
  const cover = toMediaView(coverRow[0] ?? null)

  return (
    <div className="space-y-6">
      <ActionForm action={saveProjectAction} className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        {project && <input type="hidden" name="id" value={project.id} />}
        <div className="space-y-6">
          <Panel title="Basics">
            <div className="space-y-5">
              <TextField name="title" label="Project title" defaultValue={project?.title} required maxLength={160} />
              <SlugField defaultValue={project?.slug ?? ''} prefix="/work/" />
              <TextAreaField name="summary" label="Short description" defaultValue={project?.summary} maxLength={300} rows={3} hint="Shown on project cards and as the page introduction." />
              <div className="grid gap-5 md:grid-cols-2">
                <SelectField name="categoryId" label="Category" defaultValue={project?.categoryId ?? ''} options={[{ value: '', label: 'No category' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} />
                <TextField name="completedOn" label="Completion date" type="date" defaultValue={project?.completedOn ?? ''} />
                <TextField name="projectUrl" label="Live website" type="url" defaultValue={project?.projectUrl} placeholder="https://" maxLength={500} />
              </div>
            </div>
          </Panel>
          <Panel title="Client" description="Publishing a client’s name requires their permission.">
            <div className="space-y-4">
              <TextField name="clientName" label="Client or business name" defaultValue={project?.clientName} maxLength={160} />
              <CheckboxField name="clientNameApproved" label="The client has approved showing their name" defaultChecked={project?.clientNameApproved ?? false} />
            </div>
          </Panel>
          <Panel title="Story">
            <div className="space-y-5">
              <TextAreaField name="goals" label="Goals" defaultValue={project?.goals} rows={5} mono hint="Markdown supported." />
              <TextAreaField name="description" label="Project description" defaultValue={project?.description} rows={10} mono hint="Markdown supported: ## headings, **bold**, - lists, [links](https://…)." />
              <div className="grid gap-5 md:grid-cols-2">
                <TextAreaField name="deliverables" label="Deliverables (one per line)" defaultValue={project?.deliverables.join('\n')} rows={6} />
                <TextAreaField name="technologies" label="Technologies (one per line)" defaultValue={project?.technologies.join('\n')} rows={6} />
              </div>
              <TextAreaField name="results" label="Results and measurable outcomes" defaultValue={project?.results} rows={5} mono hint="Only include figures you can verify." />
              <CheckboxField name="resultsVerified" label="These results are verified and approved for publication" defaultChecked={project?.resultsVerified ?? false} hint="Results stay hidden on the website until this is ticked." />
            </div>
          </Panel>
          <Panel title="Services provided">
            <CheckboxListField name="serviceIds" label="Linked services" options={allServices.map((s) => ({ value: s.id, label: s.name }))} defaultValues={serviceIds} />
          </Panel>
          <Panel title="Search engines">
            <SeoFields title={project?.seoTitle ?? ''} description={project?.seoDescription ?? ''} fallbackHint="Defaults to the project title." />
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Publishing">
            <PublishingFields status={project?.status ?? 'draft'} isSample={project?.isSample ?? false} />
            <CheckboxField className="mt-5" name="featured" label="Feature on the homepage" defaultChecked={project?.featured ?? false} />
            <div className="mt-6 flex flex-wrap gap-2">
              <SubmitButton>{project ? 'Save changes' : 'Create project'}</SubmitButton>
              {project && (
                <Link href={`/admin/projects/${project.id}/preview`} className="btn btn-quiet btn-sm">
                  Preview
                </Link>
              )}
            </div>
          </Panel>
          <Panel title="Cover image">
            <ImageUploader name="coverMediaId" label="Cover" initial={cover ? { id: cover.id, src: cover.src, width: cover.width, height: cover.height, alt: cover.alt } : null} />
          </Panel>
        </div>
      </ActionForm>

      {project && (
        <>
          <Panel title="Screenshots" description="Shown in the project gallery in this order.">
            <ProjectGallery
              projectId={project.id}
              images={gallery}
              addAction={addProjectImageAction}
              updateAction={updateProjectImageAction}
              removeAction={removeProjectImageAction}
              moveAction={moveProjectImageAction}
            />
          </Panel>
          <Panel title="Danger zone">
            <p className="mb-3 text-sm text-slate">Deleting removes the project and its page. Uploaded images stay in the media library.</p>
            <ActionButton action={deleteProjectAction} hidden={{ id: project.id }} label="Delete project" variant="danger" confirmMessage={`Delete “${project.title}”? This cannot be undone.`} />
          </Panel>
        </>
      )}
    </div>
  )
}
