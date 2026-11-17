// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { parametersFor, type Mark, type Point, type Study } from './definition'
import { geometryFor, markPoints } from './model'
import { PATTERN_PARQUET_LEVY, levyLacePath, levyLacePolygon, rhombilleParquet } from './pattern-parquet-levy'
import { dragonFoldPath, hexagonalPatch } from './pattern-rolling-tiles'
import { createStudyRegistry, searchStudies, studySearchRecords } from './registry'
import { renderStudySvg } from './render'

const [parquet, levy] = PATTERN_PARQUET_LEVY
const difference = ([ax, ay]: Point, [bx, by]: Point): Point => [ax - bx, ay - by]
const cross = ([ax, ay]: Point, [bx, by]: Point) => ax * by - ay * bx
const dot = ([ax, ay]: Point, [bx, by]: Point) => ax * bx + ay * by
const length = (point: Point) => Math.hypot(...point)
const area = (points: readonly Point[]) => points.reduce((sum, point, i) => sum + cross(point, points[(i + 1) % points.length]), 0) / 2
const pointsOf = (mark: Mark) => { if (mark.kind !== 'line') throw new Error('Expected line'); return mark.points }
const edgeKey = (a: string, b: string) => [a, b].sort().join(';')
const supportedParameters = (study: Study) => study.parameters.reduce<Record<string, number>[]>((values, parameter) => values.flatMap(value =>
  Array.from({ length: 1 + Math.round((parameter.max - parameter.min) / parameter.step) }, (_, i) => ({ ...value, [parameter.key]: parameter.min + i * parameter.step }))), [{}])
const settings = PATTERN_PARQUET_LEVY.flatMap(study => supportedParameters(study).map(parameters => ({ study, parameters, label: `${study.id} ${JSON.stringify(parameters)}` })))
const svgCoordinates = (svg: string) => [...new DOMParser().parseFromString(svg, 'image/svg+xml').querySelectorAll('polyline,polygon,circle,path')].map(node => ['points', 'cx', 'cy', 'r', 'd'].map(key => node.getAttribute(key)))

describe('rhombille parquet and Lévy lace studies', () => {
  it.each(supportedParameters(parquet))('tiles exact rhombi with unique lattice edges for patch $patch, inset $inset', ({ patch, inset }) => {
    const { side, faces, edges } = rhombilleParquet(patch, inset), { tiles } = hexagonalPatch(patch)
    const count = 1 + 3 * patch * (patch + 1), endpoints = new Map<string, Point>(), incidence = new Map<string, number>()
    expect(tiles).toHaveLength(count)
    expect(faces).toHaveLength(3 * count)
    expect(edges).toHaveLength(6 * count + 3 * (2 * patch + 1))
    for (const [tileIndex, tile] of tiles.entries()) {
      const group = faces.slice(3 * tileIndex, 3 * tileIndex + 3)
      expect(group.map(face => face.orientation)).toEqual([0, 1, 2])
      expect(group.reduce((sum, face) => sum + area(face.points), 0)).toBeCloseTo(3 * Math.sqrt(3) * side ** 2 / 2, 8)
      for (const face of group) {
        expect(face.tile).toEqual(tile.axial)
        const start = 2 * face.orientation
        expect(face.points).toEqual([tile.center, tile.vertices[start], tile.vertices[(start + 1) % 6], tile.vertices[(start + 2) % 6]])
        expect(area(face.points)).toBeCloseTo(Math.sqrt(3) * side ** 2 / 2, 8)
        expect(area(face.inset)).toBeCloseTo(area(face.points) * (inset / 100) ** 2, 8)
        for (const [i, point] of face.points.entries()) {
          const previous = face.points[(i + 3) % 4], next = face.points[(i + 1) % 4]
          expect(length(difference(next, point))).toBeCloseTo(side, 10)
          expect(dot(difference(previous, point), difference(next, point)) / side ** 2).toBeCloseTo(i % 2 === 0 ? -.5 : .5, 10)
          const key = face.nodes[i], [u, v] = key.split(',').map(Number)
          expect(Number.isInteger(u) && Number.isInteger(v)).toBe(true)
          expect(point).toEqual([160 + u * side / 2, 120 + v * Math.sqrt(3) * side / 2])
          if (endpoints.has(key)) expect(point).toBe(endpoints.get(key))
          else endpoints.set(key, point)
          const edge = edgeKey(key, face.nodes[(i + 1) % 4])
          incidence.set(edge, (incidence.get(edge) ?? 0) + 1)
          expect(face.inset[i]).toEqual([face.centroid[0] + (point[0] - face.centroid[0]) * inset / 100, face.centroid[1] + (point[1] - face.centroid[1]) * inset / 100])
          expect(length(difference(face.inset[(i + 1) % 4], face.inset[i]))).toBeCloseTo(side * inset / 100, 10)
          for (let edgeIndex = 0; edgeIndex < 4; edgeIndex++) {
            const a = face.points[edgeIndex], b = face.points[(edgeIndex + 1) % 4]
            expect(cross(difference(b, a), difference(face.inset[i], a))).toBeGreaterThan(0)
          }
        }
        expect(face.centroid[0]).toBeCloseTo((face.points[0][0] + face.points[2][0]) / 2, 10)
        expect(face.centroid[1]).toBeCloseTo((face.points[0][1] + face.points[2][1]) / 2, 10)
      }
    }
    expect(new Set(edges.map(edge => edgeKey(...edge.nodes)))).toEqual(new Set(incidence.keys()))
    expect(new Set(edges.map(edge => edgeKey(...edge.nodes))).size).toBe(edges.length)
    expect([...incidence.values()].every(uses => uses === 1 || uses === 2)).toBe(true)
    expect([...incidence.values()].filter(uses => uses === 1)).toHaveLength(6 * (2 * patch + 1))
    expect(endpoints.size - edges.length + faces.length).toBe(1)
    for (const edge of edges) for (const [i, key] of edge.nodes.entries()) expect(edge.points[i]).toBe(endpoints.get(key))

    const accents = faces.filter(face => face.accent)
    expect(accents).toHaveLength(1)
    expect(accents[0].tile).toEqual([0, 0])
    expect(accents[0].orientation).toBe(0)
    const marks = geometryFor(parquet, { patch, inset }).marks
    expect(marks.slice(0, edges.length).map(pointsOf)).toEqual(edges.map(edge => edge.points))
    expect(marks.slice(edges.length).map(pointsOf)).toEqual(faces.map(face => face.inset))
    expect(marks.filter(mark => mark.role === 'accent')).toEqual([expect.objectContaining({ kind: 'line', points: accents[0].inset, closed: true, emphasis: true })])
    expect(marks.some(mark => mark.role === 'guide')).toBe(false)
    // Clearance uses perpendicular distance, not radial separation near acute corners.
    const smallestClearance = (1 - inset / 100) * side * Math.sqrt(3) / 4
    expect(smallestClearance).toBeGreaterThan((4 * .4 + 4 * .4 * 2) / 2)
  })

  it('varies only the inset contours when their scale changes and rejects the colliding 80% maximum', () => {
    expect(parametersFor(parquet)).toEqual({ patch: 2, inset: 70 })
    expect(parquet.parameters.find(parameter => parameter.key === 'inset')?.max).toBe(70)
    for (const patch of [1, 2]) {
      const first = rhombilleParquet(patch, 60), second = rhombilleParquet(patch, 70)
      expect(first.edges).toEqual(second.edges)
      expect(first.faces.map(face => face.points)).toEqual(second.faces.map(face => face.points))
      expect(first.faces.map(face => face.inset)).not.toEqual(second.faces.map(face => face.inset))
    }
    expect(() => rhombilleParquet(2, 80)).toThrow()
  })

  it.each(Array.from({ length: 9 }, (_, order) => ({ order })))('retains exact Lévy recurrence, endpoints and segment lengths at order $order', ({ order }) => {
    const points = levyLacePolygon(order)
    expect(points).toHaveLength(2 ** order + 1)
    expect(points[0]).toEqual([0, 0])
    expect(points.at(-1)).toEqual([1, 0])
    for (let i = 1; i < points.length; i++) expect(length(difference(points[i], points[i - 1]))).toBeCloseTo(2 ** (-order / 2), 12)
    if (!order) return
    const previous = levyLacePolygon(order - 1)
    for (let i = 1; i < previous.length; i++) {
      const a = previous[i - 1], b = previous[i], midpoint = points[2 * i - 1], offset = difference(b, a)
      expect(points[2 * i - 2]).toEqual(a)
      expect(points[2 * i]).toEqual(b)
      expect(midpoint).toEqual([(a[0] + b[0]) / 2 - offset[1] / 2, (a[1] + b[1]) / 2 + offset[0] / 2])
      expect(Math.abs(dot(difference(midpoint, a), difference(b, midpoint)))).toBe(0)
      expect(cross(offset, difference(midpoint, a))).toBeGreaterThan(0)
    }
  })

  it.each(supportedParameters(levy))('uniformly fits and accents exactly the final recursive quarter at order $order', ({ order }) => {
    const polygon = levyLacePolygon(order), points = levyLacePath(order)
    const xs = polygon.map(point => point[0]), ys = polygon.map(point => point[1])
    const width = Math.max(...xs) - Math.min(...xs), height = Math.max(...ys) - Math.min(...ys)
    const scale = Math.min(244 / width, 184 / height), mx = (Math.max(...xs) + Math.min(...xs)) / 2, my = (Math.max(...ys) + Math.min(...ys)) / 2
    points.forEach((point, i) => {
      expect(point).toEqual([160 + (polygon[i][0] - mx) * scale, 120 - (polygon[i][1] - my) * scale])
      if (i) expect(length(difference(point, points[i - 1]))).toBeCloseTo(2 ** (-order / 2) * scale, 10)
    })
    const displayX = points.map(point => point[0]), displayY = points.map(point => point[1])
    expect((Math.min(...displayX) + Math.max(...displayX)) / 2).toBeCloseTo(160, 10)
    expect((Math.min(...displayY) + Math.max(...displayY)) / 2).toBeCloseTo(120, 10)
    expect(Math.max(...displayX) - Math.min(...displayX)).toBeLessThanOrEqual(244 + 1e-10)
    expect(Math.max(...displayY) - Math.min(...displayY)).toBeLessThanOrEqual(184 + 1e-10)
    expect(Math.max(width * scale / 244, height * scale / 184)).toBeCloseTo(1, 10)
    expect(points).not.toEqual(dragonFoldPath(order))
    const marks = geometryFor(levy, { order }).marks
    expect(marks).toHaveLength(4)
    expect(pointsOf(marks[0])).toEqual(points)
    expect(pointsOf(marks[1])).toEqual(points.slice(3 * 2 ** (order - 2)))
    expect(pointsOf(marks[1])).toHaveLength(2 ** (order - 2) + 1)
    expect(marks[1]).toMatchObject({ role: 'accent', emphasis: true, closed: false })
    expect(marks.slice(2)).toEqual([points[0], points.at(-1)].map(center => ({ kind: 'circle', center, radius: 2.4, role: 'ink', stroke: 'fine' })))
  })

  it('preserves genuine order-eight Lévy contacts and repeated edges instead of claiming a simple curve', () => {
    const points = levyLacePolygon(8), display = levyLacePath(8)
    expect(new Set(points.map(point => point.join(','))).size).toBe(214)
    expect(new Set(points.slice(1).map((point, i) => edgeKey(point.join(','), points[i].join(',')))).size).toBe(233)
    const firstOccurrence = new Map<string, Point>()
    points.forEach((point, i) => {
      const key = point.join(',')
      if (firstOccurrence.has(key)) expect(display[i]).toEqual(firstOccurrence.get(key))
      else firstOccurrence.set(key, display[i])
    })
    expect(parametersFor(levy)).toEqual({ order: 8 })
    expect(levy.basis).toContain('overlapping segments')
    // The smallest order-eight lattice pocket still exceeds the bold accent width.
    expect(length(difference(display[1], display[0]))).toBeGreaterThan(2 * 4 * .4)
  })

  it('rejects unsupported direct helper inputs', () => {
    for (const patch of [0, 3, 1.5, NaN, Infinity]) expect(() => rhombilleParquet(patch, 70)).toThrow()
    for (const inset of [50, 65, 80, NaN, Infinity]) expect(() => rhombilleParquet(2, inset)).toThrow()
    for (const order of [-1, 9, .5, NaN, Infinity]) {
      expect(() => levyLacePolygon(order)).toThrow()
      expect(() => levyLacePath(order)).toThrow()
    }
  })

  it.each(settings)('keeps $label deterministic, permanent, fine-lined and safely bounded', ({ study, parameters }) => {
    const geometry = geometryFor(study, parameters)
    expect(geometry).toEqual(geometryFor(study, parameters))
    let pointCount = 0
    for (const mark of geometry.marks) {
      expect(mark.stroke).toBe('fine')
      expect(mark.role).not.toBe('guide')
      const points = markPoints(mark)
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
    expect(pointCount).toBeLessThan(1000)
    expect(geometry.marks.length).toBeLessThan(200)
  })

  it.each(settings)('exports transparent reproducible recipes with appearance-independent geometry for $label', ({ study, parameters }) => {
    const reference = renderStudySvg(study, parameters), coordinates = svgCoordinates(reference)
    expect(reference.length).toBeLessThan(75000)
    for (const theme of ['light', 'dark'] as const) for (const weight of [1.5, 4]) for (const palette of ['folio', 'monochrome'] as const) {
      const svg = renderStudySvg(study, parameters, { theme, weight, palette, emphasis: weight === 4 ? 2 : 1.25, guides: false })
      expect(svgCoordinates(svg)).toEqual(coordinates)
      const document = new DOMParser().parseFromString(svg, 'image/svg+xml'), recipe = JSON.parse(document.querySelector('metadata')!.textContent!)
      expect(recipe.parameters).toEqual(parameters)
      expect(renderStudySvg(study, recipe.parameters, recipe.appearance)).toBe(svg)
      expect(document.querySelector('rect,script,image,foreignObject,parsererror')).toBeNull()
      expect(document.querySelector('[stroke-opacity]')).toBeNull()
      expect([...document.querySelectorAll('polyline,polygon,circle,path')].every(node => node.getAttribute('fill') === 'none')).toBe(true)
      expect(svg).not.toMatch(/NaN|Infinity|url\(|currentColor/)
      expect(Number(document.querySelector('[stroke-width]')!.getAttribute('stroke-width'))).toBeCloseTo(weight * .4, 10)
      const emphasis = [...document.querySelectorAll('[stroke-width]')].filter(node => Number(node.getAttribute('stroke-width')) > weight * .4 + 1e-8)
      expect(emphasis).toHaveLength(1)
    }
  })

  it.each(PATTERN_PARQUET_LEVY)('discovers $id by curated names and preserves distinct settings', study => {
    const registry = createStudyRegistry(PATTERN_PARQUET_LEVY)
    for (const alias of study.aliases) expect(searchStudies(registry, alias).map(result => result.id)).toContain(study.id)
    expect(searchStudies(registry, study.title, { category: 'Mathematics', tag: 'pattern' }).map(result => result.id)).toContain(study.id)
    expect(studySearchRecords(registry).find(record => record.url.endsWith(`=${study.id}`))?.content).not.toContain(study.basis)
    expect(new Set(supportedParameters(study).map(parameters => JSON.stringify(geometryFor(study, parameters)))).size).toBe(supportedParameters(study).length)
  })
})
