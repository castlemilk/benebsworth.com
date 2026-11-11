import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono, Hanken_Grotesk } from 'next/font/google'
import { preload } from 'react-dom'
import './globals.css'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { Analytics } from '@/components/analytics/analytics'
import { SITE_URL } from '@/components/seo/json-ld'

const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })
const sans = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
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
  alternates: {
    types: {
      'application/rss+xml': '/feed.xml',
      // Advertise the llms.txt site manifest for AI crawlers/tools that read
      // <link rel="alternate"> rather than probing /llms.txt by convention.
      'text/plain': '/llms.txt',
    },
  },
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
      className={`${mono.variable} ${sans.variable}`}
    >
      <body className="font-sans antialiased">
        {/* Photos (hike galleries, trail-guide figures) are served from the GCS
            bucket — warm the connection early. Hoisted into <head> by Next. */}
        <link rel="preconnect" href="https://storage.googleapis.com" />
        <link rel="dns-prefetch" href="https://storage.googleapis.com" />
        <a
          href="#main-content"
          className="skip-link"
        >
          Skip to content
        </a>
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
