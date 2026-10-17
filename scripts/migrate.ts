import './_env'
import path from 'node:path'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { closeDb, getDb } from '@/lib/db'

async function main() {
  const migrationsFolder = path.join(process.cwd(), 'drizzle')
  console.log(`Applying migrations from ${migrationsFolder} ...`)
  await migrate(getDb(), { migrationsFolder })
  console.log('Migrations applied.')
}

main()
  .catch((error) => {
    console.error('Migration failed:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => closeDb())
