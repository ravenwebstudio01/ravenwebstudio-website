import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RavenWebStudio',
    short_name: 'RavenWebStudio',
    start_url: '/',
    display: 'browser',
    background_color: '#ffffff',
    theme_color: '#1c2133',
    icons: [{ src: '/icon.svg', type: 'image/svg+xml', sizes: 'any' }],
  }
}
