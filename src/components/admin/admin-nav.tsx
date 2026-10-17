'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cx } from '@/lib/utils'

export type NavGroup = { label: string; items: { href: string; label: string }[] }

export function AdminNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`))
  return (
    <>
      <button
        type="button"
        className="btn btn-quiet btn-sm bg-paper lg:hidden"
        aria-expanded={open}
        aria-controls="admin-nav"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Close menu' : 'Menu'}
      </button>
      <nav id="admin-nav" aria-label="Dashboard" className={cx('mt-4 lg:mt-0 lg:block', open ? 'block' : 'hidden')}>
        {groups.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="mb-2 px-3 text-xs font-bold text-slate">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={cx(
                      'block rounded-[var(--radius-control)] px-3 py-2 text-[0.9375rem] font-semibold',
                      isActive(item.href) ? 'bg-plumage text-paper' : 'text-plumage hover:bg-mist',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </>
  )
}
