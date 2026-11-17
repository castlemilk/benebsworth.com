import { describe, expect, it } from 'vitest'
import { buildKnowledgeSnapshot } from './build'
import { sha256, tagId } from './identity'
import { connectionsFor, RELATION_LABELS, resolveSelection } from './navigation'
import type { ContentSource, Evidence, SourceInput } from './schema'

function fixture() {
  const file = { path: 'fixtures/navigation.json', sha256: sha256('navigation fixture; not live content') }
  const proof: Evidence = { basis: 'authored-metadata', confidence: 'explicit', locators: [{ ...file, selector: 'fixture', rawValue: 'fixture' }] }
  const documents: ContentSource[] = ['one', 'two'].map(key => ({
    kind: 'blog', key, title: `Example ${key}`, href: `/blog/${key}/`, subtype: 'article', publication: 'published',
    evidence: proof, dependencies: [file], tags: [{ value: 'shared', evidence: proof }], concepts: [], references: [],
  }))
  documents[0].references.push({ predicate: 'links_to', target: { kind: 'blog', key: 'two' }, label: 'Explicit reading link', evidence: { ...proof, basis: 'authored-link' } })
  const input: SourceInput = {
    repository: 'castlemilk/benebsworth.com', revision: 'a'.repeat(40), mapperVersion: 'navigation-fixture/1', complete: true,
    files: [file], categories: [], documents,
    aliases: [{ from: 'blog:previous-two', to: 'blog:two', evidence: { ...proof, basis: 'reviewed-id-alias', confidence: 'editorial' } }],
    diagnostics: [], coverage: { blog: 'complete', lab: 'registry-only', study: 'unavailable', concepts: 'curated-source-scoped', citations: 'supported-mdx-syntax' },
  }
  return buildKnowledgeSnapshot(input).snapshot
}

describe('UI navigation handoff', () => {
  it('returns the supplied destination and stable node identity for selection', () => {
    const snapshot = fixture()
    expect(resolveSelection(snapshot, 'blog:one', snapshot.digest)).toMatchObject({ state: 'selected', node: { id: 'blog:one', navigation: { href: '/blog/one/', availability: 'source-resolved', live: 'unverified' } }, snapshotDigest: snapshot.digest })
  })

  it('resolves an explicitly reviewed former identity without guessing a title or URL alias', () => {
    const snapshot = fixture()
    expect(resolveSelection(snapshot, 'blog:previous-two')).toMatchObject({ state: 'redirected', previousId: 'blog:previous-two', node: { id: 'blog:two' } })
    expect(resolveSelection(snapshot, 'Example two')).toEqual({ state: 'removed', previousId: 'Example two', snapshotDigest: snapshot.digest })
  })

  it('reports removed selection and gives stale revision recovery priority over redirection', () => {
    const snapshot = fixture()
    expect(resolveSelection(snapshot, 'blog:missing')).toEqual({ state: 'removed', previousId: 'blog:missing', snapshotDigest: snapshot.digest })
    expect(resolveSelection(snapshot, 'blog:previous-two', 'old-digest')).toEqual({ state: 'stale', previousId: 'blog:previous-two', expectedDigest: 'old-digest', snapshotDigest: snapshot.digest })
  })

  it('makes tag hubs filters without inventing navigable category pages', () => {
    const snapshot = fixture()
    const selected = resolveSelection(snapshot, tagId('shared'))
    expect(selected).toMatchObject({ state: 'selected', node: { kind: 'tag', navigation: { href: null, action: 'filter', availability: 'not-applicable' } } })
  })

  it('returns explicit directed connections without projecting shared tags into content edges', () => {
    const snapshot = fixture()
    const incoming = connectionsFor(snapshot, 'blog:two').find(connection => connection.edge.predicate === 'links_to')
    expect(incoming).toMatchObject({ direction: 'incoming', neighbor: { id: 'blog:one' } })
    const outgoing = connectionsFor(snapshot, 'blog:one').find(connection => connection.edge.predicate === 'links_to')
    expect(outgoing).toMatchObject({ direction: 'outgoing', neighbor: { id: 'blog:two' } })
    const shared = connectionsFor(snapshot, tagId('shared'))
    expect(shared).toHaveLength(2)
    expect(shared.every(connection => connection.direction === 'incoming' && connection.edge.predicate === 'tagged_with')).toBe(true)
    expect(snapshot.edges.filter(edge => edge.source === 'blog:one' && edge.target === 'blog:two')).toHaveLength(1)
    expect(connectionsFor(snapshot, 'missing')).toEqual([])
  })

  it('uses relationship copy that exposes the evidence basis instead of scientific authority', () => {
    expect(RELATION_LABELS.cites).toBe('Listed reference')
    expect(RELATION_LABELS.mentions_concept).toBe('Curated term in this source')
    expect(Object.keys(RELATION_LABELS)).not.toContain('prerequisite')
    expect(Object.keys(RELATION_LABELS)).not.toContain('equivalent_to')
  })
})
