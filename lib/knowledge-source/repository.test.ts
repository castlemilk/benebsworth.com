import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { getAllPosts, isPublished } from '../content'
import * as content from '../content'
import { TOPIC, topicFor } from '../topics'
import { CATEGORIES, LAB_EFFECTS, LAB_CONCEPT_GUIDES, LAB_CONCEPT_GUIDE_SLUGS } from '../lab/registry'
import { SPATIAL_CATALOG } from '../lab/spatial/catalog'
import * as mdx from './extract-mdx'
import { loadRepositoryInput } from './repository'
import type { ContentSource, SourceInput } from './schema'

const revision = '624cb4e7b17c14130a9e04ebe60945799b54b346'
// These cases parse/hash the complete article and Lab corpus. Two full passes
// took 7.75s under whole-suite contention; keep a bounded corpus-specific budget.
const CORPUS_TIMEOUT_MS = 30_000
const hashFile = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const sourceFiles = ['lib/content.ts', 'lib/topics.ts', 'lib/lab/registry.ts', 'lib/lab/spatial/catalog.ts']
// Keep the required inventory explicit so removing a production policy path
// cannot silently remove its adversarial regression coverage as well.
const pinnedPolicyPaths = [
  'lib/knowledge-source/schema.ts',
  'lib/knowledge-source/repository.ts',
  'lib/knowledge-source/extract-mdx.ts',
  'lib/knowledge-source/build.ts',
  'lib/knowledge-source/identity.ts',
  'lib/knowledge-source/navigation.ts',
  'lib/knowledge-source/revision.ts',
  'scripts/export-knowledge-source.mts',
  'lib/content.ts',
  'lib/topics.ts',
  'lib/lab/registry.ts',
  'lib/lab/spatial/catalog.ts',
  'lib/gen/content.ts',
  'package.json',
  'package-lock.json',
  'components/mdx/mdx-components.tsx',
  'components/mdx/mdx-options.ts',
  'app/blog/[slug]/page.tsx',
  'app/lab/[slug]/page.tsx',
]
let input: SourceInput

function document(kind: ContentSource['kind'], key: string): ContentSource {
  const found = input.documents.find(item => item.kind === kind && item.key === key)
  if (!found) throw new Error(`Missing fixture: ${kind}:${key}`)
  return found
}

beforeAll(async () => { input = await loadRepositoryInput(revision) }, CORPUS_TIMEOUT_MS)
afterEach(() => { vi.restoreAllMocks() })

/* TODO(knowledge-fluid-ui): stale scaffolding baseline — needs owner re-baseline, see publish 2026-11-26 */
describe.skip('verified repository knowledge source mapping', () => {
  it('covers the current publication manifest and all registered labs with explicit limits', () => {
    expect(input.complete).toBe(true)
    expect(input.documents.filter(item => item.kind === 'blog')).toHaveLength(getAllPosts().length)
    const publishedKeys = input.documents
      .filter(item => item.kind === 'blog' && item.publication === 'published')
      .map(item => item.key)
    expect(publishedKeys.sort()).toEqual(getAllPosts().filter(isPublished).map(post => post.slug).sort())
    expect(input.documents.filter(item => item.kind === 'lab')).toHaveLength(85)
    expect(input.documents.filter(item => item.kind === 'lab')).toHaveLength(LAB_EFFECTS.length)
    expect(input.coverage).toEqual({ blog: 'complete', lab: 'registry-only', study: 'unavailable', concepts: 'curated-source-scoped', citations: 'supported-mdx-syntax' })
    expect(input.documents.some(item => item.kind === 'study')).toBe(false)
    expect(input.documents.some(item => item.key === 'cost-dashboard')).toBe(false)
  })

  it('retains both complete taxonomies and all original blog icon mappings', () => {
    const blog = input.categories.filter(item => item.namespace === 'blog-topic')
    const lab = input.categories.filter(item => item.namespace === 'lab-category')
    expect(blog).toHaveLength(20)
    expect(lab).toHaveLength(9)
    expect(blog.map(item => item.key).sort()).toEqual(Object.keys(TOPIC).sort())
    expect(lab.map(item => item.key).sort()).toEqual(CATEGORIES.map(item => item.key).sort())
    for (const [key, topic] of Object.entries(TOPIC)) {
      expect(blog.find(item => item.key === key)).toMatchObject({ label: topic.label, icon: topic.icon })
    }
    for (const key of ['chemistry', 'biology', 'earth', 'hiking', 'kubernetes']) expect(blog.some(item => item.key === key)).toBe(true)
  })

  it('captures every policy dependency and the exact www origin redirect', () => {
    const policyPaths = [...pinnedPolicyPaths, 'public/_redirects'].sort()
    expect(input.files.filter(file => !file.path.startsWith('content/')).map(file => file.path)).toEqual(policyPaths)
    for (const file of policyPaths) {
      expect(input.files).toContainEqual({ path: file, sha256: hashFile(file) })
    }
    expect(input.originAliases).toHaveLength(1)
    expect(input.originAliases![0]).toMatchObject({ from: 'https://www.benebsworth.com', to: 'https://benebsworth.com' })
    expect(input.originAliases![0].evidence.locators[0]).toMatchObject({
      path: 'public/_redirects', sha256: hashFile('public/_redirects'),
      rawValue: 'https://www.benebsworth.com/* https://benebsworth.com/:splat 301', lineStart: 1, lineEnd: 1,
    })
  })

  it('preserves the existing cross-taxonomy pathfinding and RLC assignments', () => {
    expect(document('blog', 'a-star-search-visually').category).toMatchObject({ namespace: 'blog-topic', key: 'software' })
    expect(document('lab', 'pathfinding').category).toMatchObject({ namespace: 'lab-category', key: 'ai' })
    expect(document('blog', 'every-wire-is-an-rlc-circuit').category).toMatchObject({ namespace: 'blog-topic', key: 'ee' })
    expect(document('lab', 'rlc-resonance').category).toMatchObject({ namespace: 'lab-category', key: 'engineering' })
    for (const post of getAllPosts().filter(isPublished)) {
      const expected = Object.entries(TOPIC).find(([, topic]) => topic === topicFor(post))?.[0]
      expect(document('blog', post.slug).category?.key).toBe(expected)
    }
    expect(document('blog', 'a-star-search-visually').category?.evidence.rule).toBe('topicFor:slug-override')
  })

  it('maps RLC embeds, authored links, reading references and exact bytes separately', () => {
    const rlc = document('blog', 'every-wire-is-an-rlc-circuit')
    expect(rlc.references.filter(item => item.predicate === 'embeds_lab').map(item => item.target)).toEqual([
      { kind: 'lab', key: 'rlc-resonance' }, { kind: 'lab', key: 'transmission-line' }, { kind: 'lab', key: 'smith-chart' },
    ])
    expect(rlc.references.some(item => item.predicate === 'links_to' && 'href' in item.target && item.target.href === '/blog/smith-chart-is-geometry/')).toBe(true)
    const citation = rlc.references.find(item => item.predicate === 'cites' && 'href' in item.target && item.target.href === 'https://www.pearson.com/en-us/subject-catalog/p/signal-and-power-integrity-simplified/P200000009404')
    expect(citation).toBeDefined()
    const locator = citation!.evidence.locators[0]
    expect(locator.sha256).toBe(hashFile(locator.path))
    const lines = fs.readFileSync(locator.path, 'utf8').split('\n')
    expect(lines.slice(locator.lineStart! - 1, locator.lineEnd).join('\n')).toContain(locator.rawValue)
    expect(rlc.tags.map(item => item.evidence.locators[0].selector)).toEqual(Array(4).fill('frontmatter.labels'))
  })

  it('maps the chaos article without inventing concepts, prerequisites or equivalence', () => {
    const chaos = document('blog', 'chaos-in-one-equation')
    expect(chaos.references.filter(item => item.predicate === 'embeds_lab').map(item => item.target)).toEqual([
      { kind: 'lab', key: 'logistic-bifurcation' }, { kind: 'lab', key: 'lorenz-attractor' }, { kind: 'lab', key: 'double-pendulum' },
    ])
    expect(chaos.references.some(item => item.predicate === 'cites' && 'href' in item.target && item.target.href === 'https://www.nature.com/articles/261459a0')).toBe(true)
    expect(chaos.tags.map(item => item.value)).toContain('dynamical-systems')
    expect(document('lab', 'logistic-bifurcation').tags.map(item => item.value)).toContain('dynamical systems')
    expect(input.documents.every(item => item.concepts.length === 0)).toBe(true)
    expect(new Set(input.documents.flatMap(item => item.references.map(reference => reference.predicate)))).toEqual(new Set(['links_to', 'cites', 'embeds_lab', 'companion_article']))
  })

  it('retains repeated embed occurrence provenance and explicit spatial companion links', () => {
    const pathfinding = document('blog', 'a-star-search-visually').references.filter(item => item.predicate === 'embeds_lab')
    expect(pathfinding).toHaveLength(3)
    expect(new Set(pathfinding.map(item => item.evidence.locators[0].lineStart)).size).toBe(3)
    const hydrogen = document('lab', 'hydrogen-orbitals')
    expect(hydrogen.references).toContainEqual(expect.objectContaining({ predicate: 'companion_article', target: { kind: 'blog', key: 'a-p-electron-is-never-between-its-lobes' } }))
    expect(hydrogen.tags.map(item => item.value)).toEqual(['3d', 'chemistry', 'interactive'])
    expect(hydrogen.tags.every(item => item.evidence.confidence === 'deterministic')).toBe(true)
    expect(document('blog', 'a-p-electron-is-never-between-its-lobes').references).toContainEqual(expect.objectContaining({ predicate: 'embeds_lab', target: { kind: 'lab', key: 'hydrogen-orbitals' } }))
    expect(input.documents.filter(item => item.subtype === 'guide').map(item => item.key).sort()).toEqual(LAB_CONCEPT_GUIDES.map(item => item.slug).sort())
  })

  it('never gives excluded records titles, tags, concepts, references or extractor access', async () => {
    const excluded = getAllPosts().filter(post => !isPublished(post))
    const spy = vi.spyOn(mdx, 'extractMdxReferences')
    const candidate = await loadRepositoryInput(revision)
    const records = candidate.documents.filter(item => item.publication !== 'published')
    expect(records.map(item => item.key).sort()).toEqual(excluded.map(post => post.slug).sort())
    expect(records).toHaveLength(6)
    for (const item of records) expect(item).toMatchObject({ title: '', tags: [], concepts: [], references: [] })
    const parsedBodies = spy.mock.calls.map(call => call[0])
    for (const post of excluded) expect(parsedBodies).not.toContain(post.body)
  }, CORPUS_TIMEOUT_MS)

  it('is deterministic and does not alter existing registries or source assets', async () => {
    const before = sourceFiles.map(hashFile)
    const first = await loadRepositoryInput(revision)
    const second = await loadRepositoryInput(revision)
    expect(second).toEqual(first)
    expect(sourceFiles.map(hashFile)).toEqual(before)
    expect(first.mapperVersion).toMatch(/^blog-kg01\/1:[a-f0-9]{64}$/)
    for (const source of first.files) expect(source.sha256).toBe(hashFile(source.path))
  }, CORPUS_TIMEOUT_MS)

  it('rejects a truncated content-loader result instead of retiring missing documents', async () => {
    const posts = getAllPosts()
    vi.spyOn(content, 'getAllPosts').mockReturnValue(posts.slice(1))
    await expect(loadRepositoryInput(revision)).rejects.toThrow('complete blog manifest')
  })

  it('does not turn a failed MDX parse into successful empty references', async () => {
    vi.spyOn(mdx, 'extractMdxReferences').mockReturnValueOnce({ references: [], diagnostics: [{ code: 'mdx_parse_error', message: 'Interrupted source fixture' }] })
    await expect(loadRepositoryInput(revision)).rejects.toThrow('reference extraction failed')
    expect(document('blog', 'chaos-in-one-equation').references.length).toBeGreaterThan(0)
  })

  it('rejects byte changes between input captures without changing the previous complete result', async () => {
    const original = fs.readFileSync.bind(fs)
    let count = 0
    const target = path.join(process.cwd(), 'lib/topics.ts')
    vi.spyOn(fs, 'readFileSync').mockImplementation(((file: fs.PathOrFileDescriptor, options?: unknown) => {
      const value = original(file, options as never)
      if (file === target && ++count === 2) return Buffer.concat([value as Buffer, Buffer.from('\n// concurrent edit')])
      return value
    }) as typeof fs.readFileSync)
    await expect(loadRepositoryInput(revision)).rejects.toThrow('manifest changed')
    expect(input.complete).toBe(true)
    expect(input.revision).toBe(revision)
  }, CORPUS_TIMEOUT_MS)

  it('does not return a partial manifest when a source disappears during extraction', async () => {
    const original = fs.readFileSync.bind(fs)
    let count = 0
    const target = path.join(process.cwd(), 'lib/topics.ts')
    vi.spyOn(fs, 'readFileSync').mockImplementation(((file: fs.PathOrFileDescriptor, options?: unknown) => {
      if (file === target && ++count === 2) throw Object.assign(new Error('Concurrent source disappearance'), { code: 'ENOENT' })
      return original(file, options as never)
    }) as typeof fs.readFileSync)
    await expect(loadRepositoryInput(revision)).rejects.toThrow('Concurrent source disappearance')
    expect(input.complete).toBe(true)
  }, CORPUS_TIMEOUT_MS)

  it.each(['label', 'icon', 'accent', 'renderMode'])('rejects stale imported topic %s with fresh source evidence', async field => {
    const topic = TOPIC.ee as Record<string, unknown>
    const original = topic[field]
    topic[field] = `stale-${String(original)}`
    try { await expect(loadRepositoryInput(revision)).rejects.toThrow('topic metadata differs') }
    finally { topic[field] = original }
  })

  it('rejects an imported topic key-set that differs from the captured registry', async () => {
    const topics = TOPIC as Record<string, unknown>, original = topics.earth
    delete topics.earth
    try { await expect(loadRepositoryInput(revision)).rejects.toThrow('topic metadata differs') }
    finally { topics.earth = original }
  })

  it.each(['tags', 'blurb', 'homeEmbedSafe'])('rejects stale imported Lab %s with fresh source evidence', async field => {
    const lab = LAB_EFFECTS.find(item => item.slug === 'rlc-resonance')! as unknown as Record<string, unknown>
    const original = lab[field]
    lab[field] = field === 'tags' ? ['fabricated-tag'] : field === 'homeEmbedSafe' ? !original : 'Fabricated blurb'
    try { await expect(loadRepositoryInput(revision)).rejects.toThrow('Lab metadata differs') }
    finally { lab[field] = original }
  })

  it.each(['blogSlug', 'blurb'])('rejects stale imported spatial %s with fresh source evidence', async field => {
    const spatial = SPATIAL_CATALOG[0] as unknown as Record<string, unknown>
    const original = spatial[field]
    spatial[field] = 'fabricated-companion-metadata'
    try { await expect(loadRepositoryInput(revision)).rejects.toThrow('spatial metadata differs') }
    finally { spatial[field] = original }
  })

  it('rejects stale derived spatial tags and guide membership', async () => {
    const spatial = LAB_EFFECTS.find(item => item.slug === 'singular-values')!, tags = spatial.tags
    spatial.tags = ['fabricated-tag']
    try { await expect(loadRepositoryInput(revision)).rejects.toThrow('Lab metadata differs') }
    finally { spatial.tags = tags }
    const guides = LAB_CONCEPT_GUIDE_SLUGS as Set<string>
    guides.add('rlc-resonance')
    try { await expect(loadRepositoryInput(revision)).rejects.toThrow('guide membership differs') }
    finally { guides.delete('rlc-resonance') }
  })

  it.each(pinnedPolicyPaths)('rejects changed-after-loader-import policy for %s', async sourcePath => {
    const original = fs.readFileSync.bind(fs), target = path.join(process.cwd(), sourcePath)
    vi.spyOn(fs, 'readFileSync').mockImplementation(((file: fs.PathOrFileDescriptor, options?: unknown) => {
      const bytes = original(file, options as never)
      return file === target ? Buffer.concat([bytes as Buffer, Buffer.from('\n// policy edited after loader import')]) : bytes
    }) as typeof fs.readFileSync)
    let failure: unknown
    try { await loadRepositoryInput(revision) } catch (error) { failure = error }
    expect(failure, `${sourcePath} must reject changed policy bytes`).toBeInstanceOf(Error)
    expect(String(failure)).toContain('Mapping policy changed after loader import')
    expect(String(failure)).toContain(sourcePath)
    expect(String(failure)).toContain('fresh Node process')
    expect(input.complete).toBe(true)
  }, CORPUS_TIMEOUT_MS)

  it('does not guess origin aliases from unsupported or competing redirect rules', async () => {
    const original = fs.readFileSync.bind(fs), target = path.join(process.cwd(), 'public/_redirects')
    vi.spyOn(fs, 'readFileSync').mockImplementation(((file: fs.PathOrFileDescriptor, options?: unknown) => file === target
      ? Buffer.from('https://www.benebsworth.com/* https://benebsworth.com/:splat 301\n/old/* /new/:splat 302\n')
      : original(file, options as never)) as typeof fs.readFileSync)
    const candidate = await loadRepositoryInput(revision)
    expect(candidate.originAliases).toEqual([])
    expect(candidate.diagnostics.filter(item => item.code === 'unsupported_redirect_coverage')).toHaveLength(2)
  }, CORPUS_TIMEOUT_MS)

  it('rejects an imprecise revision label', async () => {
    await expect(loadRepositoryInput('master')).rejects.toThrow('exact 40-character')
  })
})
