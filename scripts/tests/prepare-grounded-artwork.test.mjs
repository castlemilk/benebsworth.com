import test from 'node:test'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
import { cp, lstat, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { brotliCompressSync } from 'node:zlib'
import { ROOT, THEMES, sha256, checkCatalogue } from '../import-grounded-artwork.mjs'
import { CHUNK_BYTES, MAX_PART_TEXT_BYTES, encodeArtwork, decodeArtwork, prepareGroundedAssets } from '../prepare-grounded-artwork.mjs'

const catalogue = JSON.parse(await readFile(resolve(ROOT, 'lib/grounded-artwork/catalogue.json')))
const manifest = JSON.parse(await readFile(resolve(ROOT, 'assets/grounded/manifest.json')))
const assetPath = (root, variant, kind = 'master') => resolve(root, `public${variant[kind]}`)
const partPath = (root, part) => resolve(root, `assets/grounded/parts/${part.sha256}.br.b64`)
async function fixture(t, outputs = true) {
 const root = await mkdtemp(join(tmpdir(), 'grounded-source-test-'))
 t.after(() => rm(root, { recursive: true, force: true }))
 await mkdir(join(root, 'lib/grounded-artwork'), { recursive: true })
 await cp(join(ROOT, 'lib/grounded-artwork/catalogue.json'), join(root, 'lib/grounded-artwork/catalogue.json'))
 await cp(join(ROOT, 'assets/grounded'), join(root, 'assets/grounded'), { recursive: true })
 if (outputs) await cp(join(ROOT, 'public/artwork/grounded'), join(root, 'public/artwork/grounded'), { recursive: true })
 return root
}
const writeManifest = (root, data) => writeFile(join(root, 'assets/grounded/manifest.json'), JSON.stringify(data))

test('all original SVG bytes round-trip and packaging is deterministic with the installed runtime', async () => {
 let originalBytes = 0, compressedBytes = 0, encodedBytes = 0, parts = 0
 for (let index = 0; index < catalogue.length; index++) {
  const art = catalogue[index], entry = manifest.artworks[index]
  const originals = await Promise.all(THEMES.map(theme => readFile(assetPath(ROOT, art.variants[theme]))))
  const first = encodeArtwork(art, originals), second = encodeArtwork(art, originals)
  assert.deepEqual(first, second)
  // Do not require a future Brotli version to reproduce the same compressed bits:
  // the committed stream hash pins transport, original hashes pin artwork identity.
  const committed = []
  for (const part of entry.parts) {
   const text = await readFile(partPath(ROOT, part)); assert(text.length <= MAX_PART_TEXT_BYTES)
   encodedBytes += text.length; committed.push(Buffer.from(text.toString().trim(), 'base64')); parts++
  }
  const decoded = decodeArtwork(entry, art, committed)
  decoded.forEach((bytes, theme) => assert(bytes.equals(originals[theme])))
  originalBytes += entry.rawBytes; compressedBytes += entry.compressedBytes
 }
 assert.deepEqual({ originalBytes, compressedBytes, encodedBytes, parts }, { originalBytes: 8570142, compressedBytes: 767259, encodedBytes: 1023114, parts: 46 })
})

test('a fresh checkout restores all 270 exact public bytes, dimensions and alpha sequentially', { timeout: 180000 }, async t => {
 const root = await fixture(t, false)
 const report = await prepareGroundedAssets({ root })
 assert.equal(report.written, 270); assert.equal(report.verified, 0)
 assert.equal((await checkCatalogue(catalogue, { root, regenerate: false })).files, 270)
 for (const art of catalogue) for (const theme of THEMES) for (const kind of ['master', 'thumbnail', 'preview']) {
  const variant = art.variants[theme]
  assert((await readFile(assetPath(root, variant, kind))).equals(await readFile(assetPath(ROOT, variant, kind))))
 }
})

test('warm outputs are skipped only after all source and public hashes pass, without rewriting', async t => {
 const root = await fixture(t), path = assetPath(root, catalogue.at(-1).variants.mono)
 const before = await lstat(path)
 const report = await prepareGroundedAssets({ root, renderer: () => { throw Error('Warm run must not render') } })
 assert.equal(report.written, 0); assert.equal(report.verified, 270)
 assert.equal((await lstat(path)).mtimeMs, before.mtimeMs)
 await prepareGroundedAssets({ root, check: true })
})

test('partial preparation restores only missing files with the same fingerprints', async t => {
 const root = await fixture(t), variant = catalogue[0].variants.light
 for (const kind of ['master', 'thumbnail', 'preview']) await rm(assetPath(root, variant, kind))
 const report = await prepareGroundedAssets({ root })
 assert.equal(report.written, 3); assert.equal(report.verified, 267)
 for (const kind of ['master', 'thumbnail', 'preview']) assert((await readFile(assetPath(root, variant, kind))).equals(await readFile(assetPath(ROOT, variant, kind))))
})

test('renderer drift fails before writing the affected artwork and check mode never regenerates', async t => {
 const root = await fixture(t), variant = catalogue[0].variants.light
 await rm(assetPath(root, variant)); await rm(assetPath(root, variant, 'thumbnail'))
 await assert.rejects(prepareGroundedAssets({ root, check: true }), /Missing prepared asset/)
 await assert.rejects(prepareGroundedAssets({ root, renderer: async () => Buffer.alloc(variant.thumbnailBytes) }), /Renderer hash drift/)
 await assert.rejects(lstat(assetPath(root, variant)), { code: 'ENOENT' })
 await assert.rejects(lstat(assetPath(root, variant, 'thumbnail')), { code: 'ENOENT' })
})

test('changed existing output fails instead of silently replacing tested bytes', async t => {
 const root = await fixture(t), path = assetPath(root, catalogue.at(-1).variants.mono)
 const damaged = await readFile(path); damaged[10] ^= 1; await writeFile(path, damaged)
 await assert.rejects(prepareGroundedAssets({ root }), /Existing asset hash mutation/)
 assert((await readFile(path)).equals(damaged))
})

test('catalogue edits fail the authority pin before creating output directories', async t => {
 const root = await fixture(t, false)
 await writeFile(join(root, 'lib/grounded-artwork/catalogue.json'), JSON.stringify(catalogue))
 await assert.rejects(prepareGroundedAssets({ root }), /Catalogue metadata mutation/)
 await assert.rejects(lstat(join(root, 'public')), { code: 'ENOENT' })
})

test('truncated, altered and noncanonical transport fail even when public assets exist', async t => {
 for (const mutate of [text => text.subarray(0, -3), text => Buffer.from(`!${text.toString().slice(1)}`), text => { const copy = Buffer.from(text); copy[0] ^= 128; return copy }]) {
  const root = await fixture(t), path = partPath(root, manifest.artworks[0].parts[0])
  await writeFile(path, mutate(await readFile(path)))
  await assert.rejects(prepareGroundedAssets({ root }), /Non-canonical|part length|part hash/)
 }
 const root = await fixture(t), path = partPath(root, manifest.artworks[0].parts[0])
 const bytes = Buffer.from((await readFile(path)).toString().trim(), 'base64'); bytes[0] ^= 1
 await writeFile(path, `${bytes.toString('base64')}\n`)
 await assert.rejects(prepareGroundedAssets({ root }), /Compressed part hash/)
})

test('unsafe metadata keys, path-like digests, oversized counts and missing chunks are rejected', async t => {
 for (const mutate of [
  m => { m.artworks[0].parts[0].filename = '../../outside.svg' },
  m => { m.artworks[0].parts[0].sha256 = '../outside' },
  m => { m.artworks[0].rawBytes = 2 ** 40 },
  m => { m.artworks[0].compressedBytes = 2 ** 40 },
  m => { m.artworks[0].parts.push(m.artworks[0].parts[0]) },
 ]) {
  const root = await fixture(t), damaged = structuredClone(manifest); mutate(damaged); await writeManifest(root, damaged)
  await assert.rejects(prepareGroundedAssets({ root }), /packet keys|Invalid SHA|differs from catalogue|bounded packet|part count/)
 }
 const root = await fixture(t); await rm(partPath(root, manifest.artworks[0].parts[0]))
 await assert.rejects(prepareGroundedAssets({ root }), { code: 'ENOENT' })
})

test('native decompression has a hard output limit and refuses valid compressed wrong original bytes', () => {
 const original = Buffer.from('small SVG'), art = { slug: 'test', variants: Object.fromEntries(THEMES.map(theme => [theme, { bytes: original.length, sha256: sha256(original) }])) }
 const { entry, chunks } = encodeArtwork(art, [original, original, original])
 const bomb = brotliCompressSync(Buffer.alloc(1024 * 1024, 65))
 assert(bomb.length < CHUNK_BYTES)
 const damaged = { ...entry, compressedBytes: bomb.length, compressedSha256: sha256(bomb), parts: [{ sha256: sha256(bomb), bytes: bomb.length }] }
 assert.throws(() => decodeArtwork(damaged, art, [bomb]), /larger than|Output|buffer/i)
 const wrongArt = structuredClone(art); wrongArt.variants.mono.sha256 = '0'.repeat(64)
 assert.throws(() => decodeArtwork(entry, wrongArt, chunks), /Original SVG hash mutation/)
})

test('symlinked source, output file and output ancestor never escape the checkout', async t => {
 for (const mode of ['source', 'output-file', 'output-directory']) {
  const root = await fixture(t), variant = catalogue[0].variants.light
  const path = mode === 'source' ? partPath(root, manifest.artworks[0].parts[0]) : mode === 'output-file' ? assetPath(root, variant) : dirname(assetPath(root, variant))
  const target = mode === 'source' ? partPath(ROOT, manifest.artworks[0].parts[0]) : mode === 'output-file' ? assetPath(ROOT, variant) : dirname(assetPath(ROOT, variant))
  await rm(path, { recursive: true }); await symlink(target, path)
  await assert.rejects(prepareGroundedAssets({ root }), /ELOOP|Unexpected artwork|Unsafe/)
 }
})

test('FIFO source files fail promptly rather than hanging in open', async t => {
 for (const mode of ['part', 'manifest']) {
  const root = await fixture(t)
  const path = mode === 'part' ? partPath(root, manifest.artworks[0].parts[0]) : join(root, 'assets/grounded/manifest.json')
  await rm(path)
  const fifo = spawnSync('mkfifo', [path], { encoding: 'utf8', timeout: 5000 })
  assert.equal(fifo.status, 0, fifo.stderr)
  const script = `import { prepareGroundedAssets } from ${JSON.stringify(pathToFileURL(join(ROOT, 'scripts/prepare-grounded-artwork.mjs')).href)}; await prepareGroundedAssets({ root: ${JSON.stringify(root)} })`
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 5000 })
  assert.equal(run.error, undefined)
  assert.equal(run.status, 1, run.stderr)
  assert.match(run.stderr, /Unsafe or oversized file/)
 }
})

test('unexpected files and oversized source parts cannot be silently ignored', async t => {
 const root = await fixture(t)
 await writeFile(join(dirname(assetPath(root, catalogue[0].variants.light)), 'extra.svg'), 'unexpected')
 await assert.rejects(prepareGroundedAssets({ root }), /Unexpected artwork file/)
 const oversized = await fixture(t)
 await writeFile(partPath(oversized, manifest.artworks[0].parts[0]), Buffer.alloc(MAX_PART_TEXT_BYTES + 1))
 await assert.rejects(prepareGroundedAssets({ root: oversized }), /oversized file/)
})

test('npm, Task, remote verification and watch paths prepare before consumers without worker races', async () => {
 const pkg = JSON.parse(await readFile(join(ROOT, 'package.json')))
 for (const hook of ['predev', 'pretest', 'pretest:watch']) assert.equal(pkg.scripts[hook], 'node scripts/prepare-grounded-artwork.mjs')
 assert(pkg.scripts.prebuild.startsWith('node scripts/prepare-grounded-artwork.mjs && '))
 const build = await readFile(join(ROOT, 'taskfiles/build.yml'), 'utf8')
 for (const name of ['default', 'clean']) {
  const block = build.split(`  ${name}:\n`)[1].split(/\n {2}[a-z]/)[0]
  assert(block.indexOf('- task: gen:grounded') < block.indexOf("'{{.BIN}}/next build'"))
 }
 assert(build.includes('- assets/grounded/**/*'))
 const unit = await readFile(join(ROOT, 'taskfiles/test.yml'), 'utf8')
 assert.match(unit, /task: ':build:gen:grounded'\n {6}- '\{\{.BIN\}\}\/vitest run'/)
 assert.match(unit, /task: ':build:gen:grounded'\n {6}- '\{\{.BIN\}\}\/vitest'/)
 const remote = await readFile(join(ROOT, 'taskfiles/remote.yml'), 'utf8')
 assert(remote.indexOf('task: ":build:gen:grounded"') < remote.indexOf("task: ':verify'"))
 const tasks = await readFile(join(ROOT, 'Taskfile.yml'), 'utf8')
 assert.match(tasks, /task: build:gen:grounded\n {6}- '\{\{.BIN\}\}\/next dev'/)
})
