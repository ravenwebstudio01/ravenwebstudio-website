import type { MediaVariant } from '@/lib/db/schema'
import { mediaUrl } from '@/lib/storage'

export type MediaRow = {
  id: string
  altText: string
  width: number
  height: number
  variants: MediaVariant[]
  storageDriver: string
}

export type MediaView = {
  id: string
  alt: string
  width: number
  height: number
  src: string
  srcSet: string
}

export function toMediaView(row: MediaRow | null | undefined, altOverride?: string): MediaView | null {
  if (!row || row.variants.length === 0) return null
  const sorted = [...row.variants].sort((a, b) => a.width - b.width)
  const largest = sorted[sorted.length - 1]!
  const mid = sorted.find((v) => v.width >= 960) ?? largest
  return {
    id: row.id,
    alt: altOverride ?? row.altText,
    width: largest.width,
    height: largest.height,
    src: mediaUrl(mid.key, row.storageDriver),
    srcSet: sorted.map((v) => `${mediaUrl(v.key, row.storageDriver)} ${v.width}w`).join(', '),
  }
}
