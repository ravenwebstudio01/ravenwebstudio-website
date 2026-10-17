/** Absolute session lifetime. */
export const SESSION_ABSOLUTE_MS = 7 * 24 * 3600_000
/** Sessions without activity for this long expire. */
export const SESSION_IDLE_MS = 12 * 3600_000
/** Password reset links are valid for this long. */
export const RESET_TOKEN_TTL_MS = 30 * 60_000
/** Failed attempts before temporary account throttling starts. */
export const LOCKOUT_THRESHOLD = 5
/** Maximum temporary lock (keeps attackers from locking admins out for long). */
export const LOCKOUT_MAX_MS = 15 * 60_000
