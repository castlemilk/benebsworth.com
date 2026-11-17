/** Add only the reviewed Set08 packet; preserve the complete published Set07 prefix. */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROOT, THEMES, sha256, validateSvg, renderWebp, checkCatalogue } from './import-grounded-artwork.mjs'
import { SET07_CATALOGUE_SHA256 } from './import-grounded-set07.mjs'
import { encodeArtwork } from './prepare-grounded-artwork.mjs'
export const SET08_CATALOGUE_SHA256 = '2e0b46e5b6fef0339df3980f3f6bc6c122b553f6111bc9fe3d36464851330705'
export const SET08_BATCH_SHA256 = '300393e185017f88f24c7b93a13ddf85620cf43c9b1383b1ac52fbad40ed300d'
export const SET08_HASHES_SHA256 = '1cb659e0ca5b4313d046a234456b5a4f04a67018445705bf5a58256f287c396c'
const json = value => JSON.stringify(value, null, 2) + '\n'
export function verifySet08Baseline(current, transport) {
 assert([105,130].includes(current.length), 'Unexpected catalogue baseline')
 const baseline = current.slice(0,105)
 assert.equal(sha256(Buffer.from(json(baseline))), SET07_CATALOGUE_SHA256, 'Published Set07 changed')
 if (current.length === 130) assert.equal(sha256(Buffer.from(json(current))), SET08_CATALOGUE_SHA256, 'Expanded catalogue changed')
 assert.equal(transport.artworks?.length, current.length, 'Current transport count mismatch')
 assert.equal(transport.catalogueSha256, sha256(Buffer.from(json(current))), 'Current transport catalogue mismatch')
 const prefix = {...transport, catalogueSha256: SET07_CATALOGUE_SHA256, artworks: transport.artworks.slice(0,105)}
 assert.equal(sha256(Buffer.from(json(prefix))), 'afd747c317fc28540d665f699e98d094a9339b47c942eda7d5ffccc793a24833', 'Published Set07 transport changed')
 return baseline
}
export function verifySet08Catalogue(catalogue) {
 assert.equal(sha256(Buffer.from(json(catalogue))), SET08_CATALOGUE_SHA256, 'Catalogue pin drift')
}
// Preserve source science verbatim; use the collection's existing broad discovery subjects.
const SUBJECT_BY_GROUP = Object.freeze({
 'body-interfaces':'biology', 'landscape-records':'geology', 'motion-converters':'mechanics',
 'charge-and-induction':'physics', 'mathematical-constructions':'mathematics',
})
export function metadataForSet08(a, batchId) {
 assert.equal(a.slug,a.id,'Canonical source identity changed')
 const subject=SUBJECT_BY_GROUP[a.group];assert(subject,'Unreviewed source group')
 assert.equal(subject,a.subject,'Authored source subject changed')
 return { slug: a.id, title: a.title, batchId, sourceId: a.id, sourceDirectoryId: `${a.number}-${a.id}`, revision: a.revision,
  width: a.width, height: a.height, viewBox: a.viewBox.join(' '), minimumDisplayWidth: a.minimum_display_width,
  caption: a.brief, basis: a.basis, limitations: a.limitations,
  provenance: `${a.provenance.replace(/[.\s]+$/, '')}. Scientific references inform facts and mathematics; no reference image is copied or traced. Citations are from the reviewed source packet; this import does not claim new source access or image-license clearance. Prefer 640px or greater when reading fine scientific detail; 64px and 160px exports establish recognition only.`,
  subject, tags: a.tags.map(tag => tag.toLowerCase().replace(/\s+/g, '-')),
  aliases: [...new Map(a.aliases.map(alias => [alias.toLowerCase().trim(), alias])).values()],
  sources: a.sources.map(({title,url})=>({title,url})) }
}
export async function importSet08(packetRoot, { check = false, root = ROOT } = {}) {
 const packet = resolve(packetRoot)
 const batchBytes = await readFile(resolve(packet, 'batch.json'))
 const hashBytes = await readFile(resolve(packet, 'sha256.json'))
 assert.equal(sha256(batchBytes), SET08_BATCH_SHA256, 'Set08 metadata requires re-review')
 assert.equal(sha256(hashBytes), SET08_HASHES_SHA256, 'Set08 manifest requires re-review')
 const batch = JSON.parse(batchBytes), hashes = JSON.parse(hashBytes)
 const notes = await readFile(resolve(packet, 'SCIENTIFIC-BASIS-AND-SOURCES.md'))
 assert.equal(sha256(notes), 'bdf9a796b0ff2c6a186857fc1e0f4055f33e0d162c059f99d425db8fe99593cd', 'Set08 scientific notes changed')
 assert((await readFile(resolve(root, 'public/artwork/grounded-notes/set08.bdf9a796b0ff2c6a186857fc1e0f4055f33e0d162c059f99d425db8fe99593cd.md'))).equals(notes), 'Published scientific notes changed')
 assert.equal(batch.batch_id, 'grounded-forms-twenty-five-studies-set08-r01')
 assert.equal(batch.artworks.length, 25)
 const catalogueFile = resolve(root,'lib/grounded-artwork/catalogue.json')
 const current = JSON.parse(await readFile(catalogueFile))
 const transportFile = resolve(root,'assets/grounded/manifest.json')
 const transport = JSON.parse(await readFile(transportFile))
 const baseline = verifySet08Baseline(current, transport)
 const entries = transport.artworks.slice(0,105), additions = []
 async function put(relative, data) {
  const target = resolve(root,relative)
  const existing = await readFile(target).catch(e => { if(e.code==='ENOENT') return null; throw e })
  if(existing) assert(existing.equals(data), `Refusing changed output: ${relative}`)
  else { assert(!check, `Missing reviewed output: ${relative}`); await mkdir(dirname(target),{recursive:true}); await writeFile(target,data,{flag:'wx'}) }
 }
 for(const a of batch.artworks) {
  const item = metadataForSet08(a,batch.batch_id); item.variants = {}
  const originals = []
  for(const theme of THEMES) {
   const source = resolve(packet,a.files[theme])
   assert(source.startsWith(packet+sep),'Source escapes reviewed packet')
   const svg = await readFile(source)
   assert.equal(sha256(svg),hashes.files[a.files[theme]],'Set08 source hash mutation')
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
 verifySet08Catalogue(catalogue)
 const manifest=Buffer.from(json({...transport,catalogueSha256:sha256(data),artworks:entries}))
 if(check || current.length===130) {
  assert.deepEqual(current,catalogue,'Catalogue metadata mutation')
  assert((await readFile(transportFile)).equals(manifest),'Transport metadata mutation')
 } else {
  // This explicit reviewed migration appends entries; the ordinary packer still refuses mutation.
  await writeFile(catalogueFile,data); await writeFile(transportFile,manifest)
 }
 return {catalogueSha256:sha256(data),...await checkCatalogue(catalogue,{root,regenerate:false,expectedCount:130})}
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const args=process.argv.slice(2)
 assert(args.length>=1 && args.length<=2 && (args.length===1 || args[1]==='--check'),'Use <packet-root> [--check]')
 process.stdout.write(json(await importSet08(args[0],{check:args[1]==='--check'})))
}
