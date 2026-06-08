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

/** BreadcrumbList from an ordered trail of { name, url } crumbs (absolute URLs). */
export function breadcrumbLd(crumbs: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  }
}

/** CollectionPage for index/listing pages, optionally carrying its item list. */
export function collectionPageLd({
  name,
  description,
  url,
  items,
}: {
  name: string
  description?: string
  url: string
  items?: { name: string; url: string }[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url,
    ...(description ? { description } : {}),
    ...(items?.length
      ? {
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: items.map((it, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: it.name,
              url: it.url,
            })),
          },
        }
      : {}),
  }
}

/** ProfilePage wrapping the Person — used on the about page. */
export const profilePageLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  mainEntity: {
    '@type': 'Person',
    name: personLd.name,
    url: personLd.url,
    jobTitle: personLd.jobTitle,
    sameAs: personLd.sameAs,
    knowsAbout: personLd.knowsAbout,
    image: `${SITE_URL}/about/opengraph-image.png`,
  },
} as const
