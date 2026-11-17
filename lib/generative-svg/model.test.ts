// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { STUDIES, geometryFor, parametersFor, sampleCurve, type Mark } from './model'
import { appearanceFor, DEFAULT_APPEARANCE, renderStudySvg } from './render'
const parseSvg = (svg: string) => new DOMParser().parseFromString(svg, 'image/svg+xml')

const study = (id: string) => STUDIES.find(s => s.id === id)!
const polyline = (mark: Mark) => { if (mark.kind !== 'line') throw new Error('Not a polyline'); return mark.points }

describe('mathematical drawing models', () => {
  it('samples a sine wave with exact endpoints, crossings, amplitude and period', () => {
    const points = polyline(geometryFor(study('sine-wave'), { amplitude: 1, cycles: 2 }).marks[2])
    expect(points).toHaveLength(257)
    for (const index of [0, 64, 128, 192, 256]) expect(points[index][1]).toBeCloseTo(120, 10)
    expect(Math.min(...points.map(p => p[1]))).toBeCloseTo(44)
    expect(Math.max(...points.map(p => p[1]))).toBeCloseTo(196)
    for (let i = 0; i <= 128; i++) expect(points[i][1]).toBeCloseTo(points[i + 128][1], 10)
    expect(points[0][0]).toBe(32)
    expect(points[256][0]).toBe(288)
  })
  it('keeps a quadratic symmetric with an exact vertex', () => {
    const points = polyline(geometryFor(study('cartesian-parabola'), { curvature: 1 }).marks[2])
    expect(points[64]).toEqual([160, 200])
    for (let i = 0; i <= 128; i++) { expect(points[i][1]).toBeCloseTo(points[128 - i][1]); expect(points[i][0] + points[128 - i][0]).toBeCloseTo(320) }
  })
  it('retains the stated Fourier partial sum and overshoot', () => {
    const one = polyline(geometryFor(study('fourier-harmonics'), { terms: 1 }).marks[2])
    expect(one[128][1]).toBeCloseTo(120 - 62 * 4 / Math.PI)
    const five = polyline(geometryFor(study('fourier-harmonics'), { terms: 5 }).marks[2])
    expect(Math.min(...five.map(p => p[1]))).toBeLessThan(120 - 62)
    expect(five[0][1]).toBe(120)
    expect(five[256][1]).toBeCloseTo(120)
  })
  it('constructs 24 nonzero rotational vectors plus the zero vector without normalization', () => {
    const marks = geometryFor(study('vector-field')).marks
    expect(marks.filter(m => m.kind === 'circle')).toHaveLength(1)
    const shafts = marks.filter(m => m.kind === 'line' && m.points.length === 2)
    expect(shafts).toHaveLength(24)
    for (const mark of shafts) {
      const [start, end] = polyline(mark), x = (start[0] - 160) / 40, y = (120 - start[1]) / 40
      expect(end[0] - start[0]).toBeCloseTo(-y * 7)
      expect(end[1] - start[1]).toBeCloseTo(-x * 7)
    }
  })
  it('preserves seven ordered keys, six edges and the selected search path', () => {
    const g = geometryFor(study('binary-search-tree'), { target: 5 })
    expect(g.marks.filter(m => m.kind === 'circle')).toHaveLength(7)
    expect(g.marks.filter(m => m.kind === 'line')).toHaveLength(6)
    expect(g.marks.filter(m => m.kind === 'text').map(m => m.kind === 'text' ? m.text : '')).toEqual(['1','2','3','4','5','6','7'])
    expect(g.marks.filter(m => m.kind === 'text' && m.role === 'accent').map(m => m.kind === 'text' ? m.text : '')).toEqual(['4','5','6'])
    expect(g.marks.filter(m => m.kind === 'line' && m.role === 'accent')).toHaveLength(2)
  })
  it('does not present an illustrative prism as a solved optical model', () => {
    expect(study('prism-dispersion').provenance).toBe('illustrative')
    expect(study('prism-dispersion').basis).toContain('not computed with Snell')
  })
  it('rejects non-finite samples instead of bridging discontinuities', () => {
    expect(() => sampleCurve(x => 1 / x, -1, 1)).toThrow('Non-finite')
    expect(() => sampleCurve(() => NaN, 0, 1)).toThrow('Non-finite')
    expect(() => sampleCurve(x => x, 1, 0)).toThrow()
    expect(() => sampleCurve(x => x, 0, 1, 10000)).toThrow()
  })
  it.each([NaN, Infinity, -1, 1.1, 0.25])('rejects invalid semantic amplitude %s', value => {
    expect(() => geometryFor(study('sine-wave'), { amplitude: value })).toThrow()
  })
  it('rejects unknown parameters and validates integer choices', () => {
    expect(() => parametersFor(study('sine-wave'), { typo: 1 })).toThrow('Unknown')
    expect(() => geometryFor(study('binary-search-tree'), { target: 1.5 })).toThrow()
  })
  it.each(STUDIES)('keeps $id bounded for every allowed parameter combination', s => {
    let combinations: Record<string, number>[] = [{}]
    for (const p of s.parameters) combinations = combinations.flatMap(values => Array.from({ length: Math.round((p.max - p.min) / p.step) + 1 }, (_, i) => ({ ...values, [p.key]: Number((p.min + p.step * i).toFixed(8)) })))
    for (const values of combinations) expect(() => geometryFor(s, values)).not.toThrow()
  })
})

describe('portable transparent SVG', () => {
  it.each(STUDIES)('serializes $id deterministically without external resources or backgrounds', s => {
    const svg = renderStudySvg(s)
    expect(renderStudySvg(s)).toBe(svg)
    const document = parseSvg(svg)
    expect(document.querySelector('parsererror, script, foreignObject, image, rect')).toBeNull()
    expect(document.documentElement.getAttribute('viewBox')).toBe('0 0 320 240')
    expect(document.querySelector('title')?.textContent).toBe(s.title)
    expect(document.querySelector('desc')?.textContent).toContain(s.provenance)
    expect(document.querySelectorAll('[id]')).toHaveLength(0)
    expect(svg).not.toMatch(/NaN|Infinity|var\(|url\(|currentColor/)
  })
  it.each(STUDIES)('keeps $id coordinates invariant across themes, palettes and weights', s => {
    const geometry = JSON.stringify(geometryFor(s))
    const paths = (svg: string) => [...parseSvg(svg).querySelectorAll('polyline,polygon,circle,text,path')].map(n => ['points','cx','cy','r','x','y','d'].map(a => n.getAttribute(a)))
    const baseline = paths(renderStudySvg(s))
    for (const theme of ['light', 'dark'] as const) for (const palette of ['folio', 'monochrome'] as const) for (const weight of [1.5, 4]) {
      expect(paths(renderStudySvg(s, {}, { theme, palette, weight }))).toEqual(baseline)
      expect(JSON.stringify(geometryFor(s))).toBe(geometry)
    }
  })
  it('removes only construction guides and escapes author-provided text', () => {
    const s = study('sine-wave')
    const withGuides = parseSvg(renderStudySvg(s))
    const without = parseSvg(renderStudySvg(s, {}, { guides: false }))
    expect(withGuides.querySelectorAll('polyline').length - without.querySelectorAll('polyline').length).toBe(2)
    const escaped = renderStudySvg({ ...s, title: '<script> & "test"', description: '</desc><script>x</script>' })
    const doc = parseSvg(escaped)
    expect(doc.querySelector('script')).toBeNull()
    expect(doc.querySelector('title')?.textContent).toBe('<script> & "test"')
  })
  it('validates appearance and keeps theme contrast separate from transparent exports', () => {
    expect(appearanceFor()).toEqual(DEFAULT_APPEARANCE)
    expect(() => appearanceFor({ weight: Infinity })).toThrow()
    expect(() => appearanceFor({ theme: 'bad' as 'light' })).toThrow()
    expect(renderStudySvg(study('sine-wave'), {}, { theme: 'dark' })).toContain('#f4f1e8')
    expect(renderStudySvg(study('sine-wave'), {}, { theme: 'dark' })).toContain('#ffaaa5')
  })
  it('retains the zero vector when construction lines are hidden', () => {
    const s = study('vector-field')
    expect(parseSvg(renderStudySvg(s, {}, { guides: false })).querySelectorAll('circle,polyline').length).toBe(parseSvg(renderStudySvg(s)).querySelectorAll('circle,polyline').length)
    const zero = parseSvg(renderStudySvg(s, {}, { guides: false })).querySelector('circle')!
    expect([zero.getAttribute('cx'), zero.getAttribute('cy'), zero.getAttribute('r')]).toEqual(['160', '120', '2'])
  })
  it.each(['folio', 'monochrome'] as const)('distinguishes both tree search routes without moving geometry in %s', palette => {
    for (const theme of ['light', 'dark'] as const) for (const weight of [1.5, 2.4, 4]) {
      const left = parseSvg(renderStudySvg(study('binary-search-tree'), { target: 1 }, { palette, theme, weight }))
      const right = parseSvg(renderStudySvg(study('binary-search-tree'), { target: 7 }, { palette, theme, weight }))
      const paths = (doc: Document) => [...doc.querySelectorAll('polyline,circle,text')].map(n => ['points','cx','cy','r','x','y'].map(a => n.getAttribute(a)))
      expect(paths(left)).toEqual(paths(right))
      const emphasizedEdges = (doc: Document) => [...doc.querySelectorAll('polyline')].flatMap((n, i) => Number(n.getAttribute('stroke-width')) > weight ? [i] : [])
      expect(emphasizedEdges(left)).toEqual([0, 2])
      expect(emphasizedEdges(right)).toEqual([1, 5])
      expect([...left.querySelectorAll('text[font-weight="700"]')].map(n => n.textContent)).toEqual(['1', '2', '4'])
      expect([...right.querySelectorAll('text[font-weight="700"]')].map(n => n.textContent)).toEqual(['4', '6', '7'])
    }
  })
})
