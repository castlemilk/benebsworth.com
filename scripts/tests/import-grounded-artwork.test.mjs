import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { ROOT, slugFor, validateSvg, metadataFor, checkCatalogue } from '../import-grounded-artwork.mjs'
const safe = '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900"><path d="M0 0 L1 1"/></svg>'
test('canonical slug maps only numbered prefix, not title', () => {
 assert.equal(slugFor('04-phyllotactic-head'),'phyllotactic-head')
 assert.equal(slugFor('degenerate-membrane'),'degenerate-membrane')
 assert.throws(()=>slugFor('../outside'))
})
test('SVG scanner parses XML and rejects unsafe elements, attributes, external URLs and duplicate IDs', () => {
 validateSvg(Buffer.from(safe))
 for (const fragment of ['<script/>','<foreignObject/>','<image href="https://example.com/a.png"/>','<path onclick="run()"/>','<path fill="url(https://example.com/a)"/>','<g id="a"/><g id="a"/>','<animate/>']) {
  assert.throws(()=>validateSvg(Buffer.from(safe.replace('</svg>',`${fragment}</svg>`))))
 }
 assert.throws(()=>validateSvg(Buffer.from('<!DOCTYPE svg>'+safe)))
 assert.throws(()=>validateSvg(Buffer.from(safe.replace('width="900"','width="320"'))))
 assert.throws(()=>validateSvg(Buffer.from(safe.replace('</svg>',''))))
})
test('curated metadata does not mine caveat text into search aliases', () => {
 const item = metadataFor({original_id:'degenerate-membrane',scientific_basis_text:'05 · Nodal membrane\n\nNot a Chladni plate.\n\nSource: [Modes](https://example.com)',direction_metadata:{},provenance:'Original'})
 assert.equal(item.basis,'Not a Chladni plate.')
 assert(!JSON.stringify([item.subject,item.tags,item.aliases]).includes('Chladni'))
 assert.equal(item.sources[0].title,'Modes')
})
test('all 30 checked-in works have byte-accurate, transparent fixed assets', async () => {
 const catalogue = JSON.parse(await readFile(resolve(ROOT,'lib/grounded-artwork/catalogue.json'),'utf8'))
 const report = await checkCatalogue(catalogue,{regenerate:false})
 assert.equal(report.artworks,30); assert.equal(report.files,270)
 for (const bytes of Object.values(report.thumbnails)) assert(bytes < 750000, 'Selected-palette gallery thumbnail budget exceeded')
 for (const art of catalogue) for (const variant of Object.values(art.variants)) assert(variant.thumbnailBytes < 50000, 'Per-thumbnail budget exceeded')
 assert.equal(catalogue.filter(a=>a.minimumDisplayWidth===320).length,6)
})
test('catalogue verification fails on duplicate identity and hash mutations', async () => {
 const catalogue = JSON.parse(await readFile(resolve(ROOT,'lib/grounded-artwork/catalogue.json'),'utf8'))
 const duplicate = structuredClone(catalogue); duplicate[1] = duplicate[0]
 await assert.rejects(checkCatalogue(duplicate,{regenerate:false}), /Duplicate slug/)
 const mutated = structuredClone(catalogue); mutated[0].variants.light.sha256 = '0'.repeat(64)
 await assert.rejects(checkCatalogue(mutated,{regenerate:false}), /Hash mutation/)
 const unsafe = structuredClone(catalogue); unsafe[0].variants.light.master = '/artwork/grounded/../outside.svg'
 await assert.rejects(checkCatalogue(unsafe,{regenerate:false}), /Unsafe asset path/)
})
