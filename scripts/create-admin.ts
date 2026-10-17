/**
 * Provision a dashboard user from the command line (there is no public sign-up).
 *
 *   npm run admin:create -- --email you@example.com --name "Your Name" [--role admin|editor]
 *
 * The password is read from a hidden prompt. In automated environments set
 * ADMIN_PASSWORD instead; it is never accepted as a command-line argument so it
 * does not end up in shell history.
 */
import './_env'
import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { closeDb, getDb } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { hashPassword, passwordProblems } from '@/lib/auth/password'
import { normaliseEmail } from '@/lib/auth/login'
import { audit } from '@/lib/audit'
import { parseArgs, prompt, promptHidden } from './_prompt'

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const email = normaliseEmail(args.email ?? process.env.ADMIN_EMAIL ?? (await prompt('E-mail: ')))
  const name = (args.name ?? process.env.ADMIN_NAME ?? (await prompt('Name: '))).trim() || 'Administrator'
  const role = (args.role ?? 'admin') as 'admin' | 'editor'
  if (!['admin', 'editor'].includes(role)) throw new Error('--role must be admin or editor')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('A valid e-mail address is required.')

  const db = getDb()
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing.length > 0) {
    if (args['if-missing'] === 'true') {
      console.log(`User ${email} already exists; nothing to do.`)
      return
    }
    throw new Error(`A user with ${email} already exists. Use npm run admin:reset-password instead.`)
  }

  let password = process.env.ADMIN_PASSWORD ?? ''
  let generated = false
  if (!password) {
    if (process.stdin.isTTY) {
      password = await promptHidden('Password (min 12 characters, leave empty to generate): ')
      if (password) {
        const confirm = await promptHidden('Repeat password: ')
        if (confirm !== password) throw new Error('Passwords do not match.')
      }
    }
    if (!password) {
      password = randomBytes(18).toString('base64url')
      generated = true
    }
  }
  const problems = passwordProblems(password, { email, name })
  if (problems.length > 0) throw new Error(`Password rejected: ${problems.join(' ')}`)

  const [created] = await db
    .insert(users)
    .values({ email, name, role, passwordHash: await hashPassword(password) })
    .returning({ id: users.id })
  await audit({ actor: null, action: 'user.created_cli', entityType: 'user', entityId: created!.id, details: { role } })

  console.log(`Created ${role} account for ${email}.`)
  if (generated) {
    console.log('\nGenerated password (shown once, store it in your password manager):')
    console.log(`  ${password}\n`)
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => closeDb())
