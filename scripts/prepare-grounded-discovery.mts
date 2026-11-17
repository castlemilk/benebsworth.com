import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { groundedCards } from '../lib/grounded-artwork/registry'
import { partitionGroundedDiscovery } from '../lib/grounded-artwork/partitions'
const { bootstrap, files } = partitionGroundedDiscovery(groundedCards())
for (const [url, body] of files) {
  const target = path.join('public', url)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, body)
}
console.log(`Grounded discovery: ${bootstrap.total} works, ${bootstrap.initial.length} initial cards, ${Buffer.byteLength(JSON.stringify(bootstrap))} initial bytes, ${files.size} on-demand files`)
