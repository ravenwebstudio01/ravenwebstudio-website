/** Helpers to read typed values from dashboard form submissions. */
import { parseMajorToMinor, parsePercentToBasisPoints } from '@/lib/money'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function str(fd: FormData, key: string): string {
  const v = fd.get(key)
  return typeof v === 'string' ? v.trim() : ''
}

export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key)
  return v === 'on' || v === 'true' || v === '1'
}

export function lines(fd: FormData, key: string): string[] {
  return str(fd, key)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
}

export function ids(fd: FormData, key: string): string[] {
  return [...new Set(fd.getAll(key).filter((v): v is string => typeof v === 'string' && UUID_RE.test(v)))]
}

export function optionalId(fd: FormData, key: string): string | null {
  const v = str(fd, key)
  return UUID_RE.test(v) ? v : null
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

/** Money in major units → minor units; null when empty, NaN when invalid. */
export function money(fd: FormData, key: string): number | null {
  return parseMajorToMinor(str(fd, key))
}

export function percent(fd: FormData, key: string): number | null {
  return parsePercentToBasisPoints(str(fd, key))
}

export function int(fd: FormData, key: string): number | null {
  const v = str(fd, key)
  if (v === '') return null
  return /^-?\d{1,9}$/.test(v) ? Number(v) : Number.NaN
}

/** yyyy-mm-dd → Date at 00:00 UTC (start) or the following midnight (inclusive end). */
export function dateUtc(fd: FormData, key: string, mode: 'start' | 'end'): Date | null {
  const v = str(fd, key)
  if (!v) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(Number.NaN)
  const d = new Date(`${v}T00:00:00Z`)
  if (mode === 'end') d.setUTCDate(d.getUTCDate() + 1)
  return d
}

export function toDateInput(value: Date | null | undefined, mode: 'start' | 'end'): string {
  if (!value) return ''
  const d = new Date(value)
  if (mode === 'end') d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}
