import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { and, eq, ne } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { sessions, users } from '@/lib/db/schema'
import { env, isProduction } from '@/lib/env'
import { pseudonymise, randomToken, sha256Hex } from '@/lib/security/crypto'
import type { Role } from './permissions'

import { SESSION_ABSOLUTE_MS, SESSION_IDLE_MS } from './constants'

export { SESSION_ABSOLUTE_MS, SESSION_IDLE_MS }
const TOUCH_INTERVAL_MS = 5 * 60_000

export type SessionUser = { id: string; email: string; name: string; role: Role }
export type SessionContext = { sessionId: string; user: SessionUser }

export function cookieSecure(): boolean {
  const v = env().COOKIE_SECURE
  if (v === 'true') return true
  if (v === 'false') return false
  return isProduction()
}

/** `__Host-` prefix pins the cookie to this exact host, HTTPS and path "/". */
export function sessionCookieName(): string {
  return cookieSecure() ? '__Host-rws_session' : 'rws_session'
}

export const SESSION_COOKIE_NAMES = ['__Host-rws_session', 'rws_session'] as const

export async function createSession(userId: string, meta: { ip: string; userAgent: string }): Promise<void> {
  const token = randomToken(32)
  const expiresAt = new Date(Date.now() + SESSION_ABSOLUTE_MS)
  await getDb()
    .insert(sessions)
    .values({
      id: sha256Hex(token),
      userId,
      expiresAt,
      ipHash: meta.ip === 'unknown' ? null : pseudonymise(meta.ip, 'ip'),
      userAgent: meta.userAgent.slice(0, 300),
    })
  const jar = await cookies()
  jar.set(sessionCookieName(), token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

async function readToken(): Promise<string | null> {
  const jar = await cookies()
  const token = jar.get(sessionCookieName())?.value
  if (!token || token.length > 128 || !/^[A-Za-z0-9_-]+$/.test(token)) return null
  return token
}

/** Current session for this request (deduplicated per request with React cache). */
export const getCurrentSession = cache(async (): Promise<SessionContext | null> => {
  const token = await readToken()
  if (!token) return null
  const id = sha256Hex(token)
  const db = getDb()
  const rows = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      lastSeenAt: sessions.lastSeenAt,
      userId: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .limit(1)
  const row = rows[0]
  if (!row) return null

  const now = Date.now()
  if (!row.isActive || row.expiresAt.getTime() <= now || row.lastSeenAt.getTime() + SESSION_IDLE_MS <= now) {
    await db.delete(sessions).where(eq(sessions.id, id))
    return null
  }
  if (now - row.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.update(sessions).set({ lastSeenAt: new Date(now) }).where(eq(sessions.id, id))
  }
  return {
    sessionId: row.sessionId,
    user: { id: row.userId, email: row.email, name: row.name, role: row.role },
  }
})

/** Ends the current session (server action / route handler only). */
export async function destroyCurrentSession(): Promise<void> {
  const token = await readToken()
  if (token) await getDb().delete(sessions).where(eq(sessions.id, sha256Hex(token)))
  const jar = await cookies()
  jar.delete(sessionCookieName())
}

export async function revokeUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
  const db = getDb()
  if (exceptSessionId) {
    await db.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId)))
  } else {
    await db.delete(sessions).where(eq(sessions.userId, userId))
  }
}
