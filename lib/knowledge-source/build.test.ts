import { describe, expect, it } from 'vitest'
import { buildKnowledgeSnapshot, snapshotFreshness, sourceUrl } from './build'
import { canonical, categoryId, conceptId, sha256, tagId } from './identity'
import { MAPPER_VERSION, type CategorySource, type ContentKind, type ContentSource, type Evidence, type ReferenceSource, type SourceFile, type SourceInput } from './schema'

// Deliberately synthetic adapter fixtures. They do not assert that study packets
// or a global glossary exist in the published blog repository.
const REVISION = 'a'.repeat(40)
const registry: SourceFile = { path: 'fixtures/catalogue.ts', sha256: sha256('fixture registry') }
const aliasFile: SourceFile = { path: 'fixtures/reviewed-aliases.json', sha256: sha256('fixture aliases') }

function proof(file: SourceFile, rawValue: string, basis: Evidence['basis'] = 'authored-metadata', line = 1): Evidence {
  return { basis, confidence: basis === 'curated-term' || basis === 'reviewed-id-alias' ? 'editorial' : 'explicit',
    locators: [{ ...file, selector: 'fixture-field', rawValue, lineStart: line, lineEnd: line }] }
}
function category(namespace: CategorySource['namespace'] = 'blog-topic', key = 'physics'): CategorySource {
  return { namespace, key, label: `${namespace} ${key}`, evidence: proof(registry, key, 'registry') }
}
function document(key: string, kind: ContentKind = 'blog'): ContentSource {
  const file = { path: `fixtures/${kind}/${key}.mdx`, sha256: sha256(`fixture ${kind}/${key}`) }
  return {
    kind, key, title: `Fixture ${kind} ${key}`, href: `/${kind}/${encodeURIComponent(key)}/`,
    subtype: kind === 'blog' ? 'article' : kind === 'lab' ? 'simulation' : 'packet',
    publication: 'published', evidence: proof(file, key), dependencies: [file, registry],
    tags: [{ value: 'shared label', evidence: proof(file, 'shared label') }],
    category: { namespace: 'blog-topic', key: 'physics', evidence: proof(registry, 'physics', 'registry') },
    concepts: [], references: [],
  }
}
function link(doc: ContentSource, href: string, predicate: ReferenceSource['predicate'] = 'links_to', line = 10): ReferenceSource {
  return { predicate, target: { href }, label: 'A referenced source', evidence: proof(doc.dependencies[0], href, 'authored-link', line) }
}
function input(documents: ContentSource[] = [document('one'), document('two')], categories = [category()]): SourceInput {
  const all = [registry, aliasFile, ...documents.flatMap(doc => doc.dependencies)]
  return {
    repository: 'castlemilk/benebsworth.com', revision: REVISION, mapperVersion: MAPPER_VERSION,
    complete: true, files: [...new Map(all.map(file => [file.path, file])).values()],
    categories, documents, aliases: [], diagnostics: [],
    coverage: { blog: 'complete', lab: 'registry-only', study: 'unavailable', concepts: 'curated-source-scoped', citations: 'supported-mdx-syntax' },
  }
}
function alias(from: string, to: string) {
  return { from, to, evidence: proof(aliasFile, `${from} -> ${to}`, 'reviewed-id-alias') }
}
function withConcept(doc: ContentSource, key = 'state') {
  doc.concepts.push({ key, label: key, evidence: proof(doc.dependencies[0], key, 'curated-term', 20) })
  return doc
}
function replaceFileHash(value: unknown, path: string, hash: string): void {
  if (!value || typeof value !== 'object') return
  const object = value as Record<string, unknown>
  if (object.path === path && typeof object.sha256 === 'string') object.sha256 = hash
  Object.values(object).forEach(child => replaceFileHash(child, path, hash))
}

describe('source graph identity and deterministic assertions', () => {
  it('is byte-equivalent after independent input and occurrence permutations', () => {
    const one = withConcept(document('one'))
    const two = withConcept(document('two'))
    one.tags.push({ value: ' SHARED  LABEL ', evidence: proof(one.dependencies[0], ' SHARED  LABEL ', 'authored-metadata', 2) })
    one.references.push(link(one, 'https://EXAMPLE.org/paper?a=1#part', 'cites', 11), link(one, '/blog/two/?view=full#reading', 'links_to', 12))
    two.references.push({ ...link(two, 'https://example.org/paper?a=1#part', 'cites'), label: 'Another authored citation title' })
    const source = input([one, two], [category(), category('lab-category', 'physics')])
    const reordered = structuredClone(source)
    reordered.documents.reverse()
    reordered.files.reverse()
    reordered.categories.reverse()
    for (const doc of reordered.documents) {
      doc.tags.reverse(); doc.references.reverse(); doc.dependencies.reverse()
      doc.evidence.locators.reverse()
    }
    expect(canonical(buildKnowledgeSnapshot(reordered).snapshot)).toBe(canonical(buildKnowledgeSnapshot(source).snapshot))
  })

  it('keeps IDs stable through title edits and records the changed display metadata', () => {
    const source = input()
    const before = buildKnowledgeSnapshot(source).snapshot
    source.documents[0].title = 'Edited display title, unchanged identity'
    const after = buildKnowledgeSnapshot(source).snapshot
    expect(after.nodes.map(n => n.id)).toEqual(before.nodes.map(n => n.id))
    expect(after.edges.map(e => e.id)).toEqual(before.edges.map(e => e.id))
    expect(after.nodes.find(n => n.id === 'blog:one')?.label).toBe(source.documents[0].title)
    expect(after.digest).not.toBe(before.digest)
  })

  it('preserves punctuation and hyphenation while merging only the documented lexical normalization', () => {
    const doc = document('terms')
    const terms = ['C', 'C++', 'C#', 'machine-learning', 'machine learning', 'é', 'e\u0301', ' FIELD\tSTATE ', 'field state']
    doc.tags = terms.map(value => ({ value, evidence: proof(doc.dependencies[0], value) }))
    const snapshot = buildKnowledgeSnapshot(input([doc])).snapshot
    const tags = snapshot.nodes.filter(n => n.kind === 'tag')
    expect(tags).toHaveLength(7)
    expect(new Set(tags.map(n => n.id)).size).toBe(7)
    expect(tags.find(n => n.id === tagId('é'))?.labels).toEqual(['e\u0301', 'é'])
    expect(tags.find(n => n.id === tagId('field state'))?.labels).toEqual([' FIELD\tSTATE ', 'field state'])
    expect(tagId('C')).not.toBe(tagId('C++'))
    expect(tagId('machine-learning')).not.toBe(tagId('machine learning'))
  })

  it('does not inflate degree for duplicate tag occurrences', () => {
    const doc = document('one')
    doc.tags.push(structuredClone(doc.tags[0]), { value: 'Shared Label', evidence: proof(doc.dependencies[0], 'Shared Label', 'authored-metadata', 2) })
    const snapshot = buildKnowledgeSnapshot(input([doc])).snapshot
    expect(snapshot.edges.filter(e => e.predicate === 'tagged_with')).toHaveLength(1)
    expect(snapshot.nodes.find(n => n.kind === 'tag')?.evidence).toHaveLength(2)
  })

  it('keeps identically named concepts scoped to their source and distinct from tags', () => {
    const one = withConcept(document('one'), 'entropy')
    const two = withConcept(document('two'), 'entropy')
    one.tags.push({ value: 'entropy', evidence: proof(one.dependencies[0], 'entropy') })
    const snapshot = buildKnowledgeSnapshot(input([one, two])).snapshot
    expect(snapshot.nodes.filter(n => n.kind === 'concept').map(n => n.id)).toEqual([
      conceptId('blog', 'one', 'entropy'), conceptId('blog', 'two', 'entropy'),
    ])
    expect(snapshot.nodes.find(n => n.id === tagId('entropy'))?.kind).toBe('tag')
    expect(snapshot.edges.some(e => e.source === 'blog:one' && e.target === 'blog:two')).toBe(false)
    expect(snapshot.edges.some(e => /requires|prerequisite|equivalent|supports|proves/.test(e.predicate))).toBe(false)
  })

  it('retains independent blog and Lab taxonomies despite matching labels', () => {
    const post = document('one')
    const lab = document('two', 'lab')
    lab.category = { namespace: 'lab-category', key: 'physics', evidence: proof(registry, 'physics', 'registry') }
    const categories = [category(), { ...category('lab-category'), label: 'blog-topic physics' }]
    const snapshot = buildKnowledgeSnapshot(input([post, lab], categories)).snapshot
    expect(snapshot.nodes.filter(n => n.kind === 'category')).toHaveLength(2)
    expect(snapshot.edges.filter(e => e.predicate === 'classified_as').map(e => e.target).sort()).toEqual([
      categoryId('blog-topic', 'physics'), categoryId('lab-category', 'physics'),
    ])
  })

  it('accepts a clearly synthetic study packet through the same explicit owner contract', () => {
    const packet = withConcept(document('synthetic-packet', 'study'), 'local-term')
    const source = input([packet])
    source.coverage.study = 'complete'
    const snapshot = buildKnowledgeSnapshot(source).snapshot
    expect(snapshot.nodes.find(n => n.id === 'study:synthetic-packet')).toMatchObject({ kind: 'study', subtype: 'packet', navigation: { href: '/study/synthetic-packet/', live: 'unverified' } })
    expect(snapshot.nodes.find(n => n.kind === 'concept')?.ownerId).toBe('study:synthetic-packet')
  })
})

describe('fail-closed structural and provenance validation', () => {
  it('rejects duplicate content identities even if their titles differ', () => {
    const duplicate = { ...document('one'), title: 'Another title' }
    expect(() => buildKnowledgeSnapshot(input([document('one'), duplicate]))).toThrow(/duplicate content identity/)
  })

  it('rejects NFC key collisions instead of silently choosing one spelling', () => {
    expect(() => buildKnowledgeSnapshot(input([document('é'), document('e\u0301')]))).toThrow(/duplicate content identity/)
  })

  it('rejects duplicate categories and duplicate concept keys, including identical records', () => {
    expect(() => buildKnowledgeSnapshot(input([document('one')], [category(), category()]))).toThrow(/duplicate graph identity/)
    const doc = withConcept(document('one'))
    doc.concepts.push(structuredClone(doc.concepts[0]))
    expect(() => buildKnowledgeSnapshot(input([doc]))).toThrow(/duplicate.*concept/)
  })

  it('rejects route collisions after optional trailing-slash normalization', () => {
    const one = document('one'); const two = document('two')
    one.href = '/article'; two.href = '/article/'
    expect(() => buildKnowledgeSnapshot(input([one, two]))).toThrow(/colliding canonical route/)
  })

  it.each(['https://benebsworth.com/blog/one/', '//evil.example/blog/one/', '/blog/one/?q=x', '/blog/one/#part', '/blog/../one/'])('rejects noncanonical content href %s', href => {
    const doc = document('one'); doc.href = href
    expect(() => buildKnowledgeSnapshot(input([doc]))).toThrow(/canonical route/)
  })

  it('rejects invented prerequisite/equivalence semantics even if a caller casts JSON to the interface', () => {
    const doc = document('one')
    doc.references = [{ ...link(doc, '/blog/two/'), predicate: 'equivalent_to' as ReferenceSource['predicate'] }]
    expect(() => buildKnowledgeSnapshot(input([doc, document('two')]))).toThrow(/unsupported relationship/)
  })

  it('requires every published assertion locator and dependency hash to match the manifest', () => {
    const badLocator = input()
    badLocator.documents[0].tags[0].evidence.locators[0].sha256 = 'f'.repeat(64)
    expect(() => buildKnowledgeSnapshot(badLocator)).toThrow(/stale source locator/)
    const badDependency = input()
    badDependency.documents[0].dependencies.push({ path: 'fixtures/unrecorded.ts', sha256: sha256('missing') })
    expect(() => buildKnowledgeSnapshot(badDependency)).toThrow(/stale dependency/)
    const missingLocator = input()
    missingLocator.documents[0].evidence.locators = []
    expect(() => buildKnowledgeSnapshot(missingLocator)).toThrow(/no source locator/)
  })

  it.each([{ lineStart: 0, lineEnd: 1 }, { lineStart: 2, lineEnd: 1 }, { lineStart: 1, lineEnd: undefined }, { lineStart: undefined, lineEnd: 1 }])('rejects malformed inclusive source line range %j', lines => {
    const source = input()
    Object.assign(source.documents[0].evidence.locators[0], lines)
    expect(() => buildKnowledgeSnapshot(source)).toThrow(/source line|line end/)
  })

  it('rejects unknown category references, invalid source paths and duplicate manifest paths', () => {
    const unknown = input(); unknown.documents[0].category!.key = 'unknown'
    expect(() => buildKnowledgeSnapshot(unknown)).toThrow(/dangling graph edge/)
    const traversal = input(); traversal.files.push({ path: '../private', sha256: sha256('private') })
    expect(() => buildKnowledgeSnapshot(traversal)).toThrow(/invalid source-file/)
    const duplicate = input(); duplicate.files.push({ ...duplicate.files[0] })
    expect(() => buildKnowledgeSnapshot(duplicate)).toThrow(/duplicate source-file/)
  })
})

describe('publication boundaries and reference availability', () => {
  it.each(['draft', 'unreleased'] as const)('excludes all private contributions for %s content', publication => {
    const published = document('public')
    const privateDoc = withConcept(document('private-dossier'), 'private-concept')
    privateDoc.publication = publication
    privateDoc.title = 'SECRET TITLE'
    privateDoc.tags = [{ value: 'SECRET TAG', evidence: proof(privateDoc.dependencies[0], 'SECRET TAG') }]
    privateDoc.references = [link(privateDoc, 'https://private-reference.example/secret', 'cites')]
    const serialized = canonical(buildKnowledgeSnapshot(input([published, privateDoc])).snapshot)
    expect(serialized).not.toMatch(/private-dossier|private-concept|SECRET TITLE|SECRET TAG|private-reference/)
  })

  it('retains a published link to excluded content without exposing the excluded metadata or adding an edge', () => {
    const published = document('public'); const privateDoc = document('private')
    privateDoc.publication = 'draft'; privateDoc.title = 'SECRET TITLE'
    published.references.push(link(published, '/blog/private/?mode=reading#section'))
    const snapshot = buildKnowledgeSnapshot(input([published, privateDoc])).snapshot
    expect(snapshot.references[0]).toMatchObject({ status: 'excluded', targetId: null, href: '/blog/private/?mode=reading#section', navigationHref: null })
    expect(snapshot.edges.some(e => e.target === 'blog:private')).toBe(false)
    expect(canonical(snapshot)).not.toContain('SECRET TITLE')
    expect(snapshot.sources.some(s => s.path === privateDoc.dependencies[0].path)).toBe(false)
  })

  it('rejects diagnostics attached to an excluded node or to a private-only source locator', () => {
    const privateDoc = document('private'); privateDoc.publication = 'draft'
    const source = input([document('public'), privateDoc])
    source.diagnostics.push({ code: 'private-note', severity: 'warning', message: 'SECRET', nodeId: 'blog:private' })
    expect(() => buildKnowledgeSnapshot(source)).toThrow(/diagnostics.*unpublished|diagnostic.*public/)
    delete source.diagnostics[0].nodeId
    source.diagnostics[0].locator = privateDoc.evidence.locators[0]
    expect(() => buildKnowledgeSnapshot(source)).toThrow(/diagnostic.*public|unpublished/)
  })

  it('preserves internal query and fragment while making no anchor/build/live claim', () => {
    const one = document('one'); const two = document('two')
    one.references.push(link(one, '../two/?q=a#part'))
    const snapshot = buildKnowledgeSnapshot(input([one, two])).snapshot
    expect(snapshot.references[0]).toMatchObject({ href: '../two/?q=a#part', navigationHref: '/blog/two/?q=a#part', targetId: 'blog:two', status: 'resolved', anchor: 'unverified' })
    expect(snapshot.nodes.find(n => n.id === 'blog:two')?.navigation).toEqual({ href: '/blog/two/', action: 'open', availability: 'source-resolved', build: 'unverified', live: 'unverified' })
  })

  it('resolves a fragment-only link against its source article rather than the eventual graph UI route', () => {
    const one = document('one')
    one.references.push(link(one, '#part'))
    const snapshot = buildKnowledgeSnapshot(input([one])).snapshot
    expect(snapshot.references[0]).toMatchObject({ href: '#part', navigationHref: '/blog/one/#part', targetId: 'blog:one', status: 'resolved', anchor: 'unverified' })
    expect(snapshot.nodes.find(node => node.id === 'blog:one')?.navigation.href).toBe('/blog/one/')
  })

  it('distinguishes missing content from routes outside declared coverage', () => {
    const doc = document('one')
    doc.references.push(link(doc, '/blog/absent/'), link(doc, '/lab/unregistered/'), link(doc, '/about/'), link(doc, '/study/unknown/'))
    const snapshot = buildKnowledgeSnapshot(input([doc])).snapshot
    const status = new Map(snapshot.references.map(r => [r.href, r.status]))
    expect(status.get('/blog/absent/')).toBe('missing')
    expect(status.get('/lab/unregistered/')).toBe('outside-coverage')
    expect(status.get('/about/')).toBe('outside-coverage')
    expect(status.get('/study/unknown/')).toBe('outside-coverage')
    expect(snapshot.references.every(reference => reference.navigationHref === null)).toBe(true)
    expect(snapshot.edges.every(edge => !/absent|unregistered|unknown/.test(edge.target))).toBe(true)
  })

  it.each(['javascript:alert(1)', 'data:text/html,hello', 'file:///etc/passwd', 'https://user:secret@example.org/a', 'https://example.org/a b'])('never turns unsafe destination %s into a navigable edge', href => {
    const doc = document('one'); doc.references.push(link(doc, href))
    const snapshot = buildKnowledgeSnapshot(input([doc])).snapshot
    expect(snapshot.references[0]).toMatchObject({ status: 'invalid', targetId: null, navigationHref: null })
    expect(snapshot.nodes.some(n => n.kind === 'citation')).toBe(false)
    expect(snapshot.edges.some(e => e.predicate === 'links_to')).toBe(false)
  })

  it('keeps a generic outbound link distinct from a listed citation to the same URL', () => {
    const doc = document('one')
    doc.references.push(link(doc, 'https://example.org/paper', 'links_to', 10), link(doc, 'https://example.org/paper', 'cites', 20))
    const snapshot = buildKnowledgeSnapshot(input([doc])).snapshot
    const citations = snapshot.nodes.filter(n => n.kind === 'citation')
    expect(citations).toHaveLength(1)
    expect(citations[0].navigation).toMatchObject({ availability: 'external-unchecked', build: 'unverified', live: 'unverified' })
    expect(snapshot.edges.filter(e => e.target === citations[0].id).map(e => e.predicate).sort()).toEqual(['cites', 'links_to'])
  })

  it('retains separate reference occurrences while merging their relationship and provenance', () => {
    const post = document('one'); const lab = document('rlc', 'lab')
    post.references = [10, 20, 30].map(line => ({ predicate: 'embeds_lab', target: { kind: 'lab', key: 'rlc' }, label: 'RLC', evidence: proof(post.dependencies[0], 'rlc', 'literal-embed', line) }))
    const snapshot = buildKnowledgeSnapshot(input([post, lab])).snapshot
    expect(snapshot.references).toHaveLength(3)
    const edges = snapshot.edges.filter(e => e.predicate === 'embeds_lab')
    expect(edges).toHaveLength(1)
    expect(edges[0].evidence).toHaveLength(3)
    expect(new Set(snapshot.references.map(r => r.id)).size).toBe(3)
  })

  it('rejects a non-lab embed and non-blog companion target', () => {
    const one = document('one'); const two = document('two')
    one.references.push({ ...link(one, '/blog/two/'), predicate: 'embeds_lab' })
    expect(() => buildKnowledgeSnapshot(input([one, two]))).toThrow(/invalid embeds_lab target/)
    one.references = [{ ...link(one, 'https://example.org'), predicate: 'companion_article' }]
    expect(() => buildKnowledgeSnapshot(input([one, two]))).toThrow(/invalid companion_article target/)
  })
})

describe('reviewed identity redirects', () => {
  it('accepts a documented same-kind ID redirect and resolves typed source references through it', () => {
    const one = document('one'); const two = document('two')
    one.references.push({ predicate: 'links_to', target: { kind: 'blog', key: 'old-two' }, label: 'Old identity', evidence: proof(one.dependencies[0], 'old-two', 'authored-link') })
    const source = input([one, two]); source.aliases.push(alias('blog:old-two', 'blog:two'))
    const snapshot = buildKnowledgeSnapshot(source).snapshot
    expect(snapshot.references[0]).toMatchObject({ status: 'resolved', targetId: 'blog:two', href: '/blog/two/', navigationHref: '/blog/two/', resolvedViaAlias: { from: 'blog:old-two', to: 'blog:two', evidence: { basis: 'reviewed-id-alias' } } })
    expect(snapshot.aliases[0].evidence.basis).toBe('reviewed-id-alias')
    expect(snapshot.edges.find(edge => edge.source === 'blog:one' && edge.target === 'blog:two')?.evidence.map(item => item.basis)).toContain('reviewed-id-alias')
  })

  it('rejects active-identity masking, duplicate aliases, missing targets and cross-kind aliases', () => {
    const cases = [
      [alias('blog:one', 'blog:two')],
      [alias('blog:old', 'blog:one'), alias('blog:old', 'blog:two')],
      [alias('blog:old', 'blog:missing')],
      [alias('lab:old', 'blog:two')],
    ]
    for (const aliases of cases) expect(() => buildKnowledgeSnapshot({ ...input(), aliases })).toThrow(/alias/)
  })

  it('rejects alias chains/cycles and aliases without reviewed evidence', () => {
    expect(() => buildKnowledgeSnapshot({ ...input(), aliases: [alias('blog:old', 'blog:older'), alias('blog:older', 'blog:one')] })).toThrow(/alias/)
    expect(() => buildKnowledgeSnapshot({ ...input(), aliases: [alias('blog:old', 'blog:older'), alias('blog:older', 'blog:old')] })).toThrow(/alias/)
    const unreviewed = alias('blog:old', 'blog:one'); unreviewed.evidence.basis = 'editorial-rule'
    expect(() => buildKnowledgeSnapshot({ ...input(), aliases: [unreviewed] })).toThrow(/reviewed provenance/)
  })

  it('never merges concepts from distinct source scopes or categories from distinct taxonomies', () => {
    const source = input([withConcept(document('one')), withConcept(document('two'))], [category(), category('lab-category')])
    source.aliases = [alias(conceptId('blog', 'other', 'state'), conceptId('blog', 'one', 'state'))]
    expect(() => buildKnowledgeSnapshot(source)).toThrow(/source scopes/)
    source.aliases = [alias(categoryId('study-category', 'physics'), categoryId('blog-topic', 'physics'))]
    expect(() => buildKnowledgeSnapshot(source)).toThrow(/taxonomies/)
  })
})

describe('explicit hosting origin aliases', () => {
  const rule = 'https://www.benebsworth.com/* https://benebsworth.com/:splat 301'
  const hosting: SourceFile = { path: 'fixtures/public/_redirects', sha256: sha256(rule) }
  function withWwwAlias(source: SourceInput) {
    source.files.push(hosting)
    source.originAliases = [{ from: 'https://www.benebsworth.com', to: 'https://benebsworth.com', evidence: {
      ...proof(hosting, rule, 'registry'), rule: 'static-host:origin-preserving-301',
    } }]
    return source
  }

  it('resolves the supplied www origin rule and preserves query/fragment with hosting provenance', () => {
    const one = document('one'); const two = document('two')
    const authored = 'https://www.benebsworth.com/blog/two/?q=a#part'
    one.references.push(link(one, authored))
    const source = withWwwAlias(input([one, two]))
    const snapshot = buildKnowledgeSnapshot(source).snapshot
    expect(snapshot.references[0]).toMatchObject({ href: authored, navigationHref: '/blog/two/?q=a#part', status: 'resolved', targetId: 'blog:two', anchor: 'unverified',
      resolvedViaOriginAlias: { from: 'https://www.benebsworth.com', to: 'https://benebsworth.com', evidence: { rule: 'static-host:origin-preserving-301' } } })
    const edge = snapshot.edges.find(candidate => candidate.source === 'blog:one' && candidate.target === 'blog:two')
    expect(edge?.evidence.some(item => item.rule === 'static-host:origin-preserving-301' && item.locators.some(locator => locator.path === hosting.path && locator.sha256 === hosting.sha256))).toBe(true)
    expect(snapshot.originAliases).toEqual(source.originAliases)
    expect(snapshot.sources).toContainEqual(hosting)
  })

  it('still excludes a draft reached through www and leaves an unrelated origin external', () => {
    const one = document('one'); const draft = document('private')
    draft.publication = 'draft'; draft.title = 'SECRET TITLE'
    const www = 'https://www.benebsworth.com/blog/private/?q=a#part'
    const unrelated = 'https://unrelated.example/blog/private/?q=a#part'
    one.references.push(link(one, www), link(one, unrelated))
    const snapshot = buildKnowledgeSnapshot(withWwwAlias(input([one, draft]))).snapshot
    expect(snapshot.references.find(reference => reference.href === www)).toMatchObject({ status: 'excluded', targetId: null, navigationHref: null })
    const external = snapshot.references.find(reference => reference.href === unrelated)
    expect(external).toMatchObject({ status: 'external-unchecked', navigationHref: unrelated })
    expect(external?.resolvedViaOriginAlias).toBeUndefined()
    expect(snapshot.nodes.filter(node => node.kind === 'citation').map(node => node.key)).toEqual([unrelated])
    expect(canonical(snapshot)).not.toContain('SECRET TITLE')
  })

  it('does not guess a www alias when no hosting rule was supplied', () => {
    const one = document('one'); const two = document('two')
    const href = 'https://www.benebsworth.com/blog/two/'
    one.references.push(link(one, href))
    const snapshot = buildKnowledgeSnapshot(input([one, two])).snapshot
    expect(snapshot.references[0]).toMatchObject({ status: 'external-unchecked', navigationHref: href })
    expect(snapshot.references[0].targetId).not.toBe('blog:two')
    expect(snapshot.references[0].resolvedViaOriginAlias).toBeUndefined()
    expect(snapshot.originAliases).toEqual([])
  })

  it('rejects conflicting origin mappings instead of selecting a rule by input order', () => {
    const source = withWwwAlias(input())
    source.originAliases!.push({ ...source.originAliases![0], to: 'https://unrelated.example' })
    expect(() => buildKnowledgeSnapshot(source)).toThrow(/origin alias|origin-alias/)
    source.originAliases!.reverse()
    expect(() => buildKnowledgeSnapshot(source)).toThrow(/origin alias|origin-alias/)
  })
})

describe('incremental rebuilding and snapshot evidence', () => {
  it('gives identical snapshots for full and incremental edits, removals, re-additions and draft transitions', () => {
    const initial = input()
    initial.documents[1].tags = [{ value: 'only-two', evidence: proof(initial.documents[1].dependencies[0], 'only-two') }]
    initial.documents[0].references.push(link(initial.documents[0], '/blog/two/'))
    let previous = buildKnowledgeSnapshot(initial)
    const revised = structuredClone(initial)
    revised.documents[0].title = 'Edited first article'
    let next = buildKnowledgeSnapshot(revised, previous.cache)
    expect(next.stats).toEqual({ rebuilt: 1, reused: 1, removed: 0 })
    expect(canonical(next.snapshot)).toBe(canonical(buildKnowledgeSnapshot(revised).snapshot))
    previous = next

    const removed = structuredClone(revised)
    removed.documents = removed.documents.filter(d => d.key !== 'two')
    next = buildKnowledgeSnapshot(removed, previous.cache)
    expect(next.stats).toEqual({ rebuilt: 0, reused: 1, removed: 1 })
    expect(next.snapshot.nodes.some(n => n.id === tagId('only-two'))).toBe(false)
    expect(next.snapshot.references[0].status).toBe('missing')
    expect(canonical(next.snapshot)).toBe(canonical(buildKnowledgeSnapshot(removed).snapshot))
    previous = next

    next = buildKnowledgeSnapshot(revised, previous.cache)
    expect(next.stats).toEqual({ rebuilt: 1, reused: 1, removed: 0 })
    expect(canonical(next.snapshot)).toBe(canonical(buildKnowledgeSnapshot(revised).snapshot))
    previous = next

    const draft = structuredClone(revised); draft.documents[1].publication = 'draft'
    next = buildKnowledgeSnapshot(draft, previous.cache)
    expect(next.stats).toEqual({ rebuilt: 0, reused: 1, removed: 1 })
    expect(next.snapshot.references[0].status).toBe('excluded')
    expect(next.snapshot.nodes.some(n => n.id === tagId('only-two'))).toBe(false)
    expect(canonical(next.snapshot)).toBe(canonical(buildKnowledgeSnapshot(draft).snapshot))
  })

  it('invalidates extraction/classification/alias policies and changed dependency hashes', () => {
    const source = input()
    const baseline = buildKnowledgeSnapshot(source)
    const mutations: ((next: SourceInput) => void)[] = [
      next => { next.mapperVersion = 'new-extractor/2' },
      next => { next.categories[0].label = 'Changed category label' },
      next => { next.aliases.push(alias('blog:old-one', 'blog:one')) },
    ]
    for (const mutate of mutations) {
      const next = structuredClone(source); mutate(next)
      const incremental = buildKnowledgeSnapshot(next, baseline.cache)
      expect(incremental.stats).toEqual({ rebuilt: 2, reused: 0, removed: 0 })
      expect(canonical(incremental.snapshot)).toBe(canonical(buildKnowledgeSnapshot(next).snapshot))
    }
    const changedSource = structuredClone(source)
    replaceFileHash(changedSource, changedSource.documents[0].dependencies[0].path, sha256('edited source bytes'))
    const incremental = buildKnowledgeSnapshot(changedSource, baseline.cache)
    expect(incremental.stats).toEqual({ rebuilt: 1, reused: 1, removed: 0 })
    expect(canonical(incremental.snapshot)).toBe(canonical(buildKnowledgeSnapshot(changedSource).snapshot))
  })

  it('treats an unreviewed source-key rename as removal/addition instead of inventing an identity alias', () => {
    const source = input([document('one')])
    const previous = buildKnowledgeSnapshot(source)
    const renamed = input([document('renamed')])
    const incremental = buildKnowledgeSnapshot(renamed, previous.cache)
    expect(incremental.stats).toEqual({ rebuilt: 1, reused: 0, removed: 1 })
    expect(incremental.snapshot.nodes.some(node => node.id === 'blog:one')).toBe(false)
    expect(incremental.snapshot.nodes.some(node => node.id === 'blog:renamed')).toBe(true)
    expect(incremental.snapshot.aliases).toEqual([])
    expect(canonical(incremental.snapshot)).toBe(canonical(buildKnowledgeSnapshot(renamed).snapshot))
  })

  it('updates exact source revision without relabelling old source evidence as a previously checked deployment', () => {
    const source = input(); const before = buildKnowledgeSnapshot(source)
    const current = { ...source, revision: 'b'.repeat(40) }
    const after = buildKnowledgeSnapshot(current, before.cache)
    expect(after.stats).toEqual({ rebuilt: 0, reused: 2, removed: 0 })
    expect(after.snapshot.sourceRevision).toBe(current.revision)
    expect(after.snapshot.digest).not.toBe(before.snapshot.digest)
    expect(after.snapshot.nodes.every(n => n.navigation.build === 'unverified' && n.navigation.live === 'unverified')).toBe(true)
    expect(canonical(after.snapshot)).toBe(canonical(buildKnowledgeSnapshot(current).snapshot))
  })

  it('does not replace the last-good snapshot/cache on an incomplete or failed update', () => {
    const source = input(); const previous = buildKnowledgeSnapshot(source)
    const preserved = canonical(previous.snapshot)
    expect(() => buildKnowledgeSnapshot({ ...source, complete: false, documents: [] }, previous.cache)).toThrow(/incomplete source read/)
    const broken = structuredClone(source); broken.documents[0].evidence.locators[0].sha256 = sha256('not observed')
    expect(() => buildKnowledgeSnapshot(broken, previous.cache)).toThrow(/stale source locator/)
    expect(canonical(previous.snapshot)).toBe(preserved)
    expect(buildKnowledgeSnapshot(source, previous.cache).stats.reused).toBe(2)
  })

  it('rejects serialized cache handles rather than trusting source-shaped cached objects', () => {
    const source = input(); const previous = buildKnowledgeSnapshot(source)
    expect(() => buildKnowledgeSnapshot(source, structuredClone(previous.cache))).toThrow(/unrecognized cache/)
  })

  it('freezes output but neither changes nor freezes caller input and cannot be corrupted by later input edits', () => {
    const source = input()
    source.documents[0].references.push(link(source.documents[0], '/blog/two/'))
    const original = structuredClone(source)
    const { snapshot, cache } = buildKnowledgeSnapshot(source)
    expect(source).toEqual(original)
    expect(Object.isFrozen(snapshot.nodes[0].evidence[0].locators[0])).toBe(true)
    expect(Object.isFrozen(source.coverage)).toBe(false)
    expect(Object.isFrozen(source.documents[0].evidence.locators[0])).toBe(false)
    const frozenBytes = canonical(snapshot)
    source.documents[0].evidence.locators[0].rawValue = 'later source edit'
    source.documents[0].references[0].target = { href: '/blog/one/' }
    source.coverage.lab = 'complete'
    expect(canonical(snapshot)).toBe(frozenBytes)
    const rebuilt = buildKnowledgeSnapshot(source, cache)
    expect(rebuilt.snapshot.references[0].targetId).toBe('blog:one')
  })

  it('distinguishes unavailable evidence, changed files, missing files and stale revision', () => {
    const source = input(); const snapshot = buildKnowledgeSnapshot(source).snapshot
    expect(snapshotFreshness(snapshot, source.revision, source.files).status).toBe('current')
    expect(snapshotFreshness(snapshot, null, null).status).toBe('unavailable')
    expect(snapshotFreshness(snapshot, 'b'.repeat(40), source.files).status).toBe('stale')
    const path = source.documents[0].dependencies[0].path
    const changed = source.files.map(file => file.path === path ? { ...file, sha256: sha256('changed') } : file)
    expect(snapshotFreshness(snapshot, source.revision, changed)).toEqual({ status: 'stale', changed: [path], missing: [] })
    expect(snapshotFreshness(snapshot, source.revision, source.files.filter(file => file.path !== path))).toEqual({ status: 'stale', changed: [], missing: [path] })
    expect(snapshotFreshness(snapshot, source.revision, [...source.files, { path: 'fixtures/new-source.mdx', sha256: sha256('new source') }]).status).toBe('stale')
  })

  it('builds exact-revision source links only for locators contained in the snapshot', () => {
    const source = input(); const snapshot = buildKnowledgeSnapshot(source).snapshot
    const locator = { ...source.documents[0].evidence.locators[0], lineStart: 10, lineEnd: 12 }
    expect(sourceUrl(snapshot, locator)).toBe(`https://github.com/castlemilk/benebsworth.com/blob/${REVISION}/fixtures/blog/one.mdx#L10-L12`)
    expect(() => sourceUrl(snapshot, { ...locator, sha256: sha256('unobserved') })).toThrow(/not in this snapshot/)
  })
})
