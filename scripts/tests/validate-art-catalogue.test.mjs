import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { ARTWORK_SCHEMA, DEFAULT_CATALOGUE, assertSupportedSchema, validateCatalogue, verifyImportedAssets } from '../validate-art-catalogue.mjs'

const current = JSON.parse(await readFile(DEFAULT_CATALOGUE, 'utf8'))
const clone = () => structuredClone(current)
const oneArtwork = () => ({ ...clone(), artworks: [structuredClone(current.artworks[0])] })
const errorText = data => validateCatalogue(data).join('\n')
const command = fileURLToPath(new URL('../validate-art-catalogue.mjs', import.meta.url))
// A tiny real PNG is sufficient to test byte/format identity; it is not gallery artwork.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')

async function importedFixture(t) {
  const publicRoot = await mkdtemp(path.join(os.tmpdir(), 'art-catalogue-test-'))
  t.after(() => rm(publicRoot, { recursive: true, force: true }))
  await mkdir(path.join(publicRoot, 'artwork/worlds/test'), { recursive: true })
  const filename = path.join(publicRoot, 'artwork/worlds/test/v1.png')
  await writeFile(filename, png)
  const data = oneArtwork()
  data.artworks[0].status = 'published'
  data.artworks[0].versions[0].asset = {
    availability: 'imported', src: '/artwork/worlds/test/v1.png',
    sha256: sha256(png), bytes: png.length, width: 1, height: 1, mimeType: 'image/png',
  }
  return { data, filename, publicRoot }
}

test('the real collection validates as eight draft works and nine unimported render versions', () => {
  const before = JSON.stringify(current)
  assert.deepEqual(validateCatalogue(current), [])
  assert.equal(current.artworks.length, 8)
  assert.equal(current.artworks.flatMap(artwork => artwork.versions).length, 9)
  assert.ok(current.artworks.every(artwork => artwork.status === 'draft'))
  assert.ok(current.artworks.flatMap(artwork => artwork.versions).every(version => version.asset.availability === 'not-imported' && version.asset.src === null))
  const ocean = current.artworks.find(artwork => artwork.slug === 'the-joining-of-two-seas')
  assert.equal(ocean.selectedVersionId, 'v2')
  assert.equal(ocean.versions[1].operation, 'edit')
  assert.equal(ocean.versions[1].parentVersionId, 'v1')
  assert.equal(JSON.stringify(current), before)
})

test('schema declares exact required fields and rejects unknown nested metadata', () => {
  assert.equal(ARTWORK_SCHEMA.$schema, 'https://json-schema.org/draft/2020-12/schema')
  const data = oneArtwork()
  data.artworks[0].rights.exclusive = true
  assert.match(errorText(data), /rights.exclusive: unknown property/)
  delete data.artworks[0].rights.exclusive
  data.artworks[0].rights = JSON.parse('{"kind":"generated-artwork","reuseLicense":null,"credit":null,"__proto__":{}}')
  assert.match(errorText(data), /rights.__proto__: unknown property/)
  delete data.artworks[0].review
  delete data.artworks[0].taxonomy.styles
  assert.match(errorText(data), /taxonomy.styles: required/)
})

test('schema changes cannot silently introduce unsupported validation keywords', () => {
  for (const [keyword, value] of [['maxLength', 1], ['allOf', [{ type: 'string' }]]]) {
    const changed = structuredClone(ARTWORK_SCHEMA)
    changed.$defs.text[keyword] = value
    assert.throws(() => assertSupportedSchema(changed), new RegExp(`unsupported keyword ${keyword}`))
  }
  // A content property called maxLength is still a property, not a keyword.
  assert.doesNotThrow(() => assertSupportedSchema({ type: 'object', properties: { maxLength: { type: 'string' } } }))
})

test('schema compatibility checks reject unsupported formats, references and keyword shapes', () => {
  assert.throws(() => assertSupportedSchema({ type: 'string', format: 'email' }), /unsupported format email/)
  assert.throws(() => assertSupportedSchema({ $ref: 'https://example.com/schema.json' }), /resolved local/)
  assert.throws(() => assertSupportedSchema({ $ref: '#/$defs/missing' }), /resolved local/)
  assert.throws(() => assertSupportedSchema({ $defs: { text: { type: 'string' } }, properties: { text: { $ref: '#/$defs/text', minLength: 1 } } }), /assertion siblings/)
  assert.throws(() => assertSupportedSchema({ type: 'string', minLength: '1' }), /nonnegative integer/)
  assert.throws(() => assertSupportedSchema({ properties: { title: true } }), /object schema/)
  assert.throws(() => assertSupportedSchema({ type: 'string', pattern: '[' }), /invalid regular expression/)
  assert.doesNotThrow(() => assertSupportedSchema(ARTWORK_SCHEMA))
})

test('style and aesthetic remain separate required nonempty string arrays', () => {
  for (const key of ['subjects', 'scales', 'styles', 'aesthetics', 'moods', 'materials', 'palette']) {
    const data = oneArtwork()
    data.artworks[0].taxonomy[key] = []
    assert.match(errorText(data), new RegExp(`${key}: must contain at least 1`))
  }
  const duplicate = oneArtwork()
  duplicate.artworks[0].taxonomy.styles = ['painterly', 'painterly']
  assert.match(errorText(duplicate), /styles: duplicate item/)
})

test('unrecognized methods, fictional claims and replay claims are rejected', () => {
  const data = oneArtwork()
  data.schemaVersion = 2
  data.artworks[0].creativeProcess.route = '50-percent-antialgorithm'
  data.artworks[0].premise.kind = 'verified-physics'
  data.artworks[0].versions[0].generation.deterministicReplay = true
  const errors = errorText(data)
  assert.match(errors, /schemaVersion: must equal 1/)
  assert.match(errors, /creativeProcess.route/)
  assert.match(errors, /premise.kind: must equal "fiction"/)
  assert.match(errors, /deterministicReplay: must equal false/)
})

test('duplicate artwork identities and slugs fail', () => {
  const data = oneArtwork()
  data.artworks.push(structuredClone(data.artworks[0]))
  assert.match(errorText(data), /duplicate artwork id/)
  assert.match(errorText(data), /duplicate artwork slug/)
})

test('selected versions and per-artwork version identities must resolve uniquely', () => {
  const data = oneArtwork()
  data.artworks[0].selectedVersionId = 'v99'
  assert.match(errorText(data), /selectedVersionId: unresolved version/)
  data.artworks[0].selectedVersionId = 'v1'
  data.artworks[0].versions.push(structuredClone(data.artworks[0].versions[0]))
  assert.match(errorText(data), /duplicate version id/)
})

test('lineage rejects missing, forward, cyclic and self parents', () => {
  const data = oneArtwork()
  const first = data.artworks[0].versions[0]
  first.operation = 'edit'
  for (const parent of [null, 'v9', 'v1']) {
    first.parentVersionId = parent
    assert.match(errorText(data), /edit parent must be an earlier version/)
  }
  first.parentVersionId = 'v2'
  data.artworks[0].versions.push({ ...structuredClone(first), id: 'v2', parentVersionId: 'v1' })
  assert.match(errorText(data), /edit parent must be an earlier version/)
  first.operation = 'generate'
  first.parentVersionId = 'v2'
  assert.match(errorText(data), /generate must have a null parentVersionId/)
})

test('annotation identities and render references are checked', () => {
  const data = oneArtwork()
  data.artworks[0].annotations[0].versionId = 'v9'
  data.artworks[0].annotations.push(structuredClone(data.artworks[0].annotations[0]))
  assert.match(errorText(data), /versionId: unresolved version/)
  assert.match(errorText(data), /duplicate annotation id/)
})

test('annotation regions must have positive area entirely within their image', () => {
  const data = oneArtwork()
  const annotation = data.artworks[0].annotations[0]
  annotation.region = { x: 0.1, y: 0.2, width: 0.9, height: 0.8 }
  assert.deepEqual(validateCatalogue(data), [])
  annotation.region.width = 0.91
  assert.match(errorText(data), /rectangle extends outside the image/)
  annotation.region = { x: -0.1, y: 0, width: 0, height: 1 }
  assert.match(errorText(data), /region.x: must be at least 0/)
  assert.match(errorText(data), /region.width: must be greater than 0/)
  annotation.region = null
  assert.deepEqual(validateCatalogue(data), [])
})

test('published records cannot have unimported selected or historical originals', () => {
  const data = oneArtwork()
  data.artworks[0].status = 'published'
  assert.match(errorText(data), /published artwork requires every recorded original to be imported/)
  const historical = clone()
  const ocean = historical.artworks.find(artwork => artwork.versions.length === 2)
  ocean.status = 'published'
  ocean.versions[1].asset.availability = 'imported'
  ocean.versions[1].asset.src = '/artwork/worlds/ocean/v2.png'
  assert.match(errorText(historical), /versions \(v1\).*published artwork requires/)
})

test('availability cannot be represented by a guessed URL or a missing imported path', () => {
  const data = oneArtwork()
  const asset = data.artworks[0].versions[0].asset
  asset.src = '/artwork/worlds/test/v1.png'
  assert.match(errorText(data), /not-imported assets must use null/)
  asset.availability = 'imported'
  asset.src = null
  assert.match(errorText(data), /imported assets require a public path/)
})

test('asset URLs reject hostnames, traversal, encoded separators and query strings', () => {
  for (const src of ['https://example.com/image.png', '/artwork/worlds/../private.png', '/artwork/worlds/%2e%2e/private.png', '/artwork/worlds/image.png?token=test', '//example.com/image.png', '/artwork/worlds/image.svg']) {
    const data = oneArtwork()
    data.artworks[0].versions[0].asset.availability = 'imported'
    data.artworks[0].versions[0].asset.src = src
    assert.match(errorText(data), /asset.src: invalid string format/)
  }
})

test('receipt fields reject malformed hashes, fractional dimensions and excessive input size', () => {
  const data = oneArtwork()
  const asset = data.artworks[0].versions[0].asset
  asset.sha256 = 'unknown'
  asset.width = 1.5
  asset.height = 0
  assert.match(errorText(data), /asset.sha256: invalid string format/)
  assert.match(errorText(data), /asset.width: expected integer/)
  assert.match(errorText(data), /asset.height: must be at least 1/)
  const large = oneArtwork()
  large.artworks[0].versions[0].asset.bytes = 64 * 1024 * 1024 + 1
  assert.match(errorText(large), /asset.bytes: must be at most 67108864/)
})

test('unknown generation settings remain null and recorded dates must be valid', () => {
  const data = oneArtwork()
  const generation = data.artworks[0].versions[0].generation
  Object.assign(generation, { model: null, seed: null, generatedAt: null })
  assert.deepEqual(validateCatalogue(data), [])
  generation.generatedAt = '2026-11-19T08:30:00+11:00'
  assert.deepEqual(validateCatalogue(data), [])
  generation.generatedAt = '2026-02-30T08:30:00Z'
  data.collection.studyDate = '2026-02-30'
  assert.match(errorText(data), /generatedAt: invalid date-time/)
  assert.match(errorText(data), /studyDate: invalid date/)
})

test('validation preserves exact prompt whitespace and rejects missing used prompts', () => {
  const data = oneArtwork()
  const version = data.artworks[0].versions[0]
  version.prompt = 'First line.\n\n  Indented detail.\n'
  const prompt = version.prompt
  assert.deepEqual(validateCatalogue(data), [])
  assert.equal(version.prompt, prompt)
  version.prompt = '   \n'
  assert.match(errorText(data), /prompt: invalid string format/)
  version.prompt = 'Prepared but unused'
  version.promptStatus = 'prepared'
  assert.match(errorText(data), /promptStatus: must equal "exact-used"/)
})

test('imported assets verify their actual bytes, SHA-256 and PNG dimensions', async t => {
  const { data, publicRoot } = await importedFixture(t)
  assert.deepEqual(validateCatalogue(data), [])
  assert.deepEqual(await verifyImportedAssets(data, publicRoot), [])
  data.artworks[0].versions[0].asset.width = 2
  assert.match((await verifyImportedAssets(data, publicRoot)).join('\n'), /PNG dimensions differ/)
})

test('asset verification catches changed originals and incorrect byte receipts', async t => {
  const { data, filename, publicRoot } = await importedFixture(t)
  const changed = Buffer.from(png)
  changed[40] ^= 1
  await writeFile(filename, changed)
  assert.match((await verifyImportedAssets(data, publicRoot)).join('\n'), /SHA-256 differs/)
  data.artworks[0].versions[0].asset.bytes += 1
  assert.match((await verifyImportedAssets(data, publicRoot)).join('\n'), /byte length differs/)
})

test('asset verification rejects false PNGs even when their byte receipt matches', async t => {
  const { data, filename, publicRoot } = await importedFixture(t)
  const falsePng = Buffer.alloc(png.length, 32)
  await writeFile(filename, falsePng)
  data.artworks[0].versions[0].asset.sha256 = sha256(falsePng)
  assert.match((await verifyImportedAssets(data, publicRoot)).join('\n'), /invalid PNG signature or IHDR/)
})

test('asset verification rejects missing files and symlinks instead of fetching replacements', async t => {
  const { data, filename, publicRoot } = await importedFixture(t)
  await rm(filename)
  assert.match((await verifyImportedAssets(data, publicRoot)).join('\n'), /ENOENT/)
  const other = path.join(publicRoot, 'other.png')
  await writeFile(other, png)
  await symlink(other, filename)
  assert.match((await verifyImportedAssets(data, publicRoot)).join('\n'), /symlinked asset paths are not allowed/)
})

test('CLI distinguishes valid metadata from imported asset verification', () => {
  const output = execFileSync(process.execPath, [command, DEFAULT_CATALOGUE, '--assets'], { encoding: 'utf8' })
  assert.match(output, /8 artworks, 9 versions; 0 imported, 9 not imported/)
  assert.match(output, /Verified 0 local PNG receipts. Unimported assets were not verified./)
  const invalid = spawnSync(process.execPath, [command, '--publish'], { encoding: 'utf8' })
  assert.equal(invalid.status, 1)
  assert.match(invalid.stderr, /Unknown or repeated flag/)
})
