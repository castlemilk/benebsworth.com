import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { expect, it } from 'vitest'
import { createIndex, close } from 'pagefind'
import { buildSearch } from '../../scripts/build-search.mjs'
import { checkStudySearch } from '../../scripts/check-study-search.mjs'
import { STUDIES } from './model'
import { GROUNDED_ARTWORK } from '../grounded-artwork/registry'
import { ARTWORK } from '../editorial-artwork/registry'

const root = fileURLToPath(new URL('../../', import.meta.url))
const cli = (script: string, directory: string) => spawnSync(process.execPath, ['--import', 'tsx', script, directory], { cwd: root, encoding: 'utf8', timeout: 20000 })

it('Task and npm both build and validate the complete asset index before release', async () => {
  const build = await fs.readFile(path.join(root, 'taskfiles/build.yml'), 'utf8')
  const post = build.split('\n  post:\n')[1].split('\n  gen:md:\n')[0]
  const builder = 'node --import tsx scripts/build-search.mts'
  const checker = 'node --import tsx scripts/check-study-search.mts'
  expect(post).toContain(`${builder} {{.OUT_DIR}}`)
  expect(post).toContain(`${checker} {{.OUT_DIR}}`)
  expect(post.indexOf(builder)).toBeGreaterThan(post.lastIndexOf('node scripts/og-rewrite.mjs'))
  expect(post.indexOf(checker)).toBeGreaterThan(post.indexOf(builder))
  expect(post).toContain('node --import tsx scripts/check-grounded-output.mts {{.OUT_DIR}}')
  expect(post).not.toContain('{{.BIN}}/pagefind --site')
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
  expect(pkg.scripts.postbuild).toBe(`node scripts/og-rewrite.mjs && ${builder} && ${checker} && node --import tsx scripts/check-grounded-output.mts`)
  const sources = build.split('    sources:\n')[1].split('    generates:\n')[0]
  for (const input of ['scripts/build-search.mts', 'scripts/check-study-search.mts', 'scripts/og-rewrite.mjs', 'taskfiles/build.yml', 'package-lock.json']) expect(sources).toContain(`- ${input}`)
})

it('the shipped CLI preserves article search as well as every SVG and PNG record', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'svg-search-cli-'))
  try {
    await fs.writeFile(path.join(directory, 'index.html'), '<html lang="en"><body><article data-pagefind-body><h1>Search fixture</h1>Preservedarticlefixture.</article></body></html>')
    const built = cli('scripts/build-search.mts', directory)
    expect(built.stderr).toBe('')
    expect(built.status).toBe(0)
    expect(JSON.parse(built.stdout)).toMatchObject({ svgStudies: STUDIES.length, pngArtwork: ARTWORK.length })
    const checked = cli('scripts/check-study-search.mts', directory)
    expect(checked.status, checked.stderr).toBe(0)
    expect(JSON.parse(checked.stdout).indexedPages).toBe(STUDIES.length + ARTWORK.length + GROUNDED_ARTWORK.length + 1)
    // A separate process keeps the emitted module and its file-backed fetch
    // isolated from the all-asset checker and other tests.
    const article = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import fs from 'node:fs/promises';
      import path from 'node:path';
      import { pathToFileURL } from 'node:url';
      const root = path.resolve(process.argv[1], 'pagefind');
      globalThis.fetch = async input => new Response(await fs.readFile(path.join(root, new URL(input).pathname.slice('/pagefind/'.length))));
      const index = await import(pathToFileURL(path.join(root, 'pagefind.js')).href);
      await index.options({ basePath: 'https://index.invalid/pagefind/', baseUrl: '/' });
      try {
        const found = await index.search('Preservedarticlefixture');
        console.log(JSON.stringify(await Promise.all(found.results.map(async hit => (await hit.data()).url))));
      } finally { await index.destroy(); }
    `, directory], { encoding: 'utf8', timeout: 20000 })
    expect(article.status, article.stderr).toBe(0)
    expect(JSON.parse(article.stdout)).toContain('/')
  } finally { await fs.rm(directory, { recursive: true, force: true }) }
}, 30000)

it('the production checker rejects the former HTML-only index', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'svg-search-missing-assets-'))
  try {
    await fs.writeFile(path.join(directory, 'index.html'), '<html lang="en"><body><article data-pagefind-body><h1>Article only</h1>Search still works for posts.</article></body></html>')
    const { index } = await createIndex()
    if (!index) throw new Error('Missing fixture index')
    await index.addDirectory({ path: directory })
    await index.writeFiles({ outputPath: path.join(directory, 'pagefind') })
    await close()
    const checked = cli('scripts/check-study-search.mts', directory)
    expect(checked.status).not.toBe(0)
    expect(checked.stderr).toContain('Study search failed:')
  } finally { await close(); await fs.rm(directory, { recursive: true, force: true }) }
}, 30000)

it('builds a real combined Pagefind index alongside articles and resolves every study title/alias', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'svg-search-test-'))
  try {
    await fs.writeFile(path.join(directory, 'index.html'), '<html lang="en"><body><nav>notindexablechrome</nav><article data-pagefind-body><h1>Search fixture</h1>Preserved article text.</article></body></html>')
    const result = await buildSearch(directory)
    expect(result.svgStudies).toBe(STUDIES.length)
    const checked = await checkStudySearch(directory)
    expect(checked.indexedPages).toBe(STUDIES.length + ARTWORK.length + GROUNDED_ARTWORK.length + 1)
    expect(result.pngArtwork).toBe(ARTWORK.length)
    expect(checked.artworkDiscovery).toBe('passed')
    expect(checked.titleAndAliasSearch).toBe('passed')
    expect(checked.excludedCaveats).toBe('passed')
  } finally {
    await fs.rm(directory, { recursive: true, force: true })
  }
}, 20000)
