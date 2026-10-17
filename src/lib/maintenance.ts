/**
 * Data-retention and housekeeping tasks. Run daily via Vercel Cron
 * (/api/cron/maintenance) or `npm run retention:purge` from any scheduler.
 */
import { and, isNotNull, lt, or } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { auditLogs, inquiries, passwordResetTokens, sessions } from '@/lib/db/schema'
import { purgeExpiredRateLimits } from '@/lib/security/rate-limit'
import { loadSettings } from '@/lib/settings'
import { SESSION_IDLE_MS } from '@/lib/auth/constants'

export type MaintenanceReport = {
  inquiriesDeleted: number
  auditLogsDeleted: number
  sessionsDeleted: number
  resetTokensDeleted: number
  rateLimitsDeleted: number
}

function monthsAgo(months: number): Date {
  const d = new Date()
  d.setUTCMonth(d.getUTCMonth() - months)
  return d
}

export async function runMaintenance(): Promise<MaintenanceReport> {
  const db = getDb()
  const settings = await loadSettings()
  const now = new Date()

  const inquiriesDeleted = await db
    .delete(inquiries)
    .where(lt(inquiries.createdAt, monthsAgo(settings.inquiryRetentionMonths)))
    .returning({ id: inquiries.id })

  const auditDeleted = await db
    .delete(auditLogs)
    .where(lt(auditLogs.createdAt, monthsAgo(settings.auditRetentionMonths)))
    .returning({ id: auditLogs.id })

  const sessionsDeleted = await db
    .delete(sessions)
    .where(or(lt(sessions.expiresAt, now), lt(sessions.lastSeenAt, new Date(now.getTime() - SESSION_IDLE_MS))))
    .returning({ id: sessions.id })

  const tokensDeleted = await db
    .delete(passwordResetTokens)
    .where(or(lt(passwordResetTokens.expiresAt, now), and(isNotNull(passwordResetTokens.usedAt))))
    .returning({ id: passwordResetTokens.id })

  const rateLimitsDeleted = await purgeExpiredRateLimits()

  return {
    inquiriesDeleted: inquiriesDeleted.length,
    auditLogsDeleted: auditDeleted.length,
    sessionsDeleted: sessionsDeleted.length,
    resetTokensDeleted: tokensDeleted.length,
    rateLimitsDeleted,
  }
}
