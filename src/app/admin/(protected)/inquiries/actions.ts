'use server'

import { eq } from 'drizzle-orm'
import type { ActionResult } from '@/lib/admin/action-result'
import { ValidationError } from '@/lib/admin/action-result'
import { optionalId, str } from '@/lib/admin/form-data'
import { runAction } from '@/lib/admin/run-action'
import { audit } from '@/lib/audit'
import { getDb } from '@/lib/db'
import { inquiries, inquiryNotes, inquiryStatus } from '@/lib/db/schema'

const STATUSES = inquiryStatus.enumValues

export async function updateInquiryStatusAction(fd: FormData): Promise<ActionResult> {
  return runAction('inquiries:manage', async (ctx) => {
    const id = optionalId(fd, 'id')
    const status = str(fd, 'status') as (typeof STATUSES)[number]
    if (!id || !STATUSES.includes(status)) throw new ValidationError('Choose a valid status.', { status: 'Choose a valid status.' })
    const updated = await getDb().update(inquiries).set({ status }).where(eq(inquiries.id, id)).returning({ id: inquiries.id })
    if (!updated.length) return { ok: false, message: 'Inquiry not found.' }
    await audit({ actor: ctx.actor, action: 'inquiry.status_changed', entityType: 'inquiry', entityId: id, details: { status }, ip: ctx.ip })
    return { ok: true, message: 'Status updated.' }
  })
}

export async function addInquiryNoteAction(fd: FormData): Promise<ActionResult> {
  return runAction('inquiries:manage', async (ctx) => {
    const id = optionalId(fd, 'id')
    const body = str(fd, 'body')
    if (!id) return { ok: false, message: 'Inquiry not found.' }
    if (body.length < 2) throw new ValidationError('Write a note first.', { body: 'Write a note first.' })
    if (body.length > 5000) throw new ValidationError('The note is too long.', { body: 'At most 5,000 characters.' })
    await getDb().insert(inquiryNotes).values({ inquiryId: id, authorId: ctx.user.id, authorName: ctx.user.name, body })
    await audit({ actor: ctx.actor, action: 'inquiry.note_added', entityType: 'inquiry', entityId: id, ip: ctx.ip })
    return { ok: true, message: 'Note added.' }
  })
}

export async function deleteInquiryAction(fd: FormData): Promise<ActionResult> {
  return runAction('inquiries:delete', async (ctx) => {
    const id = optionalId(fd, 'id')
    if (!id) return { ok: false, message: 'Inquiry not found.' }
    const deleted = await getDb().delete(inquiries).where(eq(inquiries.id, id)).returning({ reference: inquiries.reference })
    if (!deleted.length) return { ok: false, message: 'Inquiry not found.' }
    // Only the reference is logged — the personal data itself is gone.
    await audit({ actor: ctx.actor, action: 'inquiry.deleted', entityType: 'inquiry', entityId: id, details: { reference: deleted[0]!.reference }, ip: ctx.ip })
    return { ok: true, message: 'Inquiry and its notes were permanently deleted.', redirectTo: '/admin/inquiries' }
  })
}
