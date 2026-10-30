import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { rlcResonance, defaults } from './rlc-resonance'
import type { EffectTheme } from '@/lib/lab/types'

// Read the same palette tokens EffectCanvas resolves at runtime.
const css = readFileSync('app/globals.css', 'utf8')
const basePalettes = [...css.matchAll(/--fg:\s*(#[\da-f]+);[\s\S]*?--stage:\s*(#[\da-f]+);/gi)]
  .map(([, fg, bg]) => ({ fg, bg }))
const editorialCss = readFileSync('app/editorial.css', 'utf8')
const editorialRule = editorialCss.match(/:root:not\(\.dark\):has\(\.folio-reading-page,\s*\.folio-archive\)\s*\{([^}]+)\}/)![1]
const editorialForeground = editorialRule.match(/--fg:\s*(#[\da-f]+);/i)![1]
const palettes = [...basePalettes, { fg: editorialForeground, bg: basePalettes[0].bg }]

function rgb(hex: string) {
  return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16))
}
function luminance(channels: number[]) {
  return channels.map(value => {
    const s = value / 255
    return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4
  }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0)
}
function contrast(fg: string, bg: string, alpha = 1) {
  const back = rgb(bg)
  const front = rgb(fg).map((channel, i) => channel * alpha + back[i] * (1 - alpha))
  const a = luminance(front), b = luminance(back)
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
}

function draw(theme?: EffectTheme, w = 640, h = 320) {
  const labels: { text: string; color: string; alpha: number; x: number; y: number }[] = []
  const strokes: { color: string; alpha: number; path: number[][] }[] = []
  let path: number[][] = []
  const state: Record<string, unknown> = { globalAlpha: 1 }
  const stack: Record<string, unknown>[] = []
  const ctx = new Proxy(state, {
    get(target, key: string) {
      if (key === 'arc') return (_x: number, _y: number, radius: number) => {
        if (!Number.isFinite(radius) || radius < 0) throw new Error('Invalid arc radius')
      }
      if (key === 'fillText') return (text: string, x: number, y: number) => labels.push({ text, color: target.fillStyle as string, alpha: target.globalAlpha as number, x, y })
      if (key === 'stroke') return () => strokes.push({ color: target.strokeStyle as string, alpha: target.globalAlpha as number, path: [...path] })
      if (key === 'beginPath') return () => { path = [] }
      if (key === 'moveTo' || key === 'lineTo') return (...point: number[]) => path.push(point)
      if (key === 'save') return () => stack.push({ ...target })
      if (key === 'restore') return () => Object.assign(target, stack.pop())
      return key in target ? target[key] : () => {}
    },
  }) as unknown as CanvasRenderingContext2D
  rlcResonance.createRenderer(ctx, { w, h, dpr: 1 }, theme).step(16, defaults)
  return { labels, strokes }
}

describe('RLC axis theme contrast', () => {
  it.each([[0, 0], [1, 320], [2, 320], [40, 320], [82, 320], [640, 1], [640, 103]])('does not draw unusable %s × %s geometry', (w, h) => {
    const result = draw(undefined, w, h)
    expect(result.labels).toEqual([])
    expect(result.strokes).toEqual([])
  })

  it('covers the current light, dark and editorial-light stage palettes', () => {
    expect(basePalettes).toHaveLength(2)
    expect(palettes).toHaveLength(3)
    expect(palettes[2].fg).toBe(editorialForeground)
    expect(palettes[2].bg).toBe(basePalettes[0].bg)
    expect(editorialRule).not.toMatch(/--stage:/)
    expect(luminance(rgb(palettes[0].bg))).toBeGreaterThan(.5)
    expect(luminance(rgb(palettes[1].bg))).toBeLessThan(.1)
  })

  it.each(palettes)('uses readable neutral axis labels on $bg without recolouring scientific series', theme => {
    const { labels, strokes } = draw(theme)
    for (const text of ['0', '2.0V', 'time →']) {
      const label = labels.find(label => label.text === text)!
      expect(label).toBeDefined()
      expect(label.color).toBe(theme.fg)
      expect(label.alpha).toBe(1)
      expect(contrast(label.color, theme.bg, label.alpha)).toBeGreaterThanOrEqual(4.5)
    }
    const axes = strokes.find(stroke => JSON.stringify(stroke.path) === JSON.stringify([[56, 114], [56, 288], [614, 288]]))!
    expect(axes.color).toBe(theme.fg)
    expect(contrast(axes.color, theme.bg, axes.alpha)).toBeGreaterThanOrEqual(3)
    expect(labels.find(label => label.text === 'Vc(t)')?.color).toBe('#00b4d8')
    expect(labels.find(label => label.text === 'R 1.0Ω')?.color).toBe('#ffd93d')
    expect(labels.find(label => label.text === 'L 500mH')?.color).toBe('#ff7a59')
    expect(labels.find(label => label.text === 'C 1000µF')?.color).toBe('#6bcb77')
    expect(strokes.some(stroke => stroke.color === '#00b4d8')).toBe(true)
  })

  it('retains label geometry across themes and readable default dark labels', () => {
    const geometry = (theme: EffectTheme) => draw(theme).labels.map(({ text, x, y }) => ({ text, x, y }))
    expect(geometry(palettes[0])).toEqual(geometry(palettes[1]))
    const label = draw().labels.find(label => label.text === 'time →')!
    expect(label.color).toBe('#ececf0')
    expect(contrast(label.color, '#0a0a0c')).toBeGreaterThanOrEqual(4.5)
  })
})
