import type { Metadata } from 'next'
import { JetBrains_Mono, Inter } from 'next/font/google'
import './globals.css'

const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })
const sans = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  metadataBase: new URL('https://benebsworth.com'),
  title: { default: 'Ben Ebsworth', template: '%s · Ben Ebsworth' },
  description: 'A playground for development and writing material.',
  openGraph: { type: 'website', siteName: 'Ben Ebsworth' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${mono.variable} ${sans.variable}`}>
      <body className="font-mono antialiased">{children}</body>
    </html>
  )
}
