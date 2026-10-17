import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool, type PoolConfig } from 'pg'
import { env } from '@/lib/env'
import * as schema from './schema'

export type Db = NodePgDatabase<typeof schema>

declare global {
  var __rwsPool: Pool | undefined
  var __rwsDb: Db | undefined
}

function sslConfig(): PoolConfig['ssl'] {
  const e = env()
  switch (e.DATABASE_SSL) {
    case 'disable':
      return undefined
    case 'require':
      // Encrypted connection without certificate verification. Prefer `verify`
      // with DATABASE_CA_CERT when your provider publishes its CA.
      return { rejectUnauthorized: false }
    case 'verify':
      return e.DATABASE_CA_CERT
        ? { rejectUnauthorized: true, ca: e.DATABASE_CA_CERT.replace(/\\n/g, '\n') }
        : { rejectUnauthorized: true }
  }
}

export function getPool(): Pool {
  if (!globalThis.__rwsPool) {
    const url = env().DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not configured.')
    globalThis.__rwsPool = new Pool({
      connectionString: url,
      max: env().DATABASE_POOL_MAX,
      ssl: sslConfig(),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    })
  }
  return globalThis.__rwsPool
}

/** Lazily created Drizzle client (safe to import at build time). */
export function getDb(): Db {
  if (!globalThis.__rwsDb) {
    globalThis.__rwsDb = drizzle({ client: getPool(), schema })
  }
  return globalThis.__rwsDb
}

export async function closeDb() {
  if (globalThis.__rwsPool) {
    await globalThis.__rwsPool.end()
    globalThis.__rwsPool = undefined
    globalThis.__rwsDb = undefined
  }
}

export { schema }
