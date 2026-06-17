import type { DrawColors } from '@/lib/lab/circuit-sim/draw'

/**
 * The circuit console renders as a dark "bench instrument" in BOTH site themes
 * (an oscilloscope is always dark). This palette is theme-independent. Extra
 * tokens beyond DrawColors drive node-voltage heat coloring and the bezel chrome.
 */
export interface InstrumentColors extends DrawColors {
  /** Panel bezel + inset tones. */
  bezel: string
  bezelInset: string
  /** Node-voltage heat ramp endpoints (cool = low/negative, warm = high). */
  heatCool: string
  heatZero: string
  heatWarm: string
  /** Phosphor glow color for live traces/wires. */
  phosphor: string
  /** Probe marker ring. */
  probeRing: string
}

export const INSTRUMENT: InstrumentColors = {
  // ── base schematic ──
  bg: '#070b10',
  grid: '#0e1620',
  wire: '#6fb7d6',
  wireDim: '#1b2a38',
  junction: '#5a7a8a',
  junctionDot: '#9cd2e8',
  component: '#b9cdda',
  componentDim: '#39495a',
  label: '#7aa0b2',
  terminal: '#41606f',
  highlight: '#22c8ee',
  ground: '#3f6a55',
  accent: '#22c8ee',
  selection: '#22c8ee',
  voltage: '#ff8a5c',
  current: '#67d98a',
  probeNode: '#ffd84a',
  // ── scope ──
  scopeBg: '#05080c',
  scopeGrid: '#0d1620',
  scopeGridMajor: '#172634',
  scopeText: '#5c8294',
  // ── instrument extras ──
  bezel: '#0c121a',
  bezelInset: '#101822',
  heatCool: '#3b82f6',
  heatZero: '#7aa0b2',
  heatWarm: '#ff7a45',
  phosphor: '#7dffd0',
  probeRing: '#ffd84a',
}

/**
 * Map a node voltage to a heat color (cool → neutral → warm) for live coloring.
 * `vmax` is the current absolute-voltage scale; defaults to 5V.
 */
export function voltageColor(v: number, vmax = 5, colors: InstrumentColors = INSTRUMENT): string {
  const t = Math.max(-1, Math.min(1, v / (vmax || 1)))
  if (t >= 0) return mix(colors.heatZero, colors.heatWarm, t)
  return mix(colors.heatZero, colors.heatCool, -t)
}

function mix(a: string, b: string, t: number): string {
  const ca = hexToRgb(a), cb = hexToRgb(b)
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t)
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t)
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t)
  return `rgb(${r},${g},${bl})`
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
