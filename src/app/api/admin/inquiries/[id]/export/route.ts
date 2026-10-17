import { eq } from 'drizzle-orm'
import { audit } from '@/lib/audit'
import { can } from '@/lib/auth/permissions'
import { getCurrentSession } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { inquiries, inquiryNotes, inquiryServices } from '@/lib/db/schema'
import { clientIpFromHeaders } from '@/lib/request'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Data-subject access export (GDPR Art. 15/20): everything stored about one inquiry. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession()
  if (!session || !can(session.user.role, 'inquiries:read')) return new Response('Not found', { status: 404 })
  const { id } = await params
  if (!UUID_RE.test(id)) return new Response('Not found', { status: 404 })
  const db = getDb()
  const [inquiry] = await db.select().from(inquiries).where(eq(inquiries.id, id)).limit(1)
  if (!inquiry) return new Response('Not found', { status: 404 })
  const [services, notes] = await Promise.all([
    db.select({ name: inquiryServices.serviceName, kind: inquiryServices.kind }).from(inquiryServices).where(eq(inquiryServices.inquiryId, id)),
    db.select({ body: inquiryNotes.body, createdAt: inquiryNotes.createdAt, author: inquiryNotes.authorName }).from(inquiryNotes).where(eq(inquiryNotes.inquiryId, id)),
  ])
  await audit({
    actor: { id: session.user.id, email: session.user.email },
    action: 'inquiry.exported',
    entityType: 'inquiry',
    entityId: id,
    ip: clientIpFromHeaders(request.headers),
  })
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), inquiry, services, internalNotes: notes }, null, 2)
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="inquiry-${inquiry.reference}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
