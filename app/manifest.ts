import type { MetadataRoute } from 'next'
export const dynamic = 'force-static'

/**
 * Web App Manifest. Next emits `<link rel="manifest" href="/manifest.webmanifest">`
 * automatically from this route, so no <head> wiring is needed. Completes the icon
 * set (alongside app/icon.svg, app/favicon.ico and app/apple-icon.png) so bookmarks,
 * iOS "Add to Home Screen" and Android install all get a real icon + name.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ben Ebsworth',
    short_name: 'Ben Ebsworth',
    description:
      'Software, platform & hardware engineer in Melbourne. Writing on Kubernetes, distributed systems, electrical engineering and AI — plus an interactive lab of parameterised simulations.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0c',
    theme_color: '#0a0a0c',
    icons: [
      // Full-bleed dark squares with the centred "be" mark — they double as
      // Android adaptive (maskable) icons: the mark sits inside the safe zone.
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
