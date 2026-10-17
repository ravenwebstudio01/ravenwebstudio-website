/**
 * Audit log for security-relevant and content-changing actions.
 * Never put passwords, tokens or inquiry contents into `details`.
 */
import { getDb } from '@/lib/db'
import { auditLogs } from '@/lib/db/schema'
import { pseudonymise } from '@/lib/security/crypto'

export type AuditActor = { id: string; email: string } | null

export type AuditEntry = {
  actor: AuditActor
  action: string
  entityType?: string
  entityId?: string
  details?: Record<string, unknown>
  ip?: string
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await getDb()
      .insert(auditLogs)
      .values({
        actorId: entry.actor?.id ?? null,
        actorEmail: entry.actor?.email ?? '',
        action: entry.action,
        entityType: entry.entityType ?? '',
        entityId: entry.entityId ?? '',
        details: entry.details ?? {},
        ipHash: entry.ip && entry.ip !== 'unknown' ? pseudonymise(entry.ip, 'ip') : '',
      })
  } catch (error) {
    // Auditing must never break the user-facing action.
    console.error('[audit] failed to write audit entry', entry.action, (error as Error).message)
  }
}
