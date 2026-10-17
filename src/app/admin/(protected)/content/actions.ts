'use server'

import { eq } from 'drizzle-orm'
import type { ActionResult } from '@/lib/admin/action-result'
import { str } from '@/lib/admin/form-data'
import { parseOrThrow, runAction } from '@/lib/admin/run-action'
import { audit } from '@/lib/audit'
import { sectionDefinition, sectionSchema } from '@/lib/content/registry'
import { getDb } from '@/lib/db'
import { contentBlocks } from '@/lib/db/schema'

export async function saveContentAction(fd: FormData): Promise<ActionResult> {
  return runAction('content:manage', async (ctx) => {
    const key = str(fd, 'key')
    const def = sectionDefinition(key)
    if (!def) return { ok: false, message: 'Unknown section.' }
    const raw: Record<string, unknown> = {}
    for (const [name, field] of Object.entries(def.fields)) {
      const value = fd.get(name)
      switch (field.type) {
        case 'list':
          raw[name] = String(value ?? '')
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
          break
        case 'items':
          try {
            raw[name] = JSON.parse(String(value ?? '[]'))
          } catch {
            raw[name] = []
          }
          break
        case 'boolean':
          raw[name] = value === 'on'
          break
        default:
          raw[name] = String(value ?? '').replace(/\r\n/g, '\n')
      }
    }
    const data = parseOrThrow(sectionSchema(def), raw) as Record<string, unknown>
    await getDb()
      .insert(contentBlocks)
      .values({ key, data, updatedBy: ctx.user.id })
      .onConflictDoUpdate({ target: contentBlocks.key, set: { data, updatedAt: new Date(), updatedBy: ctx.user.id } })
    await audit({ actor: ctx.actor, action: 'content_block.updated', entityType: 'content_block', entityId: key, ip: ctx.ip })
    return { ok: true, message: 'Saved. The website shows the new text immediately.' }
  })
}

export async function resetContentAction(fd: FormData): Promise<ActionResult> {
  return runAction('content:manage', async (ctx) => {
    const key = str(fd, 'key')
    if (!sectionDefinition(key)) return { ok: false, message: 'Unknown section.' }
    await getDb().delete(contentBlocks).where(eq(contentBlocks.key, key))
    await audit({ actor: ctx.actor, action: 'content_block.reset', entityType: 'content_block', entityId: key, ip: ctx.ip })
    return { ok: true, message: 'Restored the default text.' }
  })
}
