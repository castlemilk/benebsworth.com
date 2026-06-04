import type { Metadata } from 'next'
import { JetBrains_Mono, Space_Grotesk, Hanken_Grotesk } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme/theme-provider'

const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })
const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
})
const sans = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://benebsworth.com'),
  title: { default: 'Ben Ebsworth — Software, Platform & Hardware Engineer', template: '%s · Ben Ebsworth' },
  description:
    'Ben Ebsworth — software, platform & hardware engineer in Melbourne. Building across the stack from electrical/embedded hardware to distributed platforms, AI-native. Writing on Kubernetes, service mesh, CI/CD and cloud.',
  keywords: ['Ben Ebsworth', 'software engineer', 'platform engineering', 'Kubernetes', 'Istio', 'SRE', 'cloud', 'GCP', 'AWS', 'embedded', 'AI-native', 'Melbourne'],
  authors: [{ name: 'Ben Ebsworth', url: 'https://benebsworth.com' }],
  creator: 'Ben Ebsworth',
  openGraph: { type: 'website', siteName: 'Ben Ebsworth', url: 'https://benebsworth.com', locale: 'en_AU' },
  twitter: { card: 'summary_large_image', creator: '@benebsworth' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${mono.variable} ${display.variable} ${sans.variable}`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
