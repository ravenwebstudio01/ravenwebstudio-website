/** PostgreSQL error code, unwrapping Drizzle's query error wrapper when present. */
export function pgErrorCode(error: unknown): string | undefined {
  let current: unknown = error
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth++) {
    const code = (current as { code?: unknown }).code
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code
    current = (current as { cause?: unknown }).cause
  }
  return undefined
}

export function isUniqueViolation(error: unknown): boolean {
  return pgErrorCode(error) === '23505'
}

export function isForeignKeyViolation(error: unknown): boolean {
  return pgErrorCode(error) === '23503'
}

/** Name of the violated constraint, if PostgreSQL reported one. */
export function pgConstraint(error: unknown): string | undefined {
  let current: unknown = error
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth++) {
    const constraint = (current as { constraint?: unknown }).constraint
    if (typeof constraint === 'string') return constraint
    current = (current as { cause?: unknown }).cause
  }
  return undefined
}
