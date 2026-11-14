import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'
import { GROUNDED_ARTWORK, groundedArtworkUrl, GROUNDED_PAGE_SIZE } from '../lib/grounded-artwork/registry'
import { GROUNDED_THEMES } from '../lib/grounded-artwork/types'

const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
/** Serialized export + exact assets; not a browser or a scientific-certification gate. */
export async function checkGroundedOutput(site = 'out') {
  const root = path.resolve(site)
  const read = (relative: string) => fs.readFile(path.join(root, relative))
  const collection = new JSDOM(await read('vectors/grounded/index.html'))
  const sitemap = new JSDOM(await read('sitemap.xml'), { contentType: 'text/xml' })
  const locations = [...sitemap.window.document.querySelectorAll('loc')].map(n => n.textContent)
  const page = (document: Document, route: string) => {
    assert.equal(document.querySelectorAll('h1').length, 1, `Grounded title structure: ${route}`)
    assert.equal(document.querySelector('h1')?.closest('main')?.id, 'main-content', `Grounded final main: ${route}`)
    assert.equal(document.querySelector('link[rel="canonical"]')?.getAttribute('href'), `https://benebsworth.com${route}`, `Grounded canonical: ${route}`)
    assert(locations.includes(`https://benebsworth.com${route}`), `Grounded sitemap: ${route}`)
  }
  let bytesChecked = 0, assetsChecked = 0
  try {
    const doc = collection.window.document
    page(doc, '/vectors/grounded/')
    const cards = [...doc.querySelectorAll('[data-grounded-card]')]
    assert.equal(cards.length, Math.min(GROUNDED_PAGE_SIZE, GROUNDED_ARTWORK.length), 'Bounded initial grounded cards')
    assert(doc.querySelector('a[href="/vectors/"]'), 'Grounded return to tunable library')
    for (const [i, card] of cards.entries()) {
      const art = GROUNDED_ARTWORK[i]
      assert.equal(card.getAttribute('data-grounded-card'), art.slug, 'Initial grounded identity/order')
      const img = card.querySelector('img')
      assert.equal(img?.getAttribute('src'), art.variants.light.thumbnail, `Grounded thumbnail: ${art.slug}`)
      assert.equal(img?.getAttribute('loading'), 'lazy', `Grounded thumbnail lazy: ${art.slug}`)
      assert.equal(img?.getAttribute('width'), img?.getAttribute('height'), 'Square grounded thumbnail')
    }
    assert(!doc.querySelector('img[src$=".svg"],object,embed'), 'No grounded master fetched on arrival')
    for (const art of GROUNDED_ARTWORK) {
      const route = groundedArtworkUrl(art)
      const detail = new JSDOM(await read(`${route.slice(1)}index.html`))
      try {
        const document = detail.window.document
        page(document, route)
        assert.equal(document.querySelector('h1')?.textContent, art.title, `Grounded title: ${art.slug}`)
        assert(document.querySelector('a[href="/vectors/grounded/"]'), `Collection link: ${art.slug}`)
        assert.equal(document.querySelector('[data-grounded-preview]')?.getAttribute('src'), art.variants.light.preview, `Grounded preview: ${art.slug}`)
        assert.equal(document.querySelector('[data-grounded-download]')?.getAttribute('href'), art.variants.light.master, `Grounded original download: ${art.slug}`)
        assert.equal(document.querySelector('[data-grounded-basis]')?.textContent, art.basis, `Grounded basis: ${art.slug}`)
        assert.equal(document.querySelector('[data-grounded-limitations]')?.textContent, art.limitations, `Grounded limitations: ${art.slug}`)
        assert(document.querySelector('[data-grounded-basis]')?.closest('[data-pagefind-ignore]'), 'Scientific caveats excluded from automated fulltext index')
      } finally { detail.window.close() }
      for (const theme of GROUNDED_THEMES) {
        const v = art.variants[theme]
        for (const [url, sha, size] of [[v.master, v.sha256, v.bytes], [v.thumbnail, v.thumbnailSha256, v.thumbnailBytes], [v.preview, v.previewSha256, v.previewBytes]] as const) {
          const bytes = await read(url.slice(1))
          assert.equal(bytes.length, size, `Grounded asset size: ${url}`)
          assert.equal(digest(bytes), sha, `Grounded asset hash: ${url}`)
          bytesChecked += bytes.length; assetsChecked++
        }
      }
    }
    return { fixedArtworks: GROUNDED_ARTWORK.length, assetsChecked, bytesChecked, originalSvgMasters: GROUNDED_ARTWORK.length * 3, initialCards: cards.length, staticOutput: 'passed', browserAcceptance: 'NOT RUN', deployment: 'NOT RUN' }
  } finally { collection.window.close(); sitemap.window.close() }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.stdout.write(`${JSON.stringify(await checkGroundedOutput(process.argv[2] || 'out'), null, 2)}\n`)
}
