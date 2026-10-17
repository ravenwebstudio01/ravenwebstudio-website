import Link from 'next/link'
import type { PublicBudgetTier, PublicOffer, PublicProjectCard, PublicService } from '@/lib/content/queries'
import { formatMoney, formatRange } from '@/lib/money'
import { describeOffer, discountHeadline } from '@/lib/offers/describe'
import { cx } from '@/lib/utils'
import { PriceLabel, ResponsiveImage, SampleBadge } from './bits'
import { ServiceIcon } from './service-icon'

/* ---------------------------------------------------------------- services */

export function ServiceIndex({ services, locale }: { services: PublicService[]; locale: string }) {
  return (
    <ul className="grid border-t border-line md:grid-cols-2 md:gap-x-12">
      {services.map((service) => (
        <li key={service.id} className="border-b border-line">
          <Link
            href={`/services/${service.slug}`}
            className="group grid grid-cols-[2.75rem_1fr] gap-4 py-6 focus-visible:outline-offset-[-3px]"
          >
            <span className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] bg-sheen-soft text-sheen transition-colors group-hover:bg-sheen group-hover:text-paper">
              <ServiceIcon name={service.icon} className="h-5 w-5" />
            </span>
            <span>
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-h3 font-bold group-hover:text-sheen">{service.name}</span>
                <SampleBadge show={service.isSample} />
              </span>
              <span className="mt-1.5 block text-slate">{service.shortDescription}</span>
              {service.showPrice && (service.priceFrom != null || service.priceTo != null) && (
                <span className="mt-2 block text-[0.9375rem] font-semibold">
                  <PriceLabel from={service.priceFrom} to={service.priceTo} currency={service.currency} unit={service.priceUnit} locale={locale} />
                </span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/* ---------------------------------------------------------------- projects */

/** Heading level for card titles: h2 when the list sits directly under the page h1, h3 inside a section. */
type HeadingLevel = 'h2' | 'h3'

export function ProjectGrid({ projects, headingLevel = 'h3' }: { projects: PublicProjectCard[]; headingLevel?: HeadingLevel }) {
  const Heading = headingLevel
  return (
    <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project, i) => (
        <li key={project.id}>
          <Link href={`/work/${project.slug}`} className="group block">
            <div className="aspect-[4/3] overflow-hidden rounded-[var(--radius-panel)] border border-line bg-mist">
              {project.cover ? (
                <ResponsiveImage
                  image={project.cover}
                  sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  priority={i === 0}
                />
              ) : (
                <ProjectPlaceholder title={project.title} />
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate">
              {project.category && <span className="font-semibold text-glint">{project.category.name}</span>}
              {project.clientName && <span>{project.clientName}</span>}
              <SampleBadge show={project.isSample} />
            </div>
            <Heading className="mt-1.5 text-h3 font-bold group-hover:text-sheen">{project.title}</Heading>
            {project.summary && <p className="mt-2 text-slate">{project.summary}</p>}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function ProjectPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex h-full w-full items-end bg-[linear-gradient(135deg,var(--color-mist)_0%,var(--color-mist-deep)_100%)] p-5">
      <span className="text-sm font-semibold text-slate">Screenshots for “{title}” coming soon</span>
    </div>
  )
}

/** Intentional empty state: three blank browser frames waiting for real work. */
export function WorkEmptyState({
  title,
  body,
  ctaLabel = 'Talk to us about your project',
  headingLevel = 'h3',
}: {
  title: string
  body: string
  ctaLabel?: string
  headingLevel?: HeadingLevel
}) {
  const Heading = headingLevel
  return (
    <div className="grid items-center gap-10 rounded-[var(--radius-panel)] border border-dashed border-line p-8 md:grid-cols-[1fr_1.1fr] md:p-12">
      <div>
        <Heading className="text-h3 font-bold">{title}</Heading>
        <p className="mt-3 max-w-md text-slate">{body}</p>
        <Link href="/contact" className="btn btn-secondary mt-6" data-track="cta_click" data-track-cta-id="work_empty_contact" data-track-location="work_empty">
          {ctaLabel}
        </Link>
      </div>
      <div aria-hidden="true" className="relative h-48">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cx(
              'absolute w-[62%] rounded-[10px] border-2 bg-paper',
              i === 0 && 'left-0 top-0 border-line',
              i === 1 && 'left-[19%] top-6 border-mist-deep',
              i === 2 && 'left-[38%] top-12 border-plumage',
            )}
          >
            <div className="flex gap-1.5 border-b-2 border-inherit px-3 py-2">
              <span className="h-2 w-2 rounded-full border border-current opacity-60" />
              <span className="h-2 w-2 rounded-full border border-current opacity-60" />
              <span className="h-2 w-2 rounded-full border border-current opacity-60" />
            </div>
            <div className="space-y-2 p-3">
              <div className={cx('h-2.5 w-2/3 rounded-sm', i === 2 ? 'bg-plumage' : 'bg-mist-deep')} />
              <div className="h-2 w-1/2 rounded-sm bg-mist" />
              <div className="h-14 rounded-md bg-mist" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ budget tiers */

const BAR_HEIGHTS = ['h-2', 'h-3', 'h-4', 'h-5', 'h-6', 'h-7'] as const

export function tierRangeLabel(tier: PublicBudgetTier, locale: string): string | null {
  if (!tier.showAmounts) return null
  const range = formatRange(tier.minAmount, tier.maxAmount, tier.currency, locale)
  if (range) return range
  return tier.startingPrice != null ? `From ${formatMoney(tier.startingPrice, tier.currency, locale)}` : null
}

/**
 * Budget categories laid out along a single scale — smaller projects on the
 * left, larger on the right — so visitors can place themselves on it.
 */
export function BudgetScale({
  tiers,
  locale,
  tone = 'dark',
  headingLevel = 'h3',
}: {
  tiers: PublicBudgetTier[]
  locale: string
  tone?: 'dark' | 'light'
  headingLevel?: HeadingLevel
}) {
  const dark = tone === 'dark'
  const Heading = headingLevel
  return (
    <ol className={cx('grid gap-px overflow-hidden rounded-[var(--radius-panel)]', dark ? 'bg-plumage-line' : 'bg-line', tiers.length >= 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2')}>
      {tiers.map((tier, i) => {
        const range = tierRangeLabel(tier, locale)
        return (
          <li key={tier.id} className={cx('flex flex-col p-7', dark ? 'bg-plumage-raised' : 'bg-paper')}>
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="flex items-end gap-[3px]">
                {Array.from({ length: Math.min(tiers.length, 6) }, (_, bar) => (
                  <span
                    key={bar}
                    className={cx(
                      'w-1.5 rounded-sm',
                      BAR_HEIGHTS[bar],
                      bar <= i ? (dark ? 'bg-sheen-on-dark' : 'bg-sheen') : dark ? 'bg-plumage-line' : 'bg-line',
                    )}
                  />
                ))}
              </span>
              <SampleBadge show={tier.isSample} />
            </div>
            <Heading className="mt-5 text-h3 font-bold">{tier.name}</Heading>
            <p className={cx('tabular mt-1 text-lg font-semibold', dark ? 'text-sheen-on-dark' : 'text-sheen')}>
              {range ?? 'Budget discussed individually'}
            </p>
            {tier.description && <p className={cx('mt-3', dark ? 'text-slate-on-dark' : 'text-slate')}>{tier.description}</p>}
            {tier.typicalFeatures.length > 0 && (
              <ul className="mt-5 space-y-2 text-[0.9688rem]">
                {tier.typicalFeatures.slice(0, 5).map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <svg viewBox="0 0 16 16" className={cx('mt-1 h-4 w-4 flex-none', dark ? 'text-sheen-on-dark' : 'text-glint')} aria-hidden="true">
                      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            )}
            {tier.timeline && <p className={cx('mt-4 text-sm', dark ? 'text-slate-on-dark' : 'text-slate')}>Typical timeline: {tier.timeline}</p>}
            <div className="mt-auto pt-7">
              <Link
                href={`/contact?budget=${encodeURIComponent(tier.slug)}`}
                className={cx('btn btn-sm w-full', dark ? 'btn-light' : 'btn-secondary')}
                data-track="budget_tier_select"
                data-track-tier-slug={tier.slug}
                data-track-location="budget_scale"
              >
                {tier.ctaLabel || 'Start with this budget'}
              </Link>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/* ------------------------------------------------------------------ offers */

export function OfferList({
  offers,
  locale,
  compact = false,
  headingLevel = 'h3',
}: {
  offers: PublicOffer[]
  locale: string
  compact?: boolean
  headingLevel?: HeadingLevel
}) {
  const Heading = headingLevel
  return (
    <ul className="grid gap-6 md:grid-cols-2">
      {offers.map((offer) => {
        const { appliesTo, conditions } = describeOffer(offer, locale)
        return (
          <li key={offer.id} id={offer.slug} className="flex flex-col rounded-[var(--radius-panel)] border-2 border-plumage p-7">
            <div className="flex flex-wrap items-center gap-3">
              <span className="pill bg-sheen text-paper">{discountHeadline(offer, locale)}</span>
              <span className="text-[0.9375rem] font-semibold text-slate">{appliesTo}</span>
              <SampleBadge show={offer.isSample} />
            </div>
            <Heading className="mt-4 text-h3 font-bold">{offer.name}</Heading>
            {offer.summary && <p className="mt-2 text-slate">{offer.summary}</p>}
            {!compact && (
              <ul className="mt-5 space-y-1.5 border-t border-line pt-5 text-[0.9375rem]">
                {conditions.map((c) => (
                  <li key={c} className="flex gap-2.5">
                    <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full bg-plumage" />
                    {c}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-auto flex flex-wrap gap-3 pt-6">
              <Link
                href={`/contact?offer=${encodeURIComponent(offer.slug)}`}
                className="btn btn-primary btn-sm"
                data-track="offer_cta_click"
                data-track-offer-slug={offer.slug}
              >
                Ask about this offer
              </Link>
              {compact && (
                <Link href={`/offers#${offer.slug}`} className="btn btn-quiet btn-sm">
                  Conditions
                </Link>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
