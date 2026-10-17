'use client'

import Link from 'next/link'
import { useEffect } from 'react'

/** Shown for unexpected server/client errors. Never displays error details to visitors. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Page error', error.digest ?? '')
  }, [error])

  return (
    <main id="main" className="shell py-24">
      <p className="text-sm font-bold text-sheen">Something went wrong</p>
      <h1 className="mt-2 text-h1 max-w-[20ch] font-extrabold">This page could not be loaded.</h1>
      <p className="mt-5 max-w-xl text-lede text-slate">
        It is a problem on our side, not yours. Try again, or come back in a few minutes.
        {error.digest ? ` If you contact us, mention reference ${error.digest}.` : ''}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="btn btn-secondary">
          Go to the homepage
        </Link>
      </div>
    </main>
  )
}
