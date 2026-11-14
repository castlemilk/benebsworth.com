// @vitest-environment jsdom
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { PATTERN_ATLAS_BATCHES, PATTERN_ATLAS_STUDIES } from './pattern-atlas'
import { STUDY_REGISTRY, geometryFor, markPoints, parametersFor } from './model'
import { renderStudySvg } from './render'
import { searchStudies } from './registry'
import reviewedHashes from './reviewed-original-svg-hashes.json'

describe('preserved reviewed drawings', () => {
  it.each(Object.entries(reviewedHashes))('retains the reviewed default bytes of %s', (id, hash) => {
    const study = STUDY_REGISTRY.get(id)!
    expect(study).toBeDefined()
    expect(createHash('sha256').update(renderStudySvg(study)).digest('hex')).toBe(hash)
  })
})

describe('pattern atlas batches', () => {
  it('registers six distinct patterns per batch without substituting the existing collection', () => {
    for (const batch of PATTERN_ATLAS_BATCHES) expect(batch).toHaveLength(6)
    expect(new Set(PATTERN_ATLAS_STUDIES.map(s => s.id)).size).toBe(PATTERN_ATLAS_STUDIES.length)
    expect(STUDY_REGISTRY.studies.length).toBeGreaterThanOrEqual(Object.keys(reviewedHashes).length + PATTERN_ATLAS_STUDIES.length)
  })
  it.each(PATTERN_ATLAS_STUDIES)('keeps $id bounded, discoverable and independently styled', study => {
    for (const query of [study.title, ...study.aliases]) expect(searchStudies(STUDY_REGISTRY, query).map(s => s.id)).toContain(study.id)
    expect(searchStudies(STUDY_REGISTRY, '', { category: study.category, tag: 'pattern' }).map(s => s.id)).toContain(study.id)
    const corners = study.parameters.reduce<Record<string, number>[]>((values, p) => values.flatMap(value => [p.min, p.max].map(n => ({ ...value, [p.key]: n }))), [{}])
    for (const values of [parametersFor(study), ...corners]) {
      const geometry = geometryFor(study, values)
      expect(geometryFor(study, values)).toEqual(geometry)
      const pointCount = geometry.marks.reduce((n, m) => n + markPoints(m).length, 0)
      expect(pointCount).toBeLessThanOrEqual(25000)
      expect(geometry.marks.some(m => m.role !== 'guide')).toBe(true)
      const svg = renderStudySvg(study, values, { theme: 'dark', palette: 'monochrome', weight: 4, guides: false })
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
      expect(doc.querySelector('rect,script,image,foreignObject,parsererror')).toBeNull()
      expect(svg).not.toMatch(/NaN|Infinity|url\(|currentColor/)
      const recipe = JSON.parse(doc.querySelector('metadata')!.textContent!)
      expect(recipe.study).toBe(study.id)
      expect(recipe.parameters).toEqual(values)
      expect(renderStudySvg(study, recipe.parameters, recipe.appearance)).toBe(svg)
      const defaultSvg = renderStudySvg(study, values, { guides: false })
      const coordinates = (source: string) => source.match(/(?:points|cx|cy|r|d)="[^"]+"/g)
      expect(coordinates(svg)).toEqual(coordinates(defaultSvg))
    }
  }, 15000)
})
