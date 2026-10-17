/**
 * Shared zod instance. The site's Content-Security-Policy does not allow
 * 'unsafe-eval', so zod's JIT fast path (which probes `new Function`) is
 * switched off before any schema is created. Import `z` from here, not 'zod'.
 */
import { z } from 'zod'

z.config({ jitless: true })

export { z }
