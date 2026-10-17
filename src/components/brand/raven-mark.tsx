/**
 * The RavenWebStudio mark: a faceted raven head built from flat planes, like a
 * page built from layout blocks. Colours come from design tokens.
 */
type Props = {
  className?: string
  /** "light" for dark backgrounds. */
  tone?: 'default' | 'light'
  title?: string
}

export const RAVEN_FACETS = [
  { points: '10,24 22,12 36,11 30,22', tone: 'b' },
  { points: '36,11 41,15 30,22', tone: 's' },
  { points: '41,15 51,17 62,26 44,24', tone: 'a' },
  { points: '44,24 62,26 51,29 42,30', tone: 'c' },
  { points: '30,22 41,15 44,24 42,30', tone: 'd' },
  { points: '10,24 30,22 20,36', tone: 'a' },
  { points: '30,22 42,30 40,35 37,34 35,40 32,39 20,36', tone: 'b' },
  { points: '10,24 20,36 8,44', tone: 'g' },
  { points: '8,44 20,36 32,39 30,47 27,46 26,54 10,56', tone: 'a' },
] as const

const PALETTES = {
  default: { a: '#1c2133', b: '#2e3552', c: '#3a4160', d: '#4335b0', s: '#5546c8', g: '#1d7a72', eye: '#ece9fc' },
  light: { a: '#e9ebf3', b: '#c9cde0', c: '#aeb4cf', d: '#9d94ee', s: '#b9b2f5', g: '#6fc2b8', eye: '#1c2133' },
} as const

export function RavenMark({ className, tone = 'default', title }: Props) {
  const palette = PALETTES[tone]
  return (
    <svg
      viewBox="6 8 58 50"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {RAVEN_FACETS.map((f) => (
        <polygon key={f.points} points={f.points} fill={palette[f.tone]} />
      ))}
      <circle cx="34.5" cy="17" r="1.5" fill={palette.eye} />
    </svg>
  )
}

export function Wordmark({ name, tone = 'default' }: { name: string; tone?: 'default' | 'light' }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <RavenMark className="h-8 w-auto" tone={tone} />
      <span className={`text-[1.1875rem] font-extrabold tracking-[-0.02em] ${tone === 'light' ? 'text-paper' : 'text-plumage'}`}>
        {name}
      </span>
    </span>
  )
}
