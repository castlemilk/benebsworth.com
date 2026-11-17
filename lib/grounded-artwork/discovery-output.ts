import assert from 'node:assert/strict'
import { partitionGroundedDiscovery } from './partitions'
import { groundedCards, GROUNDED_ARTWORK } from './registry'

/** Read the actual serialized client prop, not just the server-side estimator. */
export function inspectGroundedDiscoveryDocument(document: Document) {
  const { bootstrap } = partitionGroundedDiscovery(groundedCards())
  const found: unknown[] = []
  function visit(value: unknown) {
    if (!value || typeof value !== 'object') return
    if ('bootstrap' in value) found.push(value.bootstrap)
    for (const child of Object.values(value)) visit(child)
  }
  let flightBytes = 0, jsonLdBytes = 0
  for (const script of document.querySelectorAll('script')) {
    const text = script.textContent || ''
    if (script.type === 'application/ld+json') {
      jsonLdBytes += Buffer.byteLength(text)
      const data = JSON.parse(text)
      const collections = (Array.isArray(data) ? data : [data]).filter(item => item['@type'] === 'CollectionPage')
      for (const collection of collections) {
        assert((collection.mainEntity?.itemListElement?.length || 0) <= 24, 'Bounded grounded collection JSON-LD')
      }
    }
    const match = text.match(/^self\.__next_f\.push\((.*)\)$/s)
    if (!match) continue
    const entry = JSON.parse(match[1])
    if (entry[0] !== 1 || typeof entry[1] !== 'string') continue
    flightBytes += Buffer.byteLength(entry[1])
    // Next can split a Flight row between inline scripts; join below before parsing.
  }
  const flight = [...document.querySelectorAll('script')].map(script => {
    const match = (script.textContent || '').match(/^self\.__next_f\.push\((.*)\)$/s)
    if (!match) return ''
    const entry = JSON.parse(match[1])
    return entry[0] === 1 && typeof entry[1] === 'string' ? entry[1] : ''
  }).join('')
  for (const artwork of GROUNDED_ARTWORK.slice(24)) assert(!flight.includes(JSON.stringify('slug') + ':' + JSON.stringify(artwork.slug)), 'No hidden off-page card data in initial Flight')
  for (const line of flight.split('\n')) {
    const payload = line.replace(/^[a-f0-9]+:/, '')
    let value: unknown
    try { value = JSON.parse(payload) } catch { continue }
    visit(value)
  }
  assert.equal(found.length, 1, 'Exactly one serialized grounded bootstrap')
  assert.deepEqual(found[0], bootstrap, 'Serialized grounded bootstrap matches bounded data')
  const bootstrapBytes = Buffer.byteLength(JSON.stringify(found[0]))
  assert(bootstrapBytes < 70000, 'Initial discovery stays below 70,000 bytes')
  const thumbnails = [...document.querySelectorAll('[data-grounded-card] img')].map(img => img.getAttribute('src'))
  assert.deepEqual(thumbnails, GROUNDED_ARTWORK.slice(0, 24).map(a => a.variants.light.thumbnail), 'Only selected light thumbnails on arrival')
  return { bootstrapBytes, automaticDiscoveryJsonBytes: 0, inlineFlightBytes: flightBytes, jsonLdBytes,
    initialThumbnailCount: thumbnails.length,
    initialThumbnailBodyBytes: GROUNDED_ARTWORK.slice(0, 24).reduce((sum, a) => sum + a.variants.light.thumbnailBytes, 0) }
}
