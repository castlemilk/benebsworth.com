/** Add only the reviewed Set05 packet; preserve the complete published pilot prefix. */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROOT, THEMES, PILOT_CATALOGUE_SHA256, CATALOGUE_SHA256, sha256, validateSvg, renderWebp, checkCatalogue } from './import-grounded-artwork.mjs'
import { encodeArtwork } from './prepare-grounded-artwork.mjs'
export const SET05_BATCH_SHA256 = '84843c0ae52067285d783d7ad138daefbcabed593faf8cf529f4c404c58cb8a1'
export const SET05_HASHES_SHA256 = '05f0c22d64b83722398934b462846f7b9f8e7386973052e7a65af24b66571880'
const json = value => JSON.stringify(value, null, 2) + '\n'
export function verifySet05Baseline(current, transport) {
 assert([30,55].includes(current.length), 'Unexpected catalogue baseline')
 const pilot = current.slice(0,30)
 assert.equal(sha256(Buffer.from(json(pilot))), PILOT_CATALOGUE_SHA256, 'Published pilot changed')
 if (current.length === 55) assert.equal(sha256(Buffer.from(json(current))), CATALOGUE_SHA256, 'Expanded catalogue changed')
 const prefix = {...transport, catalogueSha256: PILOT_CATALOGUE_SHA256, artworks: transport.artworks.slice(0,30)}
 assert.equal(sha256(Buffer.from(json(prefix))), '4d039aea768a78c45b587090416531220db1449e59b7582e76a880246e2bba69', 'Published pilot transport changed')
 return pilot
}
export function verifySet05Catalogue(catalogue) {
 assert.equal(sha256(Buffer.from(json(catalogue))), CATALOGUE_SHA256, 'Catalogue pin drift')
}
export function metadataForSet05(a, batchId) {
 return { slug: a.id, title: a.title, batchId, sourceId: a.id, sourceDirectoryId: `${a.number}-${a.id}`, revision: a.revision,
  width: a.width, height: a.height, viewBox: a.viewBox.join(' '), minimumDisplayWidth: a.minimum_display_width,
  caption: a.caption, basis: a.basis, limitations: a.limitations,
  provenance: `${a.provenance}. Scientific references inform facts and mathematics; no reference image is copied or traced. References are transcribed from the reviewed source packet, not freshly verified by this import.`,
  subject: a.subject, tags: a.tags.map(tag => tag.toLowerCase().replace(/\s+/g, '-')),
  aliases: [...new Map(a.aliases.map(alias => [alias.toLowerCase().trim(), alias])).values()],
  sources: a.sources.map(({title, url}) => ({title, url})) }
}
export async function importSet05(packetRoot, { check = false, root = ROOT } = {}) {
 const packet = resolve(packetRoot)
 const batchBytes = await readFile(resolve(packet, 'batch.json'))
 const hashBytes = await readFile(resolve(packet, 'sha256.json'))
 assert.equal(sha256(batchBytes), SET05_BATCH_SHA256, 'Set05 metadata requires re-review')
 assert.equal(sha256(hashBytes), SET05_HASHES_SHA256, 'Set05 manifest requires re-review')
 const batch = JSON.parse(batchBytes), hashes = JSON.parse(hashBytes)
 const notes = await readFile(resolve(packet, 'SCIENTIFIC-BASIS.md'))
 assert.equal(sha256(notes), '5034a810f35404eb90896c95352b1395ce826e69bfa3b743a0aba8998386e98a', 'Set05 scientific notes changed')
 assert((await readFile(resolve(root, 'public/artwork/grounded-notes/set05.5034a810f35404eb90896c95352b1395ce826e69bfa3b743a0aba8998386e98a.md'))).equals(notes), 'Published scientific notes changed')
 assert.equal(batch.batch_id, 'grounded-forms-twenty-five-studies-set05-r01')
 assert.equal(batch.artworks.length, 25)
 const catalogueFile = resolve(root,'lib/grounded-artwork/catalogue.json')
 const current = JSON.parse(await readFile(catalogueFile))
 const transportFile = resolve(root,'assets/grounded/manifest.json')
 const transport = JSON.parse(await readFile(transportFile))
 const pilot = verifySet05Baseline(current, transport)
 const entries = transport.artworks.slice(0,30), additions = []
 async function put(relative, data) {
  const target = resolve(root,relative)
  const existing = await readFile(target).catch(e => { if(e.code==='ENOENT') return null; throw e })
  if(existing) assert(existing.equals(data), `Refusing changed output: ${relative}`)
  else { assert(!check, `Missing reviewed output: ${relative}`); await mkdir(dirname(target),{recursive:true}); await writeFile(target,data,{flag:'wx'}) }
 }
 for(const a of batch.artworks) {
  const item = metadataForSet05(a,batch.batch_id); item.variants = {}
  const originals = []
  for(const theme of THEMES) {
   const source = resolve(packet,a.files[theme])
   assert(source.startsWith(packet+sep),'Source escapes reviewed packet')
   const svg = await readFile(source)
   assert.equal(sha256(svg),hashes[a.files[theme]],'Set05 source hash mutation')
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
 const catalogue=[...pilot,...additions], data=Buffer.from(json(catalogue))
 verifySet05Catalogue(catalogue)
 const manifest=Buffer.from(json({...transport,catalogueSha256:sha256(data),artworks:entries}))
 if(check || current.length===55) {
  assert.deepEqual(current,catalogue,'Catalogue metadata mutation')
  assert((await readFile(transportFile)).equals(manifest),'Transport metadata mutation')
 } else {
  // This explicit reviewed migration appends entries; the ordinary packer still refuses mutation.
  await writeFile(catalogueFile,data); await writeFile(transportFile,manifest)
 }
 return {catalogueSha256:sha256(data),...await checkCatalogue(catalogue,{root,regenerate:false})}
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const args=process.argv.slice(2)
 assert(args.length>=1 && args.length<=2 && (args.length===1 || args[1]==='--check'),'Use <packet-root> [--check]')
 process.stdout.write(json(await importSet05(args[0],{check:args[1]==='--check'})))
}
