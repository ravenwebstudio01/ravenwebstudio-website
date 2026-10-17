import type { Metadata } from 'next'
import Link from 'next/link'
import { SectionHeading } from '@/components/site/bits'
import { BudgetScale, tierRangeLabel } from '@/components/site/sections'
import { getContent, getPublishedBudgetTiers, getSettings } from '@/lib/content/queries'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getContent<{ title: string; description: string }>('seo.pricing')
  return pageMetadata({ title: seo.title, description: seo.description, path: '/pricing' })
}

export default async function PricingPage() {
  const [copy, tiers, settings] = await Promise.all([
    getContent<{ heading: string; intro: string; note: string; emptyBody: string }>('page.pricing'),
    getPublishedBudgetTiers(),
    getSettings(),
  ])
  const locale = settings.locale
  const hasSuitable = tiers.some((t) => t.suitableFor.length > 0)
  const hasServices = tiers.some((t) => t.services.length > 0)

  return (
    <div className="shell py-14 lg:py-20">
      <SectionHeading as="h1" title={copy.heading} intro={copy.intro} />

      {tiers.length === 0 ? (
        <div className="mt-12 rounded-[var(--radius-panel)] border border-dashed border-line p-8">
          <p className="max-w-xl text-slate">{copy.emptyBody}</p>
          <Link href="/contact" className="btn btn-primary mt-6">
            Start a project
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-12">
            <BudgetScale tiers={tiers} locale={locale} tone="light" />
          </div>
          {copy.note && <p className="mt-5 max-w-3xl text-[0.9375rem] text-slate">{copy.note}</p>}

          {(hasSuitable || hasServices) && (
            <section className="mt-20" aria-labelledby="compare-title">
              <h2 id="compare-title" className="text-h2 font-extrabold">
                Compare at a glance
              </h2>
              <div className="mt-8 overflow-x-auto rounded-[var(--radius-panel)] border border-line">
                <table className="w-full min-w-[40rem] border-collapse text-left text-[0.9688rem]">
                  <caption className="sr-only">Project categories compared by budget, suitable projects and services</caption>
                  <thead className="bg-mist">
                    <tr>
                      <th scope="col" className="p-4 font-bold">
                        Category
                      </th>
                      <th scope="col" className="p-4 font-bold">
                        Budget
                      </th>
                      {hasSuitable && (
                        <th scope="col" className="p-4 font-bold">
                          Suitable for
                        </th>
                      )}
                      {hasServices && (
                        <th scope="col" className="p-4 font-bold">
                          Related services
                        </th>
                      )}
                      <th scope="col" className="p-4 font-bold">
                        Timeline
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiers.map((tier) => (
                      <tr key={tier.id} className="border-t border-line align-top">
                        <th scope="row" className="p-4 font-bold">
                          {tier.name}
                        </th>
                        <td className="tabular p-4">{tierRangeLabel(tier, locale) ?? 'On request'}</td>
                        {hasSuitable && <td className="p-4">{tier.suitableFor.join(', ') || '—'}</td>}
                        {hasServices && (
                          <td className="p-4">
                            {tier.services.length
                              ? tier.services.map((s, i) => (
                                  <span key={s.slug}>
                                    {i > 0 && ', '}
                                    <Link href={`/services/${s.slug}`} className="text-link">
                                      {s.name}
                                    </Link>
                                  </span>
                                ))
                              : '—'}
                          </td>
                        )}
                        <td className="p-4">{tier.timeline || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      <div className="mt-16 rounded-[var(--radius-panel)] bg-mist p-8">
        <h2 className="text-xl font-bold">Not sure which fits?</h2>
        <p className="mt-1 max-w-2xl text-slate">
          Tell us your goals and the budget you have in mind. We will suggest a scope that makes the most of it — including what to
          leave for a later phase.
        </p>
        <Link href="/contact" className="btn btn-primary mt-5" data-track="cta_click" data-track-cta-id="pricing_contact" data-track-location="pricing">
          Start a project
        </Link>
      </div>
    </div>
  )
}
