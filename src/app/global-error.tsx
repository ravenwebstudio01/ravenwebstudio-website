'use client'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '4rem 1.5rem', color: '#1c2133' }}>
        <h1 style={{ fontSize: '2rem' }}>The website is temporarily unavailable.</h1>
        <p style={{ maxWidth: '40rem', lineHeight: 1.6 }}>
          Please try again in a few minutes.{error.digest ? ` Reference: ${error.digest}.` : ''}
        </p>
        <button type="button" onClick={reset} style={{ marginTop: '1rem', padding: '0.75rem 1.25rem' }}>
          Try again
        </button>
      </body>
    </html>
  )
}
