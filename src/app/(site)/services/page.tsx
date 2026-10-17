import type { Metadata } from 'next'
import Link from 'next/link'
import { SectionHeading } from '@/components/site/bits'
import { ServiceIndex } from '@/components/site/sections'
import { getContent, getPublishedServices, getSettings, type PublicService } from '@/lib/content/queries'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getContent<{ title: string; description: string }>('seo.services')
  return pageMetadata({ title: seo.title, description: seo.description, path: '/services' })
}

function groupByCategory(services: PublicService[]) {
  const groups = new Map<string, { name: string; services: PublicService[] }>()
  for (const service of services) {
    const key = service.category?.slug ?? '_other'
    const name = service.category?.name ?? 'Other services'
    if (!groups.has(key)) groups.set(key, { name, services: [] })
    groups.get(key)!.services.push(service)
  }
  return [...groups.values()]
}

export default async function ServicesPage() {
  const [copy, services, settings] = await Promise.all([
    getContent<{ heading: string; intro: string; emptyBody: string }>('page.services'),
    getPublishedServices(),
    getSettings(),
  ])
  const groups = groupByCategory(services)
  const useGroups = groups.length > 1

  return (
    <div className="shell py-14 lg:py-20">
      <SectionHeading as="h1" title={copy.heading} intro={copy.intro} />

      {services.length === 0 ? (
        <div className="mt-12 rounded-[var(--radius-panel)] border border-dashed border-line p-8">
          <p className="max-w-xl text-slate">{copy.emptyBody}</p>
          <Link href="/contact" className="btn btn-primary mt-6">
            Tell us what you need
          </Link>
        </div>
      ) : useGroups ? (
        <div className="mt-14 space-y-14">
          {groups.map((group) => (
            <section key={group.name} aria-label={group.name}>
              <h2 className="mb-4 text-sm font-bold text-glint">{group.name}</h2>
              <ServiceIndex services={group.services} locale={settings.locale} />
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-14">
          <ServiceIndex services={services} locale={settings.locale} />
        </div>
      )}

      <div className="mt-16 flex flex-col gap-6 rounded-[var(--radius-panel)] bg-mist p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">Need several services?</h2>
          <p className="mt-1 text-slate">Combining services can qualify for bundle pricing. See current offers or ask for a tailored proposal.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/offers" className="btn btn-secondary btn-sm">
            View offers
          </Link>
          <Link href="/contact" className="btn btn-primary btn-sm" data-track="cta_click" data-track-cta-id="services_bundle_contact" data-track-location="services">
            Start a project
          </Link>
        </div>
      </div>
    </div>
  )
}
