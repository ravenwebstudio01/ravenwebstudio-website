import { expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@ravenwebstudio.test'
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'ci-Raven-Passphrase-2026'
export const MAILPIT = process.env.MAILPIT_API ?? 'http://localhost:8025'

/** Collects uncaught page errors and console errors (e.g. CSP violations). */
export function watchConsole(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`)
  })
  return errors
}

export async function login(page: Page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.goto('/admin/login')
  await page.getByLabel('E-mail address').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/admin\/login/)
}

export async function expectNoSeriousA11yIssues(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  const summary = serious.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).slice(0, 5).join(' | ')}`)
  expect(summary, `Accessibility issues on ${label}`).toEqual([])
}

export async function waitForMail(predicate: (subject: string, to: string[]) => boolean, timeoutMs = 15_000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const res = await fetch(`${MAILPIT}/api/v1/messages?limit=50`)
    if (res.ok) {
      const json = (await res.json()) as { messages?: { Subject: string; To: { Address: string }[] }[] }
      const hit = json.messages?.find((m) => predicate(m.Subject, m.To.map((t) => t.Address)))
      if (hit) return hit
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('Expected e-mail did not arrive in Mailpit')
}
