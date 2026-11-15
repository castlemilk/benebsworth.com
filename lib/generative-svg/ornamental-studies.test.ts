// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { ORNAMENTAL_STUDIES, GOLDEN_ANGLE, phyllotaxisSeeds } from './ornamental-studies'
import { geometryFor, STUDY_REGISTRY, type Mark } from './model'
import { geometryMarkup, renderStudySvg } from './render'
import { searchStudies, studySearchRecords } from './registry'

const [rosette, bloom, medallion] = ORNAMENTAL_STUDIES
const radius = ([x, y]: readonly number[]) => Math.hypot(x - 160, y - 116)
const curve = (mark: Mark) => { if (mark.kind !== 'line') throw new Error('Expected contour'); return mark.points }
const coordinates = (svg: string) => [...new DOMParser().parseFromString(svg, 'image/svg+xml').querySelectorAll('polyline,polygon,circle,path')].map(n => ['points', 'cx', 'cy', 'r', 'd'].map(a => n.getAttribute(a)))

describe('original engraved ornaments', () => {
  it('keeps thirteen closed rosette contours on their declared harmonic law at every supported setting', () => {
    for (let lobes = 6; lobes <= 12; lobes++) for (let relief = 3; relief <= 7; relief++) {
      const contours = geometryFor(rosette, { lobes, relief }).marks.slice(0, 13)
      for (const [j, mark] of contours.entries()) {
        const points = curve(mark)
        expect(points).toHaveLength(1025)
        expect(points[0]).toEqual(points.at(-1))
        expect(Math.max(...points.map(radius))).toBeLessThan(94)
        for (const n of [0, 17, 64, 257, 512, 997]) {
          const theta = n * Math.PI * 2 / 1024
          expect(radius(points[n])).toBeCloseTo(20 + 5.4 * j + relief * Math.cos(lobes * theta) + 1.2 * Math.cos(2 * lobes * theta + Math.PI / 3), 10)
          if (j) expect(radius(points[n]) - radius(curve(contours[j - 1])[n])).toBeCloseTo(5.4, 10)
        }
      }
    }
  })
  it('uses distinct golden-angle seeds with equal squared-radius increments and trimmed chords', () => {
    for (const count of [55, 72, 89]) for (let rotation = 0; rotation <= 90; rotation += 15) {
      const seeds = phyllotaxisSeeds(count, rotation)
      expect(seeds).toHaveLength(count)
      expect(new Set(seeds.map(p => p.join(','))).size).toBe(count)
      for (let n = 0; n < count; n++) {
        const angle = n * GOLDEN_ANGLE + rotation * Math.PI / 180
        expect(seeds[n][0]).toBeCloseTo(160 + 88 * Math.sqrt((n + .5) / count) * Math.cos(angle), 11)
        expect(seeds[n][1]).toBeCloseTo(116 - 88 * Math.sqrt((n + .5) / count) * Math.sin(angle), 11)
        if (n) expect(radius(seeds[n]) ** 2 - radius(seeds[n - 1]) ** 2).toBeCloseTo(88 ** 2 / count, 9)
      }
      const marks = geometryFor(bloom, { seeds: count, rotation }).marks
      expect(marks.filter(m => m.kind === 'circle')).toHaveLength(count)
      const chords = marks.filter(m => m.kind === 'line' && m.role === 'accent')
      const starts = [0, 6].flatMap(offset => Array.from({ length: Math.ceil((count - 13 - offset) / 13) }, (_, i) => offset + i * 13))
      expect(chords).toHaveLength(starts.length)
      chords.forEach((m, i) => {
        const points = curve(m), n = starts[i]
        expect(Math.hypot(points[0][0] - seeds[n][0], points[0][1] - seeds[n][1])).toBeCloseTo(4.8)
        expect(Math.hypot(points[1][0] - seeds[n + 13][0], points[1][1] - seeds[n + 13][1])).toBeCloseTo(4.8)
      })
    }
    for (const [count, rotation] of [[0, 0], [90, 0], [89, NaN], [89, 1]]) expect(() => phyllotaxisSeeds(count, rotation)).toThrow()
  })
  it('keeps three three-contour ribbons on the declared phase-shifted polar law', () => {
    for (let lobes = 5; lobes <= 9; lobes++) for (const depth of [14, 16, 18]) {
      const contours = geometryFor(medallion, { lobes, depth }).marks.slice(0, 9)
      for (const [index, mark] of contours.entries()) {
        const points = curve(mark), j = Math.floor(index / 3), h = index % 3 - 1
        expect(points).toHaveLength(1025)
        expect(points[0]).toEqual(points.at(-1))
        expect(Math.min(...points.map(radius))).toBeGreaterThan(45)
        expect(Math.max(...points.map(radius))).toBeLessThan(93)
        for (const n of [0, 93, 256, 507, 1023]) expect(radius(points[n])).toBeCloseTo(69 + 5.4 * h + depth * Math.cos(lobes * n * Math.PI * 2 / 1024 + j * Math.PI * 2 / 3), 10)
      }
    }
  })
  it.each(ORNAMENTAL_STUDIES)('discovers $id by every alias and preserves a transparent, deterministic recipe across appearances', study => {
    for (const alias of study.aliases) expect(searchStudies(STUDY_REGISTRY, alias).map(s => s.id)).toContain(study.id)
    expect(searchStudies(STUDY_REGISTRY, '', { category: 'Mathematics', tag: 'ornament' }).map(s => s.id)).toEqual(ORNAMENTAL_STUDIES.map(s => s.id))
    expect(studySearchRecords(STUDY_REGISTRY).find(r => r.url.endsWith(`=${study.id}`))?.content).not.toContain(study.basis)
    const original = renderStudySvg(study), points = coordinates(original)
    for (const theme of ['light', 'dark'] as const) for (const weight of [1.5, 4]) {
      const svg = renderStudySvg(study, {}, { theme, weight, guides: false, palette: 'monochrome', emphasis: 2 })
      expect(coordinates(svg)).toEqual(points)
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml'), recipe = JSON.parse(doc.querySelector('metadata')!.textContent!)
      expect(renderStudySvg(study, recipe.parameters, recipe.appearance)).toBe(svg)
      expect(doc.querySelector('rect,script,image,foreignObject,parsererror')).toBeNull()
      expect(svg).not.toMatch(/NaN|Infinity|url\(|currentColor/)
      expect(doc.querySelectorAll('[stroke-opacity]')).toHaveLength(0)
      expect(doc.querySelector('[stroke-width]')!.getAttribute('stroke-width')).toBe(String(Math.round(weight * .4 * 10000) / 10000))
    }
  })
  it('keeps legacy stroke bytes unchanged and rejects unknown detail tiers', () => {
    const mark: Mark = { kind: 'line', points: [[20, 20], [40, 40]], role: 'ink' }
    expect(geometryMarkup({ marks: [mark] })).toBe('<polyline points="20,20 40,40" fill="none" stroke="#28343b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>')
    expect(geometryMarkup({ marks: [{ ...mark, stroke: 'fine' }] })).toContain('stroke-width="0.96"')
    const invalid = { ...mark, stroke: 'unknown' } as unknown as Mark
    expect(() => geometryMarkup({ marks: [invalid] })).toThrow('Invalid stroke tier')
    expect(() => geometryFor({ ...rosette, model: () => ({ marks: [invalid] }) })).toThrow('Invalid stroke tier')
  })
})
