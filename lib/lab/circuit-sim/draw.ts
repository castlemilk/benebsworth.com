import { GRID_SIZE, type CircuitComponent, formatValue } from './types'

export interface DrawColors {
  wire: string
  wireDim: string
  junction: string
  component: string
  componentDim: string
  label: string
  grid: string
  terminal: string
  highlight: string
  bg: string
  ground: string
  accent: string
  scopeGrid: string
  scopeGridMajor: string
  scopeBg: string
  scopeText: string
  selection: string
  voltage: string
  current: string
  probeNode: string
  junctionDot: string
}

export const DARK_COLORS: DrawColors = {
  wire: '#6ba4c4',        // bright blue-grey for visibility
  wireDim: '#1a2a3a',
  junction: '#5a7a8a',
  junctionDot: '#8cc4dc',  // brighter junction dots
  component: '#b0c4d4',
  componentDim: '#3a4a5a',
  label: '#6a8a9a',
  grid: '#0d1117',
  terminal: '#3a5a6a',
  highlight: '#00b4d8',
  bg: '#080a10',
  ground: '#3a5a4a',
  accent: '#00b4d8',
  scopeGrid: '#0e141c',
  scopeGridMajor: '#16202a',
  scopeBg: '#06080c',
  scopeText: '#4a6a7a',
  selection: '#00b4d8',
  voltage: '#ff7a59',
  current: '#6bcb77',
  probeNode: '#ffd93d',
}

export function gridSnap(v: number): number {
  return Math.round(v / GRID_SIZE) * GRID_SIZE
}

/**
 * LEAD_HALF = distance from component center to terminal along the body axis.
 * LEAD_EXT = additional lead wire length extending past the body edge.
 * TOTAL_OFFSET = LEAD_HALF + LEAD_EXT = distance from center to terminal.
 */
const LEAD_EXT = 8

const TOTAL_OFFSET: Record<string, number> = {
  R: 30,   // body half-width 22 + lead 8
  L: 36,   // body half-width 28 + lead 8
  C: 20,   // plate gap half 6 + lead 8 = 14... actually gap is 12, half=6, but let me just make it work consistently
  V: 24,   // circle radius 16 + lead 8
  GND: 12, // just some lead length
}

// Fixed terminal offset for each type at rotation 0
function getOffset(type: string): number {
  switch (type) {
    case 'R': return 40  // 22 body + 8 lead + pad to grid
    case 'L': return 40  // 28 body + 8 lead + pad to grid
    case 'C': return 20  // gap half 6 + lead 8 + pad
    case 'V': return 20  // radius 16 + lead 8 → pad to 20
    case 'GND': return 0
    default: return 40
  }
}

/**
 * Get the two terminal positions in world coordinates.
 * Terminal A = "input" side (left at rot=0, top at rot=90, etc.)
 * Terminal B = "output" side
 * Both are grid-snapped.
 */
export function getTerminalPositions(comp: CircuitComponent): [number, number, number, number] {
  const cx = comp.x, cy = comp.y

  // Ground: single connection point at top of symbol (grid-aligned)
  if (comp.type === 'GND') {
    return [cx, cy - 20, cx, cy - 20]
  }

  const off = getOffset(comp.type)
  switch (comp.rotation) {
    case 0:
      return [cx - off, cy, cx + off, cy]
    case 90:
      return [cx, cy - off, cx, cy + off]
    case 180:
      return [cx + off, cy, cx - off, cy]
    case 270:
      return [cx, cy + off, cx, cy - off]
  }
}

// ── Component symbol drawing ───────────────────────────────────────

function drawResistor(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, rot: 0 | 90 | 180 | 270,
  value: number, colors: DrawColors, selected: boolean,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate((rot * Math.PI) / 180)

  const bw = 44, bh = 16, hw = bw / 2, hh = bh / 2
  const off = getOffset('R')

  // Selection highlight
  if (selected) {
    ctx.strokeStyle = colors.selection
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.strokeRect(-hw - 6, -hh - 6, bw + 12, bh + 12)
    ctx.setLineDash([])
  }

  // Lead wires (extend from body edge to terminal)
  ctx.strokeStyle = colors.wire
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-off, 0); ctx.lineTo(-hw, 0)
  ctx.moveTo(hw, 0); ctx.lineTo(off, 0)
  ctx.stroke()

  // Body (IEC rectangle) — semi-transparent so wires show through
  ctx.fillStyle = 'rgba(8,10,16,0.85)' // mostly opaque but wires visible
  ctx.strokeStyle = colors.component
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(-hw, -hh, bw, bh, 3)
  ctx.fill()
  ctx.stroke()

  // Label below
  ctx.fillStyle = colors.label
  ctx.font = '10px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(formatValue('R', value), 0, hh + 6)

  ctx.restore()
}

function drawCapacitor(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  rot: 0 | 90 | 180 | 270, value: number,
  colors: DrawColors, selected: boolean,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate((rot * Math.PI) / 180)

  const gap = 12, plateH = 24, phh = plateH / 2
  const off = getOffset('C')

  if (selected) {
    ctx.strokeStyle = colors.selection
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.strokeRect(-off - 4, -phh - 4, off * 2 + 8, plateH + 8)
    ctx.setLineDash([])
  }

  // Lead wires
  ctx.strokeStyle = colors.wire
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-off, 0); ctx.lineTo(-gap / 2, 0)
  ctx.moveTo(gap / 2, 0); ctx.lineTo(off, 0)
  ctx.stroke()

  // Plates (IEC)
  ctx.strokeStyle = colors.component
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-gap / 2, -phh); ctx.lineTo(-gap / 2, phh)
  ctx.moveTo(gap / 2, -phh); ctx.lineTo(gap / 2, phh)
  ctx.stroke()

  // Label
  ctx.fillStyle = colors.label
  ctx.font = '10px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(formatValue('C', value), 0, phh + 6)

  ctx.restore()
}

function drawInductor(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  rot: 0 | 90 | 180 | 270, value: number,
  colors: DrawColors, selected: boolean,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate((rot * Math.PI) / 180)

  const loops = 4, loopR = 7, loopW = 2 * loopR * loops
  const hw = loopW / 2, loopH = loopR * 2
  const off = getOffset('L')

  if (selected) {
    ctx.strokeStyle = colors.selection
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.strokeRect(-hw - 4, -loopH - 4, loopW + 8, loopH * 2 + 8)
    ctx.setLineDash([])
  }

  // Lead wires
  ctx.strokeStyle = colors.wire
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-off, 0); ctx.lineTo(-hw, 0)
  ctx.moveTo(hw, 0); ctx.lineTo(off, 0)
  ctx.stroke()

  // Coil loops
  ctx.strokeStyle = colors.component
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-hw, 0)
  for (let i = 0; i < loops; i++) {
    const cx = -hw + loopR + i * loopR * 2
    ctx.arc(cx, 0, loopR, Math.PI, 0, false)
  }
  ctx.stroke()

  // Label
  ctx.fillStyle = colors.label
  ctx.font = '10px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(formatValue('L', value), 0, loopH + 6)

  ctx.restore()
}

function drawVoltageSource(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  rot: 0 | 90 | 180 | 270, value: number,
  colors: DrawColors, selected: boolean,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate((rot * Math.PI) / 180)

  const r = 16, off = getOffset('V')

  if (selected) {
    ctx.strokeStyle = colors.selection
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.strokeRect(-r - 4, -r - 4, r * 2 + 8, r * 2 + 8)
    ctx.setLineDash([])
  }

  // Lead wires
  ctx.strokeStyle = colors.wire
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-off, 0); ctx.lineTo(-r, 0)
  ctx.moveTo(r, 0); ctx.lineTo(off, 0)
  ctx.stroke()

  // Circle body
  ctx.strokeStyle = colors.component
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.stroke()

  // Polarity marks
  ctx.fillStyle = colors.component
  ctx.font = '12px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('+', 0, -5)
  ctx.fillText('−', 0, 8)

  // Label
  ctx.fillStyle = colors.label
  ctx.font = '10px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(formatValue('V', value), 0, r + 6)

  ctx.restore()
}

function drawGround(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  colors: DrawColors, selected: boolean,
) {
  ctx.save()
  ctx.translate(x, y)

  if (selected) {
    ctx.strokeStyle = colors.selection
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.strokeRect(-12, -4, 24, 24)
    ctx.setLineDash([])
  }

  ctx.strokeStyle = colors.component
  ctx.lineWidth = 2
  ctx.lineCap = 'round'

  // Vertical stem down from terminal
  ctx.beginPath()
  ctx.moveTo(0, 0); ctx.lineTo(0, 4)
  ctx.stroke()

  // Three horizontal bars
  ctx.beginPath()
  ctx.moveTo(-10, 4); ctx.lineTo(10, 4)
  ctx.moveTo(-6, 8); ctx.lineTo(6, 8)
  ctx.moveTo(-3, 12); ctx.lineTo(3, 12)
  ctx.stroke()

  // Lead wire UP from terminal (to connect to other components)
  ctx.strokeStyle = colors.wire
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(0, -20); ctx.lineTo(0, 0)
  ctx.stroke()

  ctx.restore()
}

export function drawComponent(
  ctx: CanvasRenderingContext2D,
  comp: CircuitComponent,
  colors: DrawColors,
  selected: boolean,
) {
  switch (comp.type) {
    case 'R': drawResistor(ctx, comp.x, comp.y, comp.rotation, comp.value, colors, selected); break
    case 'L': drawInductor(ctx, comp.x, comp.y, comp.rotation, comp.value, colors, selected); break
    case 'C': drawCapacitor(ctx, comp.x, comp.y, comp.rotation, comp.value, colors, selected); break
    case 'V': drawVoltageSource(ctx, comp.x, comp.y, comp.rotation, comp.value, colors, selected); break
    case 'GND': drawGround(ctx, comp.x, comp.y, colors, selected); break
  }
}

// ── Wire & junction drawing ────────────────────────────────────────

export function drawWireSegment(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  colors: DrawColors,
) {
  ctx.strokeStyle = colors.wire
  ctx.lineWidth = 3.5   // thicker wires for visibility
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

export function drawJunctionDot(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  colors: DrawColors,
) {
  ctx.fillStyle = colors.junctionDot
  ctx.beginPath()
  ctx.arc(x, y, 5, 0, Math.PI * 2)  // bigger dots
  ctx.fill()
}

export function drawTerminal(
  ctx: CanvasRenderingContext2D, x: number, y: number,
  colors: DrawColors, hovered: boolean,
) {
  const r = hovered ? 6 : 3.5
  ctx.fillStyle = hovered ? colors.accent : colors.terminal
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  if (hovered) {
    ctx.strokeStyle = colors.accent
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(x, y, 8, 0, Math.PI * 2)
    ctx.stroke()
  }
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  offsetX: number, offsetY: number,
  colors: DrawColors,
) {
  const gs = GRID_SIZE
  ctx.fillStyle = colors.grid
  const sx = ((offsetX % gs) + gs) % gs
  const sy = ((offsetY % gs) + gs) % gs
  for (let x = sx; x < w; x += gs) {
    for (let y = sy; y < h; y += gs) {
      ctx.fillRect(x - 0.5, y - 0.5, 1, 1)
    }
  }
}
