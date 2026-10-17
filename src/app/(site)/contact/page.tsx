import type { Metadata } from 'next'
import { InquiryForm } from '@/components/site/inquiry-form'
import { tierRangeLabel } from '@/components/site/sections'
import {
  getContent,
  getPublicOffers,
  getPublishedBudgetTiers,
  getPublishedCollaborationTypes,
  getPublishedServices,
  getSettings,
} from '@/lib/content/queries'
import { SLUG_RE } from '@/lib/inquiries/schema'
import { issueFormToken } from '@/lib/security/form-token'
import { pageMetadata } from '@/lib/seo'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getContent<{ title: string; description: string }>('seo.contact')
  return pageMetadata({ title: seo.title, description: seo.description, path: '/contact' })
}

function param(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value
  return v && SLUG_RE.test(v) ? v : undefined
}

const TYPE_PARAMS = new Set(['project', 'existing_client', 'collaboration', 'general'])

export default async function ContactPage({ searchParams }: Props) {
  const sp = await searchParams
  const [copy, settings, services, tiers, collaborationTypes, offers] = await Promise.all([
    getContent<{ heading: string; intro: string; successTitle: string; successBody: string; closedNote: string }>('page.contact'),
    getSettings(),
    getPublishedServices(),
    getPublishedBudgetTiers(),
    getPublishedCollaborationTypes(),
    getPublicOffers(),
  ])
  const typeParam = Array.isArray(sp.type) ? sp.type[0] : sp.type

  return (
    <div className="shell py-14 lg:py-20">
      <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h1 className="text-h1 font-extrabold">{copy.heading}</h1>
          <p className="mt-5 text-lede text-slate">{copy.intro}</p>
          {!settings.acceptingProjects && (
            <p className="mt-6 rounded-[var(--radius-control)] border-l-4 border-warning bg-warning-soft p-4 text-[0.9375rem]">
              {copy.closedNote}
            </p>
          )}
          <div className="mt-10 border-t border-line pt-6">
            <h2 className="font-bold">What happens next</h2>
            <ol className="mt-4 space-y-3 text-[0.9688rem] text-slate">
              <li className="flex gap-3">
                <span className="tabular font-bold text-sheen">1</span>We read your inquiry and reply personally.
              </li>
              <li className="flex gap-3">
                <span className="tabular font-bold text-sheen">2</span>If it is a good fit, we suggest a short call about your goals.
              </li>
              <li className="flex gap-3">
                <span className="tabular font-bold text-sheen">3</span>You receive a written proposal with scope, timeline and price.
              </li>
            </ol>
          </div>
          {settings.contactEmail && (
            <p className="mt-8 text-[0.9688rem]">
              Prefer e-mail?{' '}
              <a href={`mailto:${settings.contactEmail}`} className="text-link">
                {settings.contactEmail}
              </a>
            </p>
          )}
        </div>

        <div>
          <noscript>
            <p className="mb-6 rounded-[var(--radius-control)] bg-warning-soft p-4">
              This form needs JavaScript. {settings.contactEmail ? `You can also write to ${settings.contactEmail}.` : ''}
            </p>
          </noscript>
          <InquiryForm
            formToken={issueFormToken()}
            locale={settings.locale}
            successTitle={copy.successTitle}
            successBody={copy.successBody}
            options={{
              services: services.map((s) => ({ slug: s.slug, name: s.name })),
              hasPricedServices: services.some((s) => s.showPrice && s.priceFrom != null),
              budgetTiers: tiers.map((t) => {
                const range = tierRangeLabel(t, settings.locale)
                return { slug: t.slug, label: range ? `${t.name} (${range})` : t.name }
              }),
              collaborationTypes: collaborationTypes.map((c) => ({ slug: c.slug, name: c.name })),
              offers: offers.map((o) => ({ slug: o.slug, name: o.name })),
            }}
            defaults={{
              serviceSlug: param(sp.service),
              budgetSlug: param(sp.budget),
              offerSlug: param(sp.offer),
              inquiryType: typeParam && TYPE_PARAMS.has(typeParam) ? typeParam : undefined,
            }}
          />
        </div>
      </div>
    </div>
  )
}
