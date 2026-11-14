// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import type { Point, Study } from './definition'
import { parametersFor } from './definition'
import { geometryFor } from './model'
import { createStudyRegistry, searchStudies } from './registry'
import { renderStudySvg } from './render'
import { confocalLoom, ellipticPoint, LOOM_FOCAL_DISTANCE as C, PATTERN_ELLIPSE_STRINGS, parabolicCornerStrings, stringCornerPoint } from './pattern-ellipse-strings'

const [loomStudy, fanStudy] = PATTERN_ELLIPSE_STRINGS
const settings = (study: Study) => study.parameters.reduce<Record<string, number>[]>((all, p) => all.flatMap(previous => Array.from({ length: 1 + Math.round((p.max - p.min) / p.step) }, (_, i) => ({ ...previous, [p.key]: p.min + i * p.step }))), [{}])
const key = ([x, y]: Point) => `${x.toFixed(8)},${y.toFixed(8)}`
const svgGeometry = (svg: string) => [...new DOMParser().parseFromString(svg, 'image/svg+xml').querySelectorAll('polyline,polygon,circle')].map(node => ['points', 'cx', 'cy', 'r'].map(attr => node.getAttribute(attr)))

describe('confocal ellipses and string corners', () => {
  it.each(settings(loomStudy))('preserves conic identities and shared foci at $outer / $density', ({ outer, density }) => {
    const loom = confocalLoom(outer, density)
    expect(loom.ellipses).toHaveLength(density)
    expect(loom.branches).toHaveLength(2 * density)
    expect(loom.scale).toBe(Math.min(112 / (C * Math.cosh(outer)), 92 / (C * Math.sinh(outer))))
    for (const { mu, points } of loom.ellipses) {
      expect(points).toHaveLength(513)
      expect(points.at(-1)).toBe(points[0])
      const a = C * Math.cosh(mu), b = C * Math.sinh(mu)
      expect(a * a - b * b).toBeCloseTo(C * C, 9)
      for (const index of [0, 7, 83, 128, 256, 384, 511]) {
        const [px, py] = points[index], x = (px - 160) / loom.scale, y = (120 - py) / loom.scale
        expect(x * x / (a * a) + y * y / (b * b)).toBeCloseTo(1, 11)
        expect(Math.hypot(x - C, y) + Math.hypot(x + C, y)).toBeCloseTo(2 * a, 10)
        const nu = 2 * Math.PI * index / 512
        const dmu = [C * Math.sinh(mu) * Math.cos(nu), C * Math.cosh(mu) * Math.sin(nu)]
        const dnu = [-C * Math.cosh(mu) * Math.sin(nu), C * Math.sinh(mu) * Math.cos(nu)]
        expect(dmu[0] * dnu[0] + dmu[1] * dnu[1]).toBeCloseTo(0, 10)
      }
    }
    for (const { nu, points } of loom.branches) {
      expect(points).toHaveLength(257)
      const a = C * Math.cos(nu), b = C * Math.sin(nu)
      expect(a * a + b * b).toBeCloseTo(C * C, 10)
      expect(Math.abs(a)).toBeGreaterThan(1)
      for (const index of [0, 37, 128, 191, 256]) {
        const [px, py] = points[index], x = (px - 160) / loom.scale, y = (120 - py) / loom.scale
        expect(x * x / (a * a) - y * y / (b * b)).toBeCloseTo(1, 10)
        expect(Math.abs(Math.hypot(x - C, y) - Math.hypot(x + C, y))).toBeCloseTo(2 * Math.abs(a), 10)
        expect(Math.sign(x)).toBe(Math.sign(a))
      }
      for (const [px, py] of [points[0], points.at(-1)!]) {
        const x = (px - 160) / loom.scale, y = (120 - py) / loom.scale
        expect((x / (C * Math.cosh(outer))) ** 2 + (y / (C * Math.sinh(outer))) ** 2).toBeCloseTo(1, 10)
      }
    }
    expect(loom.foci).toEqual([[160 - C * loom.scale, 120], [160 + C * loom.scale, 120]])
  })

  it.each(settings(fanStudy))('renders unique exact string segments with a central void at $count / $leg', ({ count, leg }) => {
    const { boundary, strings } = parabolicCornerStrings(count, leg)
    expect(boundary).toHaveLength(4)
    expect(strings).toHaveLength(4 * (count - 2))
    expect(strings.filter(s => s.accent)).toHaveLength(3)
    const all = [...boundary, ...strings]
    expect(new Set(all.map(s => s.points.map(key).sort().join('|'))).size).toBe(all.length)
    boundary.forEach(({ points: [a, b] }) => expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBe(184))
    for (const { corner, u, points } of strings) {
      expect(points).toEqual([stringCornerPoint(corner, [leg * u, 0]), stringCornerPoint(corner, [0, leg * (1 - u)])])
      // The local envelope touches its own line and has a parallel tangent.
      const x = leg * u * u, y = leg * (1 - u) ** 2
      expect(x / u + y / (1 - u)).toBeCloseTo(leg, 10)
      expect(2 * leg * u * (leg * (1 - u)) - (-2 * leg * (1 - u)) * (-leg * u)).toBeCloseTo(0, 8)
      const [a, b] = points
      for (const t of [0, .25, .5, .75, 1]) {
        const px = a[0] + t * (b[0] - a[0]), py = a[1] + t * (b[1] - a[1])
        expect(Math.abs(px - 160) + Math.abs(py - 120)).toBeGreaterThanOrEqual(184 - leg - 1e-9)
      }
    }
    const distance = ([x, y]: Point, [u, v]: Point) => Math.hypot(x - u, y - v)
    for (let corner = 0; corner < 4; corner++) expect(distance(stringCornerPoint(corner, [10, 40]), stringCornerPoint(corner, [70, 20]))).toBeCloseTo(Math.hypot(60, 20), 11)
  })

  it.each(PATTERN_ELLIPSE_STRINGS.flatMap(study => settings(study).map(parameters => ({ study, parameters }))))('keeps $study.id finite and deterministic at $parameters', ({ study, parameters }) => {
    const g = geometryFor(study, parameters)
    expect(g).toEqual(geometryFor(study, parameters))
    let count = 0
    for (const mark of g.marks) {
      expect(mark.stroke).toBe('fine')
      const points = mark.kind === 'line' ? mark.points : mark.kind === 'circle' ? [mark.center] : [mark.at]
      count += points.length
      expect(points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && x >= 40 && x <= 280 && y >= 24 && y <= 216)).toBe(true)
    }
    expect(count).toBeLessThan(10000)
  })

  it.each(PATTERN_ELLIPSE_STRINGS)('discovers $id and preserves geometry across portable appearances', study => {
    const registry = createStudyRegistry(PATTERN_ELLIPSE_STRINGS)
    for (const alias of study.aliases) expect(searchStudies(registry, alias).map(result => result.id)).toContain(study.id)
    expect(searchStudies(registry, study.title, { tag: 'pattern' }).map(result => result.id)).toContain(study.id)
    const reference = renderStudySvg(study, {}, { guides: false })
    for (const theme of ['light', 'dark'] as const) for (const weight of [1.5, 4]) {
      const svg = renderStudySvg(study, {}, { theme, weight, palette: 'monochrome', guides: false })
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml'), recipe = JSON.parse(doc.querySelector('metadata')!.textContent!)
      expect(svgGeometry(svg)).toEqual(svgGeometry(reference))
      expect(renderStudySvg(study, recipe.parameters, recipe.appearance)).toBe(svg)
      expect(doc.querySelector('rect,image,script,foreignObject,parsererror')).toBeNull()
      expect(svg).not.toMatch(/NaN|Infinity|url\(|currentColor/)
      expect(svg.length).toBeLessThan(160000)
    }
    expect(parametersFor(study)).toEqual(parametersFor(study, {}))
  })

  it('rejects invalid direct helper parameters', () => {
    for (const [a, b] of [[1, 3], [1.6, 4], [1.15, 5], [1.4, 2], [NaN, 3]]) expect(() => confocalLoom(a, b)).toThrow()
    for (const [a, b] of [[13, 128], [18, 127], [NaN, 140]]) expect(() => parabolicCornerStrings(a, b)).toThrow()
    expect(() => ellipticPoint(Infinity, 0)).toThrow()
    expect(() => stringCornerPoint(4, [0, 0])).toThrow()
  })
})
