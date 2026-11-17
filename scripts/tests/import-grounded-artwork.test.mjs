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
test('all 155 checked-in works have byte-accurate, transparent fixed assets', async () => {
 const catalogue = JSON.parse(await readFile(resolve(ROOT,'lib/grounded-artwork/catalogue.json'),'utf8'))
 const report = await checkCatalogue(catalogue,{regenerate:false})
 assert.equal(report.artworks,155); assert.equal(report.files,1395)
 for (const theme of ['light', 'dark', 'mono']) {
  const worstPage = catalogue.map(a => a.variants[theme].thumbnailBytes).sort((a,b) => b-a).slice(0,24).reduce((a,b) => a+b,0)
  assert(worstPage < 1000000, 'Selected-palette visible-page thumbnail budget exceeded')
 }
 for (const art of catalogue) for (const variant of Object.values(art.variants)) assert(variant.thumbnailBytes < 50000, 'Per-thumbnail budget exceeded')
 assert.equal(catalogue.filter(a=>a.minimumDisplayWidth===320).length,108)
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
 assert.equal(catalogue.slice(30,55).length,25)
 assert(catalogue.slice(30,55).every(a => a.batchId === 'grounded-forms-twenty-five-studies-set05-r01'))
 assert.equal(new Set(catalogue.flatMap(a => Object.values(a.variants).map(v => v.sha256))).size,465)
})
test('reviewed geometric SVG primitives stay inert and external references remain rejected', () => {
 validateSvg(Buffer.from(safe.replace('</svg>','<metadata>Illustrative geometry</metadata><line x1="0" y1="0" x2="1" y2="1"/><circle cx="1" cy="1" r="1"/><ellipse cx="1" cy="1" rx="1" ry="2"/><polygon points="0,0 1,1 2,0"/></svg>')))
 for (const fragment of ['<metadata><script/></metadata>','<line onload="run()"/>','<circle href="https://example.com"/>','<polygon style="fill:url(https://example.com)"/>']) assert.throws(()=>validateSvg(Buffer.from(safe.replace('</svg>',fragment+'</svg>'))))
})

test('Set05 migration rejects changes to either published prefix before asset writes', async () => {
 const { verifySet05Baseline } = await import('../import-grounded-set05.mjs')
 const catalogue=JSON.parse(await readFile(resolve(ROOT,'lib/grounded-artwork/catalogue.json')))
 const manifest=JSON.parse(await readFile(resolve(ROOT,'assets/grounded/manifest.json')))
 assert.equal(verifySet05Baseline(catalogue.slice(0,55),{...manifest,catalogueSha256:'4e47b279dc90ae7037ed9398e3152f58db53d7c5a9aec6f7ff8a6e8fb84ead06',artworks:manifest.artworks.slice(0,55)}).length,30)
 assert.equal(verifySet05Baseline(catalogue.slice(0,30), {...manifest,catalogueSha256:'d1d980bcb3d4f72522cf64eadcf86bfdddc2c0e75121445573973e5dd17bd1de',artworks:manifest.artworks.slice(0,30)}).length,30)
 const wrong=structuredClone(catalogue);wrong[0].title='changed'
 assert.throws(()=>verifySet05Baseline(wrong.slice(0,55),{...manifest,catalogueSha256:'4e47b279dc90ae7037ed9398e3152f58db53d7c5a9aec6f7ff8a6e8fb84ead06',artworks:manifest.artworks.slice(0,55)}),/Published pilot changed/)
 const transport=structuredClone(manifest);transport.artworks[0].rawBytes++
 assert.throws(()=>verifySet05Baseline(catalogue.slice(0,55),{...transport,catalogueSha256:'4e47b279dc90ae7037ed9398e3152f58db53d7c5a9aec6f7ff8a6e8fb84ead06',artworks:transport.artworks.slice(0,55)}),/pilot transport changed/)
})
test('Set05 migration enforces the exact reviewed result before initial or repeat metadata writes', async () => {
 const { verifySet05Catalogue } = await import('../import-grounded-set05.mjs')
 const catalogue=JSON.parse(await readFile(resolve(ROOT,'lib/grounded-artwork/catalogue.json')))
 verifySet05Catalogue(catalogue.slice(0,55))
 const wrong=structuredClone(catalogue);wrong[30].variants.light.previewSha256='0'.repeat(64)
 assert.throws(()=>verifySet05Catalogue(wrong.slice(0,55)),/Catalogue pin drift/)
 assert.throws(()=>verifySet05Catalogue(catalogue.slice(0,30)),/Catalogue pin drift/)
})

test('Set06 preserves all 55 published catalogue and transport entries', async () => {
 const { verifySet06Baseline } = await import('../import-grounded-set06.mjs')
 const catalogue=JSON.parse(await readFile(resolve(ROOT,'lib/grounded-artwork/catalogue.json'))).slice(0,80)
 const fullManifest=JSON.parse(await readFile(resolve(ROOT,'assets/grounded/manifest.json')))
 const manifest={...fullManifest,catalogueSha256:'70a46ac2eac813ba4fef83c79ba96babcd0a0b19c6107ce5299805b623aaf96e',artworks:fullManifest.artworks.slice(0,80)}
 assert.equal(verifySet06Baseline(catalogue,manifest).length,55)
 assert.equal(verifySet06Baseline(catalogue.slice(0,55),{...manifest,catalogueSha256:'4e47b279dc90ae7037ed9398e3152f58db53d7c5a9aec6f7ff8a6e8fb84ead06',artworks:manifest.artworks.slice(0,55)}).length,55)
 const wrong=structuredClone(catalogue);wrong[40].limitations='changed'
 assert.throws(()=>verifySet06Baseline(wrong,manifest),/Published Set05 changed/)
 const transport=structuredClone(manifest);transport.artworks[40].rawBytes++
 assert.throws(()=>verifySet06Baseline(catalogue,transport),/Set05 transport changed/)
})
test('Set06 migration rejects changed new metadata before writing a result', async () => {
 const { verifySet06Catalogue } = await import('../import-grounded-set06.mjs')
 const catalogue=JSON.parse(await readFile(resolve(ROOT,'lib/grounded-artwork/catalogue.json'))).slice(0,80)
 verifySet06Catalogue(catalogue)
 const wrong=structuredClone(catalogue);wrong[55].limitations='changed'
 assert.throws(()=>verifySet06Catalogue(wrong),/Catalogue pin drift/)
 assert.throws(()=>verifySet06Catalogue(catalogue.slice(0,55)),/Catalogue pin drift/)
 assert.equal(catalogue.slice(55).length,25)
 assert(catalogue.slice(55).every(a=>a.batchId==='grounded-forms-twenty-five-studies-set06-r01'))
 assert.equal(new Set(catalogue.slice(55).flatMap(a=>Object.values(a.variants).map(v=>v.sha256))).size,75)
})
test('Set06 preserves generic specimen provenance and unverified media rights', async () => {
 const catalogue=JSON.parse(await readFile(resolve(ROOT,'lib/grounded-artwork/catalogue.json'))).slice(0,80)
 const art=catalogue.find(a=>a.slug==='horseshoe-carapace')
 assert.match(art.provenance,/generic facts-grounded original/)
 assert.match(art.provenance,/current media license not fully verified/)
 assert(art.sources.some(s=>s.url==='https://qrius.si.edu/browse/object/10795203'))
 assert(!art.sources.some(s=>s.url.includes('/object/horseshoe-crab')))
 assert.equal(catalogue.slice(55).filter(a=>a.minimumDisplayWidth===320).length,18)
})
test('Set06 mapper preserves scientific text and corrects only the known reference URL', async () => {
 const { metadataForSet06 }=await import('../import-grounded-set06.mjs')
 const source={id:'horseshoe-carapace',number:'09',title:'Horseshoe carapace',revision:1,width:900,height:900,viewBox:[0,0,900,900],minimum_display_width:320,caption:'Caption',basis:'Exact basis.',limitations:'Exact limitations.',provenance:'Generic original; current media license not fully verified.',subject:'biology',tags:['specimen architecture'],aliases:['Horseshoe carapace','horseshoe carapace'],sources:[{title:'Smithsonian record',url:'https://www.si.edu/object/horseshoe-crab%3Anmnheducation_10795203'},{title:'Other',url:'https://example.com/reference'}]}
 const a=metadataForSet06(source,'set06')
 assert.equal(a.basis,source.basis);assert.equal(a.limitations,source.limitations);assert.equal(a.caption,source.caption)
 assert(a.provenance.startsWith(source.provenance+' '));assert(!a.provenance.includes('..'))
 assert.deepEqual(a.tags,['specimen-architecture']);assert.deepEqual(a.aliases,['horseshoe carapace'])
 assert.equal(a.sources[0].url,'https://qrius.si.edu/browse/object/10795203');assert.equal(a.sources[1].url,source.sources[1].url)
})

test('migration adapters reject foreign transport tails and mismatched catalogue headers', async () => {
 const { verifySet05Baseline }=await import('../import-grounded-set05.mjs')
 const { verifySet06Baseline }=await import('../import-grounded-set06.mjs')
 const catalogue=JSON.parse(await readFile(resolve(ROOT,'lib/grounded-artwork/catalogue.json')))
 const manifest=JSON.parse(await readFile(resolve(ROOT,'assets/grounded/manifest.json')))
 const prefix=catalogue.slice(0,55), transport={...manifest,catalogueSha256:'4e47b279dc90ae7037ed9398e3152f58db53d7c5a9aec6f7ff8a6e8fb84ead06',artworks:manifest.artworks.slice(0,55)}
 for(const verify of [verifySet05Baseline,verifySet06Baseline]) {
  assert.throws(()=>verify(prefix,{...transport,artworks:[...transport.artworks,transport.artworks[0]]}),/transport count mismatch/)
  assert.throws(()=>verify(prefix,{...transport,catalogueSha256:'wrong-catalogue'}),/transport catalogue mismatch/)
 }
})

test('Set07 static polylines and opacity remain finite and inert', () => {
 for(const points of ['0,0 1,1','0 0 1 1','-1.5,+2.0 3e1,4','0 , 0 1 , 1']) validateSvg(Buffer.from(safe.replace('</svg>',`<polyline points="${points}" fill-opacity="0.25"/></svg>`)))
 for(const points of ['', '0 0 1', '0 NaN 1 1', '0 Infinity 1 1', '0 1e999 1 1', '0 0 1 1junk', '0,,0 1,1', '0 0,,1 1', '0, ,0 1,1', ',0 0 1 1', '0 0 1 1,']) assert.throws(()=>validateSvg(Buffer.from(safe.replace('</svg>',`<polyline points="${points}"/></svg>`))),/Invalid SVG polyline points/)
 for(const opacity of ['-0.1','1.1','NaN','Infinity','1e999','0.5;fill:red','url(#x)']) assert.throws(()=>validateSvg(Buffer.from(safe.replace('</svg>',`<polygon points="0,0 1,1" fill-opacity="${opacity}"/></svg>`))),/Invalid SVG fill opacity/)
 for(const extra of ['onload="run()"','style="fill:red"','href="https://example.com"','fill="url(https://example.com)"']) assert.throws(()=>validateSvg(Buffer.from(safe.replace('</svg>',`<polyline points="0 0 1 1" ${extra}/></svg>`))))
})
test('Set07 preserves all 80 published catalogue and source-transport entries', async () => {
 const {verifySet07Baseline}=await import('../import-grounded-set07.mjs')
 const catalogue=JSON.parse(await readFile(resolve(ROOT,'lib/grounded-artwork/catalogue.json'))).slice(0,105)
 const fullManifest=JSON.parse(await readFile(resolve(ROOT,'assets/grounded/manifest.json')))
 const manifest={...fullManifest,catalogueSha256:'cccf9820b9d86d914be0e533c6c78ac1f0e1477f342ee450024b8a43e669f136',artworks:fullManifest.artworks.slice(0,105)}
 assert.equal(verifySet07Baseline(catalogue,manifest).length,80)
 const prefix=catalogue.slice(0,80),transport={...manifest,catalogueSha256:'70a46ac2eac813ba4fef83c79ba96babcd0a0b19c6107ce5299805b623aaf96e',artworks:manifest.artworks.slice(0,80)}
 assert.equal(verifySet07Baseline(prefix,transport).length,80)
 const wrong=structuredClone(catalogue);wrong[79].limitations='changed'
 assert.throws(()=>verifySet07Baseline(wrong,manifest),/Published Set06 changed/)
 const changed=structuredClone(manifest);changed.artworks[79].rawBytes++
 assert.throws(()=>verifySet07Baseline(catalogue,changed),/Set06 transport changed/)
 assert.throws(()=>verifySet07Baseline(prefix,{...transport,artworks:[...transport.artworks,transport.artworks[0]]}),/transport count mismatch/)
 assert.throws(()=>verifySet07Baseline(prefix,{...transport,catalogueSha256:'wrong'}),/transport catalogue mismatch/)
})
test('Set07 pins exactly 25 additions and rejects metadata drift before result writes', async () => {
 const {verifySet07Catalogue,verifySet07Baseline}=await import('../import-grounded-set07.mjs')
 const catalogue=JSON.parse(await readFile(resolve(ROOT,'lib/grounded-artwork/catalogue.json'))).slice(0,105)
 const fullManifest=JSON.parse(await readFile(resolve(ROOT,'assets/grounded/manifest.json')))
 const manifest={...fullManifest,catalogueSha256:'cccf9820b9d86d914be0e533c6c78ac1f0e1477f342ee450024b8a43e669f136',artworks:fullManifest.artworks.slice(0,105)}
 verifySet07Catalogue(catalogue)
 const wrong=structuredClone(catalogue);wrong[80].limitations='changed'
 assert.throws(()=>verifySet07Catalogue(wrong),/Catalogue pin drift/)
 assert.throws(()=>verifySet07Baseline(wrong,manifest),/Expanded catalogue changed/)
 assert.throws(()=>verifySet07Catalogue(catalogue.slice(0,80)),/Catalogue pin drift/)
 const added=catalogue.slice(80)
 assert.equal(added.length,25);assert(added.every(a=>a.batchId==='grounded-forms-twenty-five-studies-set07-r01'))
 assert.equal(new Set(added.flatMap(a=>Object.values(a.variants).map(v=>v.sha256))).size,75)
 assert.equal(added.filter(a=>a.minimumDisplayWidth===320).length,20)
 assert.deepEqual([...new Set(added.map(a=>a.subject))].sort(),['biology','mathematics','physics'])
})
test('Set07 mapper preserves science and qualifies only reviewed source-access and fine-detail limits', async () => {
 const {metadataForSet07}=await import('../import-grounded-set07.mjs')
 const source={id:'motile-cilium',slug:'motile-cilium',number:'04',title:'Motile cilium',group:'cell-machinery',revision:1,width:900,height:900,viewBox:[0,0,900,900],minimum_display_width:320,caption:'Exact caption',basis:'Exact basis.',limitations:'Exact limits.',provenance:'Original geometry.',tags:['cell machinery'],aliases:['Axoneme','axoneme'],sources:[{title:'Original PMC',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC3322410/'}]}
 const a=metadataForSet07(source,'set07')
 assert.equal(a.caption,source.caption);assert.equal(a.basis,source.basis);assert.equal(a.limitations,source.limitations)
 assert.equal(a.subject,'biology');assert.deepEqual(a.tags,['cell-machinery']);assert.deepEqual(a.aliases,['axoneme'])
 assert.deepEqual(a.sources[0],source.sources[0]);assert(a.sources.some(s=>s.url==='https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3003442'))
 assert.match(a.provenance,/direct full-text access to the original PMC references was limited/)
 assert.throws(()=>metadataForSet07({...source,slug:'other'},'set07'),/Canonical source identity changed/)
 assert.throws(()=>metadataForSet07({...source,group:'unreviewed'},'set07'),/Unreviewed source group/)
 const catalogue=JSON.parse(await readFile(resolve(ROOT,'lib/grounded-artwork/catalogue.json')))
 const eclipse=catalogue.find(a=>a.slug==='eclipse-cones')
 assert.match(eclipse.provenance,/retrieval of the original OUP endpoint failed/)
 assert(eclipse.sources.some(s=>s.url==='https://arxiv.org/html/1703.03414v1'))
 const arch=catalogue.find(a=>a.slug==='archimedean-bounds')
 assert.equal(arch.minimumDisplayWidth,320);assert.match(arch.provenance,/fine twelve-gon and circle separation is clearest at 640px/)
})

test('Set08 preserves all 105 published works and rejects old or new catalogue and transport drift', async () => {
 const {verifySet08Baseline,verifySet08Catalogue}=await import('../import-grounded-set08.mjs')
 const catalogue=JSON.parse(await readFile(resolve(ROOT,'lib/grounded-artwork/catalogue.json'))).slice(0,130)
 const fullManifest=JSON.parse(await readFile(resolve(ROOT,'assets/grounded/manifest.json')))
 const manifest={...fullManifest,catalogueSha256:'2e0b46e5b6fef0339df3980f3f6bc6c122b553f6111bc9fe3d36464851330705',artworks:fullManifest.artworks.slice(0,130)}
 assert.equal(verifySet08Baseline(catalogue,manifest).length,105)
 verifySet08Catalogue(catalogue)
 const old=structuredClone(catalogue);old[104].basis='changed'
 assert.throws(()=>verifySet08Baseline(old,manifest),/Published Set07 changed/)
 const changed=structuredClone(catalogue);changed[105].limitations='changed'
 assert.throws(()=>verifySet08Catalogue(changed),/Catalogue pin drift/)
 const transport=structuredClone(manifest);transport.artworks[104].rawBytes++
 assert.throws(()=>verifySet08Baseline(catalogue,transport),/Set07 transport changed/)
 const added=catalogue.slice(105)
 assert.deepEqual(added.map(a=>[a.slug,a.subject]), [["alveolar-sac", "biology"], ["intestinal-villus", "biology"], ["myelinated-axon", "biology"], ["insect-trachea", "biology"], ["renal-nephron", "biology"], ["karst-cavern", "geology"], ["oxbow-cutoff", "geology"], ["alluvial-fan", "geology"], ["glacial-cirque", "geology"], ["graded-bed", "geology"], ["ratchet-pawl", "mechanics"], ["cam-follower", "mechanics"], ["scotch-yoke", "mechanics"], ["scissor-lift", "mechanics"], ["universal-joint", "mechanics"], ["parallel-plate-capacitor", "physics"], ["solenoid-section", "physics"], ["transformer-core", "physics"], ["hall-effect", "physics"], ["motional-emf", "physics"], ["stereographic-projection", "mathematics"], ["pick-lattice-area", "mathematics"], ["napoleon-triangle", "mathematics"], ["tractrix-tow", "mathematics"], ["cavalieri-shear", "mathematics"]])
 assert.equal(added.length,25)
 assert(added.every(a=>a.minimumDisplayWidth===320 && a.batchId==='grounded-forms-twenty-five-studies-set08-r01'))
 assert.equal(new Set(added.flatMap(a=>Object.values(a.variants).map(v=>v.sha256))).size,75)
})
test('Set08 rectangle geometry is finite and inert', () => {
 validateSvg(Buffer.from(safe.replace('</svg>','<rect x="-1" y="2" width="3" height="4"/></svg>')))
 for(const attr of ['x="NaN"','y="1e999"','width="-1"','height="10%"','rx="-2"','x="0;run()"','onclick="run()"','fill="url(https://example.com)"']) assert.throws(()=>validateSvg(Buffer.from(safe.replace('</svg>',`<rect ${attr}/></svg>`))))
})
test('Set08 mapper preserves the source brief, scientific limitations and references', async () => {
 const {metadataForSet08}=await import('../import-grounded-set08.mjs')
 const source={id:'example',slug:'example',number:'01',title:'Example',group:'body-interfaces',subject:'biology',revision:1,width:900,height:900,viewBox:[0,0,900,900],minimum_display_width:320,brief:'Exact brief',basis:'Exact basis',limitations:'Exact caveats',provenance:'Original geometry.',tags:['body interfaces'],aliases:['Example'],sources:[{title:'Fact source',url:'https://example.com'}]}
 const a=metadataForSet08(source,'set08')
 assert.throws(()=>metadataForSet08({...source,subject:'engineering'},'set08'),/Authored source subject changed/)
 assert.equal(a.caption,source.brief);assert.equal(a.basis,source.basis);assert.equal(a.limitations,source.limitations);assert.deepEqual(a.sources,source.sources)
 assert(a.provenance.startsWith(source.provenance));assert.equal(a.subject,'biology')
 assert.throws(()=>metadataForSet08({...source,group:'unknown'},'set08'),/Unreviewed source group/)
})

test('Set09 preserves all 130 published works and rejects old or new catalogue and transport drift', async () => {
 const {verifySet09Baseline,verifySet09Catalogue}=await import('../import-grounded-set09.mjs')
 const catalogue=JSON.parse(await readFile(resolve(ROOT,'lib/grounded-artwork/catalogue.json'))).slice(0,155)
 const manifest=JSON.parse(await readFile(resolve(ROOT,'assets/grounded/manifest.json')))
 assert.equal(verifySet09Baseline(catalogue,manifest).length,130)
 verifySet09Catalogue(catalogue)
 const old=structuredClone(catalogue);old[129].basis='changed'
 assert.throws(()=>verifySet09Baseline(old,manifest),/Published Set08 changed/)
 const changed=structuredClone(catalogue);changed[130].limitations='changed'
 assert.throws(()=>verifySet09Catalogue(changed),/Catalogue pin drift/)
 const transport=structuredClone(manifest);transport.artworks[129].rawBytes++
 assert.throws(()=>verifySet09Baseline(catalogue,transport),/Set08 transport changed/)
 const added=catalogue.slice(130)
 assert.deepEqual(added.map(a=>[a.slug,a.subject]), [["anther-section", "biology"], ["legume-pod", "biology"], ["pine-cone-scale", "biology"], ["dandelion-pappus", "biology"], ["moss-capsule", "biology"], ["compact-bone-osteon", "biology"], ["tendon-fascicle", "biology"], ["epidermal-barrier", "biology"], ["intervertebral-disc", "biology"], ["arterial-wall", "biology"], ["poiseuille-profile", "physics"], ["couette-shear", "physics"], ["stokes-settling", "physics"], ["hydraulic-jump", "physics"], ["rankine-vortex", "physics"], ["methane-tetrahedron", "chemistry"], ["boron-trifluoride-plane", "chemistry"], ["sulfur-hexafluoride-octahedron", "chemistry"], ["cyclohexane-chair", "chemistry"], ["water-hydrogen-chain", "chemistry"], ["bezier-subdivision", "mathematics"], ["delaunay-edge-flip", "mathematics"], ["clothoid-transition", "mathematics"], ["ellipse-reflection", "mathematics"], ["tesseract-projection", "mathematics"]])
 assert.equal(added.length,25)
 assert(added.every(a=>a.minimumDisplayWidth===320 && a.batchId==='grounded-forms-twenty-five-studies-set09-r01'))
 assert.equal(new Set(added.flatMap(a=>Object.values(a.variants).map(v=>v.sha256))).size,75)
})

test('Set09 every authored semantic field and discovery identity survives the mapper', async () => {
 const {metadataForSet09}=await import('../import-grounded-set09.mjs')
 const sources=JSON.parse(await readFile(new URL('./fixtures/set09-source-metadata.json',import.meta.url)))
 const catalogue=JSON.parse(await readFile(resolve(ROOT,'lib/grounded-artwork/catalogue.json'))).slice(130)
 assert.equal(sources.length,25)
 for(const [i,source] of sources.entries()) {
  const mapped=metadataForSet09(source,'grounded-forms-twenty-five-studies-set09-r01')
  const actual={...catalogue[i]};delete actual.variants
  assert.deepEqual(actual,mapped)
  for(const field of ['subject','title','basis','limitations']) assert.equal(actual[field],source[field])
  assert.equal(actual.caption,source.brief);assert.deepEqual(actual.sources,source.sources.map(({title,url})=>({title,url})))
  assert.deepEqual(actual.aliases,source.aliases);assert.deepEqual(actual.tags,source.tags)
  assert(actual.provenance.startsWith(source.provenance.replace(/[.\s]+$/, '')+'.'))
  assert.throws(()=>metadataForSet09({...source,subject:'invented'},'set09'),/Authored source subject changed/)
 }
})
test('Set09 rejects foreign identity, groups and transport tails', async () => {
 const {metadataForSet09,verifySet09Baseline}=await import('../import-grounded-set09.mjs')
 const [source]=JSON.parse(await readFile(new URL('./fixtures/set09-source-metadata.json',import.meta.url)))
 assert.throws(()=>metadataForSet09({...source,slug:'wrong'},'set09'),/Canonical source identity/)
 assert.throws(()=>metadataForSet09({...source,group:'unknown'},'set09'),/Unreviewed source group/)
 const catalogue=JSON.parse(await readFile(resolve(ROOT,'lib/grounded-artwork/catalogue.json')))
 const manifest=JSON.parse(await readFile(resolve(ROOT,'assets/grounded/manifest.json')))
 assert.throws(()=>verifySet09Baseline(catalogue,{...manifest,artworks:[...manifest.artworks,manifest.artworks[0]]}),/transport count mismatch/)
 assert.throws(()=>verifySet09Baseline(catalogue,{...manifest,catalogueSha256:'wrong'}),/transport catalogue mismatch/)
})
