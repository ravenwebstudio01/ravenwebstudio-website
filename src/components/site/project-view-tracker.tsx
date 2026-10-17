'use client'

import { useEffect } from 'react'
import { track } from '@/lib/analytics/client'

export function ProjectViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    // GA may load slightly after hydration; retry briefly.
    const timer = window.setTimeout(() => track('project_view', { project_slug: slug }), 1500)
    return () => window.clearTimeout(timer)
  }, [slug])
  return null
}
