import type { Metadata, Viewport } from 'next'
import { Schibsted_Grotesk } from 'next/font/google'
import { connection } from 'next/server'
import { siteUrl } from '@/lib/env'
import './globals.css'

// Self-hosted at build time by next/font: visitors never contact Google Fonts.
const schibsted = Schibsted_Grotesk({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-schibsted',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(siteUrl()),
    applicationName: 'RavenWebStudio',
    formatDetection: { telephone: false, email: false, address: false },
  }
}

export const viewport: Viewport = {
  themeColor: '#1c2133',
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Every page renders per request: the Content-Security-Policy nonce (src/proxy.ts)
  // must reach Next.js's scripts, and content/prices are always current.
  await connection()
  return (
    <html lang="en" className={schibsted.variable}>
      <body>{children}</body>
    </html>
  )
}
