import 'server-only'
import { redirect } from 'next/navigation'
import { can, type Permission } from './permissions'
import { getCurrentSession, type SessionContext } from './session'

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

/** For admin pages (server components). Redirects instead of rendering protected data. */
export async function requireAdminPage(permission?: Permission): Promise<SessionContext> {
  const ctx = await getCurrentSession()
  if (!ctx) redirect('/admin/login')
  if (permission && !can(ctx.user.role, permission)) redirect('/admin?notice=forbidden')
  return ctx
}

/**
 * For server actions and route handlers. Every mutation calls this first, so
 * permissions are enforced on the server regardless of what the UI shows.
 */
export async function requireActionUser(permission: Permission): Promise<SessionContext> {
  const ctx = await getCurrentSession()
  if (!ctx) throw new AuthorizationError('Your session has ended. Sign in again to continue.')
  if (!can(ctx.user.role, permission)) throw new AuthorizationError('Your role does not allow this action.')
  return ctx
}
