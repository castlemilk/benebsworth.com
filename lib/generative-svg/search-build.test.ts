import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { expect, it } from 'vitest'
import { buildSearch } from '../../scripts/build-search.mjs'
import { checkStudySearch } from '../../scripts/check-study-search.mjs'
import { STUDIES } from './model'
import { ARTWORK } from '../editorial-artwork/registry'

it('builds a real combined Pagefind index alongside articles and resolves every study title/alias', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'svg-search-test-'))
  try {
    await fs.writeFile(path.join(directory, 'index.html'), '<html lang="en"><body><nav>notindexablechrome</nav><article data-pagefind-body><h1>Search fixture</h1>Preserved article text.</article></body></html>')
    const result = await buildSearch(directory)
    expect(result.svgStudies).toBe(STUDIES.length)
    const checked = await checkStudySearch(directory)
    expect(checked.indexedPages).toBe(STUDIES.length + ARTWORK.length + 1)
    expect(result.pngArtwork).toBe(ARTWORK.length)
    expect(checked.artworkDiscovery).toBe('passed')
    expect(checked.titleAndAliasSearch).toBe('passed')
    expect(checked.excludedCaveats).toBe('passed')
  } finally {
    await fs.rm(directory, { recursive: true, force: true })
  }
}, 20000)
