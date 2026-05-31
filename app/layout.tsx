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
  title: { default: 'Ben Ebsworth', template: '%s · Ben Ebsworth' },
  description: 'A playground for development and writing material.',
  openGraph: { type: 'website', siteName: 'Ben Ebsworth' },
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
