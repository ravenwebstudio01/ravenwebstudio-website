import Link from 'next/link'
import { ActionButton } from '@/components/admin/action-form'
import { AdminNav, type NavGroup } from '@/components/admin/admin-nav'
import { RavenMark } from '@/components/brand/raven-mark'
import { requireAdminPage } from '@/lib/auth/guards'
import { can, ROLE_LABELS } from '@/lib/auth/permissions'
import { logoutAction } from '../login/actions'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdminPage()
  const isAdmin = can(user.role, 'settings:manage')

  const groups: NavGroup[] = [
    { label: 'Overview', items: [{ href: '/admin', label: 'Dashboard' }] },
    ...(can(user.role, 'inquiries:read') || can(user.role, 'offers:manage')
      ? [
          {
            label: 'Clients',
            items: [
              ...(can(user.role, 'inquiries:read') ? [{ href: '/admin/inquiries', label: 'Inquiries' }] : []),
              ...(can(user.role, 'offers:manage')
                ? [
                    { href: '/admin/offers', label: 'Offers and discounts' },
                    { href: '/admin/offers/calculator', label: 'Offer calculator' },
                  ]
                : []),
            ],
          },
        ]
      : []),
    {
      label: 'Website content',
      items: [
        { href: '/admin/projects', label: 'Portfolio projects' },
        { href: '/admin/services', label: 'Services' },
        { href: '/admin/budgets', label: 'Budgets and project types' },
        { href: '/admin/collaborations', label: 'Collaborations' },
        { href: '/admin/content', label: 'Page content' },
        { href: '/admin/categories', label: 'Categories' },
        { href: '/admin/media', label: 'Media library' },
        { href: '/admin/redirects', label: 'Redirects' },
      ],
    },
    {
      label: 'Administration',
      items: [
        ...(isAdmin ? [{ href: '/admin/settings', label: 'Site settings' }] : []),
        ...(can(user.role, 'users:manage') ? [{ href: '/admin/users', label: 'Users' }] : []),
        ...(can(user.role, 'audit:read') ? [{ href: '/admin/audit', label: 'Audit log' }] : []),
        { href: '/admin/account', label: 'My account' },
      ],
    },
  ]

  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[16rem_1fr]">
      <aside className="border-b border-line bg-paper px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r lg:py-6">
        <div className="flex items-center justify-between gap-3 lg:mb-8 lg:block">
          <Link href="/admin" className="flex items-center gap-2.5 px-3">
            <RavenMark className="h-7 w-auto" />
            <span className="font-extrabold tracking-tight">Dashboard</span>
          </Link>
          <div className="lg:hidden">
            <AdminNav groups={groups} />
          </div>
        </div>
        <div className="hidden lg:block">
          <AdminNav groups={groups} />
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper px-6 py-3">
          <Link href="/" className="text-sm font-semibold text-slate hover:text-sheen" target="_blank">
            View website<span className="sr-only"> (opens in a new tab)</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span>
              <span className="font-semibold">{user.name}</span> <span className="text-slate">· {ROLE_LABELS[user.role]}</span>
            </span>
            <ActionButton action={logoutAction} label="Sign out" />
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-5 py-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  )
}
