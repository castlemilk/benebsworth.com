import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { waveSuperposition, waveInks, defaults } from './wave-superposition'

const stages = [...readFileSync('app/globals.css', 'utf8').matchAll(/--stage:\s*(#[\da-f]+);/gi)].map(match => match[1])
function luminance(hex: string) {
  return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0)
}
describe('wave component inks', () => {
  it('has at least 3:1 contrast against both stage themes', () => {
    expect(stages).toHaveLength(2)
    for (const stage of stages) for (const ink of Object.values(waveInks)) {
      const a = luminance(stage), b = luminance(ink)
      expect((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toBeGreaterThanOrEqual(3)
    }
  })
  it('uses matching opaque colours for plotted waves and inspection', () => {
    const strokes: { color: unknown; width: unknown }[] = []
    const state: Record<string, unknown> = {}
    const ctx = new Proxy(state, { get(target, key: string) {
      if (key === 'stroke') return () => strokes.push({ color: target.strokeStyle, width: target.lineWidth })
      return key in target ? target[key] : () => {}
    } }) as unknown as CanvasRenderingContext2D
    waveSuperposition.createRenderer(ctx, { w: 600, h: 300, dpr: 1 }).step(0, defaults)
    expect(strokes).toContainEqual({ color: waveInks.first, width: 2 })
    expect(strokes).toContainEqual({ color: waveInks.second, width: 2 })
    const rows = waveSuperposition.inspect!(.5, 0, defaults)
    expect(rows.find(row => row.label === 'Wave 1')?.color).toBe(waveInks.first)
    expect(rows.find(row => row.label === 'Wave 2')?.color).toBe(waveInks.second)
  })
})
