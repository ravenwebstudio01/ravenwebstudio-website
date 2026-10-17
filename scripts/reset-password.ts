/**
 * Reset a dashboard user's password from the command line and sign them out
 * everywhere. Useful when e-mail delivery is not configured.
 *
 *   npm run admin:reset-password -- --email you@example.com
 */
import './_env'
import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { closeDb, getDb } from '@/lib/db'
import { sessions, users } from '@/lib/db/schema'
import { hashPassword, passwordProblems } from '@/lib/auth/password'
import { normaliseEmail } from '@/lib/auth/login'
import { audit } from '@/lib/audit'
import { parseArgs, prompt, promptHidden } from './_prompt'

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const email = normaliseEmail(args.email ?? (await prompt('E-mail: ')))
  const db = getDb()
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user) throw new Error(`No user with ${email}.`)

  let password = process.env.NEW_PASSWORD ?? ''
  let generated = false
  if (!password && process.stdin.isTTY) {
    password = await promptHidden('New password (leave empty to generate): ')
    if (password && (await promptHidden('Repeat password: ')) !== password) throw new Error('Passwords do not match.')
  }
  if (!password) {
    password = randomBytes(18).toString('base64url')
    generated = true
  }
  const problems = passwordProblems(password, { email, name: user.name })
  if (problems.length > 0) throw new Error(`Password rejected: ${problems.join(' ')}`)

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        passwordHash: await hashPassword(password),
        passwordChangedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
        isActive: args.activate === 'true' ? true : user.isActive,
      })
      .where(eq(users.id, user.id))
    await tx.delete(sessions).where(eq(sessions.userId, user.id))
  })
  await audit({ actor: null, action: 'user.password_reset_cli', entityType: 'user', entityId: user.id })
  console.log(`Password updated for ${email}; all sessions were signed out.`)
  if (generated) console.log(`\nGenerated password (shown once):\n  ${password}\n`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => closeDb())
