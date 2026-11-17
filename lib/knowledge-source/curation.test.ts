import fs from 'node:fs'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { loadRepositoryInput } from './repository'
import { CURATED_TERMS, withCuratedTerms } from './curation'
import { buildKnowledgeSnapshot } from './build'
import type { SourceInput } from './schema'

const REVISION = '1121edc4ae6ac8de415b5395d8fadc11450fc55f'
let corpus: SourceInput
// These tests exercise curation against one real, complete corpus; extraction
// itself has separate adversarial coverage in repository.test.ts.
beforeAll(async () => { corpus = await loadRepositoryInput(REVISION) }, 30_000)
afterEach(() => vi.restoreAllMocks())
describe('bounded source-scoped term curation', () => {
  it('maps seven exact authored occurrences without changing loader input or creating equivalence', () => {
    const input = structuredClone(corpus)
    const before = JSON.stringify(input)
    const mapped = withCuratedTerms(input)
    const { snapshot } = buildKnowledgeSnapshot(mapped)
    expect(JSON.stringify(input)).toBe(before)
    const concepts = snapshot.nodes.filter(node => node.kind === 'concept')
    expect(concepts).toHaveLength(CURATED_TERMS.length)
    expect(concepts.every(node => node.ownerId?.startsWith('blog:'))).toBe(true)
    expect(snapshot.edges.filter(edge => edge.predicate === 'mentions_concept')).toHaveLength(7)
    expect(concepts.every(node => node.evidence[0].confidence === 'editorial')).toBe(true)
    expect(snapshot.edges.some(edge => /prerequisite|equivalen|supports/.test(edge.predicate))).toBe(false)
    for (const concept of concepts) {
      const locator = concept.evidence[0].locators[0]
      const line = fs.readFileSync(locator.path, 'utf8').split('\n')[(locator.lineStart ?? 0) - 1]
      expect(line).toContain(locator.rawValue)
    }
  })
  it('drops the concepts when their source becomes unpublished', () => {
    const input = structuredClone(corpus)
    input.documents.find(doc => doc.key === 'every-wire-is-an-rlc-circuit')!.publication = 'draft'
    const snapshot = buildKnowledgeSnapshot(withCuratedTerms(input)).snapshot
    expect(snapshot.nodes.some(node => node.ownerId === 'blog:every-wire-is-an-rlc-circuit')).toBe(false)
  })
  it('rejects changed source bytes instead of attaching a stale concept quote', () => {
    const input = structuredClone(corpus)
    const read = fs.readFileSync.bind(fs)
    vi.spyOn(fs, 'readFileSync').mockImplementation(((file: fs.PathOrFileDescriptor, options?: unknown) => {
      const result = read(file, options as never)
      if (String(file) === 'content/blog/every-wire-is-an-rlc-circuit/index.mdx') return `${result}\nchanged`
      return result
    }) as typeof fs.readFileSync)
    expect(() => withCuratedTerms(input)).toThrow(/Curation source changed/)
  })
  it('rejects a policy edited after module import rather than borrowing its new hash', () => {
    const input = structuredClone(corpus)
    const read = fs.readFileSync.bind(fs)
    vi.spyOn(fs, 'readFileSync').mockImplementation(((file: fs.PathOrFileDescriptor, options?: unknown) => {
      const result = read(file, options as never)
      if (String(file) === 'lib/knowledge-source/curation.ts') return `${result}\n// changed policy`
      return result
    }) as typeof fs.readFileSync)
    expect(() => withCuratedTerms(input)).toThrow(/Curation policy changed after import/)
  })
})
