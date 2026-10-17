import type { Metadata } from 'next'
import { desc } from 'drizzle-orm'
import { ActionButton, ActionForm, SubmitButton } from '@/components/admin/action-form'
import { PageHeader } from '@/components/admin/ui'
import { requireAdminPage } from '@/lib/auth/guards'
import { getDb } from '@/lib/db'
import { media } from '@/lib/db/schema'
import { toMediaView } from '@/lib/media/view'
import { formatDate } from '@/lib/utils'
import { deleteMediaAction, updateAltAction } from './actions'

export const metadata: Metadata = { title: 'Media library' }

export default async function MediaPage() {
  await requireAdminPage('content:manage')
  const rows = await getDb().select().from(media).orderBy(desc(media.createdAt)).limit(200)
  return (
    <>
      <PageHeader title="Media library" description="All uploaded images. Uploads happen on the project, service and settings pages; images are converted to WebP in several sizes." />
      {rows.length === 0 ? (
        <p className="rounded-[var(--radius-panel)] border border-dashed border-line bg-paper p-8 text-slate">No images uploaded yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const view = toMediaView(row)
            return (
              <li key={row.id} className="rounded-[var(--radius-panel)] border border-line bg-paper p-4">
                {view && <img src={view.src} alt={view.alt} className="aspect-[4/3] w-full rounded object-cover" loading="lazy" />}
                <p className="mt-2 truncate text-sm text-slate" title={row.originalName}>
                  {row.originalName || 'Image'} · {row.width}×{row.height} · {formatDate(row.createdAt)}
                </p>
                <ActionForm action={updateAltAction} className="mt-3 space-y-2">
                  <input type="hidden" name="id" value={row.id} />
                  <label className="block text-sm font-semibold">
                    Alternative text
                    <input name="alt" defaultValue={row.altText} maxLength={300} className="input mt-1" />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <SubmitButton variant="quiet">Save</SubmitButton>
                    <ActionButton action={deleteMediaAction} hidden={{ id: row.id }} label="Delete" confirmMessage="Delete this image permanently?" />
                  </div>
                </ActionForm>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
