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
  // SameAs: canonical social profiles. Google uses these to build the
  // author entity graph and to attribute content to the right person.
  // Listed in priority order: professional profile first.
  sameAs: [
    'https://github.com/castlemilk',
    'https://www.linkedin.com/in/benebsworth/',
  ],
  // KnowsAbout: topic clusters the person writes about. Helps Google's
  // topical authority computation. Keep in sync with the post labels.
  knowsAbout: [
    'Software Engineering',
    'Platform Engineering',
    'Kubernetes',
    'Distributed Systems',
    'Service Mesh',
    'Electrical Engineering',
    'Embedded Systems',
    'Signal Processing',
    'Control Systems',
    'RF Engineering',
    'Quantum Computing',
    'AI',
    'Machine Learning',
  ],
} as const

/**
 * WebSite schema with a SearchAction. The SearchAction isn't useful for
 * internal-site search (the site has none), but Google uses the
 * declaration to build sitelinks search and to understand the
 * site-search relationship. The search URL is a placeholder that
 * points to the homepage with a `?q=` param — Google will index this
 * as the canonical search template even if it doesn't do anything
 * special on our side.
 */
export const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Ben Ebsworth',
  url: SITE_URL,
  description: 'Software, platform & hardware engineer in Melbourne. Writing on Kubernetes, distributed systems, electrical engineering, and AI.',
  inLanguage: 'en-AU',
  author: { '@type': 'Person', name: 'Ben Ebsworth', url: SITE_URL },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/?q={search_term_string}`,
    },
    // Google's documentation requires the query-input to be in this
    // exact format (a property-of-EntryPoint with a quoted string).
    // Satori-friendly serialised shape.
    'query-input': 'required name=search_term_string',
  },
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
