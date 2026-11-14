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
test('all 55 checked-in works have byte-accurate, transparent fixed assets', async () => {
 const catalogue = JSON.parse(await readFile(resolve(ROOT,'lib/grounded-artwork/catalogue.json'),'utf8'))
 const report = await checkCatalogue(catalogue,{regenerate:false})
 assert.equal(report.artworks,55); assert.equal(report.files,495)
 for (const theme of ['light', 'dark', 'mono']) {
  const worstPage = catalogue.map(a => a.variants[theme].thumbnailBytes).sort((a,b) => b-a).slice(0,24).reduce((a,b) => a+b,0)
  assert(worstPage < 1000000, 'Selected-palette visible-page thumbnail budget exceeded')
 }
 for (const art of catalogue) for (const variant of Object.values(art.variants)) assert(variant.thumbnailBytes < 50000, 'Per-thumbnail budget exceeded')
 assert.equal(catalogue.filter(a=>a.minimumDisplayWidth===320).length,20)
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
test('Set05 appends 25 works without changing the published pilot metadata or download identities', async () => {
 const { createHash } = await import('node:crypto')
 const { PILOT_CATALOGUE_SHA256 } = await import('../import-grounded-artwork.mjs')
 const catalogue = JSON.parse(await readFile(resolve(ROOT,'lib/grounded-artwork/catalogue.json'),'utf8'))
 assert.equal(createHash('sha256').update(JSON.stringify(catalogue.slice(0,30),null,2)+'\n').digest('hex'),PILOT_CATALOGUE_SHA256)
 assert.equal(catalogue.slice(30).length,25)
 assert(catalogue.slice(30).every(a => a.batchId === 'grounded-forms-twenty-five-studies-set05-r01'))
 assert.equal(new Set(catalogue.flatMap(a => Object.values(a.variants).map(v => v.sha256))).size,165)
})
test('reviewed geometric SVG primitives stay inert and external references remain rejected', () => {
 validateSvg(Buffer.from(safe.replace('</svg>','<metadata>Illustrative geometry</metadata><line x1="0" y1="0" x2="1" y2="1"/><circle cx="1" cy="1" r="1"/><ellipse cx="1" cy="1" rx="1" ry="2"/><polygon points="0,0 1,1 2,0"/></svg>')))
 for (const fragment of ['<metadata><script/></metadata>','<line onload="run()"/>','<circle href="https://example.com"/>','<polygon style="fill:url(https://example.com)"/>']) assert.throws(()=>validateSvg(Buffer.from(safe.replace('</svg>',fragment+'</svg>'))))
})

test('Set05 migration rejects changes to either published prefix before asset writes', async () => {
 const { verifySet05Baseline } = await import('../import-grounded-set05.mjs')
 const catalogue=JSON.parse(await readFile(resolve(ROOT,'lib/grounded-artwork/catalogue.json')))
 const manifest=JSON.parse(await readFile(resolve(ROOT,'assets/grounded/manifest.json')))
 assert.equal(verifySet05Baseline(catalogue,manifest).length,30)
 assert.equal(verifySet05Baseline(catalogue.slice(0,30), {...manifest,catalogueSha256:'pilot',artworks:manifest.artworks.slice(0,30)}).length,30)
 const wrong=structuredClone(catalogue);wrong[0].title='changed'
 assert.throws(()=>verifySet05Baseline(wrong,manifest),/Published pilot changed/)
 const transport=structuredClone(manifest);transport.artworks[0].rawBytes++
 assert.throws(()=>verifySet05Baseline(catalogue,transport),/pilot transport changed/)
})
test('Set05 migration enforces the exact reviewed result before initial or repeat metadata writes', async () => {
 const { verifySet05Catalogue } = await import('../import-grounded-set05.mjs')
 const catalogue=JSON.parse(await readFile(resolve(ROOT,'lib/grounded-artwork/catalogue.json')))
 verifySet05Catalogue(catalogue)
 const wrong=structuredClone(catalogue);wrong[30].variants.light.previewSha256='0'.repeat(64)
 assert.throws(()=>verifySet05Catalogue(wrong),/Catalogue pin drift/)
 assert.throws(()=>verifySet05Catalogue(catalogue.slice(0,30)),/Catalogue pin drift/)
})
