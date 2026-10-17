/**
 * File storage for processed media.
 *
 * - `local`: files under STORAGE_LOCAL_DIR, served by /media/[...path]. For
 *   development and single-server (Docker/VPS) deployments with a persistent volume.
 * - `s3`: any S3-compatible bucket (Supabase Storage, Cloudflare R2, Scaleway,
 *   Hetzner, AWS) via signed requests. Required on serverless hosts such as Vercel.
 *
 * Only re-encoded images are ever stored (see src/lib/media/process.ts), under
 * random keys, so stored files can never be executed as server code.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { AwsClient } from 'aws4fetch'
import { env } from '@/lib/env'

export interface StorageDriver {
  readonly name: 'local' | 's3'
  put(key: string, body: Buffer, contentType: string): Promise<void>
  delete(key: string): Promise<void>
  publicUrl(key: string): string
}

export const MEDIA_KEY_PATTERN = /^media\/[0-9a-f-]{36}\/w\d{2,4}\.webp$/

export function assertSafeKey(key: string): void {
  if (!MEDIA_KEY_PATTERN.test(key)) throw new Error('Refusing to use an unexpected storage key.')
}

function localRoot(): string {
  // Runtime-only path: excluded from build-time file tracing.
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), env().STORAGE_LOCAL_DIR)
}

export function localPathForKey(key: string): string {
  assertSafeKey(key)
  const root = localRoot()
  const full = path.resolve(/* turbopackIgnore: true */ root, key)
  if (!full.startsWith(root + path.sep)) throw new Error('Path traversal blocked.')
  return full
}

const localDriver: StorageDriver = {
  name: 'local',
  async put(key, body) {
    const full = localPathForKey(key)
    await mkdir(path.dirname(full), { recursive: true })
    await writeFile(full, body, { mode: 0o640 })
  },
  async delete(key) {
    await rm(localPathForKey(key), { force: true })
  },
  publicUrl(key) {
    return `/${key}`
  },
}

export async function readLocalFile(key: string): Promise<Buffer | null> {
  try {
    return await readFile(localPathForKey(key))
  } catch {
    return null
  }
}

function s3Driver(): StorageDriver {
  const e = env()
  if (!e.S3_ENDPOINT || !e.S3_BUCKET || !e.S3_ACCESS_KEY_ID || !e.S3_SECRET_ACCESS_KEY || !e.MEDIA_PUBLIC_BASE_URL) {
    throw new Error(
      'S3 storage requires S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY and MEDIA_PUBLIC_BASE_URL.',
    )
  }
  const client = new AwsClient({
    accessKeyId: e.S3_ACCESS_KEY_ID,
    secretAccessKey: e.S3_SECRET_ACCESS_KEY,
    service: 's3',
    region: e.S3_REGION,
  })
  const base = `${e.S3_ENDPOINT.replace(/\/+$/, '')}/${encodeURIComponent(e.S3_BUCKET)}`
  const publicBase = e.MEDIA_PUBLIC_BASE_URL.replace(/\/+$/, '')
  return {
    name: 's3',
    async put(key, body, contentType) {
      assertSafeKey(key)
      const res = await client.fetch(`${base}/${key}`, {
        method: 'PUT',
        body: new Uint8Array(body),
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
      if (!res.ok) throw new Error(`Storage upload failed with status ${res.status}.`)
    },
    async delete(key) {
      assertSafeKey(key)
      const res = await client.fetch(`${base}/${key}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 404) throw new Error(`Storage delete failed with status ${res.status}.`)
    },
    publicUrl(key) {
      return `${publicBase}/${key}`
    },
  }
}

let cached: StorageDriver | undefined

export function storage(): StorageDriver {
  cached ??= env().STORAGE_DRIVER === 's3' ? s3Driver() : localDriver
  return cached
}

/** Public URL for a stored key, using the driver that stored it. */
export function mediaUrl(key: string, driver: string): string {
  if (driver === 's3') {
    const base = env().MEDIA_PUBLIC_BASE_URL?.replace(/\/+$/, '') ?? ''
    return `${base}/${key}`
  }
  return `/${key}`
}
