import { env } from '@/lib/env'
import { MEDIA_KEY_PATTERN, readLocalFile } from '@/lib/storage'

export const dynamic = 'force-dynamic'

/**
 * Serves processed images for the `local` storage driver. Keys are strictly
 * validated (no path traversal) and files are always served as WebP images.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (env().STORAGE_DRIVER !== 'local') return new Response('Not found', { status: 404 })
  const { path } = await params
  const key = `media/${path.join('/')}`
  if (!MEDIA_KEY_PATTERN.test(key)) return new Response('Not found', { status: 404 })
  const file = await readLocalFile(key)
  if (!file) return new Response('Not found', { status: 404 })
  return new Response(new Uint8Array(file), {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    },
  })
}
