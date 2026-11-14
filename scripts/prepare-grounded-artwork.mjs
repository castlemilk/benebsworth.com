/** Lossless repository transport. No artwork generation, optimization or network. */
import assert from 'node:assert/strict'
import { constants } from 'node:fs'
import { lstat, mkdir, open, readdir } from 'node:fs/promises'
import { dirname, join, parse, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, brotliDecompressSync, constants as zlib } from 'node:zlib'
import { ROOT, THEMES, CATALOGUE_SHA256, REVIEWED_ARTWORK_COUNT, sha256, renderWebp } from './import-grounded-artwork.mjs'

export const CHUNK_BYTES = 32768
export const MAX_PART_TEXT_BYTES = 4 * Math.ceil(CHUNK_BYTES / 3) + 1
export const MAX_SVG_BYTES = 1024 * 1024
const MAX_COMPRESSED_BYTES = 1024 * 1024
const FORMAT = 'brotli-concatenated-original-svg-v1'
const manifestPath = 'assets/grounded/manifest.json'
const json = value => JSON.stringify(value, null, 2) + '\n'
const digest = value => assert.match(value, /^[a-f0-9]{64}$/, 'Invalid SHA-256')
const integer = (value, max) => assert(Number.isSafeInteger(value) && value > 0 && value <= max, 'Size exceeds bounded packet format')
const keys = (value, expected) => assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), 'Unexpected packet keys')
const partPath = part => `assets/grounded/parts/${part.sha256}.br.b64`

// Check every path component, not just the final file: no archive-controlled paths,
// symlinked ancestors, special files or unbounded reads are accepted.
async function directory(path, create = false) {
 const absolute = resolve(path)
 let current = parse(absolute).root
 for (const component of absolute.slice(current.length).split('/').filter(Boolean)) {
  current = join(current, component)
  let stat = await lstat(current).catch(error => { if (error.code !== 'ENOENT') throw error; return null })
  if (!stat && create) {
   await mkdir(current).catch(error => { if (error.code !== 'EEXIST') throw error })
   stat = await lstat(current)
  }
  assert(stat?.isDirectory() && !stat.isSymbolicLink(), `Unsafe or missing directory: ${current}`)
 }
}
async function readBounded(path, limit, missing = false) {
 await directory(dirname(path))
 // lstat prevents opening an existing FIFO/device. O_NONBLOCK also prevents
 // hanging if a regular file is replaced by a FIFO between lstat and open.
 let before
 try { before = await lstat(path) }
 catch (error) { if (missing && error.code === 'ENOENT') return null; throw error }
 assert(before.isFile() && !before.isSymbolicLink() && before.size <= limit, `Unsafe or oversized file: ${path}`)
 let handle
 try { handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK) }
 catch (error) { if (missing && error.code === 'ENOENT') return null; throw error }
 try {
  const stat = await handle.stat()
  assert(stat.isFile() && stat.size <= limit, `Unsafe or oversized file: ${path}`)
  const data = Buffer.alloc(stat.size)
  let offset = 0
  while (offset < data.length) {
   const { bytesRead } = await handle.read(data, offset, data.length - offset, null)
   assert(bytesRead > 0, 'File changed while reading')
   offset += bytesRead
  }
  assert.equal((await handle.read(Buffer.alloc(1), 0, 1, null)).bytesRead, 0, 'File grew while reading')
  return data
 } finally { await handle.close() }
}
async function writeMissing(path, data) {
 await directory(dirname(path), true)
 const existing = await readBounded(path, data.length, true)
 if (existing) { assert(existing.equals(data), `Refusing to overwrite changed file: ${path}`); return }
 const handle = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o644)
 try { await handle.writeFile(data) } finally { await handle.close() }
}
function assetsFor(art) {
 assert.match(art.slug, /^[a-z]+(?:-[a-z]+)*$/, 'Unsafe artwork slug')
 return THEMES.flatMap(theme => {
  const variant = art.variants[theme]
  return [['master', 'sha256', 'bytes', '', 'svg', 900], ['thumbnail', 'thumbnailSha256', 'thumbnailBytes', '-480', 'webp', 480], ['preview', 'previewSha256', 'previewBytes', '-960', 'webp', 960]].map(([kind, hashKey, bytesKey, suffix, extension, size]) => {
   const hash = variant[hashKey], bytes = variant[bytesKey]
   digest(hash); integer(bytes, MAX_SVG_BYTES)
   const url = `/artwork/grounded/${art.slug}/${theme}${suffix}.${hash}.${extension}`
   assert.equal(variant[kind], url, 'Unsafe or changed asset URL')
   return { theme, kind, hash, bytes, size, path: `public${url}` }
  })
 })
}
async function readCatalogue(root) {
 const data = await readBounded(resolve(root, 'lib/grounded-artwork/catalogue.json'), 256 * 1024)
 assert.equal(sha256(data), CATALOGUE_SHA256, 'Catalogue metadata mutation; re-review required')
 const catalogue = JSON.parse(data)
 assert.equal(catalogue.length, REVIEWED_ARTWORK_COUNT)
 catalogue.forEach(assetsFor)
 assert.equal(new Set(catalogue.map(art => art.slug)).size, REVIEWED_ARTWORK_COUNT)
 return catalogue
}
function validateEntry(entry, art) {
 keys(entry, ['slug', 'rawBytes', 'rawSha256', 'compressedBytes', 'compressedSha256', 'parts'])
 assert.equal(entry.slug, art.slug, 'Packet artwork order/identity mismatch')
 const rawBytes = THEMES.reduce((total, theme) => total + art.variants[theme].bytes, 0)
 integer(rawBytes, THEMES.length * MAX_SVG_BYTES)
 assert.equal(entry.rawBytes, rawBytes, 'Packet length differs from catalogue')
 integer(entry.compressedBytes, MAX_COMPRESSED_BYTES)
 digest(entry.rawSha256); digest(entry.compressedSha256)
 assert(Array.isArray(entry.parts) && entry.parts.length === Math.ceil(entry.compressedBytes / CHUNK_BYTES), 'Invalid part count')
 entry.parts.forEach((part, index) => {
  keys(part, ['sha256', 'bytes']); digest(part.sha256)
  assert.equal(part.bytes, Math.min(CHUNK_BYTES, entry.compressedBytes - index * CHUNK_BYTES), 'Invalid part length')
 })
}
export function encodeArtwork(art, originals) {
 assert.equal(originals.length, THEMES.length)
 originals.forEach((data, index) => {
  const variant = art.variants[THEMES[index]]
  integer(data.length, MAX_SVG_BYTES)
  assert.equal(data.length, variant.bytes); assert.equal(sha256(data), variant.sha256, 'Original SVG hash mutation')
 })
 const raw = Buffer.concat(originals)
 const compressed = brotliCompressSync(raw, { params: { [zlib.BROTLI_PARAM_QUALITY]: 11, [zlib.BROTLI_PARAM_LGWIN]: 22 } })
 const chunks = []
 for (let offset = 0; offset < compressed.length; offset += CHUNK_BYTES) chunks.push(compressed.subarray(offset, offset + CHUNK_BYTES))
 const entry = { slug: art.slug, rawBytes: raw.length, rawSha256: sha256(raw), compressedBytes: compressed.length, compressedSha256: sha256(compressed), parts: chunks.map(data => ({ sha256: sha256(data), bytes: data.length })) }
 validateEntry(entry, art)
 return { entry, chunks }
}
export function decodeArtwork(entry, art, chunks) {
 validateEntry(entry, art)
 assert.equal(chunks.length, entry.parts.length)
 chunks.forEach((data, index) => {
  assert.equal(data.length, entry.parts[index].bytes, 'Compressed part length mismatch')
  assert.equal(sha256(data), entry.parts[index].sha256, 'Compressed part hash mismatch')
 })
 const compressed = Buffer.concat(chunks)
 assert.equal(sha256(compressed), entry.compressedSha256, 'Compressed stream hash mismatch')
 // Native decompression is capped before allocation by the pinned catalogue's
 // three original lengths, never by an archive header or a supplied filename.
 const raw = brotliDecompressSync(compressed, { maxOutputLength: entry.rawBytes })
 assert.equal(raw.length, entry.rawBytes, 'Decompressed byte count mismatch')
 assert.equal(sha256(raw), entry.rawSha256, 'Decompressed stream hash mismatch')
 let offset = 0
 return THEMES.map(theme => {
  const variant = art.variants[theme]
  const data = raw.subarray(offset, offset + variant.bytes); offset += variant.bytes
  assert.equal(sha256(data), variant.sha256, 'Original SVG hash mutation')
  return data
 })
}
async function readSources(root, entry, art) {
 const chunks = []
 for (const part of entry.parts) {
  const text = await readBounded(resolve(root, partPath(part)), MAX_PART_TEXT_BYTES)
  const data = Buffer.from(text.toString('ascii').trimEnd(), 'base64')
  assert(text.equals(Buffer.from(`${data.toString('base64')}\n`)), 'Non-canonical base64 source part')
  chunks.push(data)
 }
 return decodeArtwork(entry, art, chunks)
}
async function outputInventory(root, catalogue, create) {
 const base = resolve(root, 'public/artwork/grounded')
 await directory(base, create)
 const expected = new Set(catalogue.flatMap(assetsFor).map(asset => resolve(root, asset.path)))
 const directories = new Set(catalogue.map(art => art.slug))
 for (const entry of await readdir(base, { withFileTypes: true })) {
  assert(entry.isDirectory() && directories.has(entry.name), `Unexpected artwork directory: ${entry.name}`)
  for (const file of await readdir(join(base, entry.name), { withFileTypes: true })) {
   assert(file.isFile() && expected.has(join(base, entry.name, file.name)), `Unexpected artwork file: ${file.name}`)
  }
 }
}
async function existingOutputs(root, catalogue, create) {
 await outputInventory(root, catalogue, create)
 const missing = new Set()
 for (const art of catalogue) {
  await directory(resolve(root, `public/artwork/grounded/${art.slug}`), create)
  for (const asset of assetsFor(art)) {
   const data = await readBounded(resolve(root, asset.path), asset.bytes, true)
   if (!data) { missing.add(asset.path); continue }
   assert.equal(data.length, asset.bytes, `Existing asset byte count mutation: ${asset.path}`)
   assert.equal(sha256(data), asset.hash, `Existing asset hash mutation: ${asset.path}`)
  }
 }
 return missing
}
export async function packageGroundedAssets({ root = ROOT } = {}) {
 const catalogue = await readCatalogue(root)
 assert.equal((await existingOutputs(root, catalogue, false)).size, 0, 'Packaging requires every reviewed output')
 const artworks = []
 for (const art of catalogue) {
  const originals = []
  for (const theme of THEMES) originals.push(await readBounded(resolve(root, `public${art.variants[theme].master}`), MAX_SVG_BYTES))
  const { entry, chunks } = encodeArtwork(art, originals)
  for (let index = 0; index < chunks.length; index++) await writeMissing(resolve(root, partPath(entry.parts[index])), Buffer.from(`${chunks[index].toString('base64')}\n`))
  artworks.push(entry)
 }
 const manifest = { format: FORMAT, catalogueSha256: CATALOGUE_SHA256, artworks }
 await writeMissing(resolve(root, manifestPath), Buffer.from(json(manifest)))
 return sourceStats(manifest)
}
function sourceStats(manifest) {
 const parts = manifest.artworks.flatMap(entry => entry.parts)
 return { artworks: manifest.artworks.length, masters: manifest.artworks.length * THEMES.length, parts: parts.length,
  originalBytes: manifest.artworks.reduce((total, entry) => total + entry.rawBytes, 0),
  compressedBytes: manifest.artworks.reduce((total, entry) => total + entry.compressedBytes, 0),
  encodedPartBytes: parts.reduce((total, part) => total + 4 * Math.ceil(part.bytes / 3) + 1, 0),
  largestCompressedArtwork: Math.max(...manifest.artworks.map(entry => entry.compressedBytes)),
  largestPartFileBytes: Math.max(...parts.map(part => 4 * Math.ceil(part.bytes / 3) + 1)) }
}
export async function prepareGroundedAssets({ root = ROOT, check = false, renderer = renderWebp } = {}) {
 const catalogue = await readCatalogue(root)
 const manifest = JSON.parse(await readBounded(resolve(root, manifestPath), 128 * 1024))
 keys(manifest, ['format', 'catalogueSha256', 'artworks'])
 assert.equal(manifest.format, FORMAT); assert.equal(manifest.catalogueSha256, CATALOGUE_SHA256)
 assert(Array.isArray(manifest.artworks)); assert.equal(manifest.artworks.length, catalogue.length)
 manifest.artworks.forEach((entry, index) => validateEntry(entry, catalogue[index]))
 const missing = await existingOutputs(root, catalogue, !check)
 let written = 0
 // Sequential artwork and render loops bound native raster memory. Reuse the
 // importer's exact renderer; encoder drift fails before writing this artwork.
 for (let index = 0; index < catalogue.length; index++) {
  const art = catalogue[index], originals = await readSources(root, manifest.artworks[index], art)
  const pending = []
  for (const asset of assetsFor(art)) {
   if (!missing.has(asset.path)) continue
   assert(!check, `Missing prepared asset: ${asset.path}`)
   const master = originals[THEMES.indexOf(asset.theme)]
   const data = asset.kind === 'master' ? master : await renderer(master, asset.size)
   assert.equal(data.length, asset.bytes, `Renderer byte count drift: ${asset.path}`)
   assert.equal(sha256(data), asset.hash, `Renderer hash drift: ${asset.path}`)
   pending.push([asset.path, data])
  }
  for (const [path, data] of pending) { await writeMissing(resolve(root, path), data); written++ }
 }
 assert.equal((await existingOutputs(root, catalogue, false)).size, 0, 'Incomplete prepared assets')
 return { ...sourceStats(manifest), files: catalogue.length * 9, written, verified: catalogue.length * 9 - written }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const args = process.argv.slice(2)
 assert(args.length <= 1 && args.every(arg => ['--pack', '--check'].includes(arg)), 'Use --pack, --check, or no arguments')
 process.stdout.write(json(args[0] === '--pack' ? await packageGroundedAssets() : await prepareGroundedAssets({ check: args[0] === '--check' })))
}
