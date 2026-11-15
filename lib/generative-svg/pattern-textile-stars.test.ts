import { describe, expect, it } from 'vitest'
import { PATTERN_TEXTILE_STARS, COPRIME_STAR_PAIRS, coprimeStarCycle, coprimeStarPolygon, hexagonalBrocadeSegment } from './pattern-textile-stars'
import { geometryFor } from './model'
import { parametersFor, type Mark, type Point } from './definition'
import { createStudyRegistry, searchStudies } from './registry'
import { renderStudySvg } from './render'

const brocade = PATTERN_TEXTILE_STARS[0], stars = PATTERN_TEXTILE_STARS[1]
const local = ([x, y]: Point): Point => [x - 160, 120 - y]
const distancesToHexagon = (point: Point): number[] => {
  const [x, y] = local(point)
  return Array.from({ length: 6 }, (_, side) => x * Math.cos(side * Math.PI / 3) + y * Math.sin(side * Math.PI / 3))
}
const linePoints = (mark: Mark): readonly Point[] => {
  if (mark.kind !== 'line') throw new Error('Expected a line mark')
  return mark.points
}
const brocadeParameters = Array.from({ length: 5 }, (_, i) => Array.from({ length: 3 }, (_, accentFamily) => ({ spacing: 22 + i * 2, accentFamily }))).flat()
const starParameters = Array.from({ length: 4 }, (_, i) => [2, 3].map(layers => ({ pair: i + 1, layers }))).flat()
const allParameters: ReadonlyArray<ReadonlyArray<Readonly<Record<string, number>>>> = [brocadeParameters, starParameters]

describe('triangular mesh brocade', () => {
  it('clips each source line to the exact six half-planes and preserves its equation', () => {
    for (let degrees = 0; degrees < 180; degrees += 5) for (let offset = -105; offset <= 105; offset += 5) {
      const angle = degrees * Math.PI / 180, segment = hexagonalBrocadeSegment(angle, offset)
      if (!segment) continue
      expect(segment).toHaveLength(2)
      expect(Math.hypot(segment[1][0] - segment[0][0], segment[1][1] - segment[0][1])).toBeGreaterThan(1e-8)
      for (const point of segment) {
        const [x, y] = local(point), distances = distancesToHexagon(point)
        expect(x * Math.cos(angle) + y * Math.sin(angle)).toBeCloseTo(offset, 9)
        expect(distances.every(distance => distance <= 88 + 1e-8)).toBe(true)
        expect(Math.max(...distances)).toBeCloseTo(88, 9)
      }
    }
  })

  it('has exactly the declared paired threads and optional underlying centerlines', () => {
    for (const parameters of brocadeParameters) {
      const marks = geometryFor(brocade, parameters).marks
      const guides = marks.filter(mark => mark.role === 'guide')
      const threads = marks.filter(mark => mark.role !== 'guide').slice(0, -1)
      const expectedThreads: { segment: readonly [Point, Point]; family: number; j: number; shift: number }[] = []
      const expectedGuides: (readonly [Point, Point])[] = []
      for (let family = 0; family < 3; family++) for (let j = -6; j <= 6; j++) {
        const angle = family * Math.PI / 3, centerline = hexagonalBrocadeSegment(angle, j * parameters.spacing)
        if (centerline) expectedGuides.push(centerline)
        for (const shift of [-2.4, 2.4]) {
          const segment = hexagonalBrocadeSegment(angle, j * parameters.spacing + shift)
          if (segment) expectedThreads.push({ segment, family, j, shift })
        }
      }
      expect(guides.map(linePoints)).toEqual(expectedGuides)
      expect(threads).toHaveLength(expectedThreads.length)
      for (const [index, { segment, family, j, shift }] of expectedThreads.entries()) {
        const thread = threads[index]
        expect(linePoints(thread)).toEqual(segment)
        for (const point of linePoints(thread)) {
          const [x, y] = local(point)
          expect(x * Math.cos(family * Math.PI / 3) + y * Math.sin(family * Math.PI / 3)).toBeCloseTo(j * parameters.spacing + shift, 10)
          expect(Math.max(...distancesToHexagon(point))).toBeCloseTo(88, 9)
        }
        const accented = family === parameters.accentFamily && j === 0
        expect(thread.role).toBe(accented ? 'accent' : 'ink')
        expect(Boolean(thread.emphasis)).toBe(accented)
        expect(thread.stroke).toBe('fine')
      }
      expect(threads.filter(mark => mark.role === 'accent')).toHaveLength(2)
      const accentOffsets = threads.filter(mark => mark.role === 'accent').map(mark => {
        const [x, y] = local(linePoints(mark)[0]), angle = parameters.accentFamily * Math.PI / 3
        return x * Math.cos(angle) + y * Math.sin(angle)
      })
      expect(accentOffsets[1] - accentOffsets[0]).toBeCloseTo(4.8, 10)
    }
  })

  it('keeps the exact hexagonal frame visible independently of guides', () => {
    const frame = geometryFor(brocade).marks.at(-1)!
    expect(frame).toMatchObject({ kind: 'line', role: 'ink', closed: true, stroke: 'fine' })
    const points = linePoints(frame)
    expect(points).toHaveLength(7)
    expect(points[0]).toEqual(points.at(-1))
    for (const point of points) {
      const [x, y] = local(point), distances = distancesToHexagon(point)
      expect(Math.hypot(x, y)).toBeCloseTo(92 / Math.cos(Math.PI / 6), 10)
      expect(distances.filter(distance => Math.abs(distance - 92) < 1e-8)).toHaveLength(2)
      expect(Math.max(...distances)).toBeCloseTo(92, 9)
    }
    const shown = renderStudySvg(brocade), hidden = renderStudySvg(brocade, {}, { guides: false })
    expect(shown).toContain('stroke-opacity=')
    expect(hidden).not.toContain('stroke-opacity=')
    expect(hidden).toContain('<polygon')
  })

  it('changes only emphasis when selecting the accent family', () => {
    for (let spacing = 22; spacing <= 30; spacing += 2) {
      const geometry = [0, 1, 2].map(accentFamily => geometryFor(brocade, { spacing, accentFamily }))
      expect(geometry[1].marks.map(linePoints)).toEqual(geometry[0].marks.map(linePoints))
      expect(geometry[2].marks.map(linePoints)).toEqual(geometry[0].marks.map(linePoints))
    }
  })

  it('omits outside lines and vertex tangencies but retains full boundary edges', () => {
    expect(hexagonalBrocadeSegment(0, 89)).toBeNull()
    expect(hexagonalBrocadeSegment(Math.PI / 2, 88 / Math.cos(Math.PI / 6))).toBeNull()
    const edge = hexagonalBrocadeSegment(0, 88)!
    expect(edge).not.toBeNull()
    expect(edge[0][0]).toBe(248)
    expect(edge[1][0]).toBe(248)
    expect(Math.abs(edge[0][1] - edge[1][1])).toBeCloseTo(176 / Math.sqrt(3), 10)
    for (const input of [[NaN, 0, 88], [0, Infinity, 88], [0, 0, 0], [0, 0, -1]]) expect(() => hexagonalBrocadeSegment(...input as [number, number, number])).toThrow()
  })
})

describe('coprime star polygons', () => {
  it('uses precisely four coprime pairs and one N-edge cycle for each', () => {
    expect(COPRIME_STAR_PAIRS).toEqual([[7, 2], [9, 4], [11, 3], [13, 5]])
    for (const [vertices, step] of COPRIME_STAR_PAIRS) {
      const commonDivisors = Array.from({ length: step }, (_, i) => i + 1).filter(d => vertices % d === 0 && step % d === 0)
      expect(commonDivisors).toEqual([1])
      const cycle = coprimeStarCycle(vertices, step)
      expect(cycle).toHaveLength(vertices + 1)
      expect(cycle[0]).toBe(0)
      expect(cycle.at(-1)).toBe(0)
      expect([...new Set(cycle.slice(0, -1))].sort((a, b) => a - b)).toEqual(Array.from({ length: vertices }, (_, i) => i))
      for (let j = 1; j <= vertices; j++) expect((cycle[j] - cycle[j - 1] + vertices) % vertices).toBe(step)
      const edges = cycle.slice(0, -1).map((index, j) => [index, cycle[j + 1]].sort((a, b) => a - b).join(','))
      expect(new Set(edges).size).toBe(vertices)
      expect(edges.length).toBeLessThan(vertices * (vertices - 1) / 2)
    }
  })

  it('preserves exact radius, angular step, edge length and closure', () => {
    for (const [vertices, step] of COPRIME_STAR_PAIRS) for (const radius of [48, 72, 96]) {
      const points = coprimeStarPolygon(vertices, step, radius), cycle = coprimeStarCycle(vertices, step)
      expect(points).toHaveLength(vertices + 1)
      expect(points[0]).toEqual(points.at(-1))
      expect(points[0][0]).toBeCloseTo(160, 10)
      expect(points[0][1]).toBe(120 - radius)
      expect(new Set(points.slice(0, -1).map(point => JSON.stringify(point))).size).toBe(vertices)
      for (const [j, point] of points.entries()) {
        const [x, y] = local(point), angle = Math.PI / 2 + 2 * Math.PI * cycle[j] / vertices
        expect(Math.hypot(x, y)).toBeCloseTo(radius, 10)
        expect(x).toBeCloseTo(radius * Math.cos(angle), 10)
        expect(y).toBeCloseTo(radius * Math.sin(angle), 10)
        if (j) expect(Math.hypot(point[0] - points[j - 1][0], point[1] - points[j - 1][1])).toBeCloseTo(2 * radius * Math.sin(Math.PI * step / vertices), 10)
      }
    }
  })

  it('shares an angle across the declared nested radii and emphasizes only radius 72', () => {
    for (const parameters of starParameters) {
      const geometry = geometryFor(stars, parameters), [vertices, step] = COPRIME_STAR_PAIRS[parameters.pair - 1]
      const radii = parameters.layers === 3 ? [48, 72, 96] : [72, 96]
      expect(geometry.marks).toHaveLength(parameters.layers)
      for (const [i, mark] of geometry.marks.entries()) {
        expect(mark).toMatchObject({ kind: 'line', closed: true, stroke: 'fine', role: radii[i] === 72 ? 'accent' : 'ink' })
        expect(Boolean(mark.emphasis)).toBe(radii[i] === 72)
        expect(linePoints(mark)).toEqual(coprimeStarPolygon(vertices, step, radii[i]))
        for (const [j, point] of linePoints(mark).entries()) {
          const [x, y] = local(point), [outerX, outerY] = local(linePoints(geometry.marks.at(-1)!)[j])
          expect(x / radii[i]).toBeCloseTo(outerX / 96, 10)
          expect(y / radii[i]).toBeCloseTo(outerY / 96, 10)
        }
      }
      expect(geometry.marks.filter(mark => mark.role === 'accent')).toHaveLength(1)
    }
  })

  it('rejects disconnected cycles and invalid helper inputs', () => {
    for (const [vertices, step] of [[6, 2], [9, 3], [12, 4], [4, 2], [7, 0], [7, 1], [7, 4], [7.5, 2], [7, 2.5], [Infinity, 2], [129, 2]]) expect(() => coprimeStarCycle(vertices, step)).toThrow()
    for (const radius of [0, -1, NaN, Infinity]) expect(() => coprimeStarPolygon(7, 2, radius)).toThrow()
    expect(() => coprimeStarPolygon(7, 2, 96, NaN)).toThrow()
  })
})

describe('textile and star study contracts', () => {
  it('registers curated pattern tags, exact aliases and bounded meaningful controls', () => {
    const registry = createStudyRegistry(PATTERN_TEXTILE_STARS)
    expect(searchStudies(registry, '', { tag: 'pattern' })).toHaveLength(2)
    for (const study of PATTERN_TEXTILE_STARS) for (const alias of study.aliases) expect(searchStudies(registry, alias)).toContainEqual(study)
    expect(parametersFor(brocade)).toEqual({ spacing: 26, accentFamily: 0 })
    expect(parametersFor(stars)).toEqual({ pair: 3, layers: 3 })
    expect(() => parametersFor(brocade, { spacing: 23 })).toThrow()
    expect(() => parametersFor(brocade, { accentFamily: 3 })).toThrow()
    expect(() => parametersFor(stars, { pair: 0 })).toThrow()
    expect(() => parametersFor(stars, { layers: 4 })).toThrow()
  })

  it('keeps every parameter combination finite and within safe margins', () => {
    for (const [index, study] of PATTERN_TEXTILE_STARS.entries()) for (const parameters of allParameters[index]) {
      const geometry = geometryFor(study, parameters)
      expect(geometry).toEqual(geometryFor(study, parameters))
      for (const mark of geometry.marks) for (const [x, y] of linePoints(mark)) {
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true)
        expect(x).toBeGreaterThanOrEqual(64)
        expect(x).toBeLessThanOrEqual(256)
        expect(y).toBeGreaterThan(13)
        expect(y).toBeLessThan(227)
      }
    }
  })

  it('exports transparent deterministic SVG with style-independent geometry', () => {
    const appearances = [
      { theme: 'light' as const, weight: 1.5, palette: 'folio' as const, emphasis: 1.25 },
      { theme: 'dark' as const, weight: 4, palette: 'monochrome' as const, emphasis: 2 },
      { palette: 'custom' as const, inkColor: '#102030', accentColor: '#a02030', linecap: 'butt' as const },
    ]
    for (const [index, study] of PATTERN_TEXTILE_STARS.entries()) for (const parameters of allParameters[index]) {
      const before = geometryFor(study, parameters), paths: string[][] = []
      for (const appearance of appearances) {
        const svg = renderStudySvg(study, parameters, appearance)
        expect(svg).toBe(renderStudySvg(study, parameters, appearance))
        expect(svg).toContain('viewBox="0 0 320 240"')
        expect(svg).not.toMatch(/<rect|<image|<script|<foreignObject|\bhref=|url\(/)
        expect(svg.match(/\bfill="[^"]+"/g)?.every(fill => fill === 'fill="none"')).toBe(true)
        paths.push([...svg.matchAll(/\bpoints="([^"]+)"/g)].map(match => match[1]))
      }
      expect(paths[1]).toEqual(paths[0])
      expect(paths[2]).toEqual(paths[0])
      expect(geometryFor(study, parameters)).toEqual(before)
    }
  })
})
