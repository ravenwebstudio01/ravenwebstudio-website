import type { Metadata } from 'next'
import Link from 'next/link'
import { and, count, desc, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm'
import { Notice, PageHeader, Panel, StatusBadge } from '@/components/admin/ui'
import { requireAdminPage } from '@/lib/auth/guards'
import { can } from '@/lib/auth/permissions'
import { CONTENT_SECTIONS } from '@/lib/content/registry'
import { getDb } from '@/lib/db'
import { budgetTiers, collaborationTypes, contentBlocks, inquiries, offers, projects, services } from '@/lib/db/schema'
import { env, smtpConfigured } from '@/lib/env'
import { INQUIRY_TYPE_LABELS } from '@/lib/inquiries/schema'
import { loadSettings } from '@/lib/settings'
import { formatDateTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Dashboard' }

type Check = { label: string; ok: boolean; hint: string; href?: string; optional?: boolean }

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { user } = await requireAdminPage()
  const { notice } = await searchParams
  const db = getDb()
  const settings = await loadSettings()
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600_000)

  const [
    [openInquiries],
    [newThisWeek],
    [publishedServices],
    [publishedProjects],
    [activeOffers],
    sampleServices,
    sampleTiers,
    sampleCollabs,
    sampleProjects,
    legalBlocks,
    recent,
  ] = await Promise.all([
    db.select({ n: count() }).from(inquiries).where(inArray(inquiries.status, ['new', 'in_review', 'contacted', 'proposal_sent'])),
    db.select({ n: count() }).from(inquiries).where(gte(inquiries.createdAt, weekAgo)),
    db.select({ n: count() }).from(services).where(and(eq(services.status, 'published'), eq(services.isSample, false))),
    db.select({ n: count() }).from(projects).where(and(eq(projects.status, 'published'), eq(projects.isSample, false))),
    db
      .select({ n: count() })
      .from(offers)
      .where(and(eq(offers.status, 'published'), or(isNull(offers.endsAt), gte(offers.endsAt, now)), or(isNull(offers.startsAt), lte(offers.startsAt, now)))),
    db.select({ n: count() }).from(services).where(eq(services.isSample, true)),
    db.select({ n: count() }).from(budgetTiers).where(eq(budgetTiers.isSample, true)),
    db.select({ n: count() }).from(collaborationTypes).where(eq(collaborationTypes.isSample, true)),
    db.select({ n: count() }).from(projects).where(eq(projects.isSample, true)),
    db.select().from(contentBlocks).where(inArray(contentBlocks.key, ['legal.privacy', 'legal.cookies', 'legal.notice'])),
    can(user.role, 'inquiries:read')
      ? db
          .select({ id: inquiries.id, name: inquiries.name, company: inquiries.company, inquiryType: inquiries.inquiryType, status: inquiries.status, createdAt: inquiries.createdAt })
          .from(inquiries)
          .orderBy(desc(inquiries.createdAt))
          .limit(6)
      : Promise.resolve([]),
  ])

  const sampleTotal = (sampleServices[0]?.n ?? 0) + (sampleTiers[0]?.n ?? 0) + (sampleCollabs[0]?.n ?? 0) + (sampleProjects[0]?.n ?? 0)
  const reviewed = (key: string) => Boolean((legalBlocks.find((b) => b.key === key)?.data as { reviewed?: boolean } | undefined)?.reviewed)
  const e = env()
  const siteUrl = e.SITE_URL
  const checks: Check[] = [
    { label: 'Business details (legal name, address)', ok: Boolean(settings.legalName && settings.address), hint: 'Needed for the legal notice and privacy notice.', href: '/admin/settings' },
    { label: 'Public contact e-mail', ok: Boolean(settings.contactEmail), hint: 'Shown in the footer and on the contact page.', href: '/admin/settings' },
    { label: 'E-mail delivery (SMTP)', ok: smtpConfigured(), hint: 'Without it, inquiries are stored but nobody is notified.' },
    { label: 'Privacy notice reviewed', ok: reviewed('legal.privacy'), hint: 'Complete the template and tick “Reviewed”.', href: '/admin/content/legal.privacy' },
    { label: 'Cookie policy reviewed', ok: reviewed('legal.cookies'), hint: 'Must match the cookies actually used.', href: '/admin/content/legal.cookies' },
    { label: 'Legal notice reviewed', ok: reviewed('legal.notice'), hint: 'Required in several EU countries.', href: '/admin/content/legal.notice' },
    { label: 'Sample content reviewed', ok: sampleTotal === 0, hint: `${sampleTotal} sample item(s) left. They are hidden on the live site until reviewed.` },
    { label: 'At least one real published service', ok: (publishedServices?.n ?? 0) > 0, hint: 'Review a sample service and untick “Sample content”.', href: '/admin/services' },
    { label: 'Production address configured', ok: !/localhost|127\.0\.0\.1/.test(siteUrl), hint: `SITE_URL is ${siteUrl}.` },
    { label: 'Persistent image storage', ok: e.STORAGE_DRIVER === 's3' || process.env.VERCEL !== '1', hint: 'Use S3-compatible storage on Vercel.' },
    { label: 'Scheduled clean-up (CRON_SECRET)', ok: Boolean(e.CRON_SECRET), hint: 'Enables automatic data-retention clean-up.' },
    { label: 'Google Analytics 4', ok: Boolean(settings.gaMeasurementId || e.NEXT_PUBLIC_GA_MEASUREMENT_ID), hint: 'Optional. Loads only after visitor consent.', href: '/admin/settings', optional: true },
    { label: 'Search Console verification', ok: Boolean(settings.searchConsoleVerification || e.GOOGLE_SITE_VERIFICATION), hint: 'Optional. Then submit /sitemap.xml in Search Console.', href: '/admin/settings', optional: true },
  ]
  const done = checks.filter((c) => c.ok).length

  return (
    <>
      <PageHeader title={`Hello, ${user.name.split(' ')[0]}`} description="An overview of inquiries, content and what is left before launch." />
      {notice === 'forbidden' && (
        <div className="mb-6">
          <Notice tone="warning">Your role does not have access to that page.</Notice>
        </div>
      )}
      <dl className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ...(can(user.role, 'inquiries:read')
            ? [
                { label: 'Open inquiries', value: openInquiries?.n ?? 0, href: '/admin/inquiries' },
                { label: 'Inquiries in the last 7 days', value: newThisWeek?.n ?? 0, href: '/admin/inquiries?status=all' },
              ]
            : []),
          { label: 'Published services', value: publishedServices?.n ?? 0, href: '/admin/services' },
          { label: 'Published projects', value: publishedProjects?.n ?? 0, href: '/admin/projects' },
          ...(can(user.role, 'offers:manage') ? [{ label: 'Running offers', value: activeOffers?.n ?? 0, href: '/admin/offers' }] : []),
        ].map((stat) => (
          <div key={stat.label} className="rounded-[var(--radius-panel)] border border-line bg-paper p-5">
            <dt className="text-sm font-semibold text-slate">{stat.label}</dt>
            <dd className="mt-1">
              <Link href={stat.href} className="tabular text-3xl font-extrabold hover:text-sheen">
                {stat.value}
              </Link>
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        {can(user.role, 'inquiries:read') && (
          <Panel
            title="Latest inquiries"
            actions={
              <Link href="/admin/inquiries" className="text-link text-sm">
                All inquiries
              </Link>
            }
          >
            {recent.length === 0 ? (
              <p className="text-slate">No inquiries yet. They appear here as soon as someone uses the contact form.</p>
            ) : (
              <ul className="divide-y divide-line">
                {recent.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <span>
                      <Link href={`/admin/inquiries/${r.id}`} className="font-semibold hover:text-sheen hover:underline">
                        {r.name}
                      </Link>
                      <span className="block text-sm text-slate">
                        {INQUIRY_TYPE_LABELS[r.inquiryType]} · {formatDateTime(r.createdAt)}
                      </span>
                    </span>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
        <Panel title="Launch readiness" description={`${done} of ${checks.length} items done.`}>
          <ul className="space-y-3">
            {checks.map((c) => (
              <li key={c.label} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className={`mt-1 flex h-5 w-5 flex-none items-center justify-center rounded-full text-xs font-bold ${c.ok ? 'bg-success text-paper' : c.optional ? 'bg-mist-deep text-slate' : 'bg-warning-soft text-warning'}`}
                >
                  {c.ok ? '✓' : '!'}
                </span>
                <span>
                  <span className="font-semibold">
                    {c.href && !c.ok ? (
                      <Link href={c.href} className="hover:text-sheen hover:underline">
                        {c.label}
                      </Link>
                    ) : (
                      c.label
                    )}
                    <span className="sr-only">{c.ok ? ' — done' : ' — to do'}</span>
                  </span>
                  {!c.ok && <span className="block text-sm text-slate">{c.hint}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <p className="mt-8 text-sm text-slate">{CONTENT_SECTIONS.length} editable page sections are available under Page content.</p>
    </>
  )
}
