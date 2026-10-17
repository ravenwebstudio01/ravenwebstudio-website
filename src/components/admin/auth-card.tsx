import type { ReactNode } from 'react'
import { Wordmark } from '@/components/brand/raven-mark'

export function AuthCard({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <main id="main" className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Wordmark name="RavenWebStudio" />
        </div>
        <div className="rounded-[var(--radius-panel)] border border-line bg-paper p-8 shadow-[0_12px_40px_-24px_rgba(28,33,51,0.35)]">
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          {description && <p className="mt-2 text-[0.9688rem] text-slate">{description}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  )
}
