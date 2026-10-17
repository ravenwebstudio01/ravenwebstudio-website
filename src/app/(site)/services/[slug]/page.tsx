import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound, permanentRedirect, redirect } from 'next/navigation'
import { Markdown } from '@/components/markdown'
import { Breadcrumbs, JsonLd, PriceLabel, ResponsiveImage, SampleBadge } from '@/components/site/bits'
import { ServiceIcon } from '@/components/site/service-icon'
import { findRedirect, getServiceBySlug, getSettings } from '@/lib/content/queries'
import { absoluteUrl, breadcrumbJsonLd, pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const service = await getServiceBySlug(slug)
  if (!service) return { title: 'Service not found', robots: { index: false } }
  return pageMetadata({
    title: service.seoTitle || service.name,
    description: service.seoDescription || service.shortDescription,
    path: `/services/${service.slug}`,
    image: service.image ? { url: service.image.src, width: service.image.width, height: service.image.height, alt: service.image.alt } : null,
  })
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params
  const [service, settings, h] = await Promise.all([getServiceBySlug(slug), getSettings(), headers()])
  if (!service) {
    const target = await findRedirect(`/services/${slug}`)
    if (target) (target.permanent ? permanentRedirect : redirect)(target.toPath)
    notFound()
  }
  const nonce = h.get('x-nonce') ?? undefined
  const hasPrice = service.showPrice && (service.priceFrom != null || service.priceTo != null)

  const serviceLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.shortDescription,
    url: absoluteUrl(`/services/${service.slug}`),
    provider: { '@id': `${absoluteUrl('/')}#organization` },
    areaServed: { '@type': 'Place', name: 'Europe' },
  }
  if (hasPrice && service.priceFrom != null) {
    serviceLd.offers = {
      '@type': 'Offer',
      priceCurrency: service.currency,
      price: (service.priceFrom / 100).toFixed(2),
      priceSpecification: { '@type': 'PriceSpecification', minPrice: (service.priceFrom / 100).toFixed(2), priceCurrency: service.currency },
    }
  }

  return (
    <article className="shell py-12 lg:py-16">
      <Breadcrumbs items={[{ href: '/', label: 'Home' }, { href: '/services', label: 'Services' }, { label: service.name }]} />

      <header className="mt-8 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-control)] bg-sheen-soft text-sheen">
              <ServiceIcon name={service.icon} className="h-6 w-6" />
            </span>
            {service.category && <span className="text-sm font-bold text-glint">{service.category.name}</span>}
            <SampleBadge show={service.isSample} />
          </div>
          <h1 className="mt-5 text-h1 font-extrabold">{service.name}</h1>
          <p className="mt-5 max-w-2xl text-lede text-slate">{service.shortDescription}</p>
        </div>
        <aside className="self-start rounded-[var(--radius-panel)] border-2 border-plumage p-6">
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-semibold text-slate">Price</dt>
              <dd className="mt-0.5 text-xl font-bold">
                {hasPrice ? (
                  <PriceLabel from={service.priceFrom} to={service.priceTo} currency={service.currency} unit={service.priceUnit} locale={settings.locale} />
                ) : (
                  'Quoted after a short brief'
                )}
              </dd>
            </div>
            {service.timeline && (
              <div>
                <dt className="text-sm font-semibold text-slate">Typical timeline</dt>
                <dd className="mt-0.5 font-semibold">{service.timeline}</dd>
              </div>
            )}
          </dl>
          <Link
            href={`/contact?service=${encodeURIComponent(service.slug)}`}
            className="btn btn-primary mt-6 w-full"
            data-track="service_inquiry_click"
            data-track-service-slug={service.slug}
          >
            Ask about this service
          </Link>
          {hasPrice && <p className="mt-3 text-sm text-slate">Prices are starting points; your proposal confirms the final scope and cost.</p>}
        </aside>
      </header>

      {service.image && (
        <div className="mt-12 overflow-hidden rounded-[var(--radius-panel)] border border-line">
          <ResponsiveImage image={service.image} sizes="(min-width: 1216px) 1136px, 100vw" className="h-auto w-full" priority />
        </div>
      )}

      <div className="mt-14 grid gap-12 lg:grid-cols-[1.5fr_1fr]">
        <div>{service.description ? <Markdown>{service.description}</Markdown> : null}</div>
        <div className="space-y-10">
          {service.features.length > 0 && (
            <section>
              <h2 className="text-lg font-bold">What is included</h2>
              <ul className="mt-4 space-y-2.5">
                {service.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <svg viewBox="0 0 16 16" className="mt-1 h-4 w-4 flex-none text-glint" aria-hidden="true">
                      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {service.deliverables.length > 0 && (
            <section>
              <h2 className="text-lg font-bold">You receive</h2>
              <ul className="mt-4 list-disc space-y-1.5 pl-5">
                {service.deliverables.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {service.related.length > 0 && (
        <section className="mt-16 border-t border-line pt-10" aria-labelledby="related-services">
          <h2 id="related-services" className="text-h3 font-bold">
            Often combined with
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {service.related.map((r) => (
              <li key={r.id}>
                <Link href={`/services/${r.slug}`} className="group block rounded-[var(--radius-panel)] border border-line p-5 hover:border-plumage">
                  <span className="font-bold group-hover:text-sheen">{r.name}</span>
                  <span className="mt-1 block text-[0.9375rem] text-slate">{r.shortDescription}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <JsonLd data={serviceLd} nonce={nonce} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Services', path: '/services' },
          { name: service.name, path: `/services/${service.slug}` },
        ])}
        nonce={nonce}
      />
    </article>
  )
}
