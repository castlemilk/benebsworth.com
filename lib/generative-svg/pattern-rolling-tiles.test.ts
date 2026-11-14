// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import type { Mark, Point, Study } from './definition'
import { parametersFor } from './definition'
import { geometryFor } from './model'
import { EPITROCHOID_PEN_OFFSETS, EPITROCHOID_RATIOS, EPITROCHOID_SEGMENTS, HEXAGON_ARC_SEGMENTS, STUDIES, dragonFoldLattice, dragonFoldPath, epitrochoidCrown, hexagonalPatch, hexagonalTruchetArcs } from './pattern-rolling-tiles'
import { createStudyRegistry, searchStudies, studySearchRecords } from './registry'
import { renderStudySvg } from './render'

const [crown, mosaic, dragon] = STUDIES
const pointsOf = (mark: Mark) => { if (mark.kind !== 'line') throw new Error('Expected line'); return mark.points }
const cross = ([ax, ay]: Point, [bx, by]: Point) => ax * by - ay * bx
const difference = ([ax, ay]: Point, [bx, by]: Point): Point => [ax - bx, ay - by]
const dot = ([ax, ay]: Point, [bx, by]: Point) => ax * bx + ay * by
const radius = ([x, y]: Point) => Math.hypot(x - 160, y - 120)
const supportedParameters = (study: Study) => study.parameters.reduce<Record<string, number>[]>((values, parameter) => values.flatMap(value =>
  Array.from({ length: 1 + Math.round((parameter.max - parameter.min) / parameter.step) }, (_, i) => ({ ...value, [parameter.key]: parameter.min + i * parameter.step }))), [{}])
const svgCoordinates = (svg: string) => [...new DOMParser().parseFromString(svg, 'image/svg+xml').querySelectorAll('polyline,polygon,circle')].map(node => ['points', 'cx', 'cy', 'r'].map(key => node.getAttribute(key)))

describe('rolling, tiling and folding pattern studies', () => {
  it('uses the exterior rolling formula and complete closure at every radius ratio and pen reach', () => {
    expect(EPITROCHOID_RATIOS).toEqual([[3, 1], [4, 1], [5, 2]])
    for (let ratio = 1; ratio <= 3; ratio++) for (const pen of [80, 100, 120, 140]) {
      const contours = epitrochoidCrown(ratio, pen), [R, r] = EPITROCHOID_RATIOS[ratio - 1]
      const a = R + r, period = [2 * Math.PI, 2 * Math.PI, 4 * Math.PI][ratio - 1]
      const scale = 96 / (a + r * (pen / 100 + .1))
      expect(contours).toHaveLength(3)
      expect(EPITROCHOID_SEGMENTS).toBe(2048)
      contours.forEach((points, j) => {
        const d = r * (pen / 100 + EPITROCHOID_PEN_OFFSETS[j])
        expect(points).toHaveLength(EPITROCHOID_SEGMENTS + 1)
        expect(points.at(-1)).toBe(points[0])
        // This independently evaluates closure before the exact endpoint is repeated.
        expect(a * Math.cos(period) - d * Math.cos(a * period / r)).toBeCloseTo(a - d, 11)
        expect(a * Math.sin(period) - d * Math.sin(a * period / r)).toBeCloseTo(0, 11)
        for (const index of [0, 1, 173, 512, 1024, 1741, 2047]) {
          const t = period * index / EPITROCHOID_SEGMENTS
          expect(points[index][0]).toBeCloseTo(160 + scale * (a * Math.cos(t) - d * Math.cos(a * t / r)), 10)
          expect(points[index][1]).toBeCloseTo(120 - scale * (a * Math.sin(t) - d * Math.sin(a * t / r)), 10)
        }
        for (const point of points) {
          expect(radius(point)).toBeLessThanOrEqual(96 + 1e-10)
          expect(radius(point)).toBeGreaterThanOrEqual(scale * (a - d) - 1e-10)
        }
        // Classical linear-interpolation bound from ||p''|| ≤ scale(a+d(a/r)²).
        const errorBound = scale * (a + d * (a / r) ** 2) * (period / EPITROCHOID_SEGMENTS) ** 2 / 8
        expect(errorBound).toBeLessThan(.025)
        if (j > 0) expect(contours[j - 1][0][0] - points[0][0]).toBeCloseTo(scale * r / 10, 10)
      })
      // In the 5:2 case, half the declared period is not a closure.
      if (ratio === 3) expect(Math.hypot(...difference(contours[0][1024], contours[0][0]))).toBeGreaterThan(20)
      const marks = geometryFor(crown, { ratio, pen }).marks
      expect(marks.slice(0, 3).map(mark => mark.role)).toEqual(['ink', 'accent', 'ink'])
      expect(marks.slice(0, 3).every(mark => mark.kind === 'line' && mark.closed)).toBe(true)
      expect(marks.some(mark => mark.kind === 'circle')).toBe(false)
      expect(marks.slice(3)).toHaveLength(8)
      marks.slice(3).forEach((mark, index) => {
        const points = pointsOf(mark)
        expect(points).toHaveLength(9)
        expect(mark.kind === 'line' && mark.closed).toBe(false)
        points.forEach(point => expect(radius(point)).toBeCloseTo(index < 4 ? 101 : 104, 10))
        expect(Math.acos(dot(difference(points[0], [160, 120]), difference(points.at(-1)!, [160, 120])) / radius(points[0]) ** 2)).toBeCloseTo(Math.PI / 12, 10)
      })
    }
  })

  it('builds a bounded axial patch with exact hexagon sides and no duplicate guide edges', () => {
    for (const patch of [1, 2]) {
      const { side, tiles } = hexagonalPatch(patch), keys = new Set(tiles.map(tile => tile.axial.join(',')))
      expect(tiles).toHaveLength(1 + 3 * patch * (patch + 1))
      expect(keys.size).toBe(tiles.length)
      for (const tile of tiles) {
        const [q, r] = tile.axial
        expect(Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r))).toBeLessThanOrEqual(patch)
        expect(tile.center).toEqual([160 + 1.5 * side * q, 120 + Math.sqrt(3) * side * (r + q / 2)])
        expect(tile.vertices).toHaveLength(6)
        tile.vertices.forEach((vertex, i) => {
          expect(Math.hypot(...difference(vertex, tile.center))).toBeCloseTo(side, 10)
          expect(Math.hypot(...difference(vertex, tile.vertices[(i + 1) % 6]))).toBeCloseTo(side, 10)
        })
      }
      const vertices = tiles.flatMap(tile => tile.vertices)
      expect(Math.max(...vertices.map(p => p[1])) - Math.min(...vertices.map(p => p[1]))).toBeCloseTo(192, 10)
      expect(Math.max(...vertices.map(p => p[0])) - Math.min(...vertices.map(p => p[0]))).toBeLessThanOrEqual(200)
      const guides = geometryFor(mosaic, { patch, seed: 0 }).marks.filter(mark => mark.role === 'guide')
      expect(guides).toHaveLength(3 * tiles.length + 3 * (2 * patch + 1))
      const edges = guides.map(mark => pointsOf(mark).map(point => point.join(',')).sort().join(';'))
      expect(new Set(edges).size).toBe(edges.length)
    }
  })

  it('uses only the two 120-degree arc pairings, containing every sample within its tile at every seed', () => {
    const neighbors = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]] as const
    for (const patch of [1, 2]) for (let seed = 0; seed < 8; seed++) {
      const { side, tiles } = hexagonalPatch(patch), arcs = hexagonalTruchetArcs(patch, seed)
      const tileKeys = new Set(tiles.map(tile => tile.axial.join(',')))
      const endpoints = new Map<string, { point: Point; arcs: number[]; boundary: boolean }>()
      expect(arcs).toHaveLength(tiles.length * 3)
      for (const [tileIndex, tile] of tiles.entries()) {
        const [q, r] = tile.axial, group = arcs.slice(tileIndex * 3, tileIndex * 3 + 3)
        const residue = ((q * q + 3 * r * r + 5 * q * r + 7 * seed + seed * q + 2 * seed * r) % 11 + 11) % 11
        expect(group.map(arc => arc.vertex)).toEqual(residue < 5 ? [0, 2, 4] : [1, 3, 5])
        expect(new Set(group.flatMap(arc => arc.nodes)).size).toBe(6)
        for (const [localIndex, arc] of group.entries()) {
          expect(arc.tile).toEqual(tile.axial)
          expect(arc.center).toEqual(tile.vertices[arc.vertex])
          expect(arc.radius).toBe(side / 2)
          expect(arc.points).toHaveLength(HEXAGON_ARC_SEGMENTS + 1)
          for (const [i, point] of arc.points.entries()) {
            const radial = difference(point, arc.center)
            expect(Math.hypot(...radial)).toBeCloseTo(side / 2, 10)
            for (let edge = 0; edge < 6; edge++) {
              const a = tile.vertices[edge], b = tile.vertices[(edge + 1) % 6]
              expect(cross(difference(b, a), difference(point, a))).toBeGreaterThanOrEqual(-1e-9)
            }
            if (i) {
              const prior = difference(arc.points[i - 1], arc.center)
              expect(Math.atan2(cross(prior, radial), dot(prior, radial))).toBeCloseTo(-2 * Math.PI / (3 * HEXAGON_ARC_SEGMENTS), 10)
            }
          }
          for (const [end, key] of arc.nodes.entries()) {
            const edge = end === 0 ? (arc.vertex + 5) % 6 : arc.vertex
            const a = tile.vertices[edge], b = tile.vertices[(edge + 1) % 6], point = arc.points[end === 0 ? 0 : HEXAGON_ARC_SEGMENTS]
            expect(point[0]).toBeCloseTo((a[0] + b[0]) / 2, 10)
            expect(point[1]).toBeCloseTo((a[1] + b[1]) / 2, 10)
            const [u, v] = key.split(',').map(Number)
            expect(Number.isInteger(u) && Number.isInteger(v)).toBe(true)
            expect(point).toEqual([160 + u * side / 4, 120 + v * Math.sqrt(3) * side / 4])
            const [dq, dr] = neighbors[edge], boundary = !tileKeys.has(`${q + dq},${r + dr}`)
            if (endpoints.has(key)) {
              const previous = endpoints.get(key)!
              expect(point).toBe(previous.point)
              expect(previous.boundary).toBe(boundary)
              previous.arcs.push(tileIndex * 3 + localIndex)
            } else endpoints.set(key, { point, arcs: [tileIndex * 3 + localIndex], boundary })
          }
        }
      }
      let boundaryCount = 0
      for (const endpoint of endpoints.values()) {
        expect(endpoint.arcs).toHaveLength(endpoint.boundary ? 1 : 2)
        if (endpoint.boundary) boundaryCount++
        expect(new Set(endpoint.arcs.map(i => arcs[i].accent)).size).toBe(1)
      }
      expect(boundaryCount).toBe(6 * (2 * patch + 1))
      expect(endpoints.size).toBe(3 * tiles.length + 3 * (2 * patch + 1))

      const remaining = new Set(arcs.map((_, i) => i)), components: { indices: number[]; boundary: number }[] = []
      while (remaining.size) {
        const pending = [remaining.values().next().value!], indices: number[] = [], boundary = new Set<string>()
        while (pending.length) {
          const i = pending.pop()!
          if (!remaining.delete(i)) continue
          indices.push(i)
          for (const key of arcs[i].nodes) {
            const endpoint = endpoints.get(key)!
            if (endpoint.boundary) boundary.add(key)
            pending.push(...endpoint.arcs)
          }
        }
        expect([0, 2]).toContain(boundary.size)
        expect(new Set(indices.map(i => arcs[i].accent)).size).toBe(1)
        components.push({ indices, boundary: boundary.size })
      }
      expect(components.filter(component => component.boundary === 2)).toHaveLength(boundaryCount / 2)
      const loops = components.filter(component => component.boundary === 0), candidates = loops.length ? loops : components
      candidates.sort((a, b) => b.indices.length - a.indices.length || a.indices[0] - b.indices[0])
      expect(new Set(arcs.flatMap((arc, i) => arc.accent ? [i] : []))).toEqual(new Set(candidates[0].indices))
      // This supported setting exercises the intentional open-path fallback.
      if (patch === 1 && seed === 4) expect(candidates[0].boundary).toBe(2)
    }
  })

  it('retains the exact finite dragon recurrence, unit edges, contacts and complex endpoint at every order', () => {
    let endpoint: Point = [1, 0]
    for (let order = 0; order <= 9; order++) {
      const points = dragonFoldLattice(order), edgeKeys = new Set<string>()
      expect(points).toHaveLength(2 ** order + 1)
      expect(points[0]).toEqual([0, 0])
      expect(points.at(-1)).toEqual(endpoint)
      const turns: number[] = []
      for (let i = 1; i < points.length; i++) {
        expect(points[i].every(Number.isInteger)).toBe(true)
        const step = difference(points[i], points[i - 1])
        expect(dot(step, step)).toBe(1)
        edgeKeys.add([points[i - 1].join(','), points[i].join(',')].sort().join(';'))
        if (i > 1) {
          const prior = difference(points[i - 1], points[i - 2])
          expect(Math.abs(dot(prior, step))).toBe(0)
          turns.push(cross(prior, step))
        }
      }
      expect(edgeKeys.size).toBe(2 ** order)
      if (order) {
        const previous = dragonFoldLattice(order - 1), e = previous.at(-1)!
        expect(points.slice(0, previous.length)).toEqual(previous)
        const rotatedReverse = previous.slice(0, -1).reverse().map(([x, y]) => [e[0] - (e[1] - y), e[1] + (e[0] - x)])
        expect(points.slice(previous.length)).toEqual(rotatedReverse)
        const half = (turns.length - 1) / 2
        expect(turns[half]).toBe(1)
        expect(turns.slice(half + 1)).toEqual(turns.slice(0, half).reverse().map(turn => -turn))
      }
      if (order >= 7) {
        expect(new Set(points.map(point => point.join(','))).size).toBeLessThan(points.length)
        const fitted = dragonFoldPath(order), scale = Math.hypot(...difference(fitted[1], fitted[0]))
        for (let i = 1; i < fitted.length; i++) expect(Math.hypot(...difference(fitted[i], fitted[i - 1]))).toBeCloseTo(scale, 10)
        const xs = fitted.map(point => point[0]), ys = fitted.map(point => point[1])
        expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(160, 10)
        expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(120, 10)
        expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(244 + 1e-10)
        expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(184 + 1e-10)
        expect(Math.max((Math.max(...xs) - Math.min(...xs)) / 244, (Math.max(...ys) - Math.min(...ys)) / 184)).toBeCloseTo(1, 10)
        const marks = geometryFor(dragon, { order }).marks
        expect(pointsOf(marks[0])).toEqual(fitted)
        expect(pointsOf(marks[1])).toEqual(fitted.slice(3 * 2 ** (order - 2)))
        expect(marks.slice(0, 2).map(mark => mark.role)).toEqual(['ink', 'accent'])
        expect(marks.slice(0, 2).every(mark => mark.kind === 'line' && !mark.closed)).toBe(true)
      }
      endpoint = [endpoint[0] - endpoint[1], endpoint[0] + endpoint[1]]
    }
  })

  it('rejects unsupported direct helper inputs', () => {
    for (const [ratio, pen] of [[0, 120], [4, 120], [1.5, 120], [1, 90], [1, NaN], [1, 160]]) expect(() => epitrochoidCrown(ratio, pen)).toThrow()
    for (const patch of [0, 3, 1.5, NaN, Infinity]) expect(() => hexagonalPatch(patch)).toThrow()
    for (const [patch, seed] of [[0, 0], [3, 0], [1, -1], [2, 8], [1, .5], [2, NaN]]) expect(() => hexagonalTruchetArcs(patch, seed)).toThrow()
    for (const order of [-1, 10, .5, NaN, Infinity]) {
      expect(() => dragonFoldLattice(order)).toThrow()
      expect(() => dragonFoldPath(order)).toThrow()
    }
  })

  it.each(STUDIES)('keeps $id deterministic, fine-lined, finite and safely bounded at every supported setting', study => {
    const signatures = new Set<string>()
    for (const parameters of supportedParameters(study)) {
      const geometry = geometryFor(study, parameters)
      signatures.add(JSON.stringify(geometry.marks.map(mark => mark.kind === 'line' ? mark.points : mark.kind === 'circle' ? [mark.center, mark.radius] : mark.at)))
      expect(geometry).toEqual(geometryFor(study, parameters))
      let pointCount = 0
      for (const mark of geometry.marks) {
        expect(mark.stroke).toBe('fine')
        const points = mark.kind === 'line' ? mark.points : mark.kind === 'circle' ? [mark.center] : [mark.at]
        const extent = mark.kind === 'circle' ? mark.radius : 0
        pointCount += points.length
        for (const [x, y] of points) {
          expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true)
          expect(x - extent).toBeGreaterThanOrEqual(32)
          expect(x + extent).toBeLessThanOrEqual(288)
          expect(y - extent).toBeGreaterThanOrEqual(16)
          expect(y + extent).toBeLessThanOrEqual(224)
        }
      }
      expect(geometry.marks.length).toBeLessThan(150)
      expect(pointCount).toBeLessThan(7000)
    }
    expect(signatures.size).toBe(supportedParameters(study).length)
  })

  it.each(STUDIES)('discovers $id and preserves its transparent, reproducible geometry across appearances', study => {
    const registry = createStudyRegistry(STUDIES)
    for (const alias of study.aliases) expect(searchStudies(registry, alias).map(s => s.id)).toContain(study.id)
    expect(searchStudies(registry, study.title, { category: 'Mathematics', tag: 'pattern' }).map(s => s.id)).toContain(study.id)
    expect(studySearchRecords(registry).find(record => record.url.endsWith(`=${study.id}`))?.content).not.toContain(study.basis)
    expect(study.parameters.length).toBeLessThanOrEqual(2)
    expect(parametersFor(study)).toEqual(parametersFor(study, {}))
    const reference = renderStudySvg(study, {}, { guides: false }), coordinates = svgCoordinates(reference)
    expect(reference.length).toBeLessThan(150000)
    for (const theme of ['light', 'dark'] as const) for (const weight of [1.5, 4]) for (const palette of ['folio', 'monochrome'] as const) {
      const svg = renderStudySvg(study, {}, { theme, weight, palette, guides: false })
      expect(svgCoordinates(svg)).toEqual(coordinates)
      const document = new DOMParser().parseFromString(svg, 'image/svg+xml'), recipe = JSON.parse(document.querySelector('metadata')!.textContent!)
      expect(renderStudySvg(study, recipe.parameters, recipe.appearance)).toBe(svg)
      expect(document.querySelector('rect,script,image,foreignObject,parsererror')).toBeNull()
      expect(document.querySelector('[stroke-opacity]')).toBeNull()
      expect(svg).not.toMatch(/NaN|Infinity|url\(|currentColor/)
      expect(Number(document.querySelector('[stroke-width]')!.getAttribute('stroke-width'))).toBeCloseTo(weight * .4, 10)
    }
  })
})
