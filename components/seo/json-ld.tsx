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
    'https://twitter.com/benebsworth',
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

/**
 * Canonical author reference for anything Ben writes/builds — used as the
 * `author` on BlogPosting (posts), SoftwareApplication (lab effects), and
 * CreativeWork (projects). One shared object means every page points at the
 * same Person entity (same `url` → the /about/ ProfilePage, same `sameAs`),
 * so Google and AI crawlers consolidate authorship instead of fragmenting it
 * across slightly-different inline copies.
 */
export const authorLd = {
  '@type': 'Person',
  name: 'Ben Ebsworth',
  url: `${SITE_URL}/about/`,
  sameAs: [...personLd.sameAs],
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

/** Dataset — for a measured collection like the LLM benchmark results. */
export function datasetLd({
  name,
  description,
  url,
  variableMeasured,
  keywords,
}: {
  name: string
  description: string
  url: string
  variableMeasured?: string[]
  keywords?: string[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name,
    description,
    url,
    inLanguage: 'en-AU',
    isAccessibleForFree: true,
    creator: authorLd,
    license: 'https://benebsworth.com/',
    ...(variableMeasured ? { variableMeasured } : {}),
    ...(keywords ? { keywords } : {}),
  }
}

/**
 * Structured data for a hike overview page. Modelled as a CreativeWork (a
 * trip report / route overview) with the route's measured stats exposed via
 * `additionalProperty`, spatial coverage (region + country as a Place), the
 * per-hike OG art as `image`, and — when a published trail guide exists —
 * `subjectOf` pointing at that guide, so Google and AI crawlers link the
 * overview and the long-form guide as one entity cluster.
 */
export function hikeLd(
  hike: {
    slug: string
    name: string
    summary: string
    region: string
    country: string
    year: string
    status: string
    distanceKm: number
    days: number
    elevationGainM: number
    maxAltitudeM: number
  },
  guideSlug?: string,
) {
  const url = `${SITE_URL}/hiking/${hike.slug}/`
  const num = (name: string, value: number, unitText: string) => ({
    '@type': 'PropertyValue',
    name,
    value,
    unitText,
  })
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: hike.name,
    headline: hike.name,
    description: hike.summary,
    url,
    inLanguage: 'en-AU',
    author: authorLd,
    image: `${url}opengraph-image.png`,
    keywords: [hike.name, hike.region, hike.country, 'hiking', 'trek', 'trail'].join(', '),
    ...(hike.status === 'completed' && hike.year ? { dateCreated: hike.year, temporalCoverage: hike.year } : {}),
    about: {
      '@type': 'Place',
      name: hike.region,
      address: { '@type': 'PostalAddress', addressCountry: hike.country },
    },
    spatialCoverage: {
      '@type': 'Place',
      name: `${hike.region}, ${hike.country}`,
    },
    additionalProperty: [
      num('Distance', hike.distanceKm, 'km'),
      num('Duration', hike.days, 'days'),
      num('Ascent', hike.elevationGainM, 'm'),
      num('High point', hike.maxAltitudeM, 'm'),
    ],
    ...(guideSlug
      ? {
          subjectOf: {
            '@type': 'BlogPosting',
            url: `${SITE_URL}/blog/${guideSlug}/`,
            name: `${hike.name} — trail guide`,
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
