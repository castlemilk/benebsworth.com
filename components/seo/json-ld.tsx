/** Inline a JSON-LD structured-data block. Server-rendered into the static HTML. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe to inline; no user-controlled HTML.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export const SITE_URL = 'https://benebsworth.com'

/** Person + WebSite — the site-level identity, emitted on the home page. */
export const personLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Ben Ebsworth',
  url: SITE_URL,
  jobTitle: 'Software, Platform & Hardware Engineer',
  sameAs: ['https://github.com/castlemilk'],
  knowsAbout: ['Software Engineering', 'Platform Engineering', 'Kubernetes', 'Distributed Systems', 'Electrical Engineering', 'Embedded Systems', 'AI'],
} as const

export const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Ben Ebsworth',
  url: SITE_URL,
} as const
