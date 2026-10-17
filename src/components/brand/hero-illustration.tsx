import { RAVEN_FACETS } from './raven-mark'

const FILL = { a: '#1c2133', b: '#2e3552', c: '#3a4160', d: '#4335b0', s: '#5546c8', g: '#1d7a72' } as const

/**
 * Hero illustration: the raven perched on a website wireframe drawn on a layout
 * grid. On load the frame draws itself and the raven's facets settle in once;
 * prefers-reduced-motion shows the finished drawing immediately.
 */
export function HeroIllustration() {
  return (
    <svg viewBox="0 0 560 520" className="hero-art h-auto w-full" aria-hidden="true" focusable="false">
      <g stroke="#e2e5ec" strokeWidth="1">
        {[40, 160, 280, 400, 520].map((x) => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="520" />
        ))}
        {[80, 200, 320, 440].map((y) => (
          <line key={`h${y}`} x1="0" y1={y} x2="560" y2={y} />
        ))}
      </g>

      <g transform="translate(296,6) scale(3.5)">
        {RAVEN_FACETS.map((f) => (
          <polygon key={f.points} className="hero-facet" points={f.points} fill={FILL[f.tone]} />
        ))}
        <circle className="hero-facet" cx="34.5" cy="17" r="1.5" fill="#ece9fc" />
      </g>

      <rect
        className="hero-draw"
        x="40"
        y="190"
        width="480"
        height="300"
        rx="14"
        pathLength={100}
        fill="#ffffff"
        stroke="#1c2133"
        strokeWidth="2"
      />
      <line className="hero-draw" pathLength={100} x1="40" y1="226" x2="520" y2="226" stroke="#1c2133" strokeWidth="2" />
      <g fill="none" stroke="#1c2133" strokeWidth="2">
        <circle cx="64" cy="208" r="5" />
        <circle cx="82" cy="208" r="5" />
        <circle cx="100" cy="208" r="5" />
      </g>
      <rect x="140" y="201" width="200" height="14" rx="7" fill="#eef0f4" />

      <g className="hero-blocks">
        <rect x="68" y="254" width="250" height="20" rx="3" fill="#1c2133" />
        <rect x="68" y="282" width="190" height="20" rx="3" fill="#1c2133" />
        <rect x="68" y="318" width="230" height="8" rx="4" fill="#d6d9e2" />
        <rect x="68" y="334" width="205" height="8" rx="4" fill="#d6d9e2" />
        <rect x="68" y="360" width="104" height="30" rx="5" fill="#5546c8" />
        <rect x="356" y="250" width="138" height="140" rx="8" fill="#eef0f4" />
        <path d="M356 360 L400 316 L430 344 L452 322 L494 364" fill="none" stroke="#b9b2f5" strokeWidth="2" />
        <circle cx="462" cy="282" r="12" fill="none" stroke="#b9b2f5" strokeWidth="2" />
        <rect x="68" y="414" width="128" height="52" rx="6" fill="none" stroke="#d6d9e2" strokeWidth="2" />
        <rect x="216" y="414" width="128" height="52" rx="6" fill="none" stroke="#d6d9e2" strokeWidth="2" />
        <rect x="364" y="414" width="130" height="52" rx="6" fill="none" stroke="#d6d9e2" strokeWidth="2" />
      </g>
    </svg>
  )
}
