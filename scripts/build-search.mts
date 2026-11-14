import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createIndex, close } from 'pagefind'
import { STUDY_REGISTRY } from '../lib/generative-svg/model'
import { studySearchRecords } from '../lib/generative-svg/registry'
import { groundedSearchRecords } from '../lib/grounded-artwork/registry'
import { artworkSearchRecords } from '../lib/editorial-artwork/registry'

function check(errors: readonly string[], step: string) {
  if (errors.length) throw new Error(`${step}: ${errors.join('; ')}`)
}

/** Existing HTML index plus one directly addressable record for every registered study. */
export async function buildSearch(site = 'out') {
  try {
    const created = await createIndex()
    check(created.errors, 'Create search index')
    if (!created.index) throw new Error('Pagefind did not create an index')
    const index = created.index
    const html = await index.addDirectory({ path: site })
    check(html.errors, 'Index exported HTML')
    const studies = studySearchRecords(STUDY_REGISTRY)
    const artwork = artworkSearchRecords()
    const grounded = groundedSearchRecords()
    const records = [...studies, ...artwork, ...grounded]
    for (const record of records) check((await index.addCustomRecord(record)).errors, `Index ${record.url}`)
    const written = await index.writeFiles({ outputPath: path.join(site, 'pagefind') })
    check(written.errors, 'Write search index')
    return { htmlFilesScanned: html.page_count, svgStudies: studies.length, pngArtwork: artwork.length, groundedArtwork: grounded.length, outputPath: written.outputPath }
  } finally {
    await close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.stdout.write(`${JSON.stringify(await buildSearch(process.argv[2] || 'out'), null, 2)}\n`)
}
