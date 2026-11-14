// @vitest-environment jsdom
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { ARTISTIC_OBJECTS } from './artistic-objects'
import { markPoints } from './definition'
import { geometryFor } from './model'
import { createStudyRegistry, searchStudies } from './registry'
import { renderStudySvg } from './render'

const parse = (svg: string) => new DOMParser().parseFromString(svg, 'image/svg+xml')
const coordinates = (svg: string) => [...parse(svg).querySelectorAll('path')].map(n => n.getAttribute('d'))
const voids: Record<string, readonly (readonly [number, number])[]> = {
  'index-cabinet': [[128, 144], [186, 144], [160, 178], [130, 103]],
  'signal-lantern': [[140, 134], [180, 152]],
  'mosaic-carafe': [[239, 122], [153, 80]],
}

const rasterCases = ARTISTIC_OBJECTS.flatMap(study => [160, 320].flatMap(width => (['light', 'dark'] as const).flatMap(theme => (['folio', 'monochrome'] as const).flatMap(palette => [1.5, 4].map(weight => ({ study, id: study.id, width, theme, palette, weight }))))))

describe('engraved editorial objects', () => {
  it('registers three discoverable honest fixed compositions', () => {
    const registry = createStudyRegistry(ARTISTIC_OBJECTS)
    expect(registry.studies).toHaveLength(3)
    for (const study of ARTISTIC_OBJECTS) {
      expect(study.parameters).toEqual([])
      expect(study.provenance).toBe('illustrative')
      expect(study.category).toBe('Illustration')
      for (const alias of [study.title, ...study.aliases]) expect(searchStudies(registry, alias)).toContainEqual(study)
    }
  })
  it.each(ARTISTIC_OBJECTS)('$id has deterministic bounded editable contours', study => {
    const geometry = geometryFor(study, {})
    expect(geometryFor(study, Object.freeze({}))).toEqual(geometry)
    expect(geometry.marks.length).toBeGreaterThanOrEqual(35)
    expect(geometry.marks.length).toBeLessThanOrEqual(90)
    for (const mark of geometry.marks) {
      expect(mark.kind).toBe('path')
      expect(mark.role).not.toBe('guide')
      for (const [x, y] of markPoints(mark)) {
        expect(x).toBeGreaterThanOrEqual(8); expect(x).toBeLessThanOrEqual(312)
        expect(y).toBeGreaterThanOrEqual(8); expect(y).toBeLessThanOrEqual(232)
      }
      if (mark.kind === 'path' && mark.paint === 'fill') {
        expect(mark.commands.at(-1)?.op).toBe('Z')
        for (let i = 1; i < mark.commands.length; i++) if (mark.commands[i].op === 'M') expect(mark.commands[i - 1].op).toBe('Z')
      }
    }
  })
  it.each(ARTISTIC_OBJECTS)('$id separates style from geometry and roundtrips its recipe', study => {
    const baseline = coordinates(renderStudySvg(study))
    for (const theme of ['light', 'dark'] as const) for (const palette of ['folio', 'monochrome'] as const) for (const weight of [1.5, 4]) {
      const svg = renderStudySvg(study, {}, { theme, palette, weight, guides: false }), doc = parse(svg)
      expect(coordinates(svg)).toEqual(baseline)
      expect(doc.querySelector('rect,image,text,script,foreignObject,parsererror')).toBeNull()
      expect(svg).not.toMatch(/NaN|Infinity|url\(|href=|currentColor/)
      expect(doc.querySelector('title')!.textContent).toBe(study.title)
      const recipe = JSON.parse(doc.querySelector('metadata')!.textContent!)
      expect(renderStudySvg(study, recipe.parameters, recipe.appearance)).toBe(svg)
      expect(doc.querySelectorAll('[fill-rule="evenodd"]').length).toBeGreaterThan(0)
    }
  })
  it.each(rasterCases)('$id alpha and borders at $width px / $theme / $palette / weight $weight', async ({ study, width, theme, palette, weight }) => {
    const { data, info } = await sharp(Buffer.from(renderStudySvg(study, {}, { theme, palette, weight }))).resize(width).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const alpha = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3]
    for (let x = 0; x < width; x++) { expect(alpha(x, 0)).toBe(0); expect(alpha(x, info.height - 1)).toBe(0) }
    for (let y = 0; y < info.height; y++) { expect(alpha(0, y)).toBe(0); expect(alpha(width - 1, y)).toBe(0) }
    for (const [x, y] of voids[study.id]) expect(alpha(Math.floor(x * width / 320), Math.floor(y * width / 320))).toBe(0)
    const painted = Array.from({ length: width * info.height }, (_, i) => data[i * 4 + 3]).filter(a => a > 0).length
    expect(painted).toBeGreaterThan(width * info.height * 0.04)
    expect(painted).toBeLessThan(width * info.height * 0.35)
  })
})
