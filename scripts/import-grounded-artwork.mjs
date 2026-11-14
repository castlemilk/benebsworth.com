/** Fixed reviewed art importer. No generator, palette adjustment, or network access. */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { JSDOM } from 'jsdom'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const THEMES = ['light', 'dark', 'mono']
export const CATALOGUE_SHA256 = 'd1d980bcb3d4f72522cf64eadcf86bfdddc2c0e75121445573973e5dd17bd1de'
export const INVENTORY_SHA256 = 'babd060dcdfd794f29a12cef57882ba050b4729cf76ad7e9fccf356a8badd37f'
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const json = value => JSON.stringify(value, null, 2) + '\n'
// Search terms describe positive content, never phrases mined from scientific caveats.
const CURATION = [
 ['chambered-growth','biology',['shell','chambers','spiral'],['nautilus','mollusc','septa','siphuncle']],
 ['vascular-leaf','biology',['leaf','venation','networks'],['botany','midrib','reticulate veins']],
 ['catenary-span','mechanics',['catenary','chain','gravity'],['hanging chain','equal arc length']],
 ['involute-relay','mechanics',['gears','involute','kinematics'],['gear train','pinion']],
 ['degenerate-membrane','physics',['membrane','waves','nodes'],['nodal membrane','standing waves','normal modes']],
 ['autocatalytic-field','mathematics',['reaction diffusion','patterns','simulation'],['Gray–Scott','Gray Scott','autocatalysis']],
 ['feather-vane','biology',['feather','barbs','barbules'],['rachis','pennaceous vane','ornithology']],
 ['trabecular-section','biology',['bone','trabeculae','cutaway'],['cortical bone','medullary cavity']],
 ['gill-exchange','biology',['gills','countercurrent','exchange'],['lamella','filament','fish gills']],
 ['phyllotactic-head','mathematics',['phyllotaxis','seeds','spiral'],['Vogel construction','golden angle','seed head']],
 ['euler-beam','mechanics',['beam','cantilever','deflection'],['Euler Bernoulli','tip load']],
 ['triangular-truss','mechanics',['truss','equilibrium','forces'],['compression','tension','method of joints']],
 ['dipole-meridian','physics',['magnetism','dipole','field lines'],['magnetic dipole','meridian']],
 ['coupled-pendulums','physics',['pendulums','oscillation','coupling'],['normal modes','spring','anti phase']],
 ['catenoid','mathematics',['surface','curvature','catenary'],['minimal surface','surface of revolution']],
 ['trefoil-knot','mathematics',['knot','topology','crossings'],['torus knot','trefoil']],
 ['nearest-domain','mathematics',['Voronoi','partition','geometry'],['nearest site','Delaunay','cells']],
 ['helical-screw','mechanics',['helix','screw','pitch'],['Archimedean screw','single flight']],
 ['samara-wing','biology',['samara','fruit','wing'],['winged fruit','nutlet','botany']],
 ['mushroom-lamellae','biology',['mushroom','gills','fungi'],['lamellae','lamellulae','mycology']],
 ['compound-eye','biology',['eye','facets','photoreceptors'],['ommatidium','rhabdom','apposition eye']],
 ['prism-refraction','physics',['prism','refraction','optics'],['Snell law','refractive index']],
 ['block-and-tackle','mechanics',['pulleys','rope','mechanical advantage'],['block and tackle','four to one']],
 ['geneva-drive','mechanics',['Geneva','indexing','kinematics'],['Geneva mechanism','quarter turn']],
 ['capillary-rise','physics',['capillarity','surface tension','fluid'],['Jurin law','meniscus','contact angle']],
 ['four-bar-coupler','mechanics',['linkage','kinematics','coupler'],['four bar','crank','coupler curve']],
 ['close-packing','mathematics',['packing','spheres','lattice'],['face centered cubic','FCC','nearest neighbors']],
 ['mobius-band','mathematics',['topology','surface','half twist'],['Möbius','Mobius','nonorientable']],
 ['binomial-cascade','mathematics',['probability','binomial','path counts'],['Galton board','independent choices']],
 ['oblique-conic','mathematics',['cone','ellipse','section'],['conic section','plane intersection']],
].map(([slug, subject, tags, aliases]) => [slug, subject, tags.map(tag => tag.toLowerCase().replace(/\s+/g, '-')), [...new Map(aliases.map(alias => [alias.toLowerCase().trim(), alias])).values()]])
export function slugFor(sourceId) {
 const slug = sourceId.replace(/^\d{2}-/, '')
 assert.match(slug, /^[a-z]+(?:-[a-z]+)*$/, 'Unsafe source ID')
 return slug
}
export function validateSvg(bytes) {
 const text = bytes.toString('utf8')
 assert(!/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(text), 'Unsafe SVG declarations')
 const dom = new JSDOM(text, { contentType: 'image/svg+xml' })
 try {
  const root = dom.window.document.documentElement
  assert.equal(root.localName, 'svg'); assert.equal(root.namespaceURI, 'http://www.w3.org/2000/svg')
  assert.equal(root.getAttribute('width'), '900'); assert.equal(root.getAttribute('height'), '900')
  assert.equal(root.getAttribute('viewBox'), '0 0 900 900')
  const tags = new Set(['svg','g','path','title','desc','defs','clipPath'])
  const attrs = new Set(['xmlns','transform','fill','viewBox','id','height','stroke-linecap','fill-rule','clip-rule','aria-labelledby','stroke','d','stroke-width','clip-path','width','role','stroke-dasharray','stroke-linejoin'])
  const ids = new Set()
  for (const el of [root, ...root.querySelectorAll('*')]) {
   assert(tags.has(el.localName) && el.namespaceURI === root.namespaceURI, `Unsafe SVG element: ${el.tagName}`)
   for (const a of el.attributes) {
    assert(attrs.has(a.name), `Unsafe SVG attribute: ${a.name}`)
    assert(!/javascript:|data:|https?:|\/\//i.test(a.value) || a.name === 'xmlns', 'External SVG reference')
    if (/url\s*\(/i.test(a.value)) assert.match(a.value, /^url\(#[a-zA-Z][\w-]*\)$/, 'Unsafe SVG URL')
   }
   if (el.id) { assert(!ids.has(el.id), 'Duplicate SVG ID'); ids.add(el.id) }
  }
 } finally { dom.window.close() }
}
export async function renderWebp(bytes, size) {
 return sharp(bytes, { density: 72 * size / 900 }).resize(size, size).webp({ lossless: true, effort: 6 }).toBuffer()
}
export function metadataFor(a) {
 const slug = slugFor(a.original_id)
 const c = CURATION.find(row => row[0] === slug)
 assert(c, `Unreviewed artwork ${slug}`)
 const basis = a.scientific_basis_text.trim().replace(/^[^\n]+\n+/, '').replace(/\n\nSources?:[\s\S]*$/, '').trim()
 const d = a.direction_metadata || {}
 const limits = a.scientific_limits
 const limitations = [Array.isArray(limits) ? limits.join(' ') : limits,
  d.truth_contract?.approximate,
  d.truth_contract?.not_claimed?.length ? `Not claimed: ${d.truth_contract.not_claimed.join('; ')}.` : '',
  d.direction?.limitations,
  // The full basis remains visible so a short summary never erases qualifications.
  !limits && !d.truth_contract ? basis : ''].filter(Boolean).join(' ')
 const sources = [...a.scientific_basis_text.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)]
  .map(m => ({ title: m[1], url: m[2] }))
 return { slug, title: a.title, batchId: a.batch_id, sourceId: a.original_id,
  sourceDirectoryId: a.original_numbered_directory_id, revision: a.revision,
  width: 900, height: 900, viewBox: '0 0 900 900', minimumDisplayWidth: a.minimum_display_width,
  caption: a.scientific_caption, basis, limitations,
  provenance: `${a.provenance}. Scientific references inform facts and mathematics; no reference image is copied or traced. References are transcribed from the reviewed source packet, not freshly verified by this import.`,
  subject: c[1], tags: c[2], aliases: c[3], sources }
}
async function verifyImage(bytes, size) {
 const m = await sharp(bytes).metadata()
 assert.equal(m.width, size); assert.equal(m.height, size); assert.equal(m.hasAlpha, true)
 const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
 let transparent = false
 for (let i = 3; i < data.length; i += info.channels) if (data[i] === 0) { transparent = true; break }
 assert(transparent, 'Transparency was lost')
}
export async function checkCatalogue(catalogue, { regenerate = true, root = ROOT } = {}) {
 assert.equal(catalogue.length, 30)
 const slugs = new Set(), identities = new Set(), urls = new Set()
 for (const a of catalogue) {
  assert(!slugs.has(a.slug), 'Duplicate slug'); slugs.add(a.slug)
  const identity = `${a.batchId}:${a.sourceId}`
  assert(!identities.has(identity), 'Duplicate source identity'); identities.add(identity)
  assert.equal(a.slug, slugFor(a.sourceId)); assert.equal(a.width, 900); assert.equal(a.height, 900)
  assert.equal(a.viewBox, '0 0 900 900'); assert([240,320].includes(a.minimumDisplayWidth))
  for (const key of ['title','batchId','sourceId','sourceDirectoryId','caption','basis','limitations','provenance','subject']) assert(a[key]?.length, `Missing ${key}`)
  assert(!/\/workspace\/|\/home\/|file:\/\//.test(json(a)), 'Private path in catalogue')
  assert(a.sources.length); a.sources.forEach(s => assert.match(s.url, /^https?:\/\//))
  const curated = CURATION.find(c => c[0] === a.slug)
  assert.deepEqual([a.subject,a.tags,a.aliases], curated.slice(1), 'Search metadata drift')
  for (const theme of THEMES) {
   const v = a.variants[theme]
   let master
   for (const [key, hashKey, bytesKey, size] of [['master','sha256','bytes',900],['thumbnail','thumbnailSha256','thumbnailBytes',480],['preview','previewSha256','previewBytes',960]]) {
    const url = v[key]
    assert(url.startsWith(`/artwork/grounded/${a.slug}/`) && !url.includes('..'), 'Unsafe asset path')
    assert(!urls.has(url), 'Duplicate asset URL'); urls.add(url)
    const bytes = await readFile(resolve(root, `public${url}`))
    assert.equal(sha256(bytes), v[hashKey], `Hash mutation: ${url}`)
    assert.equal(bytes.length, v[bytesKey], `Byte count mutation: ${url}`)
    assert(basename(url).includes(v[hashKey]), 'Missing full fingerprint')
    if (key === 'master') { validateSvg(bytes); master = bytes } else {
     await verifyImage(bytes, size)
     if (regenerate) assert.equal(sha256(await renderWebp(master, size)), v[hashKey], `Renderer drift: ${url}`)
    }
   }
  }
 }
 assert.equal(urls.size,270)
 const files = await readdir(resolve(root, 'public/artwork/grounded'), { recursive: true, withFileTypes: true })
 assert.equal(files.filter(entry => entry.isFile()).length, 270, 'Unexpected or stale asset files')
 return { artworks: slugs.size, files: urls.size, thumbnails: Object.fromEntries(THEMES.map(theme => [theme, catalogue.reduce((sum,a) => sum + a.variants[theme].thumbnailBytes, 0)])) }
}
export async function importInventory(inventoryPath, { check = false } = {}) {
 const bytes = await readFile(inventoryPath)
 assert.equal(sha256(bytes), INVENTORY_SHA256, 'Audited inventory changed; re-review required')
 const inventory = JSON.parse(bytes)
 assert.equal(inventory.artworks.length,30)
 const packets = new Map()
 for (const p of inventory.packets) {
  assert.equal(basename(p.root), 'final', 'Only final source packets permitted')
  for (const authority of Object.values(p.authority_files)) assert.equal(sha256(await readFile(authority.path)), authority.sha256, 'Source authority mutation')
  packets.set(p.batch_id, { ...p, manifest: JSON.parse(await readFile(p.authority_files['sha256.json'].path,'utf8')) })
 }
 const catalogue = []
 for (const a of inventory.artworks) {
  const item = metadataFor(a); item.variants = {}
  const packet = packets.get(a.batch_id); assert(packet)
  for (const theme of THEMES) {
   const source = a.variants[theme]
   assert.equal(resolve(packet.root,source.filename), source.absolute_path, 'Source path escapes packet')
   const svg = await readFile(source.absolute_path)
   assert.equal(sha256(svg), source.sha256); assert.equal(svg.length, source.bytes)
   assert.equal(packet.manifest[source.filename], source.sha256, 'Manifest mismatch')
   validateSvg(svg)
   const assets = { master: svg, thumbnail: await renderWebp(svg,480), preview: await renderWebp(svg,960) }
   const variant = {}
   for (const [key, data] of Object.entries(assets)) {
    const hash = sha256(data), sizeSuffix = key === 'master' ? '' : key === 'thumbnail' ? '-480' : '-960'
    const url = `/artwork/grounded/${item.slug}/${theme}${sizeSuffix}.${hash}.${key === 'master' ? 'svg' : 'webp'}`
    const target = resolve(ROOT, `public${url}`)
    variant[key] = url; variant[key === 'master' ? 'sha256' : `${key}Sha256`] = hash
    variant[key === 'master' ? 'bytes' : `${key}Bytes`] = data.length
    if (check) assert.equal(sha256(await readFile(target)),hash,`Imported file mutation: ${url}`)
    else { await mkdir(dirname(target),{recursive:true}); await writeFile(target,data) }
   }
   item.variants[theme] = variant
  }
  catalogue.push(item)
 }
 const output = resolve(ROOT,'lib/grounded-artwork/catalogue.json')
 if (check) assert.equal(await readFile(output,'utf8'),json(catalogue),'Catalogue metadata mutation')
 else await writeFile(output,json(catalogue))
 return checkCatalogue(catalogue,{regenerate: true})
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const checkedIn = await readFile(resolve(ROOT,'lib/grounded-artwork/catalogue.json')).catch(() => null)
 if (checkedIn && (process.argv.includes('--check') || !process.argv.includes('--inventory'))) assert.equal(sha256(checkedIn), CATALOGUE_SHA256, 'Catalogue metadata mutation; re-review required')
 const args = process.argv.slice(2), inventoryIndex = args.indexOf('--inventory')
 const result = inventoryIndex >= 0
  ? await importInventory(args[inventoryIndex+1],{check:args.includes('--check')})
  : await checkCatalogue(JSON.parse(await readFile(resolve(ROOT,'lib/grounded-artwork/catalogue.json'),'utf8')))
 process.stdout.write(json(result))
}
