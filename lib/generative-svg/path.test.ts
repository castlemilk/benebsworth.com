// @vitest-environment jsdom
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { closePath, cubicTo, lineTo, markPoints, moveTo, pathPoints, type Geometry, type PathCommand, type PathMark, type Study } from './definition'
import { geometryFor, STUDIES } from './model'
import { validatePathMark } from './path'
import { createStudyRegistry, searchStudies, STUDY_CATEGORIES, studySearchRecords } from './registry'
import { geometryMarkup, renderStudySvg } from './render'

const parse = (svg: string) => new DOMParser().parseFromString(svg, 'image/svg+xml')
const contour = (left: number, top: number, right: number, bottom: number): PathCommand[] => [
  moveTo([left, top]), lineTo([right, top]), lineTo([right, bottom]), lineTo([left, bottom]), closePath(),
]
const hole: PathMark = { kind: 'path', paint: 'fill', role: 'ink', commands: [...contour(30, 30, 290, 210), ...contour(100, 80, 220, 160)] }
const curve: PathMark = { kind: 'path', paint: 'stroke', role: 'accent', stroke: 'fine', emphasis: true, commands: [moveTo([40, 180]), cubicTo([80, 32], [240, 32], [280, 180]), lineTo([284, 184])] }
const example = (marks: Geometry['marks']): Study => ({
  id: 'path-test-example', title: 'Path test example', category: 'Illustration', provenance: 'illustrative',
  description: 'Original path fixture for portable drawing tests.', basis: 'Authored contours in the shared canvas; no scientific model is claimed.',
  tags: ['illustration', 'cut-paper'], aliases: ['Negative space fixture'], parameters: [], model: () => ({ marks }),
})
const invalid = (value: unknown): PathMark => value as PathMark
const stroke = (commands: unknown): PathMark => invalid({ kind: 'path', paint: 'stroke', role: 'ink', commands })
const fill = (commands: unknown): PathMark => invalid({ kind: 'path', paint: 'fill', role: 'ink', commands })

describe('structured path authoring', () => {
  it('exposes absolute command helpers and includes controls in exhaustive point inspection', () => {
    expect(moveTo([10, 20])).toEqual({ op: 'M', to: [10, 20] })
    expect(lineTo([30, 40])).toEqual({ op: 'L', to: [30, 40] })
    expect(cubicTo([20, 30], [40, 50], [60, 70])).toEqual({ op: 'C', control1: [20, 30], control2: [40, 50], to: [60, 70] })
    expect(closePath()).toEqual({ op: 'Z' })
    expect(pathPoints(curve.commands)).toEqual([[40, 180], [80, 32], [240, 32], [280, 180], [284, 184]])
    expect(markPoints(curve)).toEqual(pathPoints(curve.commands))
    expect(markPoints({ kind: 'line', points: [[10, 20], [30, 40]], role: 'ink' })).toEqual([[10, 20], [30, 40]])
    expect(markPoints({ kind: 'circle', center: [50, 60], radius: 4, role: 'ink' })).toEqual([[50, 60]])
    expect(markPoints({ kind: 'text', at: [50, 60], text: 'x', role: 'ink' })).toEqual([[50, 60]])
  })
  it('accepts open and closed stroke subpaths, and separately closed fill contours', () => {
    for (const mark of [curve, hole,
      stroke([moveTo([8, 8]), lineTo([312, 232]), moveTo([24, 24]), cubicTo([8, 232], [312, 8], [280, 210]), closePath()]),
      fill([moveTo([40, 40]), cubicTo([140, 40], [140, 140], [40, 40]), closePath()]),
    ]) {
      expect(() => validatePathMark(mark)).not.toThrow()
      expect(geometryFor(example([mark])).marks).toEqual([mark])
    }
  })
  it('adds Illustration without altering any existing subject assignments', () => {
    expect(STUDY_CATEGORIES).toEqual(['Mathematics', 'Algorithms', 'Physics', 'Electronics', 'Distributed systems', 'Illustration'])
    const before = STUDIES.map(study => [study.id, study.category])
    const study = example([hole]), registry = createStudyRegistry([...STUDIES, study])
    expect(registry.studies.slice(0, STUDIES.length).map(study => [study.id, study.category])).toEqual(before)
    expect(searchStudies(registry, 'negative space', { category: 'Illustration', tag: 'cut-paper' })).toContainEqual(study)
    expect(searchStudies(registry, 'negative space fixture', { category: 'Illustration', tag: 'cut-paper' })).toEqual([study])
    expect(studySearchRecords(registry).at(-1)?.filters.subject).toEqual(['Illustration'])
  })
})

describe('path validation at model and direct rendering boundaries', () => {
  const rejects = (mark: PathMark) => {
    expect(() => geometryFor(example([mark]))).toThrow()
    expect(() => geometryMarkup({ marks: [mark] })).toThrow()
  }
  it.each([
    null, undefined, 'M20,20 L40,40', {}, [],
    [null], ['M20,20'], [{ op: 'm', to: [20, 20] }], [{ op: 'Q', to: [20, 20] }], [{ op: 'A', to: [20, 20] }],
    [{ op: 'M', to: [20, 20], d: 'url(https://example.test)' }],
    [{ op: 'M' }, lineTo([40, 40])],
    [moveTo([20, 20]), { op: 'C', control1: [30, 30], to: [40, 40] }],
    [moveTo([20, 20]), lineTo([40, 40]), { op: 'Z', to: [20, 20] }],
  ].map(commands => ({ commands })))('rejects malformed or unsupported command input $commands', ({ commands }) => rejects(stroke(commands)))

  it.each([
    [lineTo([40, 40])], [cubicTo([30, 30], [40, 40], [50, 50])], [closePath()],
    [moveTo([20, 20])], [moveTo([20, 20]), closePath()],
    [moveTo([20, 20]), moveTo([30, 30]), lineTo([40, 40])],
    [moveTo([20, 20]), lineTo([40, 40]), closePath(), closePath()],
    [moveTo([20, 20]), lineTo([40, 40]), closePath(), lineTo([50, 50])],
  ].map(commands => ({ commands })))('rejects invalid subpath order $commands', ({ commands }) => rejects(stroke(commands)))

  it.each([
    [moveTo([20, 20]), lineTo([40, 40])],
    [moveTo([20, 20]), lineTo([40, 40]), moveTo([50, 50]), lineTo([60, 60]), closePath()],
    [...contour(20, 20, 40, 40), moveTo([50, 50])],
    [...contour(20, 20, 40, 40), moveTo([50, 50]), lineTo([60, 60])],
  ].map(commands => ({ commands })))('requires an explicit Z on every fill contour $commands', ({ commands }) => rejects(fill(commands)))

  it.each([NaN, Infinity, -Infinity, '20', undefined, null])('rejects nonfinite or nonnumeric coordinates %s in every command position', value => {
    for (const slot of ['to', 'control1', 'control2']) for (const axis of [0, 1]) {
      const point = [30, 30]; point[axis] = value as number
      const command = { ...cubicTo([30, 30], [40, 40], [50, 50]), [slot]: point }
      rejects(stroke([moveTo([20, 20]), command]))
    }
    rejects(stroke([{ op: 'M', to: [value, 20] }, lineTo([40, 40])]))
    rejects(stroke([moveTo([20, 20]), { op: 'L', to: [20, value] }]))
  })

  it.each([[7.99, 20], [312.01, 20], [20, 7.99], [20, 232.01], [20], [20, 20, 20], new Array(2), '20,20', {}, null].map(point => ({ point })))('rejects malformed and out-of-bounds endpoints and controls $point', ({ point }) => {
    rejects(stroke([{ op: 'M', to: point }, lineTo([40, 40])]))
    for (const slot of ['to', 'control1', 'control2']) rejects(stroke([moveTo([20, 20]), { ...cubicTo([30, 30], [40, 40], [50, 50]), [slot]: point }]))
  })

  it.each([
    { paint: undefined }, { paint: 'both' }, { paint: 'url(https://example.test)' }, { role: 'unknown' },
    { stroke: 'wide' }, { emphasis: 'yes' }, { d: 'M20,20 L40,40' }, { fillRule: 'nonzero' },
    { transform: 'translate(10)' }, { filter: 'url(#blur)' }, { href: 'https://example.test' }, { font: 'custom' },
  ])('rejects arbitrary paint and renderer attributes %j', values => rejects(invalid({ ...curve, ...values })))
  it('rejects stroke styling on solid contours rather than pretending weight can change a fill', () => {
    rejects(invalid({ ...hole, stroke: 'fine' }))
    rejects(invalid({ ...hole, emphasis: true }))
  })
  it('validates hidden guides before filtering their markup', () => {
    const mark = { ...stroke([moveTo([20, 20])]), role: 'guide' } as PathMark
    expect(() => geometryMarkup({ marks: [mark] }, { guides: false })).toThrow('Unfinished path contour')
  })
})

describe('deterministic transparent path export', () => {
  it('serializes the small command language with the existing numeric precision', () => {
    const mark = stroke([moveTo([20.123456, 30]), cubicTo([40, 50], [60, 70], [80, 90]), lineTo([90, 100]), closePath()])
    expect(geometryMarkup({ marks: [mark] })).toBe('<path d="M20.1235,30 C40,50 60,70 80,90 L90,100 Z" fill="none" stroke="#28343b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>')
  })
  it('uses the existing fine tier, emphasis, caps, palette and guide treatment on strokes', () => {
    const guide: PathMark = { ...curve, role: 'guide' }
    const doc = parse(renderStudySvg(example([curve, guide]), {}, { palette: 'custom', accentColor: '#123456', weight: 4, emphasis: 2, linecap: 'butt', guideOpacity: .2 }))
    const [accent, construction] = [...doc.querySelectorAll('path')]
    expect(accent.getAttribute('stroke')).toBe('#123456')
    expect(accent.getAttribute('stroke-width')).toBe('3.2')
    expect(accent.getAttribute('stroke-linecap')).toBe('butt')
    expect(accent.getAttribute('fill')).toBe('none')
    expect(construction.getAttribute('stroke-width')).toBe('0.96')
    expect(construction.getAttribute('stroke-opacity')).toBe('0.2')
    expect(parse(renderStudySvg(example([curve, guide]), {}, { guides: false })).querySelectorAll('path')).toHaveLength(1)
  })
  it('keeps filled geometry and painted thickness independent of weight, caps and emphasis', () => {
    const study = example([hole]), baseline = parse(renderStudySvg(study)).querySelector('path')!.outerHTML
    for (const weight of [1.5, 4]) for (const emphasis of [1.25, 2]) for (const linecap of ['round', 'butt'] as const) {
      const path = parse(renderStudySvg(study, {}, { weight, emphasis, linecap })).querySelector('path')!
      expect(path.outerHTML).toBe(baseline)
      expect(path.getAttribute('fill-rule')).toBe('evenodd')
      expect(path.getAttribute('stroke')).toBe('none')
      expect(path.hasAttribute('stroke-width')).toBe(false)
    }
    const guide: PathMark = { ...hole, role: 'guide' }
    const node = parse(renderStudySvg(example([guide]), {}, { guideOpacity: .2 })).querySelector('path')!
    expect(node.getAttribute('fill-opacity')).toBe('0.2')
    expect(node.hasAttribute('stroke-opacity')).toBe(false)
    expect(parse(renderStudySvg(example([guide]), {}, { guides: false })).querySelector('path')).toBeNull()
  })
  it('exports reproducible recipes without changing geometry across all appearance families', () => {
    const study = example([hole, curve]), geometry = JSON.stringify(geometryFor(study))
    const coordinates = (svg: string) => [...parse(svg).querySelectorAll('path')].map(path => path.getAttribute('d'))
    const baseline = coordinates(renderStudySvg(study))
    for (const theme of ['light', 'dark'] as const) for (const palette of ['folio', 'monochrome', 'custom'] as const) for (const weight of [1.5, 4]) {
      const svg = renderStudySvg(study, {}, { theme, palette, weight, inkColor: '#345678', accentColor: '#abcdef' }), doc = parse(svg)
      const recipe = JSON.parse(doc.querySelector('metadata')!.textContent!)
      expect(renderStudySvg(study, recipe.parameters, recipe.appearance)).toBe(svg)
      expect(coordinates(svg)).toEqual(baseline)
      expect(JSON.stringify(geometryFor(study))).toBe(geometry)
      expect(doc.querySelector('rect,image,script,foreignObject,filter,font,parsererror')).toBeNull()
      expect(svg).not.toMatch(/NaN|Infinity|url\(|currentColor|href=/)
      const paths = [...doc.querySelectorAll('path')]
      if (palette === 'monochrome') expect(paths[0].getAttribute('fill')).toBe(paths[1].getAttribute('stroke'))
      if (palette === 'custom') expect([paths[0].getAttribute('fill'), paths[1].getAttribute('stroke')]).toEqual(['#345678', '#abcdef'])
    }
  })
  it('preserves real alpha holes on both matte colors, not a background-colored patch', async () => {
    const study = example([hole])
    for (const theme of ['light', 'dark'] as const) {
      const images = await Promise.all([1.5, 4].map(weight => sharp(Buffer.from(renderStudySvg(study, {}, { theme, weight }))).ensureAlpha().raw().toBuffer({ resolveWithObject: true })))
      expect(images[0].data.equals(images[1].data)).toBe(true)
      const { data, info } = images[0], alpha = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3]
      expect(alpha(0, 0)).toBe(0)
      expect(alpha(160, 120)).toBe(0)
      expect(alpha(50, 50)).toBe(255)
      for (const background of ['#ffffff', '#11171b']) {
        const matte = await sharp(Buffer.from(renderStudySvg(study, {}, { theme }))).flatten({ background }).raw().toBuffer({ resolveWithObject: true })
        const pixel = (x: number, y: number) => [...matte.data.subarray((y * matte.info.width + x) * matte.info.channels, (y * matte.info.width + x) * matte.info.channels + 3)]
        expect(pixel(160, 120)).toEqual(pixel(0, 0))
        expect(pixel(50, 50)).not.toEqual(pixel(0, 0))
      }
    }
  }, 15000)
})
