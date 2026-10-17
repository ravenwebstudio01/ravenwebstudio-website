import type { Metadata } from 'next'
import Link from 'next/link'
import { Markdown } from '@/components/markdown'
import { SampleBadge } from '@/components/site/bits'
import type { ContentItem } from '@/lib/content/registry'
import { getContent, getPublishedCollaborationTypes, getSettings } from '@/lib/content/queries'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getContent<{ title: string; description: string }>('seo.about')
  return pageMetadata({ title: seo.title, description: seo.description, path: '/about' })
}

export default async function AboutPage() {
  const [intro, principles, collab, types, settings] = await Promise.all([
    getContent<{ heading: string; lede: string; body: string }>('about.intro'),
    getContent<{ heading: string; items: ContentItem[] }>('about.principles'),
    getContent<{ heading: string; intro: string; closedMessage: string; button: string }>('about.collaboration'),
    getPublishedCollaborationTypes(),
    getSettings(),
  ])

  return (
    <>
      <section className="shell py-14 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <div>
            <h1 className="text-h1 font-extrabold">{intro.heading}</h1>
            <p className="mt-5 text-lede text-slate">{intro.lede}</p>
          </div>
          <Markdown className="lg:pt-3">{intro.body}</Markdown>
        </div>
      </section>

      {principles.items.length > 0 && (
        <section aria-labelledby="principles" className="bg-mist py-16 lg:py-20">
          <div className="shell">
            <h2 id="principles" className="text-h2 font-extrabold">
              {principles.heading}
            </h2>
            <dl className="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-2">
              {principles.items.map((item) => (
                <div key={item.title} className="border-t-2 border-plumage pt-4">
                  <dt className="text-xl font-bold tracking-tight">{item.title}</dt>
                  <dd className="mt-2 text-slate">{item.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      <section id="collaborate" aria-labelledby="collab-title" className="scroll-mt-24 py-16 lg:py-24">
        <div className="shell grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <div>
            <h2 id="collab-title" className="text-h2 font-extrabold">
              {collab.heading}
            </h2>
            <p className="mt-4 text-lede text-slate">{settings.acceptingCollaborations ? collab.intro : collab.closedMessage}</p>
            <p className="mt-6 inline-flex items-center gap-2 font-semibold">
              <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${settings.acceptingCollaborations ? 'bg-success' : 'bg-warning'}`} />
              {settings.acceptingCollaborations ? 'Open to new collaborations' : 'Not taking on new collaborations right now'}
            </p>
            <div className="mt-7">
              <Link
                href="/contact?type=collaboration"
                className="btn btn-primary"
                data-track="collaboration_cta_click"
                data-track-location="about"
              >
                {collab.button}
              </Link>
            </div>
          </div>
          {types.length > 0 && (
            <ul className="divide-y divide-line border-y border-line">
              {types.map((t) => (
                <li key={t.id} className="py-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold tracking-tight">{t.name}</h3>
                    <SampleBadge show={t.isSample} />
                  </div>
                  {t.summary && <p className="mt-1.5 text-slate">{t.summary}</p>}
                  {t.description && <Markdown className="mt-3 text-[0.9688rem]">{t.description}</Markdown>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  )
}
