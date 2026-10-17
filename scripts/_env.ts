/**
 * Loads `.env` for command-line scripts (Next.js loads it automatically for the app).
 * Import this first in every script.
 */
import { existsSync } from 'node:fs'

for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) {
    try {
      process.loadEnvFile(file)
    } catch {
      // ignore malformed optional files
    }
  }
}
