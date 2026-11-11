import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { STUDY_REGISTRY } from '../lib/generative-svg/model'
import { studyUrl } from '../lib/generative-svg/registry'
import { ARTWORK, artworkUrl } from '../lib/editorial-artwork/registry'

/** Exercise the real emitted Pagefind WASM index in Node, not a browser acceptance test. */
export async function checkStudySearch(site = 'out') {
  const root = path.resolve(site, 'pagefind'), originalFetch = globalThis.fetch
  const entry = JSON.parse(await fs.readFile(path.join(root, 'pagefind-entry.json'), 'utf8'))
  globalThis.fetch = async input => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    if (url.origin !== 'https://index.invalid' || !url.pathname.startsWith('/pagefind/')) throw new Error('Unexpected index resource')
    const file = path.resolve(root, url.pathname.slice('/pagefind/'.length))
    if (!file.startsWith(root + path.sep)) throw new Error('Invalid index resource path')
    return new Response(await fs.readFile(file), { headers: { 'Content-Type': file.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream' } })
  }
  const moduleUrl = pathToFileURL(path.join(root, 'pagefind.js')).href
  let pagefind: { options: (options: object) => Promise<void>; search: (query: string) => Promise<{ results: { data: () => Promise<{ url: string }> }[] }>; destroy: () => Promise<void> } | undefined
  const urls = async (query: string) => {
    const result = await pagefind!.search(query)
    return Promise.all(result.results.map(async (hit: { data: () => Promise<{ url: string }> }) => (await hit.data()).url))
  }
  try {
    pagefind = await import(/* webpackIgnore: true */ moduleUrl)
    await pagefind!.options({ basePath: 'https://index.invalid/pagefind/', baseUrl: '/' })
    for (const study of STUDY_REGISTRY.studies) {
      for (const query of [study.title, ...study.aliases]) {
        if (!(await urls(query)).includes(studyUrl(study))) throw new Error(`Study search failed: ${study.id} via ${query}`)
      }
    }
    for (const [query, id] of [['64QAM', 'qam-constellation'], ['BST', 'binary-search-tree'], ['modulation', 'qam-constellation'], ['RF antenna', 'antenna-radiation']]) {
      if (!(await urls(query)).includes(`/vectors/?study=${id}`)) throw new Error(`Tag or acronym search failed: ${query}`)
    }
    for (const [query, id] of [['noise', 'qam-constellation'], ['Snell', 'prism-dispersion'], ['elections', 'raft-consensus']]) {
      if ((await urls(query)).includes(`/vectors/?study=${id}`)) throw new Error(`Caveat leaked into search: ${id}`)
    }
    for (const asset of ARTWORK) {
      for (const query of [asset.title, ...asset.aliases, ...asset.tags]) {
        if (!(await urls(query.replaceAll('-', ' '))).includes(artworkUrl(asset))) throw new Error(`Artwork search failed: ${asset.id} via ${query}`)
      }
    }
    return { artwork: ARTWORK.length, artworkDiscovery: 'passed', indexedPages: entry.languages.en.page_count, studies: STUDY_REGISTRY.studies.length, titleAndAliasSearch: 'passed', excludedCaveats: 'passed' }
  } finally {
    try { await pagefind?.destroy() } finally { globalThis.fetch = originalFetch }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.stdout.write(`${JSON.stringify(await checkStudySearch(process.argv[2] || 'out'), null, 2)}\n`)
}
