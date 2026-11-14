// @vitest-environment jsdom
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { ARTISTIC_PAPER_INK } from './artistic-paper-ink'
import { ARTISTIC_NATURE } from './artistic-nature'
import { geometryFor, parametersFor, STUDY_REGISTRY } from './model'
import { renderStudySvg } from './render'
import { searchStudies } from './registry'

const parse = (svg: string) => new DOMParser().parseFromString(svg, 'image/svg+xml')
const coordinates = (svg: string) => [...parse(svg).querySelectorAll('path,polyline,polygon')].map(n => [n.tagName, n.getAttribute('d'), n.getAttribute('points')])

describe('bespoke artwork in the shared lab', () => {
  it('adds six original illustrative compositions without inflating the count with variants', () => {
    const art = [...ARTISTIC_NATURE, ...ARTISTIC_PAPER_INK]
    expect(art).toHaveLength(6)
    expect(new Set(art.map(s => s.id)).size).toBe(6)
    for (const s of art) {
      expect(STUDY_REGISTRY.get(s.id)).toEqual(s)
      expect(s.category).toBe('Illustration')
      expect(s.provenance).toBe('illustrative')
      for (const query of [s.title, ...s.aliases]) expect(searchStudies(STUDY_REGISTRY, query)).toContainEqual(s)
      expect(searchStudies(STUDY_REGISTRY, '', { category: 'Illustration', tag: 'bespoke-vector' })).toContainEqual(s)
    }
  })
  it.each(ARTISTIC_PAPER_INK)('$id has three distinct deterministic authored arrangements', s => {
    const variants = [1, 2, 3].map(arrangement => {
      const parameters = parametersFor(s, { arrangement })
      const geometry = geometryFor(s, parameters)
      expect(geometryFor(s, Object.freeze(parameters))).toEqual(geometry)
      expect(geometry.marks.some(m => m.kind === 'path' && m.paint === 'fill')).toBe(true)
      expect(geometry.marks.some(m => m.role === 'accent')).toBe(true)
      expect(geometry.marks.some(m => m.role === 'guide')).toBe(false)
      expect(geometry.marks.length).toBeLessThan(40)
      return JSON.stringify(geometry)
    })
    expect(new Set(variants).size).toBe(3)
    for (const arrangement of [0, 1.5, 4, Infinity]) expect(() => geometryFor(s, { arrangement })).toThrow()
  })
  it.each(ARTISTIC_PAPER_INK)('$id exports every arrangement with invariant geometry and honest recipes', s => {
    for (const arrangement of [1, 2, 3]) {
      const values = { arrangement }, baseline = coordinates(renderStudySvg(s, values))
      for (const theme of ['light', 'dark'] as const) for (const palette of ['folio', 'monochrome', 'custom'] as const) for (const weight of [1.5, 4]) {
        const svg = renderStudySvg(s, values, { theme, palette, weight, inkColor: '#123456', accentColor: '#edcba9', emphasis: 2, guides: false }), doc = parse(svg)
        expect(coordinates(svg)).toEqual(baseline)
        expect(doc.querySelector('rect,image,text,script,foreignObject,parsererror')).toBeNull()
        expect(svg).not.toMatch(/NaN|Infinity|url\(|href=|currentColor/)
        const recipe = JSON.parse(doc.querySelector('metadata')!.textContent!)
        expect(recipe.parameters).toEqual(values)
        expect(renderStudySvg(s, recipe.parameters, recipe.appearance)).toBe(svg)
        expect(doc.querySelector('desc')!.textContent).toContain('Provenance: illustrative')
      }
    }
  })
  it.each(ARTISTIC_PAPER_INK)('$id has real alpha, a safe painted border and visible art at both weight extremes', async s => {
    for (const arrangement of [1, 2, 3]) for (const weight of [1.5, 4]) {
      const { data, info } = await sharp(Buffer.from(renderStudySvg(s, { arrangement }, { weight, emphasis: 2 }))).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      const alpha = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3]
      for (let x = 0; x < 320; x++) { expect(alpha(x, 0)).toBe(0); expect(alpha(x, 239)).toBe(0) }
      for (let y = 0; y < 240; y++) { expect(alpha(0, y)).toBe(0); expect(alpha(319, y)).toBe(0) }
      const painted = Array.from({ length: 320 * 240 }, (_, i) => data[i * 4 + 3]).filter(a => a > 0).length
      expect(painted).toBeGreaterThan(2500)
      expect(painted).toBeLessThan(24000)
      if (s.id === 'offset-portal') { expect(alpha(160, 120)).toBe(0); expect(alpha(110, 120)).toBe(255) }
      if (s.id === 'interrupted-flourish') { expect(alpha(155, 109)).toBe(0); expect(alpha(145, 178)).toBe(0) }
    }
  })
})
