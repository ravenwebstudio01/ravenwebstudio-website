'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ActionButton, ActionForm, SubmitButton } from '@/components/admin/action-form'
import { uploadImage } from '@/components/admin/image-uploader'
import type { ActionResult } from '@/lib/admin/action-result'

type GalleryImage = { mediaId: string; src: string; alt: string; caption: string }

export function ProjectGallery({
  projectId,
  images,
  addAction,
  updateAction,
  removeAction,
  moveAction,
}: {
  projectId: string
  images: GalleryImage[]
  addAction: (fd: FormData) => Promise<ActionResult>
  updateAction: (fd: FormData) => Promise<ActionResult>
  removeAction: (fd: FormData) => Promise<ActionResult>
  moveAction: (fd: FormData) => Promise<ActionResult>
}) {
  const router = useRouter()
  const [alt, setAlt] = useState('')
  const [caption, setCaption] = useState('')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()

  function onFile(file: File | undefined, input: HTMLInputElement) {
    if (!file) return
    if (!alt.trim()) {
      setError('Describe the screenshot first (alternative text).')
      input.value = ''
      return
    }
    setError('')
    start(async () => {
      try {
        const uploaded = await uploadImage(file, alt.trim())
        const fd = new FormData()
        fd.set('projectId', projectId)
        fd.set('mediaId', uploaded.id)
        fd.set('caption', caption)
        const res = await addAction(fd)
        if (!res.ok) setError(res.message)
        else {
          setAlt('')
          setCaption('')
          router.refresh()
        }
      } catch (e) {
        setError((e as Error).message)
      } finally {
        input.value = ''
      }
    })
  }

  return (
    <div className="space-y-6">
      {images.length === 0 ? (
        <p className="text-sm text-slate">No screenshots yet.</p>
      ) : (
        <ol className="space-y-4">
          {images.map((img, i) => (
            <li key={img.mediaId} className="grid gap-4 rounded-[var(--radius-control)] border border-line p-4 md:grid-cols-[9rem_1fr]">
              <img src={img.src} alt={img.alt} className="h-24 w-36 rounded object-cover" />
              <div>
                <ActionForm action={updateAction} className="grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="mediaId" value={img.mediaId} />
                  <label className="text-sm font-semibold">
                    Alternative text
                    <input name="alt" defaultValue={img.alt} maxLength={300} className="input mt-1" />
                  </label>
                  <label className="text-sm font-semibold">
                    Caption (optional)
                    <input name="caption" defaultValue={img.caption} maxLength={200} className="input mt-1" />
                  </label>
                  <div className="flex flex-wrap items-center gap-2 md:col-span-2">
                    <SubmitButton variant="quiet">Save details</SubmitButton>
                    {i > 0 && <ActionButton action={moveAction} hidden={{ projectId, mediaId: img.mediaId, direction: 'up' }} label="↑" title="Move up" />}
                    {i < images.length - 1 && <ActionButton action={moveAction} hidden={{ projectId, mediaId: img.mediaId, direction: 'down' }} label="↓" title="Move down" />}
                    <ActionButton action={removeAction} hidden={{ projectId, mediaId: img.mediaId }} label="Remove" confirmMessage="Remove this screenshot from the project?" />
                  </div>
                </ActionForm>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="rounded-[var(--radius-control)] border border-dashed border-line p-4">
        <p className="font-semibold">Add a screenshot</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm font-semibold">
            Alternative text (required)
            <input value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={300} className="input mt-1" placeholder="e.g. Homepage on a phone" />
          </label>
          <label className="text-sm font-semibold">
            Caption (optional)
            <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={200} className="input mt-1" />
          </label>
        </div>
        <label className="btn btn-quiet btn-sm mt-3 cursor-pointer">
          {pending ? 'Uploading…' : 'Choose image'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            className="sr-only"
            disabled={pending}
            onChange={(e) => onFile(e.target.files?.[0], e.target)}
          />
        </label>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
