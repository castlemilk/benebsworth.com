import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { ARTISTIC_NATURE } from './artistic-nature'
import { markPoints, parametersFor } from './definition'
import { validatePathMark } from './path'
import { createStudyRegistry, searchStudies } from './registry'
import { renderStudySvg } from './render'

const registry = createStudyRegistry(ARTISTIC_NATURE)
const paths = (svg: string) => [...svg.matchAll(/ d="([^"]+)"/g)].map(match => match[1])

describe('authored engraved nature compositions', () => {
  it('registers exactly two illustrative fixed compositions with discoverable aliases', () => {
    expect(ARTISTIC_NATURE.map(study => study.id)).toEqual(['wind-cut-branch', 'night-wing-specimen'])
    for (const study of ARTISTIC_NATURE) {
      expect(study.category).toBe('Illustration')
      expect(study.provenance).toBe('illustrative')
      expect(study.parameters).toEqual([])
      expect(parametersFor(study)).toEqual({})
      expect(() => parametersFor(study, { rotation: 1 })).toThrow('Unknown parameter')
      expect(study.tags).toEqual(expect.arrayContaining(['bespoke-vector', 'engraved-natural']))
      for (const alias of study.aliases) expect(searchStudies(registry, alias)).toContain(registry.get(study.id))
    }
    expect(searchStudies(registry, '', { category: 'Illustration', tag: 'engraved-natural' })).toHaveLength(2)
  })

  it.each(ARTISTIC_NATURE)('$id is pure, bounded, cubic geometry with closed fill contours', study => {
    const before = study.model({})
    expect(study.model(Object.freeze({}))).toEqual(before)
    expect(study.model({})).not.toBe(before)
    for (const mark of before.marks) {
      expect(mark.kind).toBe('path')
      if (mark.kind !== 'path') continue
      expect(() => validatePathMark(mark)).not.toThrow()
      expect(mark.role).not.toBe('guide')
      if (mark.paint === 'stroke') expect(mark.stroke).toBe('fine')
      for (const [x, y] of markPoints(mark)) {
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true)
        expect(x).toBeGreaterThanOrEqual(36)
        expect(x).toBeLessThanOrEqual(284)
        expect(y).toBeGreaterThanOrEqual(26)
        expect(y).toBeLessThanOrEqual(214)
      }
    }
    expect(before.marks.some(mark => mark.kind === 'path' && mark.commands.some(command => command.op === 'C'))).toBe(true)
    expect(before.marks.some(mark => mark.kind === 'path' && mark.paint === 'fill' && mark.commands.filter(command => command.op === 'M').length > 1)).toBe(true)
    expect(before.marks.some(mark => mark.role === 'accent')).toBe(true)
  })

  it.each(ARTISTIC_NATURE)('$id keeps all geometry identical through palette and stroke extremes', study => {
    const defaultSvg = renderStudySvg(study)
    expect(renderStudySvg(study)).toBe(defaultSvg)
    for (const options of [
      { palette: 'monochrome' as const, weight: 4, emphasis: 2 },
      { palette: 'folio' as const, theme: 'dark' as const, weight: 1.5, guides: false },
      { palette: 'custom' as const, inkColor: '#145abc', accentColor: '#c0108a' },
    ]) {
      const svg = renderStudySvg(study, {}, options)
      expect(paths(svg)).toEqual(paths(defaultSvg))
      expect(svg).toContain('fill-rule="evenodd"')
      expect(svg).not.toMatch(/<image|<rect|<script/)
    }
  })

  it.each([
    { study: ARTISTIC_NATURE[0], holes: [[230,104], [73,143]], solids: [[232,111], [111,193]] },
    { study: ARTISTIC_NATURE[1], holes: [[60,61], [258,59], [159,156]], solids: [[46,65], [159,123]] },
  ])('$study.id rasterizes real alpha holes rather than background-colored paint', async ({ study, holes, solids }) => {
    for (const weight of [1.5, 4]) {
      const { data, info } = await sharp(Buffer.from(renderStudySvg(study, {}, { weight, emphasis: 2 }))).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      const alpha = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3]
      expect(alpha(0, 0)).toBe(0)
      for (const [x, y] of holes) expect(alpha(x, y), `hole ${x},${y}`).toBe(0)
      for (const [x, y] of solids) expect(alpha(x, y), `solid ${x},${y}`).toBeGreaterThan(200)
    }
  })
})
