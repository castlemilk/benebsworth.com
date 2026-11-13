import { describe, expect, it } from 'vitest'
import { STUDIES, STUDY_REGISTRY, geometryFor, parametersFor } from './model'
import { createStudyRegistry, normalizeStudySearch, searchStudies, studySearchRecords, studySearchText } from './registry'
import { LISSAJOUS_EXAMPLE } from './examples/lissajous'
import { renderStudySvg } from './render'
import type { Study } from './definition'

const ids = (q: string, filters = {}) => searchStudies(STUDY_REGISTRY, q, filters).map(s => s.id)
describe('searchable study registry', () => {
  it.each([['BST', 'binary-search-tree'], ['  SiNe   WaVe ', 'sine-wave'], ['64QAM', 'qam-constellation'], ['Schwarzschild', 'black-hole-geodesic'], ['RF antenna', 'antenna-radiation'], ['half—open', 'circuit-breaker'], ['probability density', 'wavepacket-quantum']])('finds %s using curated identity metadata', (q, id) => {
    expect(ids(q)).toContain(id)
  })
  it('normalizes accents, punctuation, letter/digit boundaries and whitespace', () => {
    expect(normalizeStudySearch('  PHÁSÉ–space / 64QAM ')).toBe('phase space 64 qam')
  })
  it('requires all terms and intersects subject and exact tag', () => {
    expect(ids('signal', { category: 'Electronics', tag: 'modulation' })).toEqual(['qam-constellation'])
    expect(ids('binary phase')).toEqual([])
    expect(ids('', { category: 'Physics', tag: 'modulation' })).toEqual([])
    expect(ids('', { tag: 'not-a-tag' })).toEqual([])
  })
  it('ranks exact names/aliases first and preserves source order for unranked results', () => {
    expect(ids('sine')[0]).toBe('sine-wave')
    expect(ids('')).toEqual(STUDIES.map(s => s.id))
    expect(ids('   ')).toEqual(ids(''))
  })
  it('does not index claims present only in scientific caveats or descriptions', () => {
    expect(ids('noise')).not.toContain('qam-constellation')
    expect(ids('Snell')).not.toContain('prism-dispersion')
    expect(ids('elections')).not.toContain('raft-consensus')
    expect(studySearchText(STUDIES[0])).not.toContain(STUDIES[0].basis)
  })
  it('creates a directly addressable Pagefind record per definition with useful metadata', () => {
    const records = studySearchRecords(STUDY_REGISTRY)
    expect(records).toHaveLength(STUDIES.length)
    for (const [i, record] of records.entries()) {
      expect(record.url).toBe(`/vectors/?study=${STUDIES[i].id}`)
      expect(record.meta.title).toBe(STUDIES[i].title)
      expect(record.filters.tag).toEqual(STUDIES[i].tags)
      expect(record.content).not.toContain(STUDIES[i].basis)
    }
  })
  it('registers and discovers another study without changing UI/search lists or original identities', () => {
    const expanded = createStudyRegistry([...STUDIES, LISSAJOUS_EXAMPLE])
    expect(expanded.studies).toHaveLength(STUDIES.length + 1)
    expect(searchStudies(expanded, 'lissajous')[0].id).toBe('lissajous-curve')
    expect(expanded.get('lissajous-curve')).toBeTruthy()
    expect(studySearchRecords(expanded).at(-1)?.url).toBe('/vectors/?study=lissajous-curve')
    expect(STUDY_REGISTRY.get('lissajous-curve')).toBeUndefined()
  })
  it('copies and freezes metadata rather than retaining mutable caller arrays', () => {
    const tags = ['curves'], parameter = { ...STUDIES[0].parameters[0] }
    const registered = createStudyRegistry([{ ...STUDIES[0], tags, parameters: [parameter] }]).studies[0]
    tags.push('later'); parameter.initial = .2
    expect(registered.tags).toEqual(['curves'])
    expect(registered.parameters[0].initial).toBe(.8)
    expect(Object.isFrozen(registered)).toBe(true)
  })
  it.each([
    { id: '' }, { id: 'unsafe/id' }, { id: undefined }, { title: ' ' }, { category: 'Unknown' }, { provenance: 'exact' },
    { tags: [] }, { tags: ['bad tag'] }, { tags: ['curves', 'curves'] }, { aliases: [' '] }, { aliases: ['B-S-T', 'b s t'] },
    { parameters: [{ ...STUDIES[0].parameters[0], step: 0 }] },
    { parameters: [{ ...STUDIES[0].parameters[0], max: Infinity }] },
    { parameters: [{ ...STUDIES[0].parameters[0], initial: .25 }] },
    { parameters: [STUDIES[0].parameters[0], STUDIES[0].parameters[0]] },
  ])('rejects invalid definition %j', partial => {
    expect(() => createStudyRegistry([{ ...STUDIES[0], ...partial } as Study])).toThrow()
  })
  it('uses own parameter values only, including prototype-like parameter names', () => {
    const definition = { ...STUDIES[0], parameters: [{ ...STUDIES[0].parameters[0], key: 'constructor' }] }
    const registered = createStudyRegistry([definition]).studies[0]
    expect(parametersFor(registered)).toEqual({ constructor: .8 })
    expect(parametersFor(registered, { constructor: .4 })).toEqual({ constructor: .4 })
    expect(parametersFor(STUDIES[0], Object.create({ amplitude: .4 })).amplitude).toBe(.8)
  })
  it('rejects duplicate identities', () => expect(() => createStudyRegistry([STUDIES[0], STUDIES[0]])).toThrow(/duplicate/))
})

describe('executable authoring example', () => {
  it('keeps a=b=1, phase=π/2 on the unit circle with equal scales and a closed curve', () => {
    const mark = geometryFor(LISSAJOUS_EXAMPLE, { a: 1, b: 1, phase: 1 }).marks[0]
    if (mark.kind !== 'line') throw new Error('Expected curve')
    expect(mark.closed).toBe(true)
    expect(mark.points).toHaveLength(513)
    for (const [x, y] of mark.points) expect(((x - 160) / 90) ** 2 + ((120 - y) / 90) ** 2).toBeCloseTo(1, 12)
    expect(mark.points[0][0]).toBeCloseTo(mark.points.at(-1)![0])
    expect(mark.points[0][1]).toBeCloseTo(mark.points.at(-1)![1])
  })
  it('supports every parameter combination and portable deterministic style variants', () => {
    for (let a = 1; a <= 4; a++) for (let b = 1; b <= 4; b++) for (let phase = 0; phase <= 3; phase++) {
      const p = { a, b, phase }, svg = renderStudySvg(LISSAJOUS_EXAMPLE, p)
      expect(renderStudySvg(LISSAJOUS_EXAMPLE, p)).toBe(svg)
      expect(svg).not.toMatch(/NaN|Infinity|<rect|<script|url\(/)
      const points = (source: string) => source.match(/points="[^"]+"/g)
      expect(points(renderStudySvg(LISSAJOUS_EXAMPLE, p, { theme: 'dark', palette: 'monochrome', weight: 4 }))).toEqual(points(svg))
    }
  })
})
