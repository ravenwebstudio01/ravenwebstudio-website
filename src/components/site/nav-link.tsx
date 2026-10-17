'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(`${href}/`)
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`relative inline-block whitespace-nowrap rounded-[var(--radius-control)] px-3 py-2 text-[0.9688rem] font-semibold transition-colors hover:text-sheen ${
        active ? 'text-sheen after:absolute after:inset-x-3 after:-bottom-[1.05rem] after:h-[2px] after:bg-sheen' : 'text-plumage'
      }`}
    >
      {children}
    </Link>
  )
}
