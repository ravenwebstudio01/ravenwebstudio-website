import type { Metadata } from 'next'
import Link from 'next/link'
import { Markdown } from '@/components/markdown'
import { SectionHeading } from '@/components/site/bits'
import { OfferList } from '@/components/site/sections'
import { getContent, getPublicOffers, getSettings } from '@/lib/content/queries'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getContent<{ title: string; description: string }>('seo.offers')
  return pageMetadata({ title: seo.title, description: seo.description, path: '/offers' })
}

export default async function OffersPage() {
  const [copy, offers, settings] = await Promise.all([
    getContent<{ heading: string; intro: string; emptyTitle: string; emptyBody: string }>('page.offers'),
    getPublicOffers(),
    getSettings(),
  ])
  const withTerms = offers.filter((o) => o.terms.trim() || o.description.trim())

  return (
    <div className="shell py-14 lg:py-20">
      <SectionHeading as="h1" title={copy.heading} intro={copy.intro} />

      {offers.length === 0 ? (
        <div className="mt-12 rounded-[var(--radius-panel)] border border-dashed border-line p-8">
          <h2 className="text-h3 font-bold">{copy.emptyTitle}</h2>
          <p className="mt-2 max-w-xl text-slate">{copy.emptyBody}</p>
          <Link href="/contact" className="btn btn-primary mt-6" data-track="cta_click" data-track-cta-id="offers_empty_contact" data-track-location="offers">
            Ask for a proposal
          </Link>
        </div>
      ) : (
        <div className="mt-12">
          <OfferList offers={offers} locale={settings.locale} />
        </div>
      )}

      {withTerms.length > 0 && (
        <section className="mt-20 border-t border-line pt-10" aria-labelledby="offer-terms">
          <h2 id="offer-terms" className="text-h3 font-bold">
            Details and terms
          </h2>
          <div className="mt-6 space-y-10">
            {withTerms.map((offer) => (
              <div key={offer.id}>
                <h3 className="font-bold">{offer.name}</h3>
                {offer.description && <Markdown className="mt-2">{offer.description}</Markdown>}
                {offer.terms && <Markdown className="mt-3 text-[0.9375rem] text-slate">{offer.terms}</Markdown>}
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="mt-12 max-w-3xl text-[0.9375rem] text-slate">
        Offers are applied when the conditions are met and confirmed in your written proposal. Discounts are calculated on the
        prices in that proposal.
      </p>
    </div>
  )
}
