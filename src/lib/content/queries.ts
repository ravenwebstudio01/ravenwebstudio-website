/**
 * Read-side queries for the public website. Everything goes through
 * `publiclyVisible` so drafts, archived and (in production) sample records never
 * leak. Results are deduplicated per request with React `cache`; nothing is
 * cached across requests, so price and publication changes apply immediately.
 */
import 'server-only'
import { cache } from 'react'
import { and, asc, eq, gt, inArray, isNull, lte, or, type SQL } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import {
  budgetTiers,
  budgetTierServices,
  collaborationTypes,
  contentBlocks,
  media,
  offers,
  offerServices,
  projectCategories,
  projectMedia,
  projects,
  projectServices,
  redirects,
  serviceCategories,
  serviceRelations,
  services,
} from '@/lib/db/schema'
import { loadSettings } from '@/lib/settings'
import { publiclyVisible } from './visibility'
import { resolveSection, sectionDefinition } from './registry'
import { toMediaView, type MediaRow, type MediaView } from '@/lib/media/view'

export const getSettings = cache(loadSettings)

const getAllContentBlocks = cache(async (): Promise<Map<string, unknown>> => {
  const rows = await getDb().select().from(contentBlocks)
  return new Map(rows.map((r) => [r.key, r.data]))
})

export async function getContent<T = Record<string, unknown>>(key: string): Promise<T> {
  const def = sectionDefinition(key)
  if (!def) throw new Error(`Unknown content section ${key}`)
  const stored = (await getAllContentBlocks()).get(key)
  return resolveSection<T>(def, stored)
}

async function loadMedia(ids: (string | null | undefined)[]): Promise<Map<string, MediaRow>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))]
  if (unique.length === 0) return new Map()
  const rows = await getDb()
    .select({
      id: media.id,
      altText: media.altText,
      width: media.width,
      height: media.height,
      variants: media.variants,
      storageDriver: media.storageDriver,
    })
    .from(media)
    .where(inArray(media.id, unique))
  return new Map(rows.map((r) => [r.id, r]))
}

/* ---------------------------------------------------------------- services */

export type PublicService = {
  id: string
  slug: string
  name: string
  shortDescription: string
  description: string
  category: { name: string; slug: string } | null
  features: string[]
  deliverables: string[]
  priceFrom: number | null
  priceTo: number | null
  currency: string
  priceUnit: 'project' | 'month' | 'hour'
  showPrice: boolean
  timeline: string
  icon: string
  image: MediaView | null
  isSample: boolean
  seoTitle: string
  seoDescription: string
  updatedAt: Date
}

const serviceColumns = {
  id: services.id,
  slug: services.slug,
  name: services.name,
  shortDescription: services.shortDescription,
  description: services.description,
  categoryName: serviceCategories.name,
  categorySlug: serviceCategories.slug,
  features: services.features,
  deliverables: services.deliverables,
  priceFrom: services.priceFrom,
  priceTo: services.priceTo,
  currency: services.currency,
  priceUnit: services.priceUnit,
  showPrice: services.showPrice,
  timeline: services.timeline,
  icon: services.icon,
  imageId: services.imageId,
  isSample: services.isSample,
  seoTitle: services.seoTitle,
  seoDescription: services.seoDescription,
  updatedAt: services.updatedAt,
}

function fetchServiceRows(where: SQL | undefined, limit = 500) {
  return getDb()
    .select(serviceColumns)
    .from(services)
    .leftJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
    .where(where)
    .orderBy(asc(services.displayOrder), asc(services.name))
    .limit(limit)
}

type ServiceRow = Awaited<ReturnType<typeof fetchServiceRows>>[number]

async function toPublicServices(rows: ServiceRow[]): Promise<PublicService[]> {
  const mediaMap = await loadMedia(rows.map((r) => r.imageId))
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    shortDescription: r.shortDescription,
    description: r.description,
    category: r.categoryName && r.categorySlug ? { name: r.categoryName, slug: r.categorySlug } : null,
    features: r.features,
    deliverables: r.deliverables,
    priceFrom: r.priceFrom,
    priceTo: r.priceTo,
    currency: r.currency,
    priceUnit: r.priceUnit,
    showPrice: r.showPrice,
    timeline: r.timeline,
    icon: r.icon,
    image: toMediaView(r.imageId ? mediaMap.get(r.imageId) : null),
    isSample: r.isSample,
    seoTitle: r.seoTitle,
    seoDescription: r.seoDescription,
    updatedAt: r.updatedAt,
  }))
}

export const getPublishedServices = cache(async (): Promise<PublicService[]> => {
  return toPublicServices(await fetchServiceRows(publiclyVisible(services)))
})

export const getServiceBySlug = cache(
  async (slug: string): Promise<(PublicService & { related: PublicService[] }) | null> => {
    const db = getDb()
    const [service] = await toPublicServices(await fetchServiceRows(and(eq(services.slug, slug), publiclyVisible(services)), 1))
    if (!service) return null
    const relatedIds = await db
      .select({ id: serviceRelations.relatedServiceId })
      .from(serviceRelations)
      .where(eq(serviceRelations.serviceId, service.id))
    const ids = new Set(relatedIds.map((r) => r.id))
    const related = (await getPublishedServices()).filter((s) => ids.has(s.id))
    return { ...service, related }
  },
)

/* ---------------------------------------------------------------- projects */

export type PublicProjectCard = {
  id: string
  slug: string
  title: string
  summary: string
  clientName: string | null
  category: { name: string; slug: string } | null
  cover: MediaView | null
  featured: boolean
  isSample: boolean
  completedOn: string | null
  updatedAt: Date
}

export type PublicProject = PublicProjectCard & {
  description: string
  projectUrl: string
  technologies: string[]
  goals: string
  deliverables: string[]
  results: string | null
  gallery: (MediaView & { caption: string })[]
  services: { name: string; slug: string }[]
  seoTitle: string
  seoDescription: string
  status: 'draft' | 'published' | 'archived'
}

const projectColumns = {
  id: projects.id,
  slug: projects.slug,
  title: projects.title,
  summary: projects.summary,
  clientName: projects.clientName,
  clientNameApproved: projects.clientNameApproved,
  categoryName: projectCategories.name,
  categorySlug: projectCategories.slug,
  coverMediaId: projects.coverMediaId,
  featured: projects.featured,
  isSample: projects.isSample,
  completedOn: projects.completedOn,
  updatedAt: projects.updatedAt,
}

export const getPublishedProjects = cache(async (): Promise<PublicProjectCard[]> => {
  const rows = await getDb()
    .select(projectColumns)
    .from(projects)
    .leftJoin(projectCategories, eq(projectCategories.id, projects.categoryId))
    .where(publiclyVisible(projects))
    .orderBy(asc(projects.displayOrder), asc(projects.title))
  const mediaMap = await loadMedia(rows.map((r) => r.coverMediaId))
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    clientName: r.clientNameApproved && r.clientName ? r.clientName : null,
    category: r.categoryName && r.categorySlug ? { name: r.categoryName, slug: r.categorySlug } : null,
    cover: toMediaView(r.coverMediaId ? mediaMap.get(r.coverMediaId) : null),
    featured: r.featured,
    isSample: r.isSample,
    completedOn: r.completedOn,
    updatedAt: r.updatedAt,
  }))
})

/**
 * Full project detail. `preview` (admin only) bypasses the visibility rule so
 * drafts can be previewed; callers must check permissions first.
 */
export async function getProjectDetail(
  where: { slug: string } | { id: string },
  opts: { preview?: boolean } = {},
): Promise<PublicProject | null> {
  const db = getDb()
  const match = 'slug' in where ? eq(projects.slug, where.slug) : eq(projects.id, where.id)
  const [row] = await db
    .select({
      ...projectColumns,
      description: projects.description,
      projectUrl: projects.projectUrl,
      technologies: projects.technologies,
      goals: projects.goals,
      deliverables: projects.deliverables,
      results: projects.results,
      resultsVerified: projects.resultsVerified,
      seoTitle: projects.seoTitle,
      seoDescription: projects.seoDescription,
      status: projects.status,
    })
    .from(projects)
    .leftJoin(projectCategories, eq(projectCategories.id, projects.categoryId))
    .where(opts.preview ? match : and(match, publiclyVisible(projects)))
    .limit(1)
  if (!row) return null

  const gallery = await db
    .select({ mediaId: projectMedia.mediaId, caption: projectMedia.caption })
    .from(projectMedia)
    .where(eq(projectMedia.projectId, row.id))
    .orderBy(asc(projectMedia.displayOrder))
  const linkedServices = await db
    .select({ name: services.name, slug: services.slug })
    .from(projectServices)
    .innerJoin(services, eq(services.id, projectServices.serviceId))
    .where(and(eq(projectServices.projectId, row.id), publiclyVisible(services)))
    .orderBy(asc(services.displayOrder))
  const mediaMap = await loadMedia([row.coverMediaId, ...gallery.map((g) => g.mediaId)])

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    clientName: row.clientNameApproved && row.clientName ? row.clientName : null,
    category: row.categoryName && row.categorySlug ? { name: row.categoryName, slug: row.categorySlug } : null,
    cover: toMediaView(row.coverMediaId ? mediaMap.get(row.coverMediaId) : null),
    featured: row.featured,
    isSample: row.isSample,
    completedOn: row.completedOn,
    updatedAt: row.updatedAt,
    description: row.description,
    projectUrl: row.projectUrl,
    technologies: row.technologies,
    goals: row.goals,
    deliverables: row.deliverables,
    results: row.resultsVerified && row.results.trim() ? row.results : null,
    gallery: gallery.flatMap((g) => {
      const view = toMediaView(mediaMap.get(g.mediaId))
      return view ? [{ ...view, caption: g.caption }] : []
    }),
    services: linkedServices,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    status: row.status,
  }
}

export const getProjectBySlug = cache((slug: string) => getProjectDetail({ slug }))

/* ------------------------------------------------------------ budget tiers */

export type PublicBudgetTier = {
  id: string
  slug: string
  name: string
  description: string
  minAmount: number | null
  maxAmount: number | null
  startingPrice: number | null
  currency: string
  showAmounts: boolean
  typicalFeatures: string[]
  suitableFor: string[]
  timeline: string
  ctaLabel: string
  services: { name: string; slug: string }[]
  isSample: boolean
}

export const getPublishedBudgetTiers = cache(async (): Promise<PublicBudgetTier[]> => {
  const db = getDb()
  const rows = await db
    .select()
    .from(budgetTiers)
    .where(publiclyVisible(budgetTiers))
    .orderBy(asc(budgetTiers.displayOrder), asc(budgetTiers.name))
  if (rows.length === 0) return []
  const links = await db
    .select({ tierId: budgetTierServices.tierId, name: services.name, slug: services.slug })
    .from(budgetTierServices)
    .innerJoin(services, eq(services.id, budgetTierServices.serviceId))
    .where(and(inArray(budgetTierServices.tierId, rows.map((r) => r.id)), publiclyVisible(services)))
    .orderBy(asc(services.displayOrder))
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    minAmount: r.minAmount,
    maxAmount: r.maxAmount,
    startingPrice: r.startingPrice,
    currency: r.currency,
    showAmounts: r.showAmounts,
    typicalFeatures: r.typicalFeatures,
    suitableFor: r.suitableFor,
    timeline: r.timeline,
    ctaLabel: r.ctaLabel,
    services: links.filter((l) => l.tierId === r.id).map(({ name, slug }) => ({ name, slug })),
    isSample: r.isSample,
  }))
})

/* ---------------------------------------------------------- collaborations */

export const getPublishedCollaborationTypes = cache(async () =>
  getDb()
    .select({
      id: collaborationTypes.id,
      slug: collaborationTypes.slug,
      name: collaborationTypes.name,
      summary: collaborationTypes.summary,
      description: collaborationTypes.description,
      isSample: collaborationTypes.isSample,
    })
    .from(collaborationTypes)
    .where(publiclyVisible(collaborationTypes))
    .orderBy(asc(collaborationTypes.displayOrder), asc(collaborationTypes.name)),
)

/* ------------------------------------------------------------------ offers */

export type PublicOffer = {
  id: string
  slug: string
  name: string
  summary: string
  description: string
  discountType: 'percentage' | 'fixed_amount'
  discountValue: number
  currency: string
  discountScope: 'eligible_services' | 'order_total'
  clientEligibility: 'any' | 'new' | 'existing'
  minSubtotal: number | null
  minServiceCount: number | null
  maxDiscount: number | null
  endsAt: Date | null
  stackable: boolean
  requiresApproval: boolean
  terms: string
  requiredServices: { id: string; name: string; slug: string }[]
  eligibleServices: { id: string; name: string; slug: string }[]
  isSample: boolean
}

/** Published offers that are currently running and not restricted by a private code. */
export const getPublicOffers = cache(async (): Promise<PublicOffer[]> => {
  const db = getDb()
  const now = new Date()
  const rows = await db
    .select()
    .from(offers)
    .where(
      and(
        publiclyVisible(offers),
        isNull(offers.code),
        or(isNull(offers.startsAt), lte(offers.startsAt, now)),
        or(isNull(offers.endsAt), gt(offers.endsAt, now)),
      ),
    )
    .orderBy(asc(offers.displayOrder), asc(offers.name))
  if (rows.length === 0) return []
  const links = await db
    .select({
      offerId: offerServices.offerId,
      role: offerServices.role,
      id: services.id,
      name: services.name,
      slug: services.slug,
    })
    .from(offerServices)
    .innerJoin(services, eq(services.id, offerServices.serviceId))
    .where(inArray(offerServices.offerId, rows.map((r) => r.id)))
    .orderBy(asc(services.displayOrder))
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    summary: r.summary,
    description: r.description,
    discountType: r.discountType,
    discountValue: r.discountValue,
    currency: r.currency,
    discountScope: r.discountScope,
    clientEligibility: r.clientEligibility,
    minSubtotal: r.minSubtotal,
    minServiceCount: r.minServiceCount,
    maxDiscount: r.maxDiscount,
    endsAt: r.endsAt,
    stackable: r.stackable,
    requiresApproval: r.requiresApproval,
    terms: r.terms,
    requiredServices: links.filter((l) => l.offerId === r.id && l.role === 'required').map(({ id, name, slug }) => ({ id, name, slug })),
    eligibleServices: links.filter((l) => l.offerId === r.id && l.role === 'eligible').map(({ id, name, slug }) => ({ id, name, slug })),
    isSample: r.isSample,
  }))
})

/* --------------------------------------------------------------- redirects */

export async function findRedirect(path: string): Promise<{ toPath: string; permanent: boolean } | null> {
  const [row] = await getDb()
    .select({ toPath: redirects.toPath, permanent: redirects.permanent })
    .from(redirects)
    .where(eq(redirects.fromPath, path))
    .limit(1)
  // Only same-site paths are ever followed (no open redirects).
  if (!row || !row.toPath.startsWith('/') || row.toPath.startsWith('//')) return null
  return row
}
