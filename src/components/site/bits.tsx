import Link from 'next/link'
import type { ReactNode } from 'react'
import { formatMoney, formatRange } from '@/lib/money'
import type { MediaView } from '@/lib/media/view'
import { cx } from '@/lib/utils'

/** Visible marker on development sample records (never shown in production). */
export function SampleBadge({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <span className="pill bg-warning-soft text-warning" title="Sample content for development. Not shown in production.">
      Sample content
    </span>
  )
}

export function SectionHeading({
  title,
  intro,
  as: Tag = 'h2',
  className,
  action,
  tone = 'default',
}: {
  title: string
  intro?: string
  as?: 'h1' | 'h2'
  className?: string
  action?: ReactNode
  tone?: 'default' | 'light'
}) {
  return (
    <div className={cx('flex flex-col gap-6 md:flex-row md:items-end md:justify-between', className)}>
      <div className="max-w-2xl">
        <Tag className={cx(Tag === 'h1' ? 'text-h1' : 'text-h2', 'font-extrabold')}>{title}</Tag>
        {intro && (
          <p className={cx('mt-4 text-lede', tone === 'light' ? 'text-slate-on-dark' : 'text-slate')}>{intro}</p>
        )}
      </div>
      {action}
    </div>
  )
}

const UNIT_SUFFIX = { project: '', month: ' / month', hour: ' / hour' } as const

export function PriceLabel({
  from,
  to,
  currency,
  unit = 'project',
  locale,
}: {
  from: number | null
  to?: number | null
  currency: string
  unit?: 'project' | 'month' | 'hour'
  locale?: string
}) {
  if (from == null && to == null) return null
  const text = to != null && from != null ? formatRange(from, to, currency, locale) : from != null ? `From ${formatMoney(from, currency, locale)}` : formatRange(null, to, currency, locale)
  return (
    <span className="tabular">
      {text}
      {UNIT_SUFFIX[unit]}
    </span>
  )
}

export function ResponsiveImage({
  image,
  sizes,
  className,
  priority = false,
}: {
  image: MediaView
  sizes: string
  className?: string
  priority?: boolean
}) {
  return (
    <img
      src={image.src}
      srcSet={image.srcSet}
      sizes={sizes}
      alt={image.alt}
      width={image.width}
      height={image.height}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      className={className}
    />
  )
}

export function JsonLd({ data, nonce }: { data: Record<string, unknown>; nonce?: string }) {
  // JSON.stringify output is escaped for "<" so content can never close the script tag.
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: json }} />
}

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[0.9375rem] text-slate">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true">/</span>}
            {item.href ? (
              <Link href={item.href} className="hover:text-sheen hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-semibold text-plumage">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
