import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { preload } from 'react-dom'
import './globals.css'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { Hardware } from '@/components/ui/hardware'
import { Analytics } from '@/components/analytics/analytics'
import { SITE_URL } from '@/components/seo/json-ld'

// Vendored in app/fonts/ — next/font/google hits an upstream flake where
// Google intermittently returns extensionless /l/font?kit= URLs and Turbopack
// fails the build (vercel/next.js#99114). Local files keep the build offline-safe.
const mono = localFont({
  src: './fonts/jetbrains-mono-latin.woff2',
  weight: '100 800',
  variable: '--font-mono',
})
const sans = localFont({
  src: './fonts/hanken-grotesk-latin.woff2',
  weight: '100 900',
  variable: '--font-sans',
})
// SPEC-01 hardware skin typeface — vendored so the skin stays CDN-free.
const plexMono = localFont({
  src: [
    { path: './fonts/ibm-plex-mono-200.woff2', weight: '200' },
    { path: './fonts/ibm-plex-mono-300.woff2', weight: '300' },
    { path: './fonts/ibm-plex-mono-400.woff2', weight: '400' },
    { path: './fonts/ibm-plex-mono-500.woff2', weight: '500' },
  ],
  variable: '--font-plex-mono',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Ben Ebsworth — Software, Platform & Hardware Engineer', template: '%s · Ben Ebsworth' },
  description:
    'Ben Ebsworth — software, platform & hardware engineer in Melbourne. Building across the stack from electrical/embedded hardware to distributed platforms, AI-native. Writing on Kubernetes, service mesh, CI/CD and cloud.',
  keywords: ['Ben Ebsworth', 'software engineer', 'platform engineering', 'Kubernetes', 'Istio', 'SRE', 'cloud', 'GCP', 'AWS', 'embedded', 'AI-native', 'Melbourne'],
  authors: [{ name: 'Ben Ebsworth', url: SITE_URL }],
  creator: 'Ben Ebsworth',
  openGraph: { type: 'website', siteName: 'Ben Ebsworth', url: SITE_URL, locale: 'en_AU' },
  twitter: { card: 'summary_large_image', creator: '@benebsworth' },
  // No `alternates` here: every page sets its own canonical, and Next replaces
  // the whole `alternates` object rather than merging it, so feed links
  // declared here never reached a page. They are rendered in <body> below.
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f1e9' },
    { media: '(prefers-color-scheme: dark)', color: '#111312' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The folio serif carries every heading and most reading text; fetch it with
  // the HTML instead of after CSS discovery (app/editorial.css @font-face).
  preload('/fonts/editorial/source-serif-4.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' })
  preload('/fonts/editorial/barlow-condensed-semibold.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' })
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${mono.variable} ${sans.variable} ${plexMono.variable}`}
    >
      <body className="font-sans antialiased">
        {/* Photos (hike galleries, trail-guide figures) are served from the GCS
            bucket — warm the connection early. Hoisted into <head> by Next. */}
        <link rel="preconnect" href="https://storage.googleapis.com" />
        <link rel="dns-prefetch" href="https://storage.googleapis.com" />
        {/* Feed and llms.txt autodiscovery on every page (hoisted into <head>). */}
        <link rel="alternate" type="application/rss+xml" title="Ben Ebsworth" href="/feed.xml" />
        <link rel="alternate" type="text/plain" title="llms.txt" href="/llms.txt" />
        <a
          href="#main-content"
          className="skip-link"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <Hardware keyColor={{ l: 0.64, c: 0.31, h: 48 }}>{children}</Hardware>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
