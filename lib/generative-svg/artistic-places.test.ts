// @vitest-environment jsdom
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { ARTISTIC_PLACES } from './artistic-places'
import { markPoints } from './definition'
import { geometryFor, parametersFor } from './model'
import { createStudyRegistry, searchStudies } from './registry'
import { renderStudySvg } from './render'

const parse = (svg: string) => new DOMParser().parseFromString(svg, 'image/svg+xml')
const coordinates = (svg: string) => [...parse(svg).querySelectorAll('path')].map(n => n.getAttribute('d'))
const voids: Record<string, readonly (readonly [number, number])[]> = {
  'scalloped-fan': [[59, 125], [136, 62], [247, 203]],
  'winding-quarter': [[230, 43], [67, 160], [148, 130]],
  'harbour-rigging': [[91, 191], [125, 185], [164, 175], [205, 163], [245, 150], [214, 71]],
}
const lane = [[125, 218], [135, 198], [144, 177], [147, 153], [147, 131], [145, 105], [149, 87], [166, 69], [170, 49], [172, 29]] as const

describe('authored ornament and imagined places', () => {
  it('registers three fixed, honestly illustrative subjects with searchable families', () => {
    expect(ARTISTIC_PLACES.map(s => s.id)).toEqual(['scalloped-fan', 'winding-quarter', 'harbour-rigging'])
    const registry = createStudyRegistry(ARTISTIC_PLACES)
    for (const s of ARTISTIC_PLACES) {
      expect(s.parameters).toEqual([])
      expect(s.category).toBe('Illustration')
      expect(s.provenance).toBe('illustrative')
      expect(s.tags).toContain('bespoke-vector')
      expect(s.tags).toContain(s.id === 'scalloped-fan' ? 'inlaid-ornament' : 'imagined-place')
      for (const query of [s.title, ...s.aliases]) expect(searchStudies(registry, query)).toContainEqual(s)
    }
  })
  it.each(ARTISTIC_PLACES)('$id is deterministic, bounded and uses explicitly closed real cutouts', s => {
    const geometry = geometryFor(s, parametersFor(s))
    expect(geometryFor(s, Object.freeze({}))).toEqual(geometry)
    expect(geometry.marks.length).toBeGreaterThanOrEqual(35)
    expect(geometry.marks.length).toBeLessThanOrEqual(90)
    expect(geometry.marks.some(m => m.role === 'accent')).toBe(true)
    expect(geometry.marks.some(m => m.role === 'guide')).toBe(false)
    let holes = 0
    for (const m of geometry.marks) {
      for (const [x, y] of markPoints(m)) {
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true)
        expect(x).toBeGreaterThanOrEqual(8); expect(x).toBeLessThanOrEqual(312)
        expect(y).toBeGreaterThanOrEqual(8); expect(y).toBeLessThanOrEqual(232)
      }
      expect(m.kind).toBe('path')
      if (m.kind === 'path') {
        expect(m.commands.every(c => ['M', 'L', 'C', 'Z'].includes(c.op))).toBe(true)
        if (m.paint === 'fill') {
          expect(m.commands.at(-1)?.op).toBe('Z')
          for (let i = 1; i < m.commands.length; i++) if (m.commands[i].op === 'M') expect(m.commands[i - 1].op).toBe('Z')
          holes += Math.max(0, m.commands.filter(c => c.op === 'M').length - 1)
        } else expect(m.stroke).toBe('fine')
      }
    }
    expect(holes).toBeGreaterThanOrEqual(2)
    expect(() => geometryFor(s, { arrangement: 2 })).toThrow()
  })
  it.each(ARTISTIC_PLACES)('$id preserves coordinates, static SVG safety and its reproducible recipe across appearance settings', s => {
    const baseline = coordinates(renderStudySvg(s))
    for (const theme of ['light', 'dark'] as const) for (const palette of ['folio', 'monochrome', 'custom'] as const) for (const weight of [1.5, 4]) {
      const svg = renderStudySvg(s, {}, { theme, palette, weight, guides: false, emphasis: 2, inkColor: '#123456', accentColor: '#abcdef' })
      const doc = parse(svg)
      expect(coordinates(svg)).toEqual(baseline)
      expect(doc.querySelector('rect,image,text,script,foreignObject,parsererror')).toBeNull()
      expect(svg).not.toMatch(/NaN|Infinity|url\(|href=|currentColor/)
      expect([...doc.querySelectorAll('path:not([fill="none"])')].every(p => p.getAttribute('fill-rule') === 'evenodd')).toBe(true)
      const recipe = JSON.parse(doc.querySelector('metadata')!.textContent!)
      expect(recipe.parameters).toEqual({})
      expect(renderStudySvg(s, recipe.parameters, recipe.appearance)).toBe(svg)
      expect(doc.querySelector('desc')!.textContent).toContain('Provenance: illustrative')
    }
  })
  it.each(ARTISTIC_PLACES)('$id preserves alpha and clear borders at 160/320px, light/dark/mono and both stroke extremes', async s => {
    for (const appearance of [{ theme: 'light' }, { theme: 'dark' }, { palette: 'monochrome' }] as const) for (const weight of [1.5, 4]) for (const width of [160, 320]) {
      const { data, info } = await sharp(Buffer.from(renderStudySvg(s, {}, { ...appearance, weight }))).resize(width).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      const alpha = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3]
      for (let x = 0; x < width; x++) { expect(alpha(x, 0)).toBe(0); expect(alpha(x, info.height - 1)).toBe(0) }
      for (let y = 0; y < info.height; y++) { expect(alpha(0, y)).toBe(0); expect(alpha(width - 1, y)).toBe(0) }
      const painted = Array.from({ length: width * info.height }, (_, i) => data[i * 4 + 3]).filter(a => a > 0).length
      expect(painted).toBeGreaterThan(500 * (width / 160) ** 2)
      expect(painted).toBeLessThan(width * info.height * 0.4)
      for (const [x, y] of voids[s.id]) expect(alpha(Math.floor(x * width / 320), Math.floor(y * width / 320)), `${s.id} cutout ${x},${y} at ${width}px`).toBe(0)
      if (s.id === 'winding-quarter') {
        // A connected route from the lower opening to the top edge, with a two-unit clearance on each side.
        for (let i = 1; i < lane.length; i++) for (let t = 0; t <= 20; t++) {
          const x = lane[i - 1][0] + (lane[i][0] - lane[i - 1][0]) * t / 20
          const y = lane[i - 1][1] + (lane[i][1] - lane[i - 1][1]) * t / 20
          for (const dx of [-2, 0, 2]) expect(alpha(Math.floor((x + dx) * width / 320), Math.floor(y * width / 320))).toBe(0)
        }
      }
    }
  })
})
