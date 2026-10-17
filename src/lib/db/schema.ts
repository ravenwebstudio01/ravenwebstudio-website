/**
 * Database schema (PostgreSQL, Drizzle ORM).
 *
 * Conventions
 * - Money is stored as integer minor units (cents) plus an ISO 4217 currency code.
 * - Percentages are stored in basis points (1000 = 10%).
 * - Every piece of public content has a `status` (draft/published/archived) and an
 *   `is_sample` flag. Sample rows are development placeholders; public queries
 *   exclude them unless SHOW_SAMPLE_CONTENT=true (see src/lib/content/visibility.ts).
 * - After editing this file run `npm run db:generate` and commit the new migration.
 */
import { sql } from 'drizzle-orm'
import {
  bigserial,
  boolean,
  char,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

const tz = { withTimezone: true } as const

const timestamps = {
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz)
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}

/* ------------------------------------------------------------------ enums */

export const userRole = pgEnum('user_role', ['admin', 'editor'])
export const contentStatus = pgEnum('content_status', ['draft', 'published', 'archived'])
export const priceUnit = pgEnum('price_unit', ['project', 'month', 'hour'])
export const inquiryStatus = pgEnum('inquiry_status', [
  'new',
  'in_review',
  'contacted',
  'proposal_sent',
  'won',
  'lost',
  'archived',
  'spam',
])
export const inquiryType = pgEnum('inquiry_type', [
  'project',
  'existing_client',
  'collaboration',
  'general',
])
export const clientStatus = pgEnum('client_status', ['new', 'existing'])
export const discountType = pgEnum('discount_type', ['percentage', 'fixed_amount'])
export const discountScope = pgEnum('discount_scope', ['eligible_services', 'order_total'])
export const clientEligibility = pgEnum('client_eligibility', ['any', 'new', 'existing'])
export const offerServiceRole = pgEnum('offer_service_role', ['required', 'eligible'])
export const inquiryServiceKind = pgEnum('inquiry_service_kind', ['requested', 'additional'])
export const deliveryStatus = pgEnum('delivery_status', [
  'pending',
  'sent',
  'failed',
  'not_configured',
  'skipped',
])

/* ------------------------------------------------------------ users/auth */

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 254 }).notNull().unique(),
    name: varchar('name', { length: 120 }).notNull(),
    role: userRole('role').notNull().default('editor'),
    passwordHash: text('password_hash').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    failedLoginCount: integer('failed_login_count').notNull().default(0),
    lockedUntil: timestamp('locked_until', tz),
    lastLoginAt: timestamp('last_login_at', tz),
    passwordChangedAt: timestamp('password_changed_at', tz).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [check('users_email_lowercase', sql`${t.email} = lower(${t.email})`)],
)

export const sessions = pgTable(
  'sessions',
  {
    /** SHA-256 (hex) of the session token. The raw token only exists in the cookie. */
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', tz).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', tz).notNull(),
    lastSeenAt: timestamp('last_seen_at', tz).notNull().defaultNow(),
    ipHash: varchar('ip_hash', { length: 64 }),
    userAgent: varchar('user_agent', { length: 300 }),
  },
  (t) => [index('sessions_user_idx').on(t.userId), index('sessions_expires_idx').on(t.expiresAt)],
)

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', tz).notNull(),
    usedAt: timestamp('used_at', tz),
    createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  },
  (t) => [index('password_reset_user_idx').on(t.userId)],
)

/* ------------------------------------------------------------------ media */

export type MediaVariant = {
  width: number
  height: number
  key: string
  bytes: number
}

export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  originalName: varchar('original_name', { length: 255 }).notNull().default(''),
  altText: varchar('alt_text', { length: 300 }).notNull().default(''),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  bytes: integer('bytes').notNull(),
  format: varchar('format', { length: 10 }).notNull(),
  variants: jsonb('variants').$type<MediaVariant[]>().notNull(),
  storageDriver: varchar('storage_driver', { length: 20 }).notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
})

/* --------------------------------------------------------------- services */

export const serviceCategories = pgTable('service_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  description: varchar('description', { length: 500 }).notNull().default(''),
  displayOrder: integer('display_order').notNull().default(0),
  ...timestamps,
})

export const services = pgTable(
  'services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    name: varchar('name', { length: 120 }).notNull(),
    shortDescription: varchar('short_description', { length: 300 }).notNull().default(''),
    description: text('description').notNull().default(''),
    categoryId: uuid('category_id').references(() => serviceCategories.id, {
      onDelete: 'set null',
    }),
    features: jsonb('features').$type<string[]>().notNull().default([]),
    deliverables: jsonb('deliverables').$type<string[]>().notNull().default([]),
    priceFrom: integer('price_from'),
    priceTo: integer('price_to'),
    currency: char('currency', { length: 3 }).notNull().default('EUR'),
    priceUnit: priceUnit('price_unit').notNull().default('project'),
    showPrice: boolean('show_price').notNull().default(false),
    timeline: varchar('timeline', { length: 120 }).notNull().default(''),
    icon: varchar('icon', { length: 40 }).notNull().default('layout'),
    imageId: uuid('image_id').references(() => media.id, { onDelete: 'set null' }),
    displayOrder: integer('display_order').notNull().default(0),
    status: contentStatus('status').notNull().default('draft'),
    isSample: boolean('is_sample').notNull().default(false),
    seoTitle: varchar('seo_title', { length: 70 }).notNull().default(''),
    seoDescription: varchar('seo_description', { length: 170 }).notNull().default(''),
    publishedAt: timestamp('published_at', tz),
    ...timestamps,
  },
  (t) => [
    index('services_status_order_idx').on(t.status, t.displayOrder),
    check('services_price_from_nonneg', sql`${t.priceFrom} IS NULL OR ${t.priceFrom} >= 0`),
    check(
      'services_price_range',
      sql`${t.priceTo} IS NULL OR ${t.priceFrom} IS NULL OR ${t.priceTo} >= ${t.priceFrom}`,
    ),
    check('services_currency_iso', sql`${t.currency} ~ '^[A-Z]{3}$'`),
  ],
)

export const serviceRelations = pgTable(
  'service_relations',
  {
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    relatedServiceId: uuid('related_service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.serviceId, t.relatedServiceId] }),
    check('service_relations_not_self', sql`${t.serviceId} <> ${t.relatedServiceId}`),
  ],
)

/* -------------------------------------------------------------- portfolio */

export const projectCategories = pgTable('project_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  description: varchar('description', { length: 500 }).notNull().default(''),
  displayOrder: integer('display_order').notNull().default(0),
  ...timestamps,
})

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    title: varchar('title', { length: 160 }).notNull(),
    /** Only shown publicly when clientNameApproved is true. */
    clientName: varchar('client_name', { length: 160 }).notNull().default(''),
    clientNameApproved: boolean('client_name_approved').notNull().default(false),
    summary: varchar('summary', { length: 300 }).notNull().default(''),
    description: text('description').notNull().default(''),
    categoryId: uuid('category_id').references(() => projectCategories.id, {
      onDelete: 'set null',
    }),
    projectUrl: varchar('project_url', { length: 500 }).notNull().default(''),
    technologies: jsonb('technologies').$type<string[]>().notNull().default([]),
    completedOn: date('completed_on', { mode: 'string' }),
    goals: text('goals').notNull().default(''),
    deliverables: jsonb('deliverables').$type<string[]>().notNull().default([]),
    /** Only shown publicly when resultsVerified is true. */
    results: text('results').notNull().default(''),
    resultsVerified: boolean('results_verified').notNull().default(false),
    featured: boolean('featured').notNull().default(false),
    coverMediaId: uuid('cover_media_id').references(() => media.id, { onDelete: 'set null' }),
    displayOrder: integer('display_order').notNull().default(0),
    status: contentStatus('status').notNull().default('draft'),
    isSample: boolean('is_sample').notNull().default(false),
    seoTitle: varchar('seo_title', { length: 70 }).notNull().default(''),
    seoDescription: varchar('seo_description', { length: 170 }).notNull().default(''),
    publishedAt: timestamp('published_at', tz),
    ...timestamps,
  },
  (t) => [
    index('projects_status_order_idx').on(t.status, t.displayOrder),
    index('projects_category_idx').on(t.categoryId),
  ],
)

export const projectServices = pgTable(
  'project_services',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.serviceId] })],
)

export const projectMedia = pgTable(
  'project_media',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    displayOrder: integer('display_order').notNull().default(0),
    caption: varchar('caption', { length: 200 }).notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.mediaId] })],
)

/* ----------------------------------------------------------- budget tiers */

export const budgetTiers = pgTable(
  'budget_tiers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    name: varchar('name', { length: 120 }).notNull(),
    description: varchar('description', { length: 600 }).notNull().default(''),
    minAmount: integer('min_amount'),
    maxAmount: integer('max_amount'),
    currency: char('currency', { length: 3 }).notNull().default('EUR'),
    /** Amounts stay hidden publicly until an administrator confirms them. */
    showAmounts: boolean('show_amounts').notNull().default(false),
    startingPrice: integer('starting_price'),
    typicalFeatures: jsonb('typical_features').$type<string[]>().notNull().default([]),
    suitableFor: jsonb('suitable_for').$type<string[]>().notNull().default([]),
    timeline: varchar('timeline', { length: 120 }).notNull().default(''),
    ctaLabel: varchar('cta_label', { length: 60 }).notNull().default(''),
    displayOrder: integer('display_order').notNull().default(0),
    status: contentStatus('status').notNull().default('draft'),
    isSample: boolean('is_sample').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    check('budget_tiers_min_nonneg', sql`${t.minAmount} IS NULL OR ${t.minAmount} >= 0`),
    check(
      'budget_tiers_range',
      sql`${t.maxAmount} IS NULL OR ${t.minAmount} IS NULL OR ${t.maxAmount} >= ${t.minAmount}`,
    ),
    check('budget_tiers_currency_iso', sql`${t.currency} ~ '^[A-Z]{3}$'`),
  ],
)

export const budgetTierServices = pgTable(
  'budget_tier_services',
  {
    tierId: uuid('tier_id')
      .notNull()
      .references(() => budgetTiers.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.tierId, t.serviceId] })],
)

/* --------------------------------------------------------- collaborations */

export const collaborationTypes = pgTable('collaboration_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  summary: varchar('summary', { length: 300 }).notNull().default(''),
  description: text('description').notNull().default(''),
  displayOrder: integer('display_order').notNull().default(0),
  status: contentStatus('status').notNull().default('draft'),
  isSample: boolean('is_sample').notNull().default(false),
  ...timestamps,
})

/* ----------------------------------------------------------------- offers */

export const offers = pgTable(
  'offers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    name: varchar('name', { length: 120 }).notNull(),
    summary: varchar('summary', { length: 300 }).notNull().default(''),
    description: text('description').notNull().default(''),
    discountType: discountType('discount_type').notNull(),
    /** Basis points for percentage offers, minor units (cents) for fixed amounts. */
    discountValue: integer('discount_value').notNull(),
    currency: char('currency', { length: 3 }).notNull().default('EUR'),
    discountScope: discountScope('discount_scope').notNull().default('eligible_services'),
    clientEligibility: clientEligibility('client_eligibility').notNull().default('any'),
    minSubtotal: integer('min_subtotal'),
    minServiceCount: integer('min_service_count'),
    maxDiscount: integer('max_discount'),
    startsAt: timestamp('starts_at', tz),
    endsAt: timestamp('ends_at', tz),
    stackable: boolean('stackable').notNull().default(false),
    /** Manually approved offers are never applied automatically to public estimates. */
    requiresApproval: boolean('requires_approval').notNull().default(false),
    /** Optional code; when set the offer only applies if the code is supplied. Stored uppercase. */
    code: varchar('code', { length: 40 }),
    priority: integer('priority').notNull().default(0),
    terms: text('terms').notNull().default(''),
    displayOrder: integer('display_order').notNull().default(0),
    status: contentStatus('status').notNull().default('draft'),
    isSample: boolean('is_sample').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('offers_code_unique')
      .on(t.code)
      .where(sql`${t.code} IS NOT NULL`),
    check('offers_value_positive', sql`${t.discountValue} > 0`),
    check(
      'offers_percentage_max',
      sql`${t.discountType} <> 'percentage' OR ${t.discountValue} <= 10000`,
    ),
    check(
      'offers_date_window',
      sql`${t.startsAt} IS NULL OR ${t.endsAt} IS NULL OR ${t.endsAt} > ${t.startsAt}`,
    ),
    check('offers_currency_iso', sql`${t.currency} ~ '^[A-Z]{3}$'`),
    check('offers_code_upper', sql`${t.code} IS NULL OR ${t.code} = upper(${t.code})`),
  ],
)

export const offerServices = pgTable(
  'offer_services',
  {
    offerId: uuid('offer_id')
      .notNull()
      .references(() => offers.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    role: offerServiceRole('role').notNull(),
  },
  (t) => [primaryKey({ columns: [t.offerId, t.serviceId, t.role] })],
)

/* -------------------------------------------------------------- inquiries */

export type EstimateSnapshot = {
  currency: string
  subtotal: number
  discountTotal: number
  total: number
  lines: { serviceId: string; name: string; amount: number }[]
  appliedOffers: { offerId: string; name: string; amount: number }[]
  computedAt: string
}

export const inquiries = pgTable(
  'inquiries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reference: varchar('reference', { length: 24 }).notNull().unique(),
    status: inquiryStatus('status').notNull().default('new'),
    inquiryType: inquiryType('inquiry_type').notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    email: varchar('email', { length: 254 }).notNull(),
    company: varchar('company', { length: 160 }).notNull().default(''),
    phone: varchar('phone', { length: 40 }).notNull().default(''),
    country: varchar('country', { length: 80 }).notNull().default(''),
    budgetTierId: uuid('budget_tier_id').references(() => budgetTiers.id, {
      onDelete: 'set null',
    }),
    /** Snapshot of the tier name/range at submission time. */
    budgetLabel: varchar('budget_label', { length: 200 }).notNull().default(''),
    timeline: varchar('timeline', { length: 80 }).notNull().default(''),
    description: text('description').notNull(),
    clientStatus: clientStatus('client_status').notNull().default('new'),
    collaborationTypeId: uuid('collaboration_type_id').references(() => collaborationTypes.id, {
      onDelete: 'set null',
    }),
    wantsAdditionalServices: boolean('wants_additional_services').notNull().default(false),
    websiteUrl: varchar('website_url', { length: 500 }).notNull().default(''),
    offerId: uuid('offer_id').references(() => offers.id, { onDelete: 'set null' }),
    offerCode: varchar('offer_code', { length: 40 }).notNull().default(''),
    estimate: jsonb('estimate').$type<EstimateSnapshot | null>(),
    sourcePath: varchar('source_path', { length: 300 }).notNull().default(''),
    privacyAcknowledgedAt: timestamp('privacy_acknowledged_at', tz),
    notificationStatus: deliveryStatus('notification_status').notNull().default('pending'),
    acknowledgementStatus: deliveryStatus('acknowledgement_status').notNull().default('pending'),
    ...timestamps,
  },
  (t) => [
    index('inquiries_created_idx').on(t.createdAt),
    index('inquiries_status_idx').on(t.status),
    index('inquiries_email_idx').on(t.email),
  ],
)

export const inquiryServices = pgTable(
  'inquiry_services',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    inquiryId: uuid('inquiry_id')
      .notNull()
      .references(() => inquiries.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id').references(() => services.id, { onDelete: 'set null' }),
    serviceName: varchar('service_name', { length: 120 }).notNull(),
    kind: inquiryServiceKind('kind').notNull(),
  },
  (t) => [index('inquiry_services_inquiry_idx').on(t.inquiryId)],
)

export const inquiryNotes = pgTable(
  'inquiry_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    inquiryId: uuid('inquiry_id')
      .notNull()
      .references(() => inquiries.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    authorName: varchar('author_name', { length: 120 }).notNull().default(''),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  },
  (t) => [index('inquiry_notes_inquiry_idx').on(t.inquiryId)],
)

/* ------------------------------------------------------ settings/content */

export const siteSettings = pgTable(
  'site_settings',
  {
    id: smallint('id').primaryKey().default(1),
    data: jsonb('data').$type<Record<string, unknown>>().notNull(),
    updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => [check('site_settings_singleton', sql`${t.id} = 1`)],
)

export const contentBlocks = pgTable('content_blocks', {
  key: varchar('key', { length: 80 }).primaryKey(),
  data: jsonb('data').$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
})

export const redirects = pgTable('redirects', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromPath: varchar('from_path', { length: 300 }).notNull().unique(),
  toPath: varchar('to_path', { length: 300 }).notNull(),
  permanent: boolean('permanent').notNull().default(true),
  note: varchar('note', { length: 200 }).notNull().default(''),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
})

/* ------------------------------------------------------ audit/rate limits */

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    actorEmail: varchar('actor_email', { length: 254 }).notNull().default(''),
    action: varchar('action', { length: 60 }).notNull(),
    entityType: varchar('entity_type', { length: 40 }).notNull().default(''),
    entityId: varchar('entity_id', { length: 64 }).notNull().default(''),
    details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
    ipHash: varchar('ip_hash', { length: 64 }).notNull().default(''),
    createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  },
  (t) => [
    index('audit_logs_created_idx').on(t.createdAt),
    index('audit_logs_entity_idx').on(t.entityType, t.entityId),
  ],
)

export const rateLimits = pgTable(
  'rate_limits',
  {
    key: varchar('key', { length: 200 }).notNull(),
    windowStart: timestamp('window_start', tz).notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.key, t.windowStart] }),
    index('rate_limits_window_idx').on(t.windowStart),
  ],
)
