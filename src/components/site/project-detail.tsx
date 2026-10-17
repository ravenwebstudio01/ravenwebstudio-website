import Link from 'next/link'
import { Markdown } from '@/components/markdown'
import type { PublicProject } from '@/lib/content/queries'
import { formatMonthYear, safeExternalUrl } from '@/lib/utils'
import { Breadcrumbs, ResponsiveImage, SampleBadge } from './bits'

/** Shared by the public project page and the dashboard preview. */
export function ProjectDetail({ project }: { project: PublicProject }) {
  const url = safeExternalUrl(project.projectUrl)
  const facts: [string, string][] = [
    ...(project.clientName ? ([['Client', project.clientName]] as [string, string][]) : []),
    ...(project.category ? ([['Category', project.category.name]] as [string, string][]) : []),
    ...(project.completedOn ? ([['Completed', formatMonthYear(project.completedOn)]] as [string, string][]) : []),
  ]
  return (
    <article className="shell py-12 lg:py-16">
      <Breadcrumbs items={[{ href: '/', label: 'Home' }, { href: '/work', label: 'Work' }, { label: project.title }]} />
      <header className="mt-8 max-w-3xl">
        <SampleBadge show={project.isSample} />
        <h1 className="mt-3 text-h1 font-extrabold">{project.title}</h1>
        {project.summary && <p className="mt-5 text-lede text-slate">{project.summary}</p>}
      </header>

      {project.cover && (
        <div className="mt-10 overflow-hidden rounded-[var(--radius-panel)] border border-line">
          <ResponsiveImage image={project.cover} sizes="(min-width: 1216px) 1136px, 100vw" className="h-auto w-full" priority />
        </div>
      )}

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_2fr]">
        <aside className="space-y-8 lg:sticky lg:top-28 lg:self-start">
          {facts.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-1">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-sm font-semibold text-slate">{k}</dt>
                  <dd className="mt-0.5 font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {project.services.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate">Services</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {project.services.map((s) => (
                  <li key={s.slug}>
                    <Link href={`/services/${s.slug}`} className="pill border border-line hover:border-plumage">
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {project.technologies.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate">Technologies</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {project.technologies.map((t) => (
                  <li key={t} className="pill bg-mist">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {url && (
            <a href={url} rel="noopener noreferrer" target="_blank" className="btn btn-secondary btn-sm">
              Visit the live site<span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </aside>

        <div className="space-y-12">
          {project.goals && (
            <section>
              <h2 className="text-h3 font-bold">Goals</h2>
              <Markdown className="mt-4">{project.goals}</Markdown>
            </section>
          )}
          {project.description && (
            <section>
              <h2 className="text-h3 font-bold">The project</h2>
              <Markdown className="mt-4">{project.description}</Markdown>
            </section>
          )}
          {project.deliverables.length > 0 && (
            <section>
              <h2 className="text-h3 font-bold">Deliverables</h2>
              <ul className="mt-4 list-disc space-y-1.5 pl-5">
                {project.deliverables.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </section>
          )}
          {project.results && (
            <section>
              <h2 className="text-h3 font-bold">Results</h2>
              <Markdown className="mt-4">{project.results}</Markdown>
            </section>
          )}
        </div>
      </div>

      {project.gallery.length > 0 && (
        <section className="mt-16" aria-labelledby="gallery-title">
          <h2 id="gallery-title" className="text-h3 font-bold">
            Screens
          </h2>
          <ul className="mt-6 grid gap-6 md:grid-cols-2">
            {project.gallery.map((image) => (
              <li key={image.id}>
                <figure>
                  <div className="overflow-hidden rounded-[var(--radius-panel)] border border-line">
                    <ResponsiveImage image={image} sizes="(min-width: 768px) 560px, 100vw" className="h-auto w-full" />
                  </div>
                  {image.caption && <figcaption className="mt-2 text-sm text-slate">{image.caption}</figcaption>}
                </figure>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-16 flex flex-col gap-4 border-t border-line pt-10 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-lg font-bold">Planning something similar?</p>
        <Link href="/contact" className="btn btn-primary" data-track="cta_click" data-track-cta-id="project_contact" data-track-location="project_detail">
          Start a project
        </Link>
      </div>
    </article>
  )
}
