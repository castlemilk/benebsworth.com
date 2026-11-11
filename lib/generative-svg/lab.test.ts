// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { STUDIES, geometryFor, type Mark } from './model'
import { appearanceFor, activePreset, contrastRatio, DEFAULT_APPEARANCE, lowContrastInks, presetAppearance, renderStudySvg } from './render'
const study = (id: string) => STUDIES.find(s => s.id === id)!
const parse = (svg: string) => new DOMParser().parseFromString(svg, 'image/svg+xml')
const coordinates = (svg: string) => [...parse(svg).querySelectorAll('polyline,polygon,circle,text')].map(n => ['points', 'cx', 'cy', 'r', 'x', 'y'].map(a => n.getAttribute(a)))

describe('three additional declared models', () => {
  it('keeps oscillator energy constant with equal axis scales and the correct phase orientation', () => {
    for (const amplitude of [0.3, 0.8, 1]) for (let phase = 0; phase < 8; phase++) {
      const g = geometryFor(study('phase-space-orbit'), { amplitude, phase })
      const orbit = g.marks[2]
      expect(orbit.kind).toBe('line')
      if (orbit.kind !== 'line') throw new Error('missing orbit')
      expect(orbit.points).toHaveLength(257)
      for (const [x, y] of orbit.points) expect(((x - 160) / 78) ** 2 + ((120 - y) / 78) ** 2).toBeCloseTo(amplitude ** 2, 12)
      expect(orbit.points[64][0]).toBeCloseTo(160)
      expect(orbit.points[64][1]).toBeCloseTo(120 + 78 * amplitude)
      const marker = g.marks[3]
      expect(marker.kind).toBe('circle')
      if (marker.kind === 'circle') expect(marker.center).toEqual(orbit.points[phase * 32])
    }
  })
  it.each([1, 2, 3])('gives %s bits per QAM axis distinct symmetric points and unit mean energy', bits => {
    const circles = geometryFor(study('qam-constellation'), { bits }).marks.filter((m): m is Extract<Mark, { kind: 'circle' }> => m.kind === 'circle')
    expect(circles).toHaveLength(4 ** bits)
    expect(new Set(circles.map(m => m.center.join(','))).size).toBe(4 ** bits)
    const points = circles.map(m => [(m.center[0] - 160) / 76, (120 - m.center[1]) / 76])
    expect(points.reduce((sum, [i, q]) => sum + i * i + q * q, 0) / points.length).toBeCloseTo(1, 12)
    expect(points.reduce((sum, [i]) => sum + i, 0)).toBeCloseTo(0, 12)
    expect(points.reduce((sum, [, q]) => sum + q, 0)).toBeCloseTo(0, 12)
    if (bits === 3) expect(Math.max(...points.map(([i]) => i))).toBeGreaterThan(1)
  })
  it('keeps three directed transitions, the initial arrow and acceptance ring independent of active state', () => {
    let baseline: unknown
    for (const state of [0, 1, 2]) {
      const g = geometryFor(study('state-machine'), { state })
      expect(g.marks.filter(m => m.kind === 'line' && m.points.length === 2)).toHaveLength(4)
      expect(g.marks.filter(m => m.kind === 'line' && m.points.length === 3)).toHaveLength(4)
      expect(g.marks.filter(m => m.kind === 'circle')).toHaveLength(4)
      expect(g.marks.filter(m => m.kind === 'text' && m.text === 'next')).toHaveLength(3)
      expect(g.marks.filter(m => m.kind === 'text' && m.emphasis).map(m => m.kind === 'text' && m.text)).toEqual([String(state)])
      const points = coordinates(renderStudySvg(study('state-machine'), { state }))
      if (baseline) expect(points).toEqual(baseline)
      baseline = points
    }
  })
})

describe('safe portable style tuning', () => {
  it('normalizes colors, exposes presets and identifies custom edits', () => {
    expect(appearanceFor({ inkColor: '#ABCDEF' }).inkColor).toBe('#abcdef')
    expect(activePreset(DEFAULT_APPEARANCE)).toBe('folio')
    expect(activePreset(presetAppearance('technical', 'dark'))).toBe('technical')
    expect(activePreset({ ...DEFAULT_APPEARANCE, weight: 3.1 })).toBe('custom')
    expect(presetAppearance('bold', 'dark').theme).toBe('dark')
    expect(() => presetAppearance('missing', 'light')).toThrow()
  })
  it.each([{ inkColor: 'url(https://example.com)' }, { accentColor: '#fff' }, { inkColor: '#12345g' }, { linecap: 'square' }, { guideOpacity: 0 }, { guideOpacity: NaN }, { emphasis: 1 }, { emphasis: Infinity }, { weight: '2' }, { constructor: 1 }] as unknown[])('rejects invalid appearance %j', value => {
    expect(() => appearanceFor(value as never)).toThrow()
  })
  it('warns about low-contrast custom inks without overwriting them', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21)
    expect(lowContrastInks(DEFAULT_APPEARANCE)).toEqual([])
    const custom = appearanceFor({ palette: 'custom', inkColor: '#f4f1e8', accentColor: '#f4f1e8' })
    expect(lowContrastInks(custom)).toEqual(['ink', 'accent'])
    expect(custom.inkColor).toBe('#f4f1e8')
    expect(lowContrastInks({ ...custom, theme: 'dark' })).toEqual([])
  })
  it.each(STUDIES)('exports $id tuning as a reproducible recipe without moving geometry', s => {
    const options = appearanceFor({ palette: 'custom', inkColor: '#123456', accentColor: '#654321', linecap: 'butt', guideOpacity: 0.2, emphasis: 2, weight: 4 })
    const svg = renderStudySvg(s, {}, options), doc = parse(svg)
    const recipe = JSON.parse(doc.querySelector('metadata')!.textContent!)
    expect(recipe).toMatchObject({ version: 1, study: s.id, appearance: options })
    expect(renderStudySvg(s, recipe.parameters, recipe.appearance)).toBe(svg)
    expect(coordinates(svg)).toEqual(coordinates(renderStudySvg(s)))
    expect(svg).toContain('stroke-linecap="butt"')
    expect(svg).not.toMatch(/NaN|Infinity|url\(|currentColor/)
    expect(doc.querySelector('rect,script,foreignObject,image,parsererror')).toBeNull()
  })
  it('applies guide opacity only to construction marks, retaining semantic emphasis at its minimum', () => {
    const field = parse(renderStudySvg(study('vector-field'), {}, { guideOpacity: 0.2, guides: false }))
    expect(field.querySelector('circle')).not.toBeNull()
    expect(field.querySelector('[stroke-opacity]')).toBeNull()
    const tree = parse(renderStudySvg(study('binary-search-tree'), { target: 1 }, { palette: 'monochrome', emphasis: 1.25 }))
    expect([...tree.querySelectorAll('polyline')].filter(n => Number(n.getAttribute('stroke-width')) > 2.4)).toHaveLength(2)
    expect(tree.querySelectorAll('text[font-weight="700"]')).toHaveLength(3)
  })
})
