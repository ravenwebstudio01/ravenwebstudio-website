import { expect, test } from '@playwright/test'
import { expectNoSeriousA11yIssues, watchConsole } from './helpers'

const PAGES = [
  { path: '/', name: 'home', h1: /Business websites, built properly/ },
  { path: '/services', name: 'services', h1: /Services/ },
  { path: '/services/business-websites', name: 'service-detail', h1: /Business websites/ },
  { path: '/work', name: 'work', h1: /Work/ },
  { path: '/pricing', name: 'pricing', h1: /Project types and budgets/ },
  { path: '/offers', name: 'offers', h1: /Offers and bundles/ },
  { path: '/about', name: 'about', h1: /About RavenWebStudio/ },
  { path: '/contact', name: 'contact', h1: /Start a project/ },
  { path: '/privacy', name: 'privacy', h1: /Privacy notice/ },
  { path: '/cookies', name: 'cookies', h1: /Cookie policy/ },
  { path: '/legal-notice', name: 'legal-notice', h1: /Legal notice/ },
]

test.describe('public pages', () => {
  for (const p of PAGES) {
    test(`${p.path} renders without errors and is accessible`, async ({ page }) => {
      const errors = watchConsole(page)
      const response = await page.goto(p.path)
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(p.h1)
      await expect(page).toHaveTitle(/RavenWebStudio|Services|Work|Budgets|budgets|Offers|About|project|Privacy|Cookie|Legal/)
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
      expect(canonical).toBeTruthy()
      expect(await page.locator('h1').count()).toBe(1)
      await expectNoSeriousA11yIssues(page, p.path)
      expect(errors).toEqual([])
    })
  }

  test('main navigation reaches every section', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Main' }).first()
    for (const [label, url] of [
      ['Services', /\/services$/],
      ['Work', /\/work$/],
      ['Budgets', /\/pricing$/],
      ['Offers', /\/offers$/],
      ['About', /\/about$/],
    ] as const) {
      await nav.getByRole('link', { name: label, exact: true }).click()
      await expect(page).toHaveURL(url)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    }
    await page.getByRole('link', { name: 'Start a project' }).first().click()
    await expect(page).toHaveURL(/\/contact$/)
  })

  test('mobile menu opens and closes with Escape', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    const toggle = page.getByRole('button', { name: 'Open menu' })
    await toggle.click()
    await expect(page.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('link', { name: 'Services', exact: true }).filter({ visible: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false')
  })

  test('skip link moves keyboard focus to the main content', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to content' })
    await expect(skip).toBeFocused()
    await skip.press('Enter')
    await expect(page).toHaveURL(/#main$/)
  })

  test('portfolio shows an intentional empty state before projects are published', async ({ page }) => {
    await page.goto('/work')
    await expect(page.getByText('Case studies are on their way')).toBeVisible()
  })

  test('sample content is clearly labelled', async ({ page }) => {
    await page.goto('/services')
    await expect(page.getByText('Sample content').first()).toBeVisible()
  })

  test('unknown pages return a helpful 404', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist')
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('flown off')
    const project = await page.goto('/work/not-a-project')
    expect(project?.status()).toBe(404)
  })
})

test.describe('SEO and security headers', () => {
  test('robots.txt and sitemap.xml', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text()
    expect(robots).toContain('Disallow: /admin')
    expect(robots).toContain('Sitemap:')
    const sitemap = await (await request.get('/sitemap.xml')).text()
    expect(sitemap).toContain('/services/business-websites')
    expect(sitemap).not.toContain('/admin')
  })

  test('security headers and nonce-based CSP are sent', async ({ request }) => {
    const res = await request.get('/')
    const h = res.headers()
    expect(h['content-security-policy']).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/)
    expect(h['content-security-policy']).toContain("frame-ancestors 'none'")
    expect(h['x-content-type-options']).toBe('nosniff')
    expect(h['x-frame-options']).toBe('DENY')
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(h['x-powered-by']).toBeUndefined()
  })

  test('admin area is not indexable and requires a session', async ({ request }) => {
    const res = await request.get('/admin', { maxRedirects: 0 })
    expect([307, 308]).toContain(res.status())
    expect(res.headers()['location']).toContain('/admin/login')
    const login = await request.get('/admin/login')
    expect(login.headers()['x-robots-tag']).toContain('noindex')
  })

  test('protected APIs reject anonymous requests', async ({ request, baseURL }) => {
    const upload = await request.post('/api/admin/media', { headers: { origin: baseURL! }, multipart: { alt: 'x' } })
    expect(upload.status()).toBe(401)
    const crossSite = await request.post('/api/admin/media', { headers: { origin: 'https://evil.example' }, multipart: { alt: 'x' } })
    expect(crossSite.status()).toBe(403)
    const exportRes = await request.get('/api/admin/inquiries/00000000-0000-4000-8000-000000000000/export')
    expect(exportRes.status()).toBe(404)
    const cron = await request.get('/api/cron/maintenance')
    expect(cron.status()).toBe(401)
  })

  test('structured data describes the organisation', async ({ page }) => {
    await page.goto('/')
    const json = await page.locator('script[type="application/ld+json"]').first().textContent()
    const data = JSON.parse(json ?? '{}')
    expect(data['@type']).toBe('Organization')
    expect(data.name).toBe('RavenWebStudio')
  })
})

test.describe('visual snapshots for review', () => {
  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 820, height: 1180 },
    { name: 'mobile', width: 390, height: 844 },
  ]
  for (const vp of viewports) {
    test(`screenshots at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      for (const p of PAGES.slice(0, 8)) {
        await page.goto(p.path)
        await page.waitForLoadState('networkidle')
        await page.screenshot({ path: `reports/screenshots/${vp.name}-${p.name}.jpg`, fullPage: true, type: 'jpeg', quality: 55, animations: 'disabled' })
      }
    })
  }
})
