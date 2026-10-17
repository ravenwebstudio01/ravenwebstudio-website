import type { Metadata } from 'next'
import Link from 'next/link'
import { HeroIllustration } from '@/components/brand/hero-illustration'
import { SectionHeading } from '@/components/site/bits'
import { BudgetScale, OfferList, ProjectGrid, ServiceIndex, WorkEmptyState } from '@/components/site/sections'
import type { ContentItem } from '@/lib/content/registry'
import {
  getContent,
  getPublicOffers,
  getPublishedBudgetTiers,
  getPublishedCollaborationTypes,
  getPublishedProjects,
  getPublishedServices,
  getSettings,
} from '@/lib/content/queries'
import { pageMetadata } from '@/lib/seo'

type Hero = { headline: string; intro: string; primaryCta: string; secondaryCta: string; assurances: string[] }
type Simple = { heading: string; intro: string }

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getContent<{ title: string; description: string }>('seo.home')
  return pageMetadata({ title: seo.title, description: seo.description, path: '/', absoluteTitle: true })
}

export default async function HomePage() {
  const [settings, hero, servicesCopy, processCopy, workCopy, budgetsCopy, offersCopy, collabCopy, ctaCopy] = await Promise.all([
    getSettings(),
    getContent<Hero>('home.hero'),
    getContent<Simple>('home.services'),
    getContent<Simple & { steps: ContentItem[] }>('home.process'),
    getContent<Simple & { emptyTitle: string; emptyBody: string }>('home.work'),
    getContent<Simple>('home.budgets'),
    getContent<Simple>('home.offers'),
    getContent<Simple>('home.collaboration'),
    getContent<{ heading: string; body: string; button: string }>('home.cta'),
  ])
  const [services, projects, tiers, offers, collaborations] = await Promise.all([
    getPublishedServices(),
    getPublishedProjects(),
    getPublishedBudgetTiers(),
    getPublicOffers(),
    getPublishedCollaborationTypes(),
  ])
  const featured = (projects.some((p) => p.featured) ? projects.filter((p) => p.featured) : projects).slice(0, 3)
  const locale = settings.locale

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="shell grid items-center gap-10 pb-16 pt-12 md:pt-16 lg:grid-cols-[1.08fr_1fr] lg:gap-6 lg:pb-24 lg:pt-20">
          <div className="hero-rise">
            {!settings.acceptingProjects && settings.availabilityNote && (
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-sm font-semibold text-slate">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-warning" />
                {settings.availabilityNote}
              </p>
            )}
            <h1 className="text-display max-w-[13ch] font-extrabold">{hero.headline}</h1>
            <p className="mt-6 max-w-xl text-lede text-slate">{hero.intro}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/contact" className="btn btn-primary" data-track="cta_click" data-track-cta-id="hero_primary" data-track-location="hero">
                {hero.primaryCta}
              </Link>
              <Link href="/work" className="btn btn-secondary" data-track="cta_click" data-track-cta-id="hero_secondary" data-track-location="hero">
                {hero.secondaryCta}
              </Link>
            </div>
            {hero.assurances.length > 0 && (
              <ul className="mt-10 grid gap-3 border-t border-line pt-6 text-[0.9688rem] sm:grid-cols-3 sm:gap-6">
                {hero.assurances.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <svg viewBox="0 0 16 16" className="mt-1 h-4 w-4 flex-none text-glint" aria-hidden="true">
                      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mx-auto w-full max-w-[34rem] lg:max-w-none">
            <HeroIllustration />
          </div>
        </div>
      </section>

      {/* Services */}
      <section aria-labelledby="home-services" className="py-16 lg:py-24">
        <div className="shell">
          <div id="home-services">
            <SectionHeading
              title={servicesCopy.heading}
              intro={servicesCopy.intro}
              action={
                <Link href="/services" className="text-link whitespace-nowrap">
                  All services
                </Link>
              }
            />
          </div>
          <div className="mt-12">
            {services.length > 0 ? (
              <ServiceIndex services={services.slice(0, 6)} locale={locale} />
            ) : (
              <p className="border-t border-line pt-6 text-slate">Service descriptions are being updated.</p>
            )}
          </div>
        </div>
      </section>

      {/* Process */}
      {processCopy.steps.length > 0 && (
        <section aria-labelledby="home-process" className="bg-mist py-16 lg:py-24">
          <div className="shell">
            <div id="home-process">
              <SectionHeading title={processCopy.heading} intro={processCopy.intro} />
            </div>
            <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none lg:gap-6">
              {processCopy.steps.map((step, i) => (
                <li key={step.title} className="relative border-t-2 border-plumage pt-5">
                  <span className="tabular text-sm font-bold text-sheen">Step {i + 1}</span>
                  <h3 className="mt-1 text-xl font-bold tracking-tight">{step.title}</h3>
                  <p className="mt-2 text-[0.9688rem] text-slate">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* Work */}
      <section aria-labelledby="home-work" className="py-16 lg:py-24">
        <div className="shell">
          <div id="home-work">
            <SectionHeading
              title={workCopy.heading}
              intro={workCopy.intro}
              action={
                featured.length > 0 ? (
                  <Link href="/work" className="text-link whitespace-nowrap">
                    All projects
                  </Link>
                ) : undefined
              }
            />
          </div>
          <div className="mt-12">
            {featured.length > 0 ? <ProjectGrid projects={featured} /> : <WorkEmptyState title={workCopy.emptyTitle} body={workCopy.emptyBody} />}
          </div>
        </div>
      </section>

      {/* Budgets */}
      {tiers.length > 0 && (
        <section aria-labelledby="home-budgets" className="on-dark bg-plumage py-16 text-paper lg:py-24">
          <div className="shell">
            <div id="home-budgets">
              <SectionHeading
                title={budgetsCopy.heading}
                intro={budgetsCopy.intro}
                tone="light"
                action={
                  <Link href="/pricing" className="whitespace-nowrap font-semibold text-sheen-on-dark underline underline-offset-4 hover:text-paper">
                    Compare project types
                  </Link>
                }
              />
            </div>
            <div className="mt-12">
              <BudgetScale tiers={tiers.slice(0, 3)} locale={locale} />
            </div>
          </div>
        </section>
      )}

      {/* Offers */}
      {offers.length > 0 && (
        <section aria-labelledby="home-offers" className="py-16 lg:py-24">
          <div className="shell">
            <div id="home-offers">
              <SectionHeading
                title={offersCopy.heading}
                intro={offersCopy.intro}
                action={
                  <Link href="/offers" className="text-link whitespace-nowrap">
                    All offers
                  </Link>
                }
              />
            </div>
            <div className="mt-12">
              <OfferList offers={offers.slice(0, 2)} locale={locale} compact />
            </div>
          </div>
        </section>
      )}

      {/* Collaboration */}
      <section aria-labelledby="home-collab" className="bg-mist py-16 lg:py-24">
        <div className="shell grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <h2 id="home-collab" className="text-h2 font-extrabold">
              {collabCopy.heading}
            </h2>
            <p className="mt-4 text-lede text-slate">{collabCopy.intro}</p>
            <p className="mt-6 inline-flex items-center gap-2 text-[0.9375rem] font-semibold">
              <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${settings.acceptingCollaborations ? 'bg-success' : 'bg-warning'}`} />
              {settings.acceptingCollaborations ? 'Currently open to new collaborations' : 'Not taking on new collaborations right now'}
            </p>
            <div className="mt-6">
              <Link href="/about#collaborate" className="btn btn-secondary" data-track="collaboration_cta_click" data-track-location="home">
                How we collaborate
              </Link>
            </div>
          </div>
          {collaborations.length > 0 && (
            <ul className="divide-y divide-line self-center border-y border-line">
              {collaborations.map((c) => (
                <li key={c.id} className="py-4">
                  <p className="font-bold">{c.name}</p>
                  {c.summary && <p className="mt-1 text-[0.9688rem] text-slate">{c.summary}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Closing CTA */}
      <section aria-labelledby="home-cta" className="py-20 lg:py-28">
        <div className="shell grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <h2 id="home-cta" className="text-h1 max-w-[16ch] font-extrabold">
              {ctaCopy.heading}
            </h2>
            <p className="mt-5 max-w-xl text-lede text-slate">{ctaCopy.body}</p>
          </div>
          <div className="lg:justify-self-end">
            <Link href="/contact" className="btn btn-primary" data-track="cta_click" data-track-cta-id="home_closing" data-track-location="closing_cta">
              {ctaCopy.button}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
