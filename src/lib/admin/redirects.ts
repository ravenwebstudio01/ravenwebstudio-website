import { eq } from 'drizzle-orm'
import type { Db } from '@/lib/db'
import { redirects } from '@/lib/db/schema'

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/**
 * Records a permanent redirect when a published page changes its URL, and
 * re-points older redirects so visitors never follow a chain.
 */
export async function recordSlugChange(tx: Tx, fromPath: string, toPath: string): Promise<void> {
  if (fromPath === toPath) return
  await tx.update(redirects).set({ toPath }).where(eq(redirects.toPath, fromPath))
  await tx
    .insert(redirects)
    .values({ fromPath, toPath, permanent: true, note: 'Created automatically when the URL changed' })
    .onConflictDoUpdate({ target: redirects.fromPath, set: { toPath, permanent: true } })
}

/** A live page must never be shadowed by an old redirect from the same path. */
export async function clearRedirectFrom(tx: Tx, path: string): Promise<void> {
  await tx.delete(redirects).where(eq(redirects.fromPath, path))
}
