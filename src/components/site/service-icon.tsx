/**
 * Small stroke icon set for services (editable per service in the dashboard).
 */
export const SERVICE_ICONS = {
  layout: 'M4 5h16v14H4zM4 9h16M10 9v10',
  building: 'M5 21V5l7-2 7 2v16M9 9h2M13 9h2M9 13h2M13 13h2M10 21v-4h4v4M3 21h18',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  refresh: 'M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4',
  cart: 'M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6.2M9 20.5h.01M17 20.5h.01',
  wrench: 'M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-2-2 8-8M14.7 6.3 13 4.6a4 4 0 0 0-5.6 5.6l-5 5L5 17.8l5-5a4 4 0 0 0 5.6-5.6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  gauge: 'M4 18a8 8 0 1 1 16 0M12 18l4-6M7 18h.01M17 18h.01',
  plug: 'M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0zM12 16v5',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
} as const

export type ServiceIconName = keyof typeof SERVICE_ICONS

export function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const d = SERVICE_ICONS[(name in SERVICE_ICONS ? name : 'layout') as ServiceIconName]
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  )
}
