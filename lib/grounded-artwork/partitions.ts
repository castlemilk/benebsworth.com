import { createHash } from 'node:crypto'
import { GROUNDED_PAGE_SIZE } from './discovery'
import type { GroundedCard } from './types'
import type { GroundedBootstrap, GroundedManifest, GroundedDisplayCard } from './remote-discovery'

/** Server/build only. Hash names keep an open tab's metadata consistent across releases. */
export function partitionGroundedDiscovery(cards: readonly GroundedCard[]) {
  const files = new Map<string, string>()
  function asset(value: unknown) {
    const body = JSON.stringify(value)
    const url = `/artwork/grounded-discovery/${createHash('sha256').update(body).digest('hex')}.json`
    files.set(url, body)
    return url
  }
  const display: GroundedDisplayCard[] = cards.map(({ slug, title, subject, minimumDisplayWidth, thumbnails }) => ({ slug, title, subject, minimumDisplayWidth, thumbnail: thumbnails.light }))
  const partitions: string[] = []
  for (let i = 0; i < cards.length; i += GROUNDED_PAGE_SIZE) partitions.push(asset(display.slice(i, i + GROUNDED_PAGE_SIZE)))
  const manifest: GroundedManifest = {
    partitions,
    records: cards.map(({ slug, title, subject, tags, aliases }, index) => ({ slug, title, subject, tags, aliases, partition: Math.floor(index / GROUNDED_PAGE_SIZE) })),
  }
  const bootstrap: GroundedBootstrap = {
    total: cards.length, initial: display.slice(0, GROUNDED_PAGE_SIZE), manifest: asset(manifest),
    subjects: [...new Set(cards.map(a => a.subject))].sort(), tags: [...new Set(cards.flatMap(a => a.tags))].sort(),
  }
  if (Buffer.byteLength(JSON.stringify(bootstrap)) >= 70000) throw Error('Grounded initial discovery exceeds 70,000-byte budget')
  return { bootstrap, manifest, files }
}
