import { ImageResponse } from 'next/og'
import { RAVEN_FACETS } from '@/components/brand/raven-mark'

export const alt = 'RavenWebStudio — websites for European businesses'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const FILL = { a: '#e9ebf3', b: '#c9cde0', c: '#aeb4cf', d: '#9d94ee', s: '#b9b2f5', g: '#6fc2b8' } as const

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#1c2133',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <svg width="92" height="80" viewBox="6 8 58 50">
            {RAVEN_FACETS.map((f) => (
              <polygon key={f.points} points={f.points} fill={FILL[f.tone]} />
            ))}
          </svg>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.02em' }}>RavenWebStudio</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.035em', maxWidth: 900 }}>
            Business websites, built properly.
          </div>
          <div style={{ marginTop: 28, fontSize: 30, color: '#b6bbcf' }}>Design, development and care for businesses across Europe</div>
        </div>
      </div>
    ),
    size,
  )
}
