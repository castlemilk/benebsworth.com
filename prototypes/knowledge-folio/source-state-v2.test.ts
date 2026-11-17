import { describe, expect, it } from 'vitest'
import { HOST_KINDS } from '../../lib/knowledge-source/integration/host-seam'
import {
  CANONICAL_PROVIDER, CONSOLE_PROVIDER,
  type SourceViewDataV2, type SourceViewStateV2, type SourceViewTransitionV2,
} from './view-contract-v2'
import {
  buildSourceViewHref, initialSourceViewState, readSourceViewState, safeViewHref, sourceHistoryPlan,
} from './source-state-v2'

/** Empty synthetic owner-shaped input exercises only the view codec, not graph extraction. */
function fixture(): SourceViewDataV2 {
  const revision = 'a'.repeat(40), digest = 'b'.repeat(64), hostDigest = 'c'.repeat(64)
  return {
    contractVersion: 2, currentness: 'current', sourcePublication: 'unknown',
    canonical: {
      schemaVersion: 1, repository: 'castlemilk/benebsworth.com', sourceRevision: revision,
      mapperVersion: 'synthetic-codec-fixture/1', inputManifestDigest: 'd'.repeat(64), digest,
      coverage: { blog: 'complete', lab: 'registry-only', study: 'complete', concepts: 'owner-registry', citations: 'supported-mdx-syntax' },
      sources: [], nodes: [], edges: [], references: [], aliases: [], originAliases: [], diagnostics: [],
    },
    hostGraph: { nodes: [], edges: [] },
    bridge: {
      version: 1, sourceRevision: revision, canonicalSnapshotIdentity: digest,
      host: { provider: CONSOLE_PROVIDER, revision, digest: hostDigest, snapshotIdentity: 'git:' + revision + ':sha256:' + hostDigest, nodes: 0, edgeOccurrences: 0 },
      correspondences: [], edges: [], categories: [], artwork: [], destinations: [], canonicalOnlyIds: [], gaps: [],
    },
    studyCoverage: { curriculumChapters: 0, packetChapters: 0, glossaryOccurrences: 0, studyReferences: 'not-extracted' },
    glossary: [],
  }
}

function transition(state: SourceViewStateV2, history: SourceViewTransitionV2['history']): SourceViewTransitionV2 {
  return { state, history, inspectorId: null, cameraId: null }
}

function encodedOrigin(data: SourceViewDataV2) {
  return new URLSearchParams({
    kgOriginProvider: CONSOLE_PROVIDER, kgOriginSnapshot: data.bridge.host.snapshotIdentity,
    kgOriginId: 'concept:arithmetic-intensity',
  }).toString()
}

describe('source-mode V2 URL and history codec; no browser binding', () => {
  it('starts with qualified canonical context and no invented root, selection or origin', () => {
    const data = fixture(), state = initialSourceViewState(data)
    expect(state).toMatchObject({
      navigation: { provider: CANONICAL_PROVIDER, snapshot: data.canonical.digest, rootId: null, selectedId: null, query: '' },
      candidateOrigin: null, view: 'neighbourhood', scope: 'collection', categoryId: null, page: 1, theme: 'light', inputError: null,
    })
    expect(state.navigation.kinds).toEqual(HOST_KINDS)
    expect(readSourceViewState('/knowledge/', data)).toEqual(state)
  })

  it('round-trips independent opaque root/selection, literal percent IDs and chooser origin', () => {
    const data = fixture(), state = initialSourceViewState(data)
    state.navigation.rootId = 'concept:study:vol1%2F01-introduction:arithmetic%20intensity'
    state.navigation.selectedId = 'tag:dynamical%20systems'
    state.navigation.query = '100% + term / μ?'
    state.navigation.kinds = ['study', 'concept', 'tag']
    state.candidateOrigin = { provider: CONSOLE_PROVIDER, snapshot: data.bridge.host.snapshotIdentity, id: 'concept:arithmetic-intensity' }
    Object.assign(state, { view: 'list', scope: 'neighbours', categoryId: 'category:lab-category:maths', page: 4, theme: 'dark' })
    const href = buildSourceViewHref('/knowledge/?q=global#readout', state)
    expect(href).not.toBeNull()
    expect(href).toContain('kgSelected=tag%3Adynamical%2520systems')
    expect(readSourceViewState(href!, data)).toEqual(state)
    expect(state.navigation.rootId).not.toBe(state.navigation.selectedId)
  })

  it('preserves original absolute authority/path, foreign repeated values and their encoding', () => {
    const data = fixture(), state = initialSourceViewState(data)
    const original = 'HTTPS://Example.test:443/knowledge/%7E/?q=a%20b&q=c+d&opaque=%252F&tilde=~#raw%2f'
    const href = buildSourceViewHref(original, state)!
    expect(href.startsWith('HTTPS://Example.test:443/knowledge/%7E/?q=a%20b&q=c+d&opaque=%252F&tilde=~&')).toBe(true)
    expect(href.endsWith('#raw%2f')).toBe(true)
    const parsed = new URL(href)
    expect(parsed.searchParams.getAll('q')).toEqual(['a b', 'c d'])
    expect(readSourceViewState(href, data)).toEqual(state)
  })

  it('does not migrate legacy fixture/query/kind fields or unqualified IDs', () => {
    const data = fixture()
    const original = '/knowledge/?kgRoot=concept%3Alogistic-map%3Aproposal&kgSelected=blog%3Aone&kgQ=old%20term&kgKind=lab&kgFixture=source'
    const state = readSourceViewState(original, data)
    expect(state.inputError).toBeNull()
    expect(state.navigation).toMatchObject({
      provider: '', snapshot: '', rootId: 'concept:logistic-map:proposal', selectedId: 'blog:one', query: '',
    })
    expect(state.navigation.kinds).toEqual(HOST_KINDS)
    const href = buildSourceViewHref(original, state)!
    expect(href).toContain('kgQ=old%20term&kgKind=lab&kgFixture=source')
    expect(readSourceViewState(href, data).navigation.provider).toBe('')
    expect(readSourceViewState(href, data).navigation.snapshot).toBe('')
  })

  it('distinguishes absent kinds from deliberately empty kinds', () => {
    const data = fixture()
    expect(readSourceViewState('/knowledge/', data).navigation.kinds).toEqual(HOST_KINDS)
    const empty = readSourceViewState('/knowledge/?kgKinds=', data)
    expect(empty.inputError).toBeNull()
    expect(empty.navigation.kinds).toEqual([])
    expect(readSourceViewState(buildSourceViewHref('/knowledge/', empty)!, data).navigation.kinds).toEqual([])
  })

  it('retains wrong/stale provider tokens and origin for later guarded recovery', () => {
    const data = fixture()
    const state = readSourceViewState('/knowledge/?kgProvider=other-provider&kgSnapshot=old-canonical&kgRoot=unknown-root&kgSelected=unknown-selected&kgOriginProvider=old-host&kgOriginSnapshot=old-host-snapshot&kgOriginId=unknown-hub', data)
    expect(state.inputError).toBeNull()
    expect(state.navigation).toMatchObject({ provider: 'other-provider', snapshot: 'old-canonical', rootId: 'unknown-root', selectedId: 'unknown-selected' })
    expect(state.candidateOrigin).toEqual({ provider: 'old-host', snapshot: 'old-host-snapshot', id: 'unknown-hub' })
    expect(readSourceViewState(buildSourceViewHref('/knowledge/', state)!, data)).toEqual(state)
  })

  it.each([
    ['kgOriginProvider=benebsworth-console', { provider: CONSOLE_PROVIDER, snapshot: '', id: '' }],
    ['kgOriginSnapshot=old', { provider: '', snapshot: 'old', id: '' }],
    ['kgOriginId=tag%3Ashared', { provider: '', snapshot: '', id: 'tag:shared' }],
  ])('keeps an incomplete origin non-null and fail-closed: %s', (query, origin) => {
    const state = readSourceViewState('/knowledge/?' + query, fixture())
    expect(state.candidateOrigin).toEqual(origin)
    expect(state.inputError).toContain('Incomplete candidate origin')
    expect(buildSourceViewHref('/knowledge/', state)).toBeNull()
  })

  it('keeps explicitly empty and duplicate origin requests unavailable rather than direct mode', () => {
    const data = fixture()
    const empty = readSourceViewState('/knowledge/?kgOriginProvider=&kgOriginSnapshot=&kgOriginId=', data)
    expect(empty.candidateOrigin).toEqual({ provider: '', snapshot: '', id: '' })
    expect(empty.inputError).toContain('kgOriginProvider')
    const duplicate = readSourceViewState('/knowledge/?' + encodedOrigin(data) + '&kgOriginId=second-hub', data)
    expect(duplicate.candidateOrigin?.id).toBe('concept:arithmetic-intensity')
    expect(duplicate.inputError).toContain('Duplicate owned parameter: kgOriginId')
    expect(buildSourceViewHref('/knowledge/', duplicate)).toBeNull()
  })

  it('reports duplicate owned keys while retaining first requested root/selection fields', () => {
    const state = readSourceViewState('/knowledge/?kgRoot=first&kgRoot=second&kgSelected=article&kgPage=1&kgPage=2&q=a&q=b', fixture())
    expect(state.navigation.rootId).toBe('first')
    expect(state.navigation.selectedId).toBe('article')
    expect(state.inputError).toContain('Duplicate owned parameter: kgRoot')
    expect(state.inputError).toContain('Duplicate owned parameter: kgPage')
    expect(state.inputError).not.toContain('parameter: q')
    expect(buildSourceViewHref('/knowledge/', state)).toBeNull()
  })

  it.each([
    'kgView=orbit', 'kgScope=all', 'kgTheme=sepia', 'kgPage=0', 'kgPage=-1',
    'kgPage=01', 'kgPage=1.5', 'kgPage=9007199254740992', 'kgKinds=blog,unknown',
    'kgKinds=blog,,lab', 'kgQuery=line%0Abreak', 'kgRoot=trailing%20', 'kgCategory=%00',
  ])('fails closed for malformed owned values: %s', query => {
    const state = readSourceViewState('/knowledge/?' + query, fixture())
    expect(state.inputError).toContain('Malformed owned parameter')
    expect(buildSourceViewHref('/knowledge/', state)).toBeNull()
  })

  it('records malformed percent/UTF-8 encoding without decoding valid percent IDs twice', () => {
    const data = fixture()
    expect(readSourceViewState('/knowledge/?kgRoot=%FF', data).inputError).toContain('Malformed encoding for kgRoot')
    expect(readSourceViewState('/knowledge/?kgRoot=tag%ZZ', data).inputError).toContain('Malformed encoding for kgRoot')
    const state = readSourceViewState('/knowledge/?kgRoot=tag%3Aliteral%2520value', data)
    expect(state.navigation.rootId).toBe('tag:literal%20value')
    expect(state.inputError).toBeNull()
  })

  it('retains requested query fields from an invalid original URL for explicit recovery only', () => {
    const state = readSourceViewState('https:///example.test/knowledge/?kgRoot=host-root&kgOriginId=host-choice', fixture())
    expect(state.inputError).toContain('Invalid original graph URL')
    expect(state.inputError).toContain('Incomplete candidate origin')
    expect(state.navigation.rootId).toBe('host-root')
    expect(state.candidateOrigin).toEqual({ provider: '', snapshot: '', id: 'host-choice' })
    expect(buildSourceViewHref('/knowledge/', state)).toBeNull()
  })

  it('removes the three origin keys only after explicit state clears the origin', () => {
    const data = fixture(), original = '/knowledge/?q=keep&' + encodedOrigin(data) + '#inspector'
    const state = readSourceViewState(original, data)
    state.candidateOrigin = null
    const href = buildSourceViewHref(original, state)!
    expect(href).not.toContain('kgOrigin')
    expect(href).toContain('q=keep')
    expect(href.endsWith('#inspector')).toBe(true)
  })

  it('rejects malformed wrapper state and does not mutate valid input', () => {
    const data = fixture(), state = initialSourceViewState(data)
    const before = JSON.stringify(state)
    for (const patch of [
      { page: 0 }, { page: Number.NaN }, { page: 1.5 }, { categoryId: '' },
      { inputError: 'unresolved malformed input' }, { view: 'orbit' as never },
      { candidateOrigin: { provider: CONSOLE_PROVIDER, snapshot: '', id: 'host' } },
    ]) expect(buildSourceViewHref('/knowledge/', { ...state, ...patch })).toBeNull()
    expect(buildSourceViewHref('/knowledge/', { ...state, navigation: { ...state.navigation, kinds: ['unknown' as never] } })).toBeNull()
    expect(buildSourceViewHref('/knowledge/', state)).not.toBeNull()
    expect(JSON.stringify(state)).toBe(before)
  })

  it('plans no write for restoration and preserves original href and metadata untouched', () => {
    const state = initialSourceViewState(fixture())
    const href = 'https:///invalid-original.test/?kgRoot=unbound'
    const metadata = Object.freeze({ next: { preserve: true }, kg02: { focus: 'existing' } })
    const plan = sourceHistoryPlan(href, transition(state, 'none'), metadata)
    expect(plan).toEqual({ method: 'none', href, state: metadata })
    expect(plan.state).toBe(metadata)
    expect(sourceHistoryPlan(href, transition(state, 'none'), 7).state).toBe(7)
  })

  it('plans explicit push/replace without executing history or altering caller metadata', () => {
    const data = fixture(), state = initialSourceViewState(data)
    state.navigation.rootId = 'root'
    state.navigation.selectedId = 'selected'
    const metadata = { existingRouter: ['preserve'] }
    for (const method of ['push', 'replace'] as const) {
      const plan = sourceHistoryPlan('https://benebsworth.com/knowledge/?q=global#readout', transition(state, method), metadata)
      expect(plan.method).toBe(method)
      expect(plan.state).toBe(metadata)
      expect(plan.href.startsWith('https://benebsworth.com/knowledge/')).toBe(true)
      expect(readSourceViewState(plan.href, data)).toEqual(state)
    }
  })

  it('does not repair an invalid original graph URL into a writable history plan', () => {
    const state = initialSourceViewState(fixture()), href = 'https:////example.test/knowledge/'
    expect(sourceHistoryPlan(href, transition(state, 'push'), null)).toEqual({
      method: 'none', href, state: null, reason: 'Invalid original graph URL',
    })
  })

  it('allows an explicit clean recovery state to replace malformed owned parameters', () => {
    const data = fixture(), href = '/knowledge/?q=a%20b&kgOriginId=half-origin&kgRoot=legacy-root#keep'
    const bad = readSourceViewState(href, data)
    expect(bad.inputError).not.toBeNull()
    expect(sourceHistoryPlan(href, transition(bad, 'push'), null).method).toBe('none')
    const plan = sourceHistoryPlan(href, transition(initialSourceViewState(data), 'push'), null)
    expect(plan.method).toBe('push')
    expect(plan.href).toContain('q=a%20b')
    expect(plan.href).not.toContain('kgOrigin')
    expect(readSourceViewState(plan.href, data)).toEqual(initialSourceViewState(data))
  })
})

describe('strict original destination guard', () => {
  it.each([
    '/blog/source/?q=a%2Bb#reading', 'https://example.test/paper?q=a%2Bb#fig-2',
    'HTTP://Example.test:80/Exact%2fPath', '/study/vol1/01-introduction/',
  ])('returns safe native href bytes unchanged: %s', href => {
    expect(safeViewHref(href)).toBe(href)
  })

  it.each([
    'https:///example.test/path', 'https:////example.test/path', 'https:/example.test/path',
    '//example.test/path', 'relative/path', 'javascript:alert(1)', 'data:text/plain,a',
    'https://user:pass@example.test/', 'https://@example.test/', 'https://example.test/a b',
    '/a\\b', '/a\n', '/a\u007f', '/a\u00a0b', ' https://example.test/', '',
  ])('rejects unsafe or malformed original input: %s', href => {
    expect(safeViewHref(href)).toBeNull()
    expect(buildSourceViewHref(href, initialSourceViewState(fixture()))).toBeNull()
  })

  it('does not infer an absolute origin for a valid relative source anchor', () => {
    expect(safeViewHref('/blog/source/')).toBe('/blog/source/')
    expect(safeViewHref('/blog/source/', true)).toBeNull()
    expect(safeViewHref('https://example.test/source/', true)).toBe('https://example.test/source/')
    expect(safeViewHref(null)).toBeNull()
  })
})
