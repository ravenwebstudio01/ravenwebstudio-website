import { NextResponse, type NextRequest } from 'next/server'

const SESSION_COOKIES = ['__Host-rws_session', 'rws_session']
const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/forgot-password', '/admin/reset-password']

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'
  let mediaOrigin = ''
  try {
    if (process.env.MEDIA_PUBLIC_BASE_URL) mediaOrigin = new URL(process.env.MEDIA_PUBLIC_BASE_URL).origin
  } catch {
    mediaOrigin = ''
  }
  const ga = 'https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com'
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-inline'" : ''}`,
    // Style attributes are needed by some framework internals; script injection is still blocked.
    "style-src-attr 'unsafe-inline'",
    `img-src 'self' data: blob: ${ga}${mediaOrigin ? ` ${mediaOrigin}` : ''}`,
    "font-src 'self'",
    `connect-src 'self' ${ga}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ')
}

/**
 * Runs before every page request:
 * 1. Generates a per-request CSP nonce (Next.js applies it to its own scripts).
 * 2. Sends visitors without a session cookie away from /admin early. This is a
 *    convenience only — every admin page, server action and API route checks the
 *    session and role on the server again.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (pathname.startsWith('/admin') && !PUBLIC_ADMIN_PATHS.some((p) => pathname === p)) {
    const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name))
    if (!hasSession) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.search = pathname === '/admin' ? '' : `?next=${encodeURIComponent(pathname + search)}`
      return NextResponse.redirect(url)
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = buildCsp(nonce)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: [
    {
      source: '/((?!api|media|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|manifest.webmanifest).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
