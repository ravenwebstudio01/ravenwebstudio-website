'use client'

import { useId, useRef, useState } from 'react'

export type UploadedImage = { id: string; src: string; width: number; height: number; alt: string }

export async function uploadImage(file: File, alt: string): Promise<UploadedImage> {
  const body = new FormData()
  body.set('file', file)
  body.set('alt', alt)
  const res = await fetch('/api/admin/media', { method: 'POST', body, credentials: 'same-origin' })
  const json = (await res.json().catch(() => ({}))) as { error?: string } & Partial<UploadedImage>
  if (!res.ok || !json.id) throw new Error(json.error ?? 'Upload failed. Please try again.')
  return json as UploadedImage
}

/**
 * Uploads an image immediately and stores the resulting media id in a hidden
 * input called `name`, so the surrounding form saves only the reference.
 */
export function ImageUploader({
  name,
  label,
  initial,
  hint = 'JPEG, PNG, WebP, AVIF or GIF up to 4 MB. Images are resized and converted automatically.',
}: {
  name: string
  label: string
  initial?: UploadedImage | null
  hint?: string
}) {
  const id = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [image, setImage] = useState<UploadedImage | null>(initial ?? null)
  const [alt, setAlt] = useState(initial?.alt ?? '')
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error'>('idle')
  const [error, setError] = useState('')

  async function onFile(file: File | undefined) {
    if (!file) return
    if (!alt.trim()) {
      setStatus('error')
      setError('Describe the image first (alternative text) so it is accessible.')
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    setStatus('uploading')
    setError('')
    try {
      const uploaded = await uploadImage(file, alt.trim())
      setImage(uploaded)
      setStatus('idle')
    } catch (e) {
      setStatus('error')
      setError((e as Error).message)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <fieldset className="rounded-[var(--radius-control)] border border-line p-4">
      <legend className="px-1 text-[0.9375rem] font-semibold">{label}</legend>
      <input type="hidden" name={name} value={image?.id ?? ''} />
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex h-28 w-40 flex-none items-center justify-center overflow-hidden rounded-[var(--radius-control)] bg-mist">
          {image ? <img src={image.src} alt={image.alt} className="h-full w-full object-cover" /> : <span className="text-sm text-slate">No image</span>}
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <label htmlFor={`${id}-alt`} className="field-label">
              Alternative text
            </label>
            <input
              id={`${id}-alt`}
              className="input"
              value={alt}
              maxLength={300}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="What does the image show?"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="btn btn-quiet btn-sm cursor-pointer">
              {status === 'uploading' ? 'Uploading…' : image ? 'Replace image' : 'Upload image'}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                className="sr-only"
                disabled={status === 'uploading'}
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>
            {image && (
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setImage(null)}>
                Remove
              </button>
            )}
          </div>
          <p className="field-hint">{hint}</p>
          {status === 'error' && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
        </div>
      </div>
    </fieldset>
  )
}
