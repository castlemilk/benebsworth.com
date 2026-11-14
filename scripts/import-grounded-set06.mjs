/** Add only the reviewed Set06 packet; preserve the complete published Set05 prefix. */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROOT, THEMES, SET05_CATALOGUE_SHA256, sha256, validateSvg, renderWebp, checkCatalogue } from './import-grounded-artwork.mjs'
import { encodeArtwork } from './prepare-grounded-artwork.mjs'
export const SET06_CATALOGUE_SHA256 = '70a46ac2eac813ba4fef83c79ba96babcd0a0b19c6107ce5299805b623aaf96e'
export const SET06_BATCH_SHA256 = 'b36e044757615929468c56608b1fcb4ba1ffb98089751c08ac1abf76e5fa3e90'
export const SET06_HASHES_SHA256 = 'e8990ba5b5a3673cd8a05b52ab3090efe350c7378c4686ef428037a8c64f552a'
const json = value => JSON.stringify(value, null, 2) + '\n'
export function verifySet06Baseline(current, transport) {
 assert([55,80].includes(current.length), 'Unexpected catalogue baseline')
 const baseline = current.slice(0,55)
 assert.equal(sha256(Buffer.from(json(baseline))), SET05_CATALOGUE_SHA256, 'Published Set05 changed')
 if (current.length === 80) assert.equal(sha256(Buffer.from(json(current))), SET06_CATALOGUE_SHA256, 'Expanded catalogue changed')
 assert.equal(transport.artworks?.length, current.length, 'Current transport count mismatch')
 assert.equal(transport.catalogueSha256, sha256(Buffer.from(json(current))), 'Current transport catalogue mismatch')
 const prefix = {...transport, catalogueSha256: SET05_CATALOGUE_SHA256, artworks: transport.artworks.slice(0,55)}
 assert.equal(sha256(Buffer.from(json(prefix))), '1cfde8608e1e9e1d958c18e76180e221634106601f7a9c991b88a466748d2559', 'Published Set05 transport changed')
 return baseline
}
export function verifySet06Catalogue(catalogue) {
 assert.equal(sha256(Buffer.from(json(catalogue))), SET06_CATALOGUE_SHA256, 'Catalogue pin drift')
}
// The original object URL is preserved in the source packet; Q?rius is the verified live record.
// Neither reference URL nor the inspected source image establishes media-rights clearance.
export function metadataForSet06(a, batchId) {
 return { slug: a.id, title: a.title, batchId, sourceId: a.id, sourceDirectoryId: `${a.number}-${a.id}`, revision: a.revision,
  width: a.width, height: a.height, viewBox: a.viewBox.join(' '), minimumDisplayWidth: a.minimum_display_width,
  caption: a.caption, basis: a.basis, limitations: a.limitations,
  provenance: `${a.provenance.replace(/[.\s]+$/, '')}. Scientific and museum references inform facts and mathematics; no source image is copied or traced. Source access and licensing qualifications are preserved in the complete Set06 notes. References are transcribed from the reviewed source packet, not freshly verified by this import.`,
  subject: a.subject, tags: a.tags.map(tag => tag.toLowerCase().replace(/\s+/g, '-')),
  aliases: [...new Map(a.aliases.map(alias => [alias.toLowerCase().trim(), alias])).values()],
  sources: a.sources.map(({title, url}) => ({title, url: url === 'https://www.si.edu/object/horseshoe-crab%3Anmnheducation_10795203' ? 'https://qrius.si.edu/browse/object/10795203' : url})) }
}
export async function importSet06(packetRoot, { check = false, root = ROOT } = {}) {
 const packet = resolve(packetRoot)
 const batchBytes = await readFile(resolve(packet, 'batch.json'))
 const hashBytes = await readFile(resolve(packet, 'sha256.json'))
 assert.equal(sha256(batchBytes), SET06_BATCH_SHA256, 'Set06 metadata requires re-review')
 assert.equal(sha256(hashBytes), SET06_HASHES_SHA256, 'Set06 manifest requires re-review')
 const batch = JSON.parse(batchBytes), hashes = JSON.parse(hashBytes)
 const notes = await readFile(resolve(packet, 'SCIENTIFIC-BASIS.md'))
 assert.equal(sha256(notes), '6d16ad6fe8cd49a4ec007bba55c7abee9560f598c6ee7e486f98d88065650df3', 'Set06 scientific notes changed')
 assert((await readFile(resolve(root, 'public/artwork/grounded-notes/set06.6d16ad6fe8cd49a4ec007bba55c7abee9560f598c6ee7e486f98d88065650df3.md'))).equals(notes), 'Published scientific notes changed')
 assert.equal(batch.batch_id, 'grounded-forms-twenty-five-studies-set06-r01')
 assert.equal(batch.artworks.length, 25)
 const catalogueFile = resolve(root,'lib/grounded-artwork/catalogue.json')
 const current = JSON.parse(await readFile(catalogueFile))
 const transportFile = resolve(root,'assets/grounded/manifest.json')
 const transport = JSON.parse(await readFile(transportFile))
 const baseline = verifySet06Baseline(current, transport)
 const entries = transport.artworks.slice(0,55), additions = []
 async function put(relative, data) {
  const target = resolve(root,relative)
  const existing = await readFile(target).catch(e => { if(e.code==='ENOENT') return null; throw e })
  if(existing) assert(existing.equals(data), `Refusing changed output: ${relative}`)
  else { assert(!check, `Missing reviewed output: ${relative}`); await mkdir(dirname(target),{recursive:true}); await writeFile(target,data,{flag:'wx'}) }
 }
 for(const a of batch.artworks) {
  const item = metadataForSet06(a,batch.batch_id); item.variants = {}
  const originals = []
  for(const theme of THEMES) {
   const source = resolve(packet,a.files[theme])
   assert(source.startsWith(packet+sep),'Source escapes reviewed packet')
   const svg = await readFile(source)
   assert.equal(sha256(svg),hashes[a.files[theme]],'Set06 source hash mutation')
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
 verifySet06Catalogue(catalogue)
 const manifest=Buffer.from(json({...transport,catalogueSha256:sha256(data),artworks:entries}))
 if(check || current.length===80) {
  assert.deepEqual(current,catalogue,'Catalogue metadata mutation')
  assert((await readFile(transportFile)).equals(manifest),'Transport metadata mutation')
 } else {
  // This explicit reviewed migration appends entries; the ordinary packer still refuses mutation.
  await writeFile(catalogueFile,data); await writeFile(transportFile,manifest)
 }
 return {catalogueSha256:sha256(data),...await checkCatalogue(catalogue,{root,regenerate:false,expectedCount:80})}
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const args=process.argv.slice(2)
 assert(args.length>=1 && args.length<=2 && (args.length===1 || args[1]==='--check'),'Use <packet-root> [--check]')
 process.stdout.write(json(await importSet06(args[0],{check:args[1]==='--check'})))
}
