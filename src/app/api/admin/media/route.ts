import { randomUUID } from 'node:crypto'
import { audit } from '@/lib/audit'
import { can } from '@/lib/auth/permissions'
import { getCurrentSession } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { media } from '@/lib/db/schema'
import { MAX_UPLOAD_BYTES, MediaValidationError, processImage, sanitiseFileName } from '@/lib/media/process'
import { clientIpFromHeaders } from '@/lib/request'
import { hitRateLimit } from '@/lib/security/rate-limit'
import { storage } from '@/lib/storage'
import { toMediaView } from '@/lib/media/view'

export const dynamic = 'force-dynamic'

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

/** Same-origin check: blocks cross-site form posts (CSRF) to this endpoint. */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Cross-site requests are not allowed.' }, 403)
  const session = await getCurrentSession()
  if (!session) return json({ error: 'Your session has ended. Sign in again.' }, 401)
  if (!can(session.user.role, 'media:upload')) return json({ error: 'Your role cannot upload files.' }, 403)

  const limit = await hitRateLimit(`upload:user:${session.user.id}`, 60, 3600)
  if (!limit.allowed) return json({ error: 'Upload limit reached. Try again later.' }, 429)

  const declared = Number(request.headers.get('content-length') ?? '0')
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) return json({ error: 'The file is too large (maximum 4 MB).' }, 413)

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return json({ error: 'Upload could not be read.' }, 400)
  }
  const file = form.get('file')
  const alt = String(form.get('alt') ?? '').trim().slice(0, 300)
  if (!(file instanceof File)) return json({ error: 'Choose an image to upload.' }, 400)
  if (file.size > MAX_UPLOAD_BYTES) return json({ error: 'The file is too large (maximum 4 MB).' }, 413)
  if (!alt) return json({ error: 'Alternative text is required.' }, 400)

  const id = randomUUID()
  try {
    const processed = await processImage(Buffer.from(await file.arrayBuffer()), id)
    const driver = storage()
    for (const variant of processed.variants) {
      await driver.put(variant.key, variant.buffer, 'image/webp')
    }
    const variants = processed.variants.map(({ buffer: _buffer, ...v }) => v)
    const [row] = await getDb()
      .insert(media)
      .values({
        id,
        originalName: sanitiseFileName(file.name),
        altText: alt,
        width: processed.width,
        height: processed.height,
        bytes: variants.reduce((sum, v) => sum + v.bytes, 0),
        format: 'webp',
        variants,
        storageDriver: driver.name,
        createdBy: session.user.id,
      })
      .returning()
    await audit({
      actor: { id: session.user.id, email: session.user.email },
      action: 'media.uploaded',
      entityType: 'media',
      entityId: id,
      details: { variants: variants.length },
      ip: clientIpFromHeaders(request.headers),
    })
    const view = toMediaView(row!)!
    return json({ id, src: view.src, width: view.width, height: view.height, alt: view.alt })
  } catch (error) {
    if (error instanceof MediaValidationError) return json({ error: error.message }, 400)
    console.error('[media] upload failed', (error as Error).message)
    return json({ error: 'The image could not be processed. Try another file.' }, 500)
  }
}
