// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import type { Mark, Point, Study } from './definition'
import { parametersFor } from './definition'
import { geometryFor } from './model'
import { HYPOTROCHOID_RATIOS, HYPOTROCHOID_SEGMENTS, PATTERN_CONSTRUCTIONS, hilbertGrid, hypotrochoidContours, modularChordEdges, squareTruchetArcs } from './pattern-constructions'
import { createStudyRegistry, searchStudies, studySearchRecords } from './registry'
import { renderStudySvg } from './render'

const [filigree, truchet, hilbert, chords] = PATTERN_CONSTRUCTIONS
const pointsOf = (mark: Mark) => { if (mark.kind !== 'line') throw new Error('Expected line'); return mark.points }
const radius = ([x, y]: Point) => Math.hypot(x - 160, y - 120)
const canonical = (a: number, b: number) => [a, b].sort((x, y) => x - y).join(',')
const supportedParameters = (study: Study) => study.parameters.reduce<Record<string, number>[]>((values, parameter) => values.flatMap(value =>
  Array.from({ length: 1 + Math.round((parameter.max - parameter.min) / parameter.step) }, (_, i) => ({ ...value, [parameter.key]: parameter.min + i * parameter.step }))), [{}])
const svgCoordinates = (svg: string) => [...new DOMParser().parseFromString(svg, 'image/svg+xml').querySelectorAll('polyline,polygon,circle')].map(node => ['points', 'cx', 'cy', 'r'].map(key => node.getAttribute(key)))

describe('first-batch pattern constructions', () => {
  it('samples every hypotrochoid ratio over its correct closure period with one uniform radial fit', () => {
    const periods = [4 * Math.PI, 6 * Math.PI, 6 * Math.PI]
    for (let ratio = 1; ratio <= 3; ratio++) for (const pen of [80, 100, 120, 140]) {
      const contours = hypotrochoidContours(ratio, pen), [R, r] = HYPOTROCHOID_RATIOS[ratio - 1]
      const a = R - r, scale = 96 / (a + r * (pen / 100 + .1)), period = periods[ratio - 1]
      expect(contours).toHaveLength(3)
      expect(HYPOTROCHOID_SEGMENTS).toBeLessThanOrEqual(4096)
      contours.forEach((points, j) => {
        const d = r * (pen / 100 + (j - 1) / 10)
        expect(points).toHaveLength(HYPOTROCHOID_SEGMENTS + 1)
        expect(points.at(-1)).toBe(points[0])
        expect(a * Math.cos(period) + d * Math.cos(a * period / r)).toBeCloseTo(a + d, 11)
        expect(a * Math.sin(period) - d * Math.sin(a * period / r)).toBeCloseTo(0, 11)
        for (const index of [0, 1, 137, 512, 1024, 1536, 2047]) {
          const t = period * index / HYPOTROCHOID_SEGMENTS
          expect(points[index][0]).toBeCloseTo(160 + scale * (a * Math.cos(t) + d * Math.cos(a * t / r)), 10)
          expect(points[index][1]).toBeCloseTo(120 - scale * (a * Math.sin(t) - d * Math.sin(a * t / r)), 10)
        }
        for (const point of points) expect(radius(point)).toBeLessThanOrEqual(96 + 1e-10)
        if (j) expect(points[0][0] - contours[j - 1][0][0]).toBeCloseTo(scale * r / 10, 10)
      })
      expect(radius(contours[2][0])).toBeCloseTo(96, 10)
      const marks = geometryFor(filigree, { ratio, pen }).marks
      expect(marks.slice(0, 3).map(m => m.role)).toEqual(['ink', 'accent', 'ink'])
      expect(marks.slice(0, 3).every(m => m.kind === 'line' && m.closed)).toBe(true)
    }
  })

  it('builds exact shared Truchet endpoints, quarter-circles and whole accented circuits at every seed', () => {
    for (const cells of [6, 8]) for (let seed = 0; seed <= 7; seed++) {
      const arcs = squareTruchetArcs(cells, seed), size = 192 / cells
      const endpoints = new Map<string, { point: Point; indices: number[] }>()
      expect(arcs).toHaveLength(cells * cells * 2)
      arcs.forEach((arc, index) => {
        const [x, y] = arc.tile
        expect(arc.points).toHaveLength(25)
        const endpointNodes = arc.nodes.map(key => key.split(',').map(Number))
        expect(Math.abs(endpointNodes[0][0] - endpointNodes[1][0])).toBe(1)
        expect(Math.abs(endpointNodes[0][1] - endpointNodes[1][1])).toBe(1)
        for (const point of arc.points) {
          expect(Math.hypot(point[0] - arc.center[0], point[1] - arc.center[1])).toBeCloseTo(size / 2, 10)
          expect(point[0]).toBeGreaterThanOrEqual(64 + x * size - 1e-10)
          expect(point[0]).toBeLessThanOrEqual(64 + (x + 1) * size + 1e-10)
          expect(point[1]).toBeGreaterThanOrEqual(24 + y * size - 1e-10)
          expect(point[1]).toBeLessThanOrEqual(24 + (y + 1) * size + 1e-10)
        }
        for (const [end, key] of arc.nodes.entries()) {
          const point = arc.points[end === 0 ? 0 : 24], [u, v] = endpointNodes[end]
          expect(point).toEqual([64 + u * size / 2, 24 + v * size / 2])
          if (endpoints.has(key)) {
            expect(point).toBe(endpoints.get(key)!.point)
            endpoints.get(key)!.indices.push(index)
          } else endpoints.set(key, { point, indices: [index] })
        }
      })
      for (let tile = 0; tile < cells * cells; tile++) {
        const pair = arcs.slice(tile * 2, tile * 2 + 2), [x, y] = pair[0].tile
        expect(new Set(pair.flatMap(arc => arc.nodes)).size).toBe(4)
        const topLeft = (x * x + 3 * y * y + 5 * x * y + 7 * seed + seed * x + 2 * seed * y) % 11 < 5
        expect(pair[0].nodes).toEqual(topLeft ? [`${2 * x + 1},${2 * y}`, `${2 * x},${2 * y + 1}`] : [`${2 * x + 2},${2 * y + 1}`, `${2 * x + 1},${2 * y}`])
      }
      let boundaryCount = 0
      for (const [key, { indices }] of endpoints) {
        const [x, y] = key.split(',').map(Number), boundary = x === 0 || y === 0 || x === cells * 2 || y === cells * 2
        expect(indices).toHaveLength(boundary ? 1 : 2)
        if (boundary) { boundaryCount++; expect(arcs[indices[0]].accent).toBe(false) }
        // At every shared vertex, the complete component has one ink role.
        expect(new Set(indices.map(i => arcs[i].accent)).size).toBe(1)
      }
      expect(boundaryCount).toBe(4 * cells)
      const remaining = new Set(arcs.flatMap((arc, i) => arc.accent ? [i] : []))
      let accentCircuits = 0
      while (remaining.size) {
        accentCircuits++
        const pending = [remaining.values().next().value!]
        while (pending.length) {
          const index = pending.pop()!
          if (!remaining.delete(index)) continue
          for (const key of arcs[index].nodes) {
            expect(endpoints.get(key)!.indices).toHaveLength(2)
            pending.push(...endpoints.get(key)!.indices.filter(i => remaining.has(i)))
          }
        }
      }
      expect(accentCircuits).toBeLessThanOrEqual(2)
      const guides = geometryFor(truchet, { cells, seed }).marks.filter(mark => mark.role === 'guide')
      expect(guides).toHaveLength(2 * (cells + 1))
      for (const guide of guides) {
        const [a, b] = pointsOf(guide)
        expect(a[0] === b[0] || a[1] === b[1]).toBe(true)
        expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBe(192)
      }
    }
    expect(squareTruchetArcs(8, 0).map(arc => arc.nodes)).not.toEqual(squareTruchetArcs(8, 1).map(arc => arc.nodes))
  })

  it('uses the standard finite Hilbert recursion with unique lattice vertices and unit adjacency', () => {
    expect(hilbertGrid(1)).toEqual([[0, 0], [0, 1], [1, 1], [1, 0]])
    expect(hilbertGrid(2)).toEqual([[0, 0], [1, 0], [1, 1], [0, 1], [0, 2], [0, 3], [1, 3], [1, 2], [2, 2], [2, 3], [3, 3], [3, 2], [3, 1], [2, 1], [2, 0], [3, 0]])
    for (const order of [2, 3, 4]) {
      const grid = hilbertGrid(order), side = 2 ** order
      expect(grid).toHaveLength(4 ** order)
      expect(new Set(grid.map(point => point.join(','))).size).toBe(4 ** order)
      expect(grid[0]).toEqual([0, 0])
      expect(grid.at(-1)).toEqual([side - 1, 0])
      grid.forEach(([x, y], i) => {
        expect(Number.isInteger(x) && Number.isInteger(y)).toBe(true)
        expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(side)
        expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThan(side)
        if (i) expect(Math.abs(x - grid[i - 1][0]) + Math.abs(y - grid[i - 1][1])).toBe(1)
      })
      const marks = geometryFor(hilbert, { order }).marks, path = pointsOf(marks[0]), accent = pointsOf(marks[1])
      expect(marks[0].kind === 'line' && marks[0].closed).toBe(false)
      expect(accent).toEqual(path.slice(path.length / 4, path.length / 2))
      expect(accent[0]).toBe(path[path.length / 4])
      expect(path[0]).toEqual([64, 24])
      expect(path.at(-1)).toEqual([256, 24])
      expect(Math.min(...path.map(p => p[1]))).toBe(24)
      expect(Math.max(...path.map(p => p[1]))).toBe(216)
      path.forEach((point, i) => {
        if (i) expect(Math.hypot(point[0] - path[i - 1][0], point[1] - path[i - 1][1])).toBeCloseTo(192 / (side - 1), 10)
      })
      expect(marks.slice(2).map(mark => mark.kind === 'circle' && mark.center)).toEqual([path[0], path.at(-1)])
    }
  })

  it('draws the exact modular multiplication graph without fixed points or reversed duplicates', () => {
    const greatestDivisor = (a: number, b: number) => Array.from({ length: Math.min(a, b) }, (_, i) => i + 1).filter(d => a % d === 0 && b % d === 0).at(-1)!
    for (const vertices of [48, 72, 96]) for (let multiplier = 2; multiplier <= 5; multiplier++) {
      const edges = modularChordEdges(vertices, multiplier), keys = edges.map(([a, b]) => canonical(a, b))
      const expected = Array.from({ length: vertices }, (_, n) => [n, multiplier * n % vertices]).filter(([a, b]) => a !== b).map(([a, b]) => canonical(a, b))
      expect(new Set(keys)).toEqual(new Set(expected))
      expect(new Set(keys).size).toBe(edges.length)
      expect(edges).toHaveLength(vertices - (greatestDivisor(multiplier - 1, vertices) + greatestDivisor(multiplier * multiplier - 1, vertices)) / 2)
      edges.forEach(([a, b]) => { expect(b).toBe(multiplier * a % vertices); expect(a).not.toBe(b) })
      const orbitEdges = new Set<string>(), orbitVertices = new Set<number>()
      for (let n = 1; !orbitVertices.has(n); n = n * multiplier % vertices) {
        orbitVertices.add(n)
        const next = n * multiplier % vertices
        if (n !== next) orbitEdges.add(canonical(n, next))
      }
      const marks = geometryFor(chords, { vertices, multiplier }).marks
      edges.forEach(([a, b], i) => {
        const points = pointsOf(marks[i])
        expect(points).toHaveLength(2)
        for (const [j, n] of [a, b].entries()) {
          expect(radius(points[j])).toBeCloseTo(96, 10)
          expect(points[j][0]).toBeCloseTo(160 - 96 * Math.sin(2 * Math.PI * n / vertices), 10)
          expect(points[j][1]).toBeCloseTo(120 - 96 * Math.cos(2 * Math.PI * n / vertices), 10)
        }
        expect(marks[i].role).toBe(orbitEdges.has(canonical(a, b)) ? 'accent' : 'ink')
      })
      expect(marks.filter(mark => mark.role === 'guide')).toHaveLength(vertices)
      expect(marks.filter(mark => mark.role === 'accent')).toHaveLength(orbitEdges.size)
    }
  })

  it('rejects unsupported direct helper inputs', () => {
    for (const [a, b] of [[0, 120], [4, 120], [1, 90], [1, NaN], [1.5, 120]]) expect(() => hypotrochoidContours(a, b)).toThrow()
    for (const [a, b] of [[7, 1], [8, -1], [6, 8], [6, .5], [NaN, 1]]) expect(() => squareTruchetArcs(a, b)).toThrow()
    for (const order of [-1, 5, .5, NaN]) expect(() => hilbertGrid(order)).toThrow()
    for (const [a, b] of [[64, 2], [48, 1], [96, 6], [72, 2.5], [NaN, 2]]) expect(() => modularChordEdges(a, b)).toThrow()
  })

  it.each(PATTERN_CONSTRUCTIONS.flatMap(study => supportedParameters(study).map(parameters => ({ study, parameters }))))(
    'keeps $study.id deterministic, finite, fine-lined and bounded at $parameters', ({ study, parameters }) => {
      const geometry = geometryFor(study, parameters)
      expect(geometry).toEqual(geometryFor(study, parameters))
      let pointCount = 0
      for (const mark of geometry.marks) {
        expect(mark.stroke).toBe('fine')
        const points = mark.kind === 'line' ? mark.points : mark.kind === 'circle' ? [mark.center] : [mark.at]
        pointCount += points.length
        for (const [x, y] of points) {
          expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true)
          expect(x).toBeGreaterThanOrEqual(56); expect(x).toBeLessThanOrEqual(264)
          expect(y).toBeGreaterThanOrEqual(16); expect(y).toBeLessThanOrEqual(224)
        }
      }
      expect(pointCount).toBeLessThan(10000)
    })

  it.each(PATTERN_CONSTRUCTIONS)('discovers $id and preserves its transparent recipe and permanent geometry across appearances', study => {
    const registry = createStudyRegistry(PATTERN_CONSTRUCTIONS)
    for (const alias of study.aliases) expect(searchStudies(registry, alias).map(s => s.id)).toContain(study.id)
    expect(searchStudies(registry, study.title, { category: 'Mathematics', tag: 'pattern' }).map(s => s.id)).toContain(study.id)
    expect(studySearchRecords(registry).find(record => record.url.endsWith(`=${study.id}`))?.content).not.toContain(study.basis)
    expect(study.parameters.length).toBeLessThanOrEqual(2)
    expect(parametersFor(study)).toEqual(parametersFor(study, {}))
    const reference = renderStudySvg(study, {}, { guides: false }), coordinates = svgCoordinates(reference)
    expect(reference.length).toBeLessThan(160000)
    for (const theme of ['light', 'dark'] as const) for (const weight of [1.5, 4]) {
      const svg = renderStudySvg(study, {}, { theme, weight, palette: 'monochrome', guides: false })
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
