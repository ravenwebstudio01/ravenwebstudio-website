import 'server-only'
import type { z } from '@/lib/zod'
import { AuthorizationError, requireActionUser } from '@/lib/auth/guards'
import type { Permission } from '@/lib/auth/permissions'
import type { SessionContext } from '@/lib/auth/session'
import { isForeignKeyViolation, isUniqueViolation, pgConstraint } from '@/lib/db/errors'
import { requestMeta } from '@/lib/request'
import { ValidationError, type ActionResult } from './action-result'

export type ActionContext = SessionContext & { ip: string; actor: { id: string; email: string } }

/**
 * Wraps every dashboard mutation: checks the session and role on the server,
 * converts validation and database errors into friendly messages, and never
 * leaks stack traces to the browser.
 */
export async function runAction(permission: Permission, fn: (ctx: ActionContext) => Promise<ActionResult>): Promise<ActionResult> {
  try {
    const session = await requireActionUser(permission)
    const { ip } = await requestMeta()
    return await fn({ ...session, ip, actor: { id: session.user.id, email: session.user.email } })
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    if (error instanceof ValidationError) return { ok: false, message: error.message, fieldErrors: error.fieldErrors }
    if (isUniqueViolation(error)) {
      const constraint = pgConstraint(error) ?? ''
      const field = constraint.includes('slug') ? 'slug' : constraint.includes('email') ? 'email' : constraint.includes('code') ? 'code' : constraint.includes('from_path') ? 'fromPath' : 'form'
      return { ok: false, message: 'That value is already in use.', fieldErrors: { [field]: 'Already in use — choose another.' } }
    }
    if (isForeignKeyViolation(error)) {
      return { ok: false, message: 'This item is still referenced elsewhere and cannot be changed this way.' }
    }
    console.error('[admin action] failed:', (error as Error).message)
    return { ok: false, message: 'Something went wrong and nothing was saved. Please try again.' }
  }
}

export function parseOrThrow<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input)
  if (!result.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of result.error.issues) {
      const key = issue.path.map(String).join('.') || 'form'
      const top = String(issue.path[0] ?? 'form')
      if (!fieldErrors[top]) fieldErrors[top] = issue.message
      if (key !== top && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    throw new ValidationError('Please correct the highlighted fields.', fieldErrors)
  }
  return result.data
}
