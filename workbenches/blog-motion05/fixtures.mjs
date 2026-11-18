/** Interaction fixtures, not the knowledge graph's schema or taxonomy. */
export const BASELINE = '1121edc4ae6ac8de415b5395d8fadc11450fc55f'
const source = path => `https://github.com/castlemilk/benebsworth.com/blob/${BASELINE}/${path}`

export const FIXTURES = Object.freeze([
  Object.freeze({
    id: 'rlc-article', kind: 'article', label: 'Every Wire Is an RLC Circuit: Why Your Digital Signal Rings',
    taxonomy: 'Topic · ee · Electrical Eng', href: 'https://benebsworth.com/blog/every-wire-is-an-rlc-circuit/',
    sourcePath: 'content/blog/every-wire-is-an-rlc-circuit/index.mdx',
    evidenceHref: source('content/blog/every-wire-is-an-rlc-circuit/index.mdx'),
    evidence: 'The published article source explicitly embeds LabSide with effect="rlc-resonance". This supports an article-to-lab reference; it does not make the two entities equivalent.',
  }),
  Object.freeze({
    id: 'rlc-lab', kind: 'lab', label: 'RLC Resonance',
    taxonomy: 'Lab category · engineering · Electrical Engineering', href: 'https://benebsworth.com/lab/rlc-resonance/',
    sourcePath: 'lib/lab/registry.ts', evidenceHref: source('lib/lab/registry.ts'),
    evidence: 'The Lab registry declares the rlc-resonance slug and the engineering category. The article refers to this slug. Motion does not start the simulation or alter its parameters.',
  }),
  Object.freeze({
    id: 'seasons-article', kind: 'article', label: 'Earth is closest to the Sun in the northern winter',
    taxonomy: 'Topic · earth · Earth & Space', href: 'https://benebsworth.com/blog/earth-is-closest-to-the-sun-in-winter/',
    sourcePath: 'content/blog/earth-is-closest-to-the-sun-in-winter/index.mdx',
    evidenceHref: source('content/blog/earth-is-closest-to-the-sun-in-winter/index.mdx'),
    evidence: 'The published article source explicitly embeds SpatialLab with slug="seasons". It is included to review a longer label and the wider topic taxonomy, not as a neighbour of the RLC article.',
  }),
  Object.freeze({
    id: 'seasons-lab', kind: 'lab', label: 'Seasons from a tilted axis',
    taxonomy: 'Lab category · earth · Earth & Space', href: 'https://benebsworth.com/lab/seasons/',
    sourcePath: 'lib/lab/spatial/catalog.ts', evidenceHref: source('lib/lab/spatial/catalog.ts'),
    evidence: 'The spatial catalogue explicitly connects seasons to the earth-is-closest-to-the-sun-in-winter blog slug. This is a source reference, not evidence of a relation to the RLC root.',
  }),
])

export const ROOT_ID = 'rlc-article'
export const findFixture = id => FIXTURES.find(item => item.id === id)

/** These query keys belong only to this specimen, never to /knowledge/. */
export function readRoute(value) {
  const url = value instanceof URL ? value : new URL(value, 'http://localhost')
  const p = url.searchParams
  const type = p.get('type')
  const review = p.get('review')
  return Object.freeze({
    inspect: p.get('inspect') || ROOT_ID,
    q: (p.get('q') || '').slice(0, 256),
    type: ['article', 'lab'].includes(type) ? type : 'all',
    review: ['loading', 'unavailable', 'empty'].includes(review) ? review : 'ready',
    motion: p.get('motion') === 'off' ? 'off' : 'system',
    enhance: ['off', 'broken'].includes(p.get('enhance')) ? p.get('enhance') : 'on',
  })
}

/** Preserve unrelated query/hash state. Callers own history and error recovery. */
export function routeUrl(value, changes) {
  const url = new URL(value, 'http://localhost')
  const allowed = new Set(['inspect', 'q', 'type', 'review', 'motion', 'enhance'])
  for (const [key, value] of Object.entries(changes)) {
    if (!allowed.has(key)) throw new TypeError(`Unknown specimen query key: ${key}`)
    if (value === '' || value === null || value === undefined) url.searchParams.delete(key)
    else url.searchParams.set(key, String(value))
  }
  return `${url.pathname}${url.search}${url.hash}`
}

export function matchingFixtures(route) {
  if (route.review === 'empty') return []
  const query = route.q.trim().toLocaleLowerCase('en')
  return FIXTURES.filter(item =>
    (route.type === 'all' || item.kind === route.type) &&
    `${item.label} ${item.taxonomy}`.toLocaleLowerCase('en').includes(query))
}

export function viewFor(route) {
  const selected = findFixture(route.inspect)
  const matches = matchingFixtures(route)
  const outside = selected && !matches.includes(selected)
  const count = `${matches.length} matching ${matches.length === 1 ? 'source' : 'sources'}.`
  const state = route.review === 'loading'
    ? 'Review fixture: waiting for a response. Existing matching sources remain available.'
    : route.review === 'unavailable'
      ? 'Review fixture: the request is unavailable. Existing matching sources remain available.'
      : `${count}${outside ? ' The inspected source is retained outside the filter.' : ''}`
  return { selected, matches, outside, status: state }
}

/** Enhancement must leave modified/new-tab/download/external activation native. */
export function canEnhanceLink(event, anchor, currentUrl) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return false
  if (!anchor?.hasAttribute('data-inspect-link') || anchor.hasAttribute('download')) return false
  if (anchor.target && anchor.target !== '_self') return false
  const current = new URL(currentUrl)
  const next = new URL(anchor.href, current)
  return next.origin === current.origin && next.pathname === current.pathname
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]))
}
