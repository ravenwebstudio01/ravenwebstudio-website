/**
 * Image upload pipeline.
 *
 * The file type is detected from the decoded image (never from the browser's
 * MIME type or file name). Every upload is decoded and re-encoded to WebP at a
 * few responsive widths; metadata (EXIF/GPS) is stripped. SVG is rejected
 * because it can carry scripts.
 */
import sharp from 'sharp'
import type { MediaVariant } from '@/lib/db/schema'

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 // fits within serverless request limits
export const MAX_INPUT_PIXELS = 40_000_000
export const VARIANT_WIDTHS = [480, 960, 1440, 2048] as const
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'avif', 'gif', 'tiff', 'heif'])

export class MediaValidationError extends Error {}

export type ProcessedImage = {
  width: number
  height: number
  variants: (MediaVariant & { buffer: Buffer })[]
}

export async function processImage(input: Buffer, mediaId: string): Promise<ProcessedImage> {
  if (input.byteLength === 0) throw new MediaValidationError('The file is empty.')
  if (input.byteLength > MAX_UPLOAD_BYTES) {
    throw new MediaValidationError(`Images must be ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB or smaller.`)
  }

  let meta: sharp.Metadata
  try {
    meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata()
  } catch {
    throw new MediaValidationError('This file is not a supported image.')
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new MediaValidationError('Upload a JPEG, PNG, WebP, AVIF or GIF image.')
  }
  if (!meta.width || !meta.height) throw new MediaValidationError('Could not read the image dimensions.')

  // Width after applying EXIF orientation.
  const rotated = (meta.orientation ?? 1) >= 5
  const sourceWidth = rotated ? meta.height : meta.width

  const widths = VARIANT_WIDTHS.filter((w) => w < sourceWidth)
  widths.push(Math.min(sourceWidth, VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1]!))
  const unique = [...new Set(widths)].sort((a, b) => a - b)

  const variants: ProcessedImage['variants'] = []
  for (const width of unique) {
    const { data, info } = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, animated: false })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer({ resolveWithObject: true })
    variants.push({
      width: info.width,
      height: info.height,
      bytes: data.byteLength,
      key: `media/${mediaId}/w${info.width}.webp`,
      buffer: data,
    })
  }
  const largest = variants[variants.length - 1]!
  return { width: largest.width, height: largest.height, variants }
}

/** Removes path components and control characters from an uploaded file name. */
export function sanitiseFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? ''
  return base.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '').slice(0, 200)
}
