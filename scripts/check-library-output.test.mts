import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { STUDIES } from '../lib/generative-svg/model'
import { renderStudySvg } from '../lib/generative-svg/render'
import { ARTWORK } from '../lib/editorial-artwork/registry'
import { checkLibraryOutput } from './check-library-output.mts'
import { checkStudySearch } from './check-study-search.mts'

const source = fileURLToPath(new URL('../', import.meta.url))
let root: string
const html = (route: string, body: string) => `<!doctype html><html><head><link rel="canonical" href="https://benebsworth.com${route}"><meta property="og:url" content="https://benebsworth.com${route}"></head><body><main id="main-content">Loading</main><div hidden><main id="main-content"><h1>Library</h1>${body}</main></div></body></html>`
const library = html('/vectors/', `<a href="/vectors/originals/">Originals</a><section id="svg-studies">${STUDIES.map(study => `<button aria-label="Open ${study.title}">Open</button>`).join('')}</section><a download="${STUDIES[0].id}.svg" href="data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderStudySvg(STUDIES[0]))}">SVG</a>${ARTWORK.map(asset => `<article id="artwork-${asset.id}"><a href="${asset.src}" download="${path.posix.basename(asset.src)}">PNG</a></article>`).join('')}`)
before(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'library-output-'))
  await fs.cp(path.join(source, 'public/vectors'), path.join(root, 'vectors'), { recursive: true })
  await fs.cp(path.join(source, 'public/artwork'), path.join(root, 'artwork'), { recursive: true })
  await fs.mkdir(path.join(root, 'vectors/originals'), { recursive: true })
  await fs.writeFile(path.join(root, 'vectors/index.html'), library)
  await fs.writeFile(path.join(root, 'vectors/originals/index.html'), html('/vectors/originals/', '<a href="/vectors/">Library</a>'))
  await fs.writeFile(path.join(root, 'sitemap.xml'), '<urlset><url><loc>https://benebsworth.com/vectors/</loc></url><url><loc>https://benebsworth.com/vectors/originals/</loc></url></urlset>')
})
after(async () => { if (root) await fs.rm(root, { recursive: true, force: true }) })

async function corrupt(relative: string, mutate: (bytes: Buffer) => Buffer | string, expected: RegExp) {
  const file = path.join(root, relative), original = await fs.readFile(file)
  try {
    await fs.writeFile(file, mutate(original))
    await assert.rejects(checkLibraryOutput(root), expected)
  } finally { await fs.writeFile(file, original) }
}

test('static output contract preserves current catalogue without executing streamed scripts', async () => {
  const result = await checkLibraryOutput(root)
  assert.equal(result.svgStudies, STUDIES.length)
  assert.equal(result.pngArtwork, ARTWORK.length)
  assert(result.preservedOriginalFiles > 0)
  assert.equal(result.browserAcceptance, 'NOT RUN')
  assert.equal(result.deployment, 'NOT RUN')
  assert.equal(result.releaseApproved, false)
})
test('missing or renamed study fails instead of passing only the card count', () => corrupt('vectors/index.html', b => b.toString().replace(`Open ${STUDIES[0].title}`, 'Open missing'), /Study card/))
test('wrong default SVG bytes fail', () => corrupt('vectors/index.html', b => b.toString().replace('data:image/svg+xml;charset=utf-8,', 'data:image/svg+xml;charset=utf-8,wrong'), /Exact default SVG/))
test('PNG substitution with the same byte length fails', () => corrupt(ARTWORK[0].src.slice(1), b => { const changed = Buffer.from(b); changed[100] ^= 1; return changed }, /PNG hash/))
test('missing PNG fails closed', async () => {
  const file = path.join(root, ARTWORK[0].src.slice(1)), bytes = await fs.readFile(file)
  try { await fs.unlink(file); await assert.rejects(checkLibraryOutput(root), /ENOENT/) }
  finally { await fs.writeFile(file, bytes) }
})
test('provenance drift fails', () => corrupt('artwork/editorial/provenance.json', () => '[]', /Public provenance bytes/))
test('wrong PNG download type fails', () => corrupt('vectors/index.html', b => b.toString().replace(`download="${path.posix.basename(ARTWORK[0].src)}"`, 'download="fake.svg"'), /PNG download/))
test('original vector mutation fails', async () => {
  async function firstFile(dir: string): Promise<string> {
    for (const entry of await fs.readdir(path.join(source, 'public', dir), { withFileTypes: true })) {
      if (entry.isFile()) return path.join(dir, entry.name)
      if (entry.isDirectory()) return firstFile(path.join(dir, entry.name))
    }
    throw Error('Empty original archive')
  }
  await corrupt(await firstFile('vectors'), b => Buffer.concat([b, Buffer.from('changed')]), /Original vector bytes/)
})
test('archive canonical drift fails', () => corrupt('vectors/originals/index.html', b => b.toString().replace('rel="canonical" href="https://benebsworth.com/vectors/originals/"', 'rel="canonical" href="https://benebsworth.com/vectors/"'), /Canonical/))
test('missing archive return link fails', () => corrupt('vectors/originals/index.html', b => b.toString().replace('href="/vectors/"', 'href="/"'), /Archive return/))
test('missing archive sitemap entry fails', () => corrupt('sitemap.xml', b => b.toString().replace('https://benebsworth.com/vectors/originals/', 'https://benebsworth.com/'), /Sitemap/))

test('absent built search index fails closed', async () => {
  await assert.rejects(checkStudySearch(root), /ENOENT/)
})
