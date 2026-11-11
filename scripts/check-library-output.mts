import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'
import { STUDIES } from '../lib/generative-svg/model'
import { renderStudySvg } from '../lib/generative-svg/render'
import { ARTWORK } from '../lib/editorial-artwork/registry'
import { checkStudySearch } from './check-study-search.mts'

const repository = fileURLToPath(new URL('../', import.meta.url))
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

/** Read serialized static HTML only. No scripts, resources, browser or network. */
export async function checkLibraryOutput(site: string, source = repository) {
  const root = path.resolve(site)
  const read = (relative: string) => fs.readFile(path.join(root, relative))
  const libraryDom = new JSDOM(await read('vectors/index.html'))
  const archiveDom = new JSDOM(await read('vectors/originals/index.html'))
  try {
    const library = libraryDom.window.document, archive = archiveDom.window.document
    for (const [document, route] of [[library, '/vectors/'], [archive, '/vectors/originals/']] as const) {
      assert.equal(document.querySelectorAll('h1').length, 1, `Single serialized title: ${route}`)
      // Next can serialize both its temporary loading main and a streamed final main.
      // Do not claim hydrated landmark acceptance from this static inspection.
      assert.equal(document.querySelector('h1')?.closest('main')?.id, 'main-content', `Final main: ${route}`)
      assert.equal(document.querySelector('link[rel="canonical"]')?.getAttribute('href'), `https://benebsworth.com${route}`, `Canonical: ${route}`)
      assert.equal(document.querySelector('meta[property="og:url"]')?.getAttribute('content'), `https://benebsworth.com${route}`, `Open Graph URL: ${route}`)
    }
    assert(library.querySelector('a[href="/vectors/originals/"]'), 'Discoverable original archive')
    assert(archive.querySelector('a[href="/vectors/"]'), 'Archive return link')
    const studyButtons = [...library.querySelectorAll('#svg-studies button[aria-label^="Open "]')]
    assert.equal(studyButtons.length, STUDIES.length, 'SVG study card count')
    for (const study of STUDIES) {
      assert.equal(studyButtons.filter(button => button.getAttribute('aria-label') === `Open ${study.title}`).length, 1, `Study card: ${study.id}`)
    }
    const defaultStudy = STUDIES[0]
    const svgLink = library.querySelector(`a[download="${defaultStudy.id}.svg"]`)
    const href = svgLink?.getAttribute('href') || ''
    const prefix = 'data:image/svg+xml;charset=utf-8,'
    assert(href.startsWith(prefix), 'Standalone SVG download')
    assert.equal(decodeURIComponent(href.slice(prefix.length)), renderStudySvg(defaultStudy), 'Exact default SVG export bytes')

    for (const asset of ARTWORK) {
      assert.equal(library.querySelectorAll(`[id="artwork-${asset.id}"]`).length, 1, `Unique artwork anchor: ${asset.id}`)
      const filename = path.posix.basename(asset.src)
      assert.equal(library.querySelector(`a[download="${filename}"]`)?.getAttribute('href'), asset.src, `PNG download: ${asset.id}`)
      const bytes = await read(asset.src.slice(1))
      assert.equal(bytes.length, asset.bytes, `PNG size: ${asset.id}`)
      assert.equal(hash(bytes), asset.sha256, `PNG hash: ${asset.id}`)
      assert(bytes.equals(await fs.readFile(path.join(source, 'public', asset.src.slice(1)))), `Original PNG bytes: ${asset.id}`)
    }
    const provenance = await read('artwork/editorial/provenance.json')
    assert(provenance.equals(await fs.readFile(path.join(source, 'public/artwork/editorial/provenance.json'))), 'Public provenance bytes')
    assert.deepEqual(JSON.parse(provenance.toString()).assets, JSON.parse(await fs.readFile(path.join(source, 'lib/editorial-artwork/manifest.json'), 'utf8')), 'Public artwork provenance')
    let originalFiles = 0
    async function originals(directory = 'vectors') {
      for (const entry of await fs.readdir(path.join(source, 'public', directory), { withFileTypes: true })) {
        const relative = path.join(directory, entry.name)
        if (entry.isDirectory()) await originals(relative)
        else {
          assert(entry.isFile(), `Unexpected original asset type: ${relative}`)
          assert((await read(relative)).equals(await fs.readFile(path.join(source, 'public', relative))), `Original vector bytes: ${relative}`)
          originalFiles++
        }
      }
    }
    await originals()
    assert(originalFiles > 0, 'Original vector archive is nonempty')
    const sitemapDom = new JSDOM(await read('sitemap.xml'), { contentType: 'text/xml' })
    try {
      const locations = [...sitemapDom.window.document.querySelectorAll('loc')].map(node => node.textContent)
      for (const route of ['/vectors/', '/vectors/originals/']) assert(locations.includes(`https://benebsworth.com${route}`), `Sitemap: ${route}`)
    } finally { sitemapDom.window.close() }
    return { serializedLibraryAndArchive: 'passed', svgStudies: STUDIES.length, pngArtwork: ARTWORK.length, pngHashesAndProvenance: 'passed', preservedOriginalFiles: originalFiles, defaultSvgExport: 'exact', browserAcceptance: 'NOT RUN', deployment: 'NOT RUN', releaseApproved: false }
  } finally {
    libraryDom.window.close()
    archiveDom.window.close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const site = process.argv[2] || 'out'
  const library = await checkLibraryOutput(site)
  const search = await checkStudySearch(site)
  process.stdout.write(`${JSON.stringify({ ...library, search }, null, 2)}\n`)
}
