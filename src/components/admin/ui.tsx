import Link from 'next/link'
import type { ReactNode } from 'react'
import { cx } from '@/lib/utils'

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  back?: { href: string; label: string }
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {back && (
          <Link href={back.href} className="mb-2 inline-block text-sm font-semibold text-slate hover:text-sheen">
            ← {back.label}
          </Link>
        )}
        <h1 className="text-[1.875rem] font-extrabold tracking-tight">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[0.9688rem] text-slate">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Panel({ title, description, children, className, actions }: { title?: string; description?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cx('rounded-[var(--radius-panel)] border border-line bg-paper p-6', className)}>
      {(title || actions) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-bold">{title}</h2>}
            {description && <p className="mt-1 text-sm text-slate">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-success-soft text-success',
  draft: 'bg-mist-deep text-slate',
  archived: 'bg-mist text-slate',
  new: 'bg-sheen-soft text-sheen-strong',
  in_review: 'bg-warning-soft text-warning',
  contacted: 'bg-glint-soft text-glint',
  proposal_sent: 'bg-glint-soft text-glint',
  won: 'bg-success-soft text-success',
  lost: 'bg-mist-deep text-slate',
  spam: 'bg-danger-soft text-danger',
  sent: 'bg-success-soft text-success',
  failed: 'bg-danger-soft text-danger',
  not_configured: 'bg-warning-soft text-warning',
  pending: 'bg-mist-deep text-slate',
  skipped: 'bg-mist text-slate',
}

export const STATUS_LABELS: Record<string, string> = {
  published: 'Published',
  draft: 'Draft',
  archived: 'Archived',
  new: 'New',
  in_review: 'In review',
  contacted: 'Contacted',
  proposal_sent: 'Proposal sent',
  won: 'Won',
  lost: 'Lost',
  spam: 'Spam',
  sent: 'Sent',
  failed: 'Failed',
  not_configured: 'Not configured',
  pending: 'Pending',
  skipped: 'Skipped',
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={cx('pill', STATUS_STYLES[status] ?? 'bg-mist text-slate')}>{STATUS_LABELS[status] ?? status}</span>
}

export function SampleTag({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <span className="pill bg-warning-soft text-warning" title="Placeholder content. Hidden in production until you review it and untick “Sample content”.">
      Sample
    </span>
  )
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-slate">
        {children}
      </td>
    </tr>
  )
}

export function Table({ children, caption }: { children: ReactNode; caption: string }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-panel)] border border-line bg-paper">
      <table className="w-full min-w-[40rem] border-collapse text-left text-[0.9375rem]">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  )
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th scope="col" className={cx('border-b border-line bg-mist px-4 py-3 text-sm font-bold text-slate', className)}>
      {children}
    </th>
  )
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cx('border-b border-line px-4 py-3 align-top', className)}>{children}</td>
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warning' | 'danger' | 'success'; children: ReactNode }) {
  const styles = {
    info: 'border-sheen bg-sheen-soft',
    warning: 'border-warning bg-warning-soft',
    danger: 'border-danger bg-danger-soft',
    success: 'border-success bg-success-soft',
  }[tone]
  return <div className={cx('rounded-[var(--radius-control)] border-l-4 px-4 py-3 text-[0.9375rem]', styles)}>{children}</div>
}
