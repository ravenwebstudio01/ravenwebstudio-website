import { expect, test, type Page } from '@playwright/test'
import sharp from 'sharp'
import { ADMIN_EMAIL, expectNoSeriousA11yIssues, login, logout, waitForMail, watchConsole } from './helpers'

test.describe.configure({ mode: 'serial' })

const NOTIFY = 'studio-inbox@ravenwebstudio.test'
const CONTACT = 'hello@ravenwebstudio.test'

async function fillInquiry(page: Page, opts: { email: string; serviceLabel?: string; offerName?: string }) {
  await page.getByRole('textbox', { name: /^Name/ }).fill('Maria Keller')
  await page.getByRole('textbox', { name: /^E-mail/ }).fill(opts.email)
  await page.getByLabel('Company').fill('Keller Bau GmbH')
  await page.getByLabel('Country or market').selectOption('Germany')
  if (opts.serviceLabel) await page.getByRole('checkbox', { name: opts.serviceLabel, exact: true }).first().check()
  await page.getByLabel('Tell us about your project').fill('We need a new website for our construction company, with a project gallery and a contact form.')
  if (opts.offerName) await page.getByLabel('Offer you are interested in').selectOption({ label: opts.offerName })
  await page.getByRole('checkbox', { name: /I have read the/ }).check()
}

test.describe('administration and inquiry flows', () => {
  test('rejects a wrong password with a neutral message', async ({ page }) => {
    await page.goto('/admin/login')
    await page.getByLabel('E-mail address').fill(ADMIN_EMAIL)
    await page.getByLabel('Password').fill('definitely-not-the-password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toContainText('E-mail address or password is incorrect.')
  })

  test('login page is accessible', async ({ page }) => {
    await page.goto('/admin/login')
    await expectNoSeriousA11yIssues(page, '/admin/login')
  })

  test('administrator updates business settings and the footer reflects them', async ({ page }) => {
    const errors = watchConsole(page)
    await login(page)
    await expectNoSeriousA11yIssues(page, '/admin')
    await page.goto('/admin/settings')
    await page.getByLabel('Public contact e-mail').fill(CONTACT)
    await page.getByLabel('Send new inquiries to').fill(NOTIFY)
    await page.getByLabel('Registered legal name').fill('Example Legal Name (test)')
    await page.getByRole('button', { name: 'Save settings' }).click()
    await expect(page.getByRole('status')).toContainText('Settings saved.')
    await page.goto('/')
    await expect(page.locator('footer')).toContainText(CONTACT)
    expect(errors).toEqual([])
  })

  test('service prices stay hidden until shown, then appear publicly', async ({ page }) => {
    await login(page)
    await page.goto('/admin/services')
    await page.getByRole('link', { name: 'Business websites' }).click()
    await page.getByLabel('Starting price').fill('2400')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('status')).toContainText('Service saved.')
    await page.goto('/services/business-websites')
    await expect(page.getByText('Quoted after a short brief')).toBeVisible()
    await page.goto('/admin/services')
    await page.getByRole('link', { name: 'Business websites' }).click()
    await page.getByLabel('Show price on the website').check()
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('status')).toContainText('Service saved.')
    await page.goto('/services/business-websites')
    await expect(page.getByText('From €2,400').first()).toBeVisible()
  })

  test('budget ranges are editable and shown only when enabled', async ({ page }) => {
    await login(page)
    await page.goto('/admin/budgets')
    await page.getByRole('link', { name: 'Small business websites' }).click()
    await page.getByLabel('Minimum').fill('3000')
    await page.getByLabel('Maximum (optional)').fill('6000')
    await page.getByLabel('Show amounts on the website').check()
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('status')).toContainText('Budget category saved.')
    await page.goto('/pricing')
    await expect(page.getByText('€3,000–€6,000').first()).toBeVisible()
  })

  test('validation errors are reported next to the fields', async ({ page }) => {
    await login(page)
    await page.goto('/admin/budgets')
    await page.getByRole('link', { name: 'Entry-level projects' }).click()
    await page.getByLabel('Minimum').fill('5000')
    await page.getByLabel('Maximum (optional)').fill('1000')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('alert')).toContainText('Please correct the highlighted fields.')
    await expect(page.getByText('The maximum must be at least the minimum.')).toBeVisible()
    // The user's input is kept for correction.
    await expect(page.getByLabel('Minimum')).toHaveValue('5000')
  })

  test('portfolio: create, upload a cover, publish, preview and unpublish a project', async ({ page }) => {
    await login(page)
    await page.goto('/admin/projects/new')
    await page.getByLabel('Project title').fill('E2E Test Project')
    await page.getByLabel('Short description').fill('A project created by the automated test suite.')
    await page.getByRole('button', { name: 'Create project' }).click()
    await expect(page).toHaveURL(/\/admin\/projects\/[0-9a-f-]{36}$/)

    const png = await sharp({ create: { width: 1600, height: 1000, channels: 3, background: '#2e3552' } }).png().toBuffer()
    await page.getByLabel('Alternative text', { exact: true }).first().fill('Test cover image')
    await page.locator('input[type=file]').first().setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: png })
    await expect(page.locator('img[alt="Test cover image"]').first()).toBeVisible({ timeout: 20_000 })

    await page.getByLabel('Status').selectOption('published')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('status')).toContainText('Project saved.')

    await page.goto('/work')
    await expect(page.getByRole('heading', { name: 'E2E Test Project' })).toBeVisible()
    await page.getByRole('link', { name: /E2E Test Project/ }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E Test Project')
    await expect(page.locator('img[alt="Test cover image"]')).toBeVisible()

    await page.goto('/admin/projects')
    const row = page.getByRole('row', { name: /E2E Test Project/ })
    await row.getByRole('button', { name: 'Unpublish' }).click()
    await expect(row.getByRole('button', { name: 'Publish' })).toBeVisible()
    const res = await page.goto('/work/e2e-test-project')
    expect(res?.status()).toBe(404)

    await page.goto('/admin/projects')
    await page.getByRole('row', { name: /E2E Test Project/ }).getByRole('link', { name: 'Preview' }).click()
    await expect(page.getByText('Visitors cannot see this page yet.')).toBeVisible()
  })

  test('offers: create, publish, calculate discounts on the server', async ({ page }) => {
    await login(page)
    await page.goto('/admin/offers/new')
    await page.getByRole('textbox', { name: /^Name/ }).fill('E2E SEO bundle')
    await page.getByLabel('Summary').fill('Ten percent off technical SEO when ordered with a business website.')
    await page.getByLabel('Value').fill('10')
    await page.getByRole('group', { name: 'Required services (all must be ordered)' }).getByRole('checkbox', { name: 'Business websites' }).check()
    await page.getByRole('group', { name: 'Discounted services' }).getByRole('checkbox', { name: 'Technical SEO' }).check()
    await page.getByLabel('Status').selectOption('published')
    await page.getByLabel('Sample content').uncheck()
    await page.getByRole('button', { name: 'Create offer' }).click()
    await expect(page).toHaveURL(/\/admin\/offers\/[0-9a-f-]{36}$/)

    await page.goto('/offers')
    await expect(page.getByRole('heading', { name: 'E2E SEO bundle' })).toBeVisible()
    await expect(page.getByText('10% off').first()).toBeVisible()

    await page.goto('/admin/offers/calculator')
    const services = page.getByRole('group', { name: 'Services in the proposal' })
    await services.getByRole('checkbox', { name: 'Business websites' }).check()
    await services.getByRole('checkbox', { name: 'Technical SEO' }).check()
    await page.getByLabel(/Technical SEO \(EUR\)/).fill('1000')
    await page.getByRole('button', { name: 'Calculate' }).click()
    await expect(page.getByText('E2E SEO bundle: −€100')).toBeVisible()
    await expect(page.locator('tfoot')).toContainText('€3,300')
  })

  test('collaboration availability can be switched off', async ({ page }) => {
    await login(page)
    await page.goto('/admin/collaborations')
    await page.getByLabel('We are currently open to new collaborations').uncheck()
    await page.getByRole('button', { name: 'Save availability' }).click()
    await expect(page.getByRole('status')).toContainText('Availability updated.')
    await page.goto('/about')
    await expect(page.getByText('Not taking on new collaborations right now')).toBeVisible()
    await page.goto('/admin/collaborations')
    await page.getByLabel('We are currently open to new collaborations').check()
    await page.getByRole('button', { name: 'Save availability' }).click()
    await expect(page.getByRole('status')).toContainText('Availability updated.')
  })

  test('inquiry form validates in the browser', async ({ page }) => {
    await page.goto('/contact')
    await page.getByRole('button', { name: 'Send inquiry' }).click()
    const summary = page.getByRole('alert')
    await expect(summary).toContainText('Some details need your attention.')
    await expect(summary).toContainText('Enter your name.')
    await expect(summary).toContainText('Please confirm that you have read the privacy notice.')
  })

  test('visitor submits an inquiry with an estimate; studio and visitor receive e-mails', async ({ page }) => {
    const errors = watchConsole(page)
    await page.goto('/contact?offer=e2e-seo-bundle')
    await page.waitForTimeout(3500) // humans take longer than 3 s; the anti-bot timer requires it
    await fillInquiry(page, { email: 'maria@keller-bau.test', serviceLabel: 'Business websites', offerName: 'E2E SEO bundle' })
    await page.getByRole('button', { name: 'Show estimate' }).click()
    await expect(page.getByText('Indicative total')).toBeVisible()
    await page.getByRole('button', { name: 'Send inquiry' }).click()
    await expect(page.getByRole('heading', { name: /your inquiry is with us/ })).toBeVisible()
    const reference = (await page.locator('strong.tabular').textContent())?.trim()
    expect(reference).toMatch(/^RWS-\d{4}-[A-Z2-9]{5}$/)

    await waitForMail((subject, to) => subject.includes(reference!) && to.includes(NOTIFY))
    await waitForMail((subject, to) => subject.includes(reference!) && to.includes('maria@keller-bau.test'))
    expect(errors).toEqual([])

    await login(page)
    await page.goto('/admin/inquiries')
    await page.getByRole('link', { name: 'Maria Keller' }).first().click()
    await expect(page.getByText(reference!)).toBeVisible()
    await expect(page.getByText('Indicative estimate shown to the client')).toBeVisible()
    await expect(page.getByText('Sent', { exact: true }).first()).toBeVisible()
    await page.getByLabel('Change status').selectOption('contacted')
    await page.getByRole('button', { name: 'Update status' }).click()
    await expect(page.getByRole('status')).toContainText('Status updated.')
    await page.getByLabel('Add a note').fill('Called Maria, sending proposal next week.')
    await page.getByRole('button', { name: 'Add note' }).click()
    await expect(page.getByText('Called Maria, sending proposal next week.')).toBeVisible()
    const download = await page.request.get(page.url().replace('/admin/inquiries/', '/api/admin/inquiries/') + '/export')
    expect(download.status()).toBe(200)
    expect(await download.text()).toContain('maria@keller-bau.test')
  })

  test('editors manage content but cannot see inquiries, offers or users', async ({ page }) => {
    await login(page)
    await page.goto('/admin/users')
    await page.getByRole('textbox', { name: /^Name/ }).fill('Test Editor')
    await page.getByRole('textbox', { name: /^E-mail/ }).fill('editor@ravenwebstudio.test')
    await page.getByRole('button', { name: 'Create account' }).click()
    const message = await page.getByRole('status').textContent()
    const password = message?.match(/\(shown once\): (\S+)/)?.[1]
    expect(password).toBeTruthy()
    await logout(page)

    await login(page, 'editor@ravenwebstudio.test', password!)
    await expect(page.getByRole('link', { name: 'Inquiries' })).toHaveCount(0)
    await page.goto('/admin/inquiries')
    await expect(page).toHaveURL(/notice=forbidden/)
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/notice=forbidden/)
    await page.goto('/admin/services')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Services')
    await logout(page)
  })

  test('analytics loads only after consent and can be withdrawn', async ({ page }) => {
    await login(page)
    await page.goto('/admin/settings')
    await page.getByLabel('Google Analytics 4 measurement ID').fill('G-TEST123456')
    await page.getByRole('button', { name: 'Save settings' }).click()
    await expect(page.getByRole('status')).toContainText('Settings saved.')
    await logout(page)

    const gaRequests: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('googletagmanager.com')) gaRequests.push(r.url())
    })
    await page.goto('/')
    const banner = page.getByRole('region', { name: 'Analytics cookies' })
    await expect(banner).toBeVisible()
    await banner.getByRole('button', { name: 'Reject' }).click()
    await expect(banner).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole('region', { name: 'Analytics cookies' })).toHaveCount(0)
    expect(gaRequests).toEqual([])

    await page.getByRole('button', { name: 'Cookie settings' }).click()
    await page.getByRole('region', { name: 'Analytics cookies' }).getByRole('button', { name: 'Allow analytics' }).click()
    await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(1)

    await login(page)
    await page.goto('/admin/settings')
    await page.getByLabel('Google Analytics 4 measurement ID').fill('')
    await page.getByRole('button', { name: 'Save settings' }).click()
    await expect(page.getByRole('status')).toContainText('Settings saved.')
  })
})
