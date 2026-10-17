import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound, permanentRedirect, redirect } from 'next/navigation'
import { JsonLd } from '@/components/site/bits'
import { ProjectDetail } from '@/components/site/project-detail'
import { ProjectViewTracker } from '@/components/site/project-view-tracker'
import { findRedirect, getProjectBySlug } from '@/lib/content/queries'
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const project = await getProjectBySlug(slug)
  if (!project) return { title: 'Project not found', robots: { index: false } }
  return pageMetadata({
    title: project.seoTitle || project.title,
    description: project.seoDescription || project.summary,
    path: `/work/${project.slug}`,
    image: project.cover ? { url: project.cover.src, width: project.cover.width, height: project.cover.height, alt: project.cover.alt } : null,
  })
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params
  const [project, h] = await Promise.all([getProjectBySlug(slug), headers()])
  if (!project) {
    // Unpublished or removed projects return 404 (and leave the sitemap); renamed
    // projects keep working through the redirect recorded when the slug changed.
    const target = await findRedirect(`/work/${slug}`)
    if (target) (target.permanent ? permanentRedirect : redirect)(target.toPath)
    notFound()
  }
  return (
    <>
      <ProjectDetail project={project} />
      <ProjectViewTracker slug={project.slug} />
      <JsonLd
        nonce={h.get('x-nonce') ?? undefined}
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Work', path: '/work' },
          { name: project.title, path: `/work/${project.slug}` },
        ])}
      />
    </>
  )
}
