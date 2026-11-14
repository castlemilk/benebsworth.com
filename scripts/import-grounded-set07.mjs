/** Add only the reviewed Set07 packet; preserve the complete published Set06 prefix. */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROOT, THEMES, sha256, validateSvg, renderWebp, checkCatalogue } from './import-grounded-artwork.mjs'
import { SET06_CATALOGUE_SHA256 } from './import-grounded-set06.mjs'
import { encodeArtwork } from './prepare-grounded-artwork.mjs'
export const SET07_CATALOGUE_SHA256 = 'cccf9820b9d86d914be0e533c6c78ac1f0e1477f342ee450024b8a43e669f136'
export const SET07_BATCH_SHA256 = '89e7240c3b263dfdd706af527ed0fbc20f23b0f3505646c1149e2990bb269f77'
export const SET07_HASHES_SHA256 = 'c1d43cc86622eae12e47c9c9f47ca048a863eaf26ff39cc0fa29684887d1ba98'
const json = value => JSON.stringify(value, null, 2) + '\n'
export function verifySet07Baseline(current, transport) {
 assert([80,105].includes(current.length), 'Unexpected catalogue baseline')
 const baseline = current.slice(0,80)
 assert.equal(sha256(Buffer.from(json(baseline))), SET06_CATALOGUE_SHA256, 'Published Set06 changed')
 if (current.length === 105) assert.equal(sha256(Buffer.from(json(current))), SET07_CATALOGUE_SHA256, 'Expanded catalogue changed')
 assert.equal(transport.artworks?.length, current.length, 'Current transport count mismatch')
 assert.equal(transport.catalogueSha256, sha256(Buffer.from(json(current))), 'Current transport catalogue mismatch')
 const prefix = {...transport, catalogueSha256: SET06_CATALOGUE_SHA256, artworks: transport.artworks.slice(0,80)}
 assert.equal(sha256(Buffer.from(json(prefix))), 'a14f9a4e085fac6ea20471deff27a2355dd42a0db385eb27c1f697727562802b', 'Published Set06 transport changed')
 return baseline
}
export function verifySet07Catalogue(catalogue) {
 assert.equal(sha256(Buffer.from(json(catalogue))), SET07_CATALOGUE_SHA256, 'Catalogue pin drift')
}
// Preserve source science verbatim; use the collection's existing broad discovery subjects.
const SUBJECT_BY_GROUP = Object.freeze({
 'cell-machinery':'biology', 'matter-and-interfaces':'physics', 'celestial-geometry':'physics',
 'optics-and-instruments':'physics', 'geometric-reasoning':'mathematics',
})
const EXTRA_PROVENANCE = Object.freeze({
 'motile-cilium':'During source review, direct full-text access to the original PMC references was limited. Accessible PLOS primary research corroborated the depicted relationships; unrestricted access to the original endpoints is not claimed.',
 'eclipse-cones':'During source review, retrieval of the original OUP endpoint failed. The same authors’ accessible arXiv version, with matching journal DOI, supplied the inspected cone derivation.',
 'archimedean-bounds':'The broad construction is intended for 320px or wider; the fine twelve-gon and circle separation is clearest at 640px or wider.',
})
const EXTRA_SOURCES = Object.freeze({
 'motile-cilium':[
  {title:'PLOS Biology: primary research on ciliary doublet architecture',url:'https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3003442'},
 ],
 'eclipse-cones':[{title:'Veras and Breedt (2017): accessible author version',url:'https://arxiv.org/html/1703.03414v1'}],
})
export function metadataForSet07(a, batchId) {
 assert.equal(a.slug,a.id,'Canonical source identity changed')
 const subject=SUBJECT_BY_GROUP[a.group];assert(subject,'Unreviewed source group')
 return { slug: a.id, title: a.title, batchId, sourceId: a.id, sourceDirectoryId: `${a.number}-${a.id}`, revision: a.revision,
  width: a.width, height: a.height, viewBox: a.viewBox.join(' '), minimumDisplayWidth: a.minimum_display_width,
  caption: a.caption, basis: a.basis, limitations: a.limitations,
  provenance: `${a.provenance.replace(/[.\s]+$/, '')}. Scientific references inform facts and mathematics; no reference image is copied or traced. Citations are from the reviewed source packet; this import does not claim new source access or image-license clearance.${EXTRA_PROVENANCE[a.id] ? ` ${EXTRA_PROVENANCE[a.id]}` : ''}`,
  subject, tags: a.tags.map(tag => tag.toLowerCase().replace(/\s+/g, '-')),
  aliases: [...new Map(a.aliases.map(alias => [alias.toLowerCase().trim(), alias])).values()],
  sources: [...a.sources.map(({title,url})=>({title,url})),...(EXTRA_SOURCES[a.id]??[])] }
}
export async function importSet07(packetRoot, { check = false, root = ROOT } = {}) {
 const packet = resolve(packetRoot)
 const batchBytes = await readFile(resolve(packet, 'batch.json'))
 const hashBytes = await readFile(resolve(packet, 'sha256.json'))
 assert.equal(sha256(batchBytes), SET07_BATCH_SHA256, 'Set07 metadata requires re-review')
 assert.equal(sha256(hashBytes), SET07_HASHES_SHA256, 'Set07 manifest requires re-review')
 const batch = JSON.parse(batchBytes), hashes = JSON.parse(hashBytes)
 const notes = await readFile(resolve(packet, 'SCIENTIFIC-BASIS.md'))
 assert.equal(sha256(notes), 'd7416b7d71060fa9921008e41250dc92e0d078e5c2e31b591ff5eadb6acc98a9', 'Set07 scientific notes changed')
 assert((await readFile(resolve(root, 'public/artwork/grounded-notes/set07.d7416b7d71060fa9921008e41250dc92e0d078e5c2e31b591ff5eadb6acc98a9.md'))).equals(notes), 'Published scientific notes changed')
 assert.equal(batch.batch_id, 'grounded-forms-twenty-five-studies-set07-r01')
 assert.equal(batch.artworks.length, 25)
 const catalogueFile = resolve(root,'lib/grounded-artwork/catalogue.json')
 const current = JSON.parse(await readFile(catalogueFile))
 const transportFile = resolve(root,'assets/grounded/manifest.json')
 const transport = JSON.parse(await readFile(transportFile))
 const baseline = verifySet07Baseline(current, transport)
 const entries = transport.artworks.slice(0,80), additions = []
 async function put(relative, data) {
  const target = resolve(root,relative)
  const existing = await readFile(target).catch(e => { if(e.code==='ENOENT') return null; throw e })
  if(existing) assert(existing.equals(data), `Refusing changed output: ${relative}`)
  else { assert(!check, `Missing reviewed output: ${relative}`); await mkdir(dirname(target),{recursive:true}); await writeFile(target,data,{flag:'wx'}) }
 }
 for(const a of batch.artworks) {
  const item = metadataForSet07(a,batch.batch_id); item.variants = {}
  const originals = []
  for(const theme of THEMES) {
   const source = resolve(packet,a.files[theme])
   assert(source.startsWith(packet+sep),'Source escapes reviewed packet')
   const svg = await readFile(source)
   assert.equal(sha256(svg),hashes[a.files[theme]],'Set07 source hash mutation')
   validateSvg(svg); originals.push(svg)
   const assets = { master:svg, thumbnail:await renderWebp(svg,480), preview:await renderWebp(svg,960) }, variant = {}
   for(const [key,data] of Object.entries(assets)) {
    const hash=sha256(data), suffix=key==='master'?'':key==='thumbnail'?'-480':'-960'
    const url=`/artwork/grounded/${item.slug}/${theme}${suffix}.${hash}.${key==='master'?'svg':'webp'}`
    variant[key]=url; variant[key==='master'?'sha256':`${key}Sha256`]=hash; variant[key==='master'?'bytes':`${key}Bytes`]=data.length
    await put(`public${url}`,data)
   }
   item.variants[theme]=variant
  }
  const {entry,chunks}=encodeArtwork(item,originals)
  for(const [i,chunk] of chunks.entries()) await put(`assets/grounded/parts/${entry.parts[i].sha256}.br.b64`,Buffer.from(chunk.toString('base64')+'\n'))
  entries.push(entry); additions.push(item)
 }
 const catalogue=[...baseline,...additions], data=Buffer.from(json(catalogue))
 verifySet07Catalogue(catalogue)
 const manifest=Buffer.from(json({...transport,catalogueSha256:sha256(data),artworks:entries}))
 if(check || current.length===105) {
  assert.deepEqual(current,catalogue,'Catalogue metadata mutation')
  assert((await readFile(transportFile)).equals(manifest),'Transport metadata mutation')
 } else {
  // This explicit reviewed migration appends entries; the ordinary packer still refuses mutation.
  await writeFile(catalogueFile,data); await writeFile(transportFile,manifest)
 }
 return {catalogueSha256:sha256(data),...await checkCatalogue(catalogue,{root,regenerate:false,expectedCount:105})}
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const args=process.argv.slice(2)
 assert(args.length>=1 && args.length<=2 && (args.length===1 || args[1]==='--check'),'Use <packet-root> [--check]')
 process.stdout.write(json(await importSet07(args[0],{check:args[1]==='--check'})))
}
