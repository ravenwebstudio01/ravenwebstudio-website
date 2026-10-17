/**
 * Seeds structure and clearly-labelled SAMPLE content so the site and dashboard
 * can be explored during development.
 *
 * - Every content row created here has is_sample = true. Sample rows are hidden
 *   in production unless SHOW_SAMPLE_CONTENT=true, and the dashboard lists them
 *   until an editor reviews each one (unticking "Sample content").
 * - No portfolio projects, client names, testimonials or prices are created.
 * - Idempotent: existing rows (matched by slug) are left untouched.
 *
 *   npm run db:seed
 */
import './_env'
import { eq } from 'drizzle-orm'
import { closeDb, getDb } from '@/lib/db'
import {
  budgetTiers,
  budgetTierServices,
  collaborationTypes,
  offers,
  offerServices,
  projectCategories,
  serviceCategories,
  serviceRelations,
  services,
  siteSettings,
} from '@/lib/db/schema'
import { DEFAULT_SETTINGS } from '@/lib/settings'

const CATEGORIES = [
  { slug: 'websites', name: 'Websites', displayOrder: 1 },
  { slug: 'growth', name: 'Search and performance', displayOrder: 2 },
  { slug: 'care', name: 'Care and improvements', displayOrder: 3 },
  { slug: 'custom', name: 'Custom development', displayOrder: 4 },
]

type SeedService = {
  slug: string
  name: string
  category: string
  icon: string
  priceUnit?: 'project' | 'month' | 'hour'
  shortDescription: string
  features: string[]
  deliverables: string[]
  related?: string[]
}

const SERVICES: SeedService[] = [
  {
    slug: 'business-websites',
    name: 'Business websites',
    category: 'websites',
    icon: 'building',
    shortDescription: 'A multi-page website that explains what you do, builds trust and turns visitors into inquiries.',
    features: ['Content structure and page planning', 'Responsive design for phones, tablets and desktops', 'Contact and inquiry forms', 'Editable content', 'SEO foundations and analytics set-up'],
    deliverables: ['Designed and developed website', 'Launch checklist and handover', 'Short guide to editing content'],
  },
  {
    slug: 'website-development',
    name: 'Website development',
    category: 'websites',
    icon: 'layout',
    shortDescription: 'Development of a website from your existing design, or from a design we create together.',
    features: ['Modern, maintainable code', 'Accessibility checks against WCAG', 'Performance budget for every page', 'Testing on real devices'],
    deliverables: ['Production-ready website', 'Source code and documentation'],
  },
  {
    slug: 'landing-pages',
    name: 'Landing pages',
    category: 'websites',
    icon: 'target',
    shortDescription: 'A focused page for one campaign, product or offer, built to load fast and convert.',
    features: ['Single clear call to action', 'Conversion tracking (with consent)', 'Fast loading on mobile networks'],
    deliverables: ['Landing page', 'Tracking plan for its key events'],
  },
  {
    slug: 'website-redesigns',
    name: 'Website redesigns',
    category: 'websites',
    icon: 'refresh',
    shortDescription: 'A fresh design and solid technical base for an existing website — without losing what already works.',
    features: ['Review of current content and search visibility', 'Redirect plan to protect existing rankings', 'Updated design system'],
    deliverables: ['Redesigned website', 'Redirect map', 'Before/after technical report'],
  },
  {
    slug: 'e-commerce',
    name: 'E-commerce development',
    category: 'websites',
    icon: 'cart',
    shortDescription: 'Online shops that are fast, clear to navigate and easy for your team to manage.',
    features: ['Product catalogue and checkout', 'Payment and shipping integrations', 'EU-friendly checkout and consent flows'],
    deliverables: ['Online shop', 'Admin training session'],
  },
  {
    slug: 'website-maintenance',
    name: 'Website maintenance',
    category: 'care',
    icon: 'wrench',
    priceUnit: 'month',
    shortDescription: 'Updates, security patches, backups checks and small fixes so your website keeps running smoothly.',
    features: ['Dependency and security updates', 'Uptime and error monitoring', 'Monthly allowance for small changes'],
    deliverables: ['Monthly maintenance summary'],
  },
  {
    slug: 'technical-seo',
    name: 'Technical SEO',
    category: 'growth',
    icon: 'search',
    shortDescription: 'Fix the technical issues that stop search engines from understanding and ranking your pages.',
    features: ['Crawl and indexing audit', 'Metadata, structured data and sitemaps', 'Search Console set-up'],
    deliverables: ['Prioritised SEO report', 'Implemented fixes'],
  },
  {
    slug: 'performance-optimisation',
    name: 'Performance optimisation',
    category: 'growth',
    icon: 'gauge',
    shortDescription: 'Faster pages through better images, leaner code and smarter loading — measured with Core Web Vitals.',
    features: ['Core Web Vitals analysis', 'Image and font optimisation', 'Script and third-party review'],
    deliverables: ['Performance report with before/after measurements'],
  },
  {
    slug: 'custom-integrations',
    name: 'Custom functionality and integrations',
    category: 'custom',
    icon: 'plug',
    shortDescription: 'Booking, CRM, payment or internal tools connected to your website — built to fit how you work.',
    features: ['API integrations', 'Custom dashboards and forms', 'Automations between your tools'],
    deliverables: ['Working integration', 'Technical documentation'],
  },
  {
    slug: 'ongoing-improvements',
    name: 'Ongoing website improvements',
    category: 'care',
    icon: 'spark',
    priceUnit: 'month',
    shortDescription: 'A regular development budget to add features, test ideas and keep improving your website.',
    features: ['Planned monthly improvements', 'Prioritised backlog', 'Regular progress updates'],
    deliverables: ['Monthly release notes'],
  },
]

const RELATIONS: Record<string, string[]> = {
  'business-websites': ['website-maintenance', 'technical-seo'],
  'website-redesigns': ['technical-seo', 'performance-optimisation'],
  'e-commerce': ['custom-integrations', 'website-maintenance'],
  'landing-pages': ['performance-optimisation'],
}

const TIERS = [
  {
    slug: 'entry-level',
    name: 'Entry-level projects',
    description: 'For a first professional presence: a single page or a small site with the essentials done properly.',
    typicalFeatures: ['One to three pages', 'Contact form', 'Mobile-first design', 'Basic SEO set-up'],
    suitableFor: ['New businesses', 'Freelancers', 'Single campaigns'],
    services: ['landing-pages', 'business-websites'],
  },
  {
    slug: 'small-business',
    name: 'Small business websites',
    description: 'A complete website for an established small business that wants to present its services clearly.',
    typicalFeatures: ['Up to around eight pages', 'Editable content', 'Analytics with consent', 'Accessibility checks'],
    suitableFor: ['Local and regional businesses', 'Service providers'],
    services: ['business-websites'],
  },
  {
    slug: 'professional',
    name: 'Professional multi-page websites',
    description: 'A larger site with richer content, structured service pages and room to grow.',
    typicalFeatures: ['Custom design system', 'Service and case-study templates', 'Technical SEO', 'Performance budget'],
    suitableFor: ['Growing companies', 'Professional services'],
    services: ['business-websites', 'technical-seo'],
  },
  {
    slug: 'advanced',
    name: 'Advanced business websites',
    description: 'For businesses that need integrations, multiple languages or more complex content.',
    typicalFeatures: ['Integrations with your tools', 'Multilingual content', 'Advanced forms and workflows'],
    suitableFor: ['Established companies', 'Multi-market businesses'],
    services: ['custom-integrations', 'business-websites'],
  },
  {
    slug: 'e-commerce',
    name: 'E-commerce projects',
    description: 'Online shops from a focused catalogue to larger stores with integrations.',
    typicalFeatures: ['Product catalogue', 'Checkout and payments', 'Shipping and tax rules'],
    suitableFor: ['Retailers', 'Brands selling direct'],
    services: ['e-commerce'],
  },
  {
    slug: 'custom',
    name: 'Custom or complex projects',
    description: 'Bespoke platforms, portals and integrations, scoped together in a discovery phase.',
    typicalFeatures: ['Discovery workshop', 'Architecture plan', 'Phased delivery'],
    suitableFor: ['Platforms and portals', 'Internal tools'],
    services: ['custom-integrations'],
  },
]

const COLLABORATIONS = [
  { slug: 'web-studios', name: 'Web development studios', summary: 'Extra development capacity for studios with more work than hands.' },
  { slug: 'marketing-agencies', name: 'Marketing agencies', summary: 'Websites and landing pages built for your clients, under your brand or ours.' },
  { slug: 'designers', name: 'Designers', summary: 'We turn your designs into fast, accessible, maintainable websites.' },
  { slug: 'freelancers', name: 'Freelancers', summary: 'Technical implementation support when a project needs more than one person.' },
  { slug: 'external-dev-partner', name: 'Businesses needing a development partner', summary: 'An external team for companies without in-house developers.' },
  { slug: 'ongoing-partnerships', name: 'Ongoing partnerships', summary: 'Long-term collaboration with agreed capacity and a shared way of working.' },
]

async function main() {
  const db = getDb()

  await db.insert(siteSettings).values({ id: 1, data: DEFAULT_SETTINGS }).onConflictDoNothing()

  await db.insert(serviceCategories).values(CATEGORIES).onConflictDoNothing()
  const categoryRows = await db.select().from(serviceCategories)
  const categoryId = (slug: string) => categoryRows.find((c) => c.slug === slug)?.id ?? null

  await db
    .insert(services)
    .values(
      SERVICES.map((s, i) => ({
        slug: s.slug,
        name: s.name,
        categoryId: categoryId(s.category),
        icon: s.icon,
        priceUnit: s.priceUnit ?? 'project',
        shortDescription: s.shortDescription,
        features: s.features,
        deliverables: s.deliverables,
        displayOrder: i + 1,
        status: 'published' as const,
        isSample: true,
        publishedAt: new Date(),
      })),
    )
    .onConflictDoNothing()
  const serviceRows = await db.select({ id: services.id, slug: services.slug }).from(services)
  const serviceId = (slug: string) => serviceRows.find((s) => s.slug === slug)?.id

  const relationValues = Object.entries(RELATIONS).flatMap(([from, tos]) =>
    tos.flatMap((to) => {
      const a = serviceId(from)
      const b = serviceId(to)
      return a && b ? [{ serviceId: a, relatedServiceId: b }] : []
    }),
  )
  if (relationValues.length) await db.insert(serviceRelations).values(relationValues).onConflictDoNothing()

  await db
    .insert(budgetTiers)
    .values(
      TIERS.map((t, i) => ({
        slug: t.slug,
        name: t.name,
        description: t.description,
        typicalFeatures: t.typicalFeatures,
        suitableFor: t.suitableFor,
        currency: 'EUR',
        showAmounts: false,
        displayOrder: i + 1,
        status: 'published' as const,
        isSample: true,
      })),
    )
    .onConflictDoNothing()
  const tierRows = await db.select({ id: budgetTiers.id, slug: budgetTiers.slug }).from(budgetTiers)
  const tierLinks = TIERS.flatMap((t) => {
    const tierId = tierRows.find((r) => r.slug === t.slug)?.id
    return tierId ? t.services.flatMap((s) => (serviceId(s) ? [{ tierId, serviceId: serviceId(s)! }] : [])) : []
  })
  if (tierLinks.length) await db.insert(budgetTierServices).values(tierLinks).onConflictDoNothing()

  await db
    .insert(collaborationTypes)
    .values(COLLABORATIONS.map((c, i) => ({ ...c, displayOrder: i + 1, status: 'published' as const, isSample: true })))
    .onConflictDoNothing()

  await db
    .insert(projectCategories)
    .values([
      { slug: 'business-websites', name: 'Business websites', displayOrder: 1 },
      { slug: 'e-commerce', name: 'E-commerce', displayOrder: 2 },
      { slug: 'landing-pages', name: 'Landing pages', displayOrder: 3 },
    ])
    .onConflictDoNothing()

  // One example offer, left as a DRAFT so it is never shown until someone decides on it.
  const [offer] = await db
    .insert(offers)
    .values({
      slug: 'website-and-care-bundle',
      name: 'Website and care bundle',
      summary: 'Example: a discount on maintenance when it is ordered together with a new business website.',
      discountType: 'percentage',
      discountValue: 1000,
      currency: 'EUR',
      discountScope: 'eligible_services',
      clientEligibility: 'any',
      stackable: false,
      status: 'draft',
      isSample: true,
      terms: 'Example terms — replace before publishing.',
    })
    .onConflictDoNothing()
    .returning({ id: offers.id })
  if (offer) {
    const web = serviceId('business-websites')
    const care = serviceId('website-maintenance')
    if (web && care) {
      await db.insert(offerServices).values([
        { offerId: offer.id, serviceId: web, role: 'required' },
        { offerId: offer.id, serviceId: care, role: 'eligible' },
      ])
    }
  }

  const sampleCount = await db.select({ id: services.id }).from(services).where(eq(services.isSample, true))
  console.log(`Seed complete. ${sampleCount.length} sample services present (hidden in production unless SHOW_SAMPLE_CONTENT=true).`)
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => closeDb())
