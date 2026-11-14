import { describe, expect, it } from 'vitest'
import { LISSAJOUS_SILK_PAIRS, PATTERN_SILK_WARP, sinusoidalWarpPoint } from './pattern-silk-warp'
import { parametersFor, type Mark, type Point } from './definition'
import { geometryFor } from './model'
import { createStudyRegistry, searchStudies } from './registry'
import { renderStudySvg } from './render'

const silk = PATTERN_SILK_WARP[0], warp = PATTERN_SILK_WARP[1]
const TAU = 2 * Math.PI, SILK_INTERVALS = 1536, WARP_INTERVALS = 192
const local = ([x, y]: Point): Point => [x - 160, 120 - y]
const linePoints = (mark: Mark): readonly Point[] => {
  if (mark.kind !== 'line') throw new Error('Expected a line mark')
  return mark.points
}
const phaseControl = silk.parameters.find(parameter => parameter.key === 'phase')!
const silkCases = LISSAJOUS_SILK_PAIRS.flatMap((_, index) => Array.from({ length: 1 + (phaseControl.max - phaseControl.min) / phaseControl.step }, (_, j) => ({ pair: index + 1, phase: phaseControl.min + j * phaseControl.step })))
const warpCases = [8, 12, 16, 20, 24].flatMap(amplitude => [24, 28].map(pitch => ({ amplitude, pitch })))
const pointKey = (point: Point): string => point.map(coordinate => coordinate.toFixed(7)).join(',')
const edgesOf = (points: readonly Point[]): string[] => points.slice(0, -1).map((point, index) => [pointKey(point), pointKey(points[index + 1])].sort().join('|'))
const cross = ([ax, ay]: Point, [bx, by]: Point): number => ax * by - ay * bx
const subtract = ([ax, ay]: Point, [bx, by]: Point): Point => [ax - bx, ay - by]
const intersection = (a: Point, b: Point, c: Point, d: Point): Point | null => {
  const r = subtract(b, a), s = subtract(d, c), denominator = cross(r, s)
  if (Math.abs(denominator) < 1e-10) return null
  const displacement = subtract(c, a), t = cross(displacement, s) / denominator, u = cross(displacement, r) / denominator
  return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9 ? [a[0] + t * r[0], a[1] + t * r[1]] : null
}

type SourceThread = { vertical: boolean; offset: number; accent: boolean }
const sourceThreads = (pitch: number): SourceThread[] => {
  const threads: SourceThread[] = []
  for (const vertical of [true, false]) for (let j = -5; j <= 5; j++) {
    if (Math.abs(j * pitch) + 2.4 > (vertical ? 96 : 88)) continue
    for (const shift of [-2.4, 2.4]) threads.push({ vertical, offset: j * pitch + shift, accent: vertical && j === 0 })
  }
  return [...threads.filter(thread => !thread.accent), ...threads.filter(thread => thread.accent)]
}

describe('Lissajous silk', () => {
  it('declares only the curated coprime pairs and keeps the rectangular study free of a frame', () => {
    expect(LISSAJOUS_SILK_PAIRS).toEqual([[3, 4], [4, 5], [5, 6]])
    expect(silk.provenance).toBe('math-derived')
    expect(silk.basis).toContain('1536 equal parameter intervals')
    expect(silk.basis).toContain('not parallel offsets or woven threads')
    expect(geometryFor(silk).marks).toHaveLength(3)
    expect(geometryFor(silk).marks.every(mark => mark.role !== 'guide')).toBe(true)
  })

  for (const [p, q] of LISSAJOUS_SILK_PAIRS) it(`excludes equivalent whole-triplet variants for frequencies ${p}/${q}`, () => {
    const phases = silkCases.filter(parameters => parameters.pair === p - 2).map(parameters => parameters.phase)
    expect(phases).toEqual([16, 26, 36, 46, 56])
    for (let i = 0; i < phases.length; i++) for (let j = i + 1; j < phases.length; j++) {
      // Time shifts preserve the h labels; time reflections exchange h = −10 and +10.
      // For p = q−1, the entire triple shares its loci exactly when φ′ ≡ φ
      // or φ′ ≡ 180°/q − φ (mod 360°/q), since the accented h = 0 locus must agree.
      expect(Math.abs(Math.sin(q * (phases[i] - phases[j]) * Math.PI / 360))).toBeGreaterThan(1e-6)
      expect(Math.abs(Math.cos(q * (phases[i] + phases[j]) * Math.PI / 360))).toBeGreaterThan(1e-6)
    }
  })

  it('detects the discarded shift and reflection equivalences independently', () => {
    const sameLocus = (q: number, a: number, b: number): boolean => Math.abs(Math.sin(q * (a - b) * Math.PI / 360)) < 1e-9 || Math.abs(Math.cos(q * (a + b) * Math.PI / 360)) < 1e-9
    expect(sameLocus(6, 12, 72)).toBe(true)
    expect(sameLocus(5, 12, 24)).toBe(true)
    expect(sameLocus(5, 48, 60)).toBe(true)
    expect(sameLocus(5, 36, 72)).toBe(true)
    expect(sameLocus(4, 16, 56)).toBe(false)
  })

  for (const parameters of silkCases) it(`samples all three phases, exact closure, bounds and distinct paths for pair ${parameters.pair}, phase ${parameters.phase}`, () => {
    const [p, q] = LISSAJOUS_SILK_PAIRS[parameters.pair - 1], marks = geometryFor(silk, parameters).marks
    const allEdges: Set<string>[] = []
    expect(marks).toHaveLength(3)
    for (const [curve, neighbor] of [-10, 10, 0].entries()) {
      const mark = marks[curve], points = linePoints(mark), theta = (parameters.phase + neighbor) * Math.PI / 180
      expect(mark).toMatchObject({ kind: 'line', closed: true, stroke: 'fine', role: neighbor === 0 ? 'accent' : 'ink' })
      expect(Boolean(mark.emphasis)).toBe(neighbor === 0)
      expect(points).toHaveLength(SILK_INTERVALS + 1)
      expect(points.at(-1)).toBe(points[0])
      let largestError = 0
      for (const [index, point] of points.entries()) {
        const [x, y] = local(point), t = TAU * index / SILK_INTERVALS
        largestError = Math.max(largestError, Math.abs(x - 108 * Math.sin(p * t + theta)), Math.abs(y - 88 * Math.sin(q * t)))
      }
      expect(largestError).toBeLessThan(1e-10)
      expect(points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && x >= 52 && x <= 268 && y >= 32 && y <= 208)).toBe(true)
      const edges = edgesOf(points)
      expect(new Set(edges).size).toBe(SILK_INTERVALS)
      allEdges.push(new Set(edges))
      // A retraced locus would satisfy qθ = π/2 modulo π for these p = q−1 pairs.
      expect(Math.abs(Math.cos(q * theta))).toBeGreaterThan(1e-6)
      // Known analytic crossing parameters; verify that the unsplit sampled paths really cross nearby.
      let crossings = 0
      for (let k = 0; k < 2 * p; k++) {
        const first = ((Math.PI - 2 * theta - p * TAU / q + TAU * k) / (2 * p) % TAU + TAU) % TAU
        const second = (first + TAU / q) % TAU
        const i = Math.min(SILK_INTERVALS - 1, Math.floor(first / TAU * SILK_INTERVALS)), j = Math.min(SILK_INTERVALS - 1, Math.floor(second / TAU * SILK_INTERVALS))
        const actual = intersection(points[i], points[i + 1], points[j], points[j + 1])
        if (actual) {
          const expected: Point = [160 + 108 * Math.sin(p * first + theta), 120 - 88 * Math.sin(q * first)]
          expect(Math.hypot(actual[0] - expected[0], actual[1] - expected[1])).toBeLessThan(0.04)
          crossings++
        }
      }
      expect(crossings).toBeGreaterThan(0)
    }
    for (const [a, b] of [[0, 1], [0, 2], [1, 2]]) {
      expect([...allEdges[a]].some(edge => !allEdges[b].has(edge))).toBe(true)
      const neighborA = [-10, 10, 0][a], neighborB = [-10, 10, 0][b]
      // The phase-shift and phase-reflection equivalences must both be absent.
      expect(Math.abs(Math.sin(q * (neighborA - neighborB) * Math.PI / 360))).toBeGreaterThan(1e-6)
      expect(Math.abs(Math.cos(q * (2 * parameters.phase + neighborA + neighborB) * Math.PI / 360))).toBeGreaterThan(1e-6)
    }
    expect(marks.reduce((total, mark) => total + linePoints(mark).length, 0)).toBe(4611)
    expect(marks.at(-1)?.emphasis).toBe(true)
  })
})

describe('sinusoidal warp textile', () => {
  for (const parameters of warpCases) it(`keeps complete source pairs, formula, boundaries and topology at amplitude ${parameters.amplitude}, pitch ${parameters.pitch}`, () => {
    const marks = geometryFor(warp, parameters).marks, threads = marks.filter(mark => mark.role !== 'guide'), sources = sourceThreads(parameters.pitch)
    expect(threads).toHaveLength(sources.length)
    expect(threads).toHaveLength(28)
    expect(threads.filter(mark => mark.role === 'accent')).toHaveLength(2)
    let largestError = 0, inverseError = 0
    for (const [index, source] of sources.entries()) {
      const mark = threads[index], points = linePoints(mark)
      expect(mark).toMatchObject({ kind: 'line', closed: false, stroke: 'fine', role: source.accent ? 'accent' : 'ink' })
      expect(Boolean(mark.emphasis)).toBe(source.accent)
      expect(points).toHaveLength(source.vertical ? WARP_INTERVALS + 1 : 2)
      for (const [i, point] of points.entries()) {
        const [x, y] = local(point), sourceX = source.vertical ? source.offset : i === 0 ? -96 : 96, sourceY = source.vertical ? -88 + i * 176 / WARP_INTERVALS : source.offset
        largestError = Math.max(largestError, Math.abs(x - (sourceX + parameters.amplitude * Math.sin(TAU * sourceY / 176))), Math.abs(y - sourceY))
        const recovered: Point = [x - parameters.amplitude * Math.sin(TAU * y / 176), y]
        inverseError = Math.max(inverseError, Math.abs(recovered[0] - sourceX), Math.abs(recovered[1] - sourceY))
        expect(Math.abs(sourceX)).toBeLessThanOrEqual(96)
        expect(Math.abs(sourceY)).toBeLessThanOrEqual(88)
      }
      if (source.vertical) {
        expect(local(points[0])[0]).toBeCloseTo(source.offset, 10)
        expect(local(points.at(-1)!)[0]).toBeCloseTo(source.offset, 10)
        expect(local(points[0])[1]).toBe(-88)
        expect(local(points.at(-1)!)[1]).toBe(88)
        const quarter = local(points[WARP_INTERVALS / 4]), threeQuarters = local(points[3 * WARP_INTERVALS / 4])
        expect(quarter[0]).toBeCloseTo(source.offset - parameters.amplitude, 10)
        expect(threeQuarters[0]).toBeCloseTo(source.offset + parameters.amplitude, 10)
      } else {
        expect(points[0][1]).toBe(points[1][1])
        expect(points[1][0] - points[0][0]).toBeCloseTo(192, 10)
      }
    }
    expect(largestError).toBeLessThan(1e-10)
    expect(inverseError).toBeLessThan(1e-10)
    const vertical = sources.flatMap((source, index) => source.vertical ? [{ source, points: linePoints(threads[index]) }] : []).sort((a, b) => a.source.offset - b.source.offset)
    const horizontal = sources.filter(source => !source.vertical).sort((a, b) => a.offset - b.offset)
    expect(vertical).toHaveLength(14)
    expect(horizontal).toHaveLength(14)
    for (let i = 1; i < vertical.length; i++) {
      const separation = vertical[i].source.offset - vertical[i - 1].source.offset
      expect(separation).toBeGreaterThan(0)
      expect(vertical[i].points.every((point, j) => Math.abs(point[0] - vertical[i - 1].points[j][0] - separation) < 1e-10)).toBe(true)
    }
    for (const thread of vertical) for (const horizontalSource of horizontal) {
      // Strictly monotone y gives exactly one crossing with each horizontal; the crossing is inside its endpoints.
      const y = horizontalSource.offset, sample = (y + 88) / 176 * WARP_INTERVALS, i = Math.floor(sample), fraction = sample - i
      const x = local(thread.points[i])[0] * (1 - fraction) + local(thread.points[i + 1])[0] * fraction
      const displacement = parameters.amplitude * Math.sin(TAU * y / 176)
      expect(x).toBeGreaterThan(-96 + displacement)
      expect(x).toBeLessThan(96 + displacement)
    }
    for (const source of sources) {
      const mate = sources.find(other => other.vertical === source.vertical && Math.abs(Math.abs(source.offset - other.offset) - 4.8) < 1e-8)
      expect(mate).toBeDefined()
    }
    const points = marks.flatMap(mark => [...linePoints(mark)])
    expect(points.length).toBeLessThan(10000)
    expect(points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && x >= 40 && x <= 280 && y >= 32 && y <= 208)).toBe(true)
    expect(marks.slice(-2).every(mark => mark.role === 'accent' && mark.emphasis)).toBe(true)
  })

  for (const amplitude of [8, 12, 16, 20, 24]) it(`has unit Jacobian determinant, an explicit inverse and no fold at amplitude ${amplitude}`, () => {
    const h = 1e-4
    for (const x of [-96, -24, 0, 36, 96]) for (const y of [-88, -60, -44, -12, 0, 44, 72, 88]) {
      const point = sinusoidalWarpPoint([x, y], amplitude)
      expect(point[0] - amplitude * Math.sin(TAU * point[1] / 176)).toBeCloseTo(x, 10)
      expect(point[1]).toBe(y)
      const alongX = subtract(sinusoidalWarpPoint([x + h, y], amplitude), sinusoidalWarpPoint([x - h, y], amplitude)).map(value => value / (2 * h)) as unknown as Point
      const alongY = subtract(sinusoidalWarpPoint([x, y + h], amplitude), sinusoidalWarpPoint([x, y - h], amplitude)).map(value => value / (2 * h)) as unknown as Point
      expect(alongX[0]).toBeCloseTo(1, 8)
      expect(alongX[1]).toBe(0)
      expect(alongY[0]).toBeCloseTo(TAU * amplitude / 176 * Math.cos(TAU * y / 176), 8)
      expect(alongY[1]).toBeCloseTo(1, 8)
      expect(cross(alongX, alongY)).toBeCloseTo(1, 8)
    }
    const central = linePoints(geometryFor(warp, { amplitude }).marks.at(-1)!)
    const length = central.slice(1).reduce((sum, point, i) => sum + Math.hypot(point[0] - central[i][0], point[1] - central[i][1]), 0)
    expect(length).toBeGreaterThan(176)
    expect(warp.basis).toContain('not lengths or angles')
  })

  for (const pitch of [24, 28]) it(`uses optional undeformed centerlines and keeps permanent paired detail at pitch ${pitch}`, () => {
    const guides = geometryFor(warp, { pitch }).marks.filter(mark => mark.role === 'guide')
    expect(guides).toHaveLength(14)
    const expected: Point[][] = []
    for (const vertical of [true, false]) for (let j = -3; j <= 3; j++) expected.push(vertical ? [[160 + j * pitch, 208], [160 + j * pitch, 32]] : [[64, 120 - j * pitch], [256, 120 - j * pitch]])
    expect(guides.map(linePoints)).toEqual(expected)
    expect(geometryFor(warp, { pitch, amplitude: 8 }).marks.filter(mark => mark.role === 'guide')).toEqual(geometryFor(warp, { pitch, amplitude: 24 }).marks.filter(mark => mark.role === 'guide'))
    const hidden = renderStudySvg(warp, { pitch }, { guides: false })
    expect(hidden).not.toContain('stroke-opacity=')
    expect([...hidden.matchAll(/<polyline /g)]).toHaveLength(28)
  })

  it('rejects non-finite shear inputs', () => {
    for (const [x, y, amplitude] of [[NaN, 0, 20], [0, Infinity, 20], [0, 0, NaN]]) expect(() => sinusoidalWarpPoint([x, y], amplitude)).toThrow()
  })
})

describe('silk and warp study contracts', () => {
  it('registers curated aliases, pattern tags and bounded meaningful controls', () => {
    const registry = createStudyRegistry(PATTERN_SILK_WARP)
    expect(searchStudies(registry, '', { tag: 'pattern', category: 'Mathematics' })).toHaveLength(2)
    for (const study of PATTERN_SILK_WARP) for (const alias of study.aliases) expect(searchStudies(registry, alias)).toContainEqual(study)
    expect(searchStudies(registry, 'harmonic silk', { tag: 'parametric-curves' })).toEqual([registry.get(silk.id)])
    expect(searchStudies(registry, 'shear textile', { tag: 'transformations' })).toEqual([registry.get(warp.id)])
    expect(searchStudies(registry, 'material simulation')).toEqual([])
    expect(parametersFor(silk)).toEqual({ pair: 2, phase: 46 })
    expect(phaseControl).toMatchObject({ min: 16, max: 56, step: 10, initial: 46 })
    expect(parametersFor(warp)).toEqual({ amplitude: 20, pitch: 24 })
    for (const parameters of [{ pair: 0 }, { pair: 4 }, { phase: 0 }, { phase: 90 }, { phase: phaseControl.min + 1 }] as Record<string, number>[]) expect(() => parametersFor(silk, parameters)).toThrow()
    for (const parameters of [{ amplitude: 7 }, { amplitude: 25 }, { amplitude: 10 }, { pitch: 26 }, { pitch: 32 }] as Record<string, number>[]) expect(() => parametersFor(warp, parameters)).toThrow()
  })

  for (const [study, cases] of [[silk, silkCases], [warp, warpCases]] as const) for (const parameters of cases) it(`exports deterministic transparent geometry and a reproducible recipe for ${study.id} ${JSON.stringify(parameters)}`, () => {
    const before = geometryFor(study, parameters), paths: string[][] = []
    for (const appearance of [
      { theme: 'light' as const, weight: 1.5, palette: 'folio' as const, emphasis: 1.25 },
      { theme: 'dark' as const, weight: 4, palette: 'monochrome' as const, emphasis: 2 },
      { palette: 'custom' as const, inkColor: '#102030', accentColor: '#a02030', linecap: 'butt' as const },
    ]) {
      const svg = renderStudySvg(study, parameters, appearance)
      expect(svg).toBe(renderStudySvg(study, parameters, appearance))
      expect(svg).not.toMatch(/<rect|<image|<script|<foreignObject|\bhref=|url\(/)
      expect(svg).toContain('viewBox="0 0 320 240"')
      expect(svg.match(/\bfill="[^"]+"/g)?.every(fill => fill === 'fill="none"')).toBe(true)
      paths.push([...svg.matchAll(/\bpoints="([^"]+)"/g)].map(match => match[1]))
      const recipeText = svg.match(/<metadata>([^<]+)<\/metadata>/)![1].replaceAll('&quot;', '"').replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&apos;', "'")
      const recipe = JSON.parse(recipeText)
      expect(recipe.study).toBe(study.id)
      expect(recipe.parameters).toEqual(parametersFor(study, parameters))
      expect(renderStudySvg(study, recipe.parameters, recipe.appearance)).toBe(svg)
    }
    expect(paths[1]).toEqual(paths[0])
    expect(paths[2]).toEqual(paths[0])
    expect(geometryFor(study, parameters)).toEqual(before)
    const mono = renderStudySvg(study, parameters, { guides: false, palette: 'monochrome', weight: 1.5, emphasis: 1.25 })
    expect(mono).toContain('stroke-width="0.6"')
    expect(mono).toContain('stroke-width="0.75"')
    expect([...mono.matchAll(/stroke="([^"]+)"/g)].every(match => match[1] === '#28343b')).toBe(true)
    expect([...mono.matchAll(/\bpoints="([^"]+)"/g)].map(match => match[1])).toEqual(paths[0].slice(before.marks.filter(mark => mark.role === 'guide').length))
  })
})
