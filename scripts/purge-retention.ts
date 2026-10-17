import './_env'
import { closeDb } from '@/lib/db'
import { runMaintenance } from '@/lib/maintenance'

runMaintenance()
  .then((report) => console.log('Maintenance complete:', JSON.stringify(report)))
  .catch((error) => {
    console.error('Maintenance failed:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => closeDb())
