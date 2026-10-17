// CI secret checks:
// 1. Source files must not contain obvious credentials.
// 2. Client-side bundles must not contain server-side secret values.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

let failures = 0
const fail = (msg) => {
  failures++
  console.log(`FAIL ${msg}`)
}

function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    if (['node_modules', '.next', '.git', 'reports', 'storage'].includes(entry)) continue
    const full = path.join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) walk(full, exts, out)
    else if (exts.some((e) => full.endsWith(e))) out.push(full)
  }
  return out
}

const patterns = [
  { name: 'private key', re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'AWS access key', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'Stripe live key', re: /sk_live_[0-9a-zA-Z]{20,}/ },
  { name: 'GitHub token', re: /gh[pousr]_[A-Za-z0-9]{30,}/ },
  { name: 'Postgres URL with password', re: /postgres(ql)?:\/\/[^:\s'"]+:(?!postgres@|password@|\$\{)[^@\s'"]{6,}@(?!localhost|127\.0\.0\.1|db:|postgres:)/ },
]
const sourceFiles = walk('.', ['.ts', '.tsx', '.js', '.mjs', '.json', '.yml', '.yaml', '.md', '.env.example'])
for (const file of sourceFiles) {
  const text = readFileSync(file, 'utf8')
  for (const { name, re } of patterns) if (re.test(text)) fail(`${name} pattern in ${file}`)
}
console.log(`Scanned ${sourceFiles.length} source files.`)

const secretValues = ['SESSION_SECRET', 'DATABASE_URL', 'SMTP_PASSWORD', 'S3_SECRET_ACCESS_KEY', 'CRON_SECRET', 'ADMIN_PASSWORD']
  .map((k) => [k, process.env[k]])
  .filter(([, v]) => v && v.length >= 8)
const clientDir = '.next/static'
const clientFiles = walk(clientDir, ['.js', '.css', '.json', '.html'])
for (const file of clientFiles) {
  const text = readFileSync(file, 'utf8')
  for (const [key, value] of secretValues) if (text.includes(value)) fail(`${key} value found in client bundle ${file}`)
}
console.log(`Scanned ${clientFiles.length} client bundle files for ${secretValues.length} secret values.`)

if (failures > 0) {
  console.log(`${failures} problem(s) found.`)
  process.exit(1)
}
console.log('No secrets found.')
