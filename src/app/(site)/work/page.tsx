import type { Metadata } from 'next'
import Link from 'next/link'
import { SectionHeading } from '@/components/site/bits'
import { ProjectGrid, WorkEmptyState } from '@/components/site/sections'
import { getContent, getPublishedProjects } from '@/lib/content/queries'
import { pageMetadata } from '@/lib/seo'
import { cx } from '@/lib/utils'

type Props = { searchParams: Promise<{ category?: string }> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { category } = await searchParams
  const seo = await getContent<{ title: string; description: string }>('seo.work')
  // Filtered views canonicalise to the main page so search engines index one URL.
  return { ...pageMetadata({ title: seo.title, description: seo.description, path: '/work' }), ...(category ? { robots: { index: false, follow: true } } : {}) }
}

export default async function WorkPage({ searchParams }: Props) {
  const { category } = await searchParams
  const [copy, homeWork, projects] = await Promise.all([
    getContent<{ heading: string; intro: string }>('page.work'),
    getContent<{ emptyTitle: string; emptyBody: string }>('home.work'),
    getPublishedProjects(),
  ])
  const categories = [...new Map(projects.flatMap((p) => (p.category ? [[p.category.slug, p.category] as const] : []))).values()]
  const active = categories.find((c) => c.slug === category)?.slug
  const visible = active ? projects.filter((p) => p.category?.slug === active) : projects

  return (
    <div className="shell py-14 lg:py-20">
      <SectionHeading as="h1" title={copy.heading} intro={copy.intro} />

      {categories.length > 1 && (
        <nav aria-label="Filter projects by category" className="mt-10">
          <ul className="flex flex-wrap gap-2">
            {[{ slug: '', name: 'All' }, ...categories].map((c) => {
              const isActive = (c.slug || undefined) === active
              return (
                <li key={c.slug || 'all'}>
                  <Link
                    href={c.slug ? `/work?category=${encodeURIComponent(c.slug)}` : '/work'}
                    aria-current={isActive ? 'true' : undefined}
                    className={cx(
                      'inline-flex min-h-10 items-center rounded-full border px-4 text-[0.9375rem] font-semibold',
                      isActive ? 'border-plumage bg-plumage text-paper' : 'border-line hover:border-plumage',
                    )}
                  >
                    {c.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      )}

      <div className="mt-12">
        {visible.length > 0 ? <ProjectGrid projects={visible} /> : <WorkEmptyState title={homeWork.emptyTitle} body={homeWork.emptyBody} />}
      </div>
    </div>
  )
}
