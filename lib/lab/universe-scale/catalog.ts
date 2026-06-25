// The catalogue of objects on the size axis, Planck length -> observable
// universe. Each entry knows its real size (metres) and how to draw itself at
// an apparent diameter `px`, centred at (cx, cy). Draw functions are pure
// canvas calls; the renderer sets globalAlpha for cross-fading.

export type Regime =
  | 'quantum' | 'atomic' | 'human' | 'geographic'
  | 'planetary' | 'stellar' | 'galactic' | 'cosmic'

export type DrawArgs = {
  ctx: CanvasRenderingContext2D
  cx: number
  cy: number
  px: number // apparent diameter in CSS px
  fg: string // theme foreground colour
  t: number // time (ms) for gentle motion
}

export type ScaleObject = {
  id: string
  name: string
  sizeMeters: number
  regime: Regime
  blurb: string
  draw: (a: DrawArgs) => void
}

// Accent colours chosen mid-luminance so they read on light + dark.
const COL = {
  earth: '#4c9be8',
  land: '#5fb98a',
  sun: '#f5a623',
  mars: '#d4694a',
  gas: '#cBa37a',
  bio: '#6cc4a1',
  star: '#ffd97a',
  galaxy: '#a78bfa',
  cosmic: '#8b9dff',
  quantum: '#67e8f9',
}

// ── drawing helpers ────────────────────────────────────────────────────────
function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.arc(x, y, Math.max(0.2, r), 0, Math.PI * 2)
}
function strokeCirc(a: DrawArgs, r: number, w = 1.5, col?: string) {
  a.ctx.lineWidth = w
  a.ctx.strokeStyle = col ?? a.fg
  circle(a.ctx, a.cx, a.cy, r)
  a.ctx.stroke()
}
function fillCirc(a: DrawArgs, r: number, col: string) {
  a.ctx.fillStyle = col
  circle(a.ctx, a.cx, a.cy, r)
  a.ctx.fill()
}
function dotCloud(a: DrawArgs, r: number, n: number, seed: number, col: string, dotR = 1.2) {
  a.ctx.fillStyle = col
  for (let i = 0; i < n; i++) {
    const u = Math.sin(seed + i * 12.9898) * 43758.5453
    const v = Math.sin(seed + i * 78.233) * 12543.123
    const ang = (u - Math.floor(u)) * Math.PI * 2
    const rad = Math.sqrt(v - Math.floor(v)) * r
    circle(a.ctx, a.cx + Math.cos(ang) * rad, a.cy + Math.sin(ang) * rad, dotR)
    a.ctx.fill()
  }
}

// ── bespoke silhouettes ────────────────────────────────────────────────────
function drawPlanck(a: DrawArgs) {
  const r = a.px / 2
  a.ctx.save()
  a.ctx.globalAlpha *= 0.9
  dotCloud(a, r * 1.4, 26, 3, COL.quantum, 1.1)
  strokeCirc(a, r, 1, COL.quantum)
  a.ctx.restore()
}
function drawQuark(a: DrawArgs) {
  const r = a.px / 2
  fillCirc(a, Math.max(1.5, r * 0.5), COL.quantum)
  strokeCirc(a, r, 1, COL.quantum)
}
function drawProton(a: DrawArgs) {
  const r = a.px / 2
  const cols = [COL.quantum, '#f472b6', '#fbbf24']
  for (let i = 0; i < 3; i++) {
    const ang = a.t / 1400 + (i * Math.PI * 2) / 3
    fillCirc({ ...a, cx: a.cx + Math.cos(ang) * r * 0.42, cy: a.cy + Math.sin(ang) * r * 0.42 }, r * 0.34, cols[i])
  }
  strokeCirc(a, r, 1, a.fg)
}
function drawAtom(a: DrawArgs) {
  const r = a.px / 2
  fillCirc(a, r * 0.16, COL.mars) // nucleus
  a.ctx.strokeStyle = a.fg
  a.ctx.lineWidth = 1
  for (let i = 0; i < 3; i++) {
    a.ctx.save()
    a.ctx.translate(a.cx, a.cy)
    a.ctx.rotate((i * Math.PI) / 3)
    a.ctx.beginPath()
    a.ctx.ellipse(0, 0, r * 0.95, r * 0.36, 0, 0, Math.PI * 2)
    a.ctx.stroke()
    const ea = a.t / 500 + i * 2
    fillCirc({ ...a, cx: a.cx, cy: a.cy }, 0, a.fg) // noop to keep types
    a.ctx.fillStyle = COL.quantum
    circle(a.ctx, Math.cos(ea) * r * 0.95, Math.sin(ea) * r * 0.36, Math.max(1, r * 0.06))
    a.ctx.fill()
    a.ctx.restore()
  }
}
function drawDNA(a: DrawArgs) {
  const r = a.px / 2
  a.ctx.strokeStyle = COL.bio
  a.ctx.lineWidth = Math.max(1, r * 0.06)
  for (let s = 0; s < 2; s++) {
    a.ctx.beginPath()
    for (let y = -r; y <= r; y += 2) {
      const x = Math.sin(y / r * Math.PI * 2 + s * Math.PI) * r * 0.45
      if (y === -r) a.ctx.moveTo(a.cx + x, a.cy + y)
      else a.ctx.lineTo(a.cx + x, a.cy + y)
    }
    a.ctx.stroke()
  }
  a.ctx.strokeStyle = a.fg
  a.ctx.lineWidth = 1
  for (let y = -r; y <= r; y += r * 0.28) {
    const x = Math.sin(y / r * Math.PI * 2) * r * 0.45
    a.ctx.beginPath()
    a.ctx.moveTo(a.cx + x, a.cy + y)
    a.ctx.lineTo(a.cx - x, a.cy + y)
    a.ctx.stroke()
  }
}
function drawVirus(a: DrawArgs) {
  const r = a.px / 2
  fillCirc(a, r * 0.7, COL.bio)
  a.ctx.strokeStyle = a.fg
  a.ctx.lineWidth = 1
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2
    a.ctx.beginPath()
    a.ctx.moveTo(a.cx + Math.cos(ang) * r * 0.7, a.cy + Math.sin(ang) * r * 0.7)
    a.ctx.lineTo(a.cx + Math.cos(ang) * r, a.cy + Math.sin(ang) * r)
    a.ctx.stroke()
    circle(a.ctx, a.cx + Math.cos(ang) * r, a.cy + Math.sin(ang) * r, Math.max(1, r * 0.07))
    a.ctx.fillStyle = COL.bio
    a.ctx.fill()
  }
}
function drawCell(a: DrawArgs) {
  const r = a.px / 2
  fillCirc(a, r, COL.bio + '44')
  strokeCirc(a, r, Math.max(1, r * 0.04), COL.bio)
  fillCirc(a, r * 0.34, COL.bio) // nucleus
}
function blob(a: DrawArgs, r: number, col: string) {
  fillCirc(a, r, col)
}
function drawAnt(a: DrawArgs) {
  const s = a.px / 2
  a.ctx.fillStyle = '#7a5230'
  a.ctx.strokeStyle = '#7a5230'
  a.ctx.lineWidth = Math.max(1, s * 0.08)
  // three body segments along x
  const seg = [
    [-0.55, 0.32],
    [0.0, 0.26],
    [0.6, 0.42],
  ]
  for (const [dx, rr] of seg) {
    circle(a.ctx, a.cx + dx * s, a.cy, rr * s)
    a.ctx.fill()
  }
  // legs
  for (let i = -1; i <= 1; i++) {
    for (const dir of [-1, 1]) {
      a.ctx.beginPath()
      a.ctx.moveTo(a.cx + i * s * 0.18, a.cy)
      a.ctx.lineTo(a.cx + i * s * 0.18 + dir * s * 0.5, a.cy + dir * s * 0.55)
      a.ctx.stroke()
    }
  }
  // antennae
  for (const dir of [-1, 1]) {
    a.ctx.beginPath()
    a.ctx.moveTo(a.cx - 0.55 * s, a.cy)
    a.ctx.lineTo(a.cx - 0.95 * s, a.cy + dir * s * 0.4)
    a.ctx.stroke()
  }
}
function drawHuman(a: DrawArgs) {
  const h = a.px // treat px as height
  const s = h / 2
  a.ctx.strokeStyle = a.fg
  a.ctx.fillStyle = a.fg
  a.ctx.lineWidth = Math.max(1.5, h * 0.04)
  const headR = h * 0.11
  circle(a.ctx, a.cx, a.cy - s + headR, headR)
  a.ctx.fill()
  const neck = a.cy - s + headR * 2
  const hip = a.cy + s * 0.1
  a.ctx.beginPath()
  a.ctx.moveTo(a.cx, neck)
  a.ctx.lineTo(a.cx, hip)
  a.ctx.stroke()
  // arms
  a.ctx.beginPath()
  a.ctx.moveTo(a.cx - s * 0.34, a.cy - s * 0.1)
  a.ctx.lineTo(a.cx, neck + h * 0.04)
  a.ctx.lineTo(a.cx + s * 0.34, a.cy - s * 0.1)
  a.ctx.stroke()
  // legs
  a.ctx.beginPath()
  a.ctx.moveTo(a.cx - s * 0.26, a.cy + s)
  a.ctx.lineTo(a.cx, hip)
  a.ctx.lineTo(a.cx + s * 0.26, a.cy + s)
  a.ctx.stroke()
}
function drawWhale(a: DrawArgs) {
  const w = a.px
  const s = w / 2
  a.ctx.fillStyle = '#4a6b86'
  a.ctx.beginPath()
  a.ctx.ellipse(a.cx, a.cy, s, s * 0.34, 0, 0, Math.PI * 2)
  a.ctx.fill()
  // tail fluke
  a.ctx.beginPath()
  a.ctx.moveTo(a.cx + s * 0.85, a.cy)
  a.ctx.lineTo(a.cx + s, a.cy - s * 0.3)
  a.ctx.lineTo(a.cx + s, a.cy + s * 0.3)
  a.ctx.closePath()
  a.ctx.fill()
  // eye + belly line
  a.ctx.fillStyle = a.fg
  circle(a.ctx, a.cx - s * 0.62, a.cy - s * 0.04, Math.max(1, s * 0.04))
  a.ctx.fill()
}
function drawBuilding(a: DrawArgs) {
  const h = a.px
  const w = h * 0.32
  a.ctx.fillStyle = '#7c8aa0'
  a.ctx.fillRect(a.cx - w / 2, a.cy - h / 2, w, h)
  a.ctx.fillStyle = '#cbd5e1'
  const rows = Math.min(18, Math.max(3, Math.floor(h / 14)))
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 3; c++) {
      if ((r + c) % 2 === 0) continue
      a.ctx.fillRect(a.cx - w / 2 + (c + 0.5) * (w / 3) - w * 0.08, a.cy - h / 2 + (r + 0.5) * (h / rows) - h * 0.012, w * 0.16, h * 0.02)
    }
  }
}
function drawMountain(a: DrawArgs) {
  const s = a.px / 2
  a.ctx.fillStyle = '#6b7280'
  a.ctx.beginPath()
  a.ctx.moveTo(a.cx - s, a.cy + s * 0.6)
  a.ctx.lineTo(a.cx - s * 0.1, a.cy - s * 0.7)
  a.ctx.lineTo(a.cx + s * 0.35, a.cy - s * 0.1)
  a.ctx.lineTo(a.cx + s * 0.6, a.cy - s * 0.45)
  a.ctx.lineTo(a.cx + s, a.cy + s * 0.6)
  a.ctx.closePath()
  a.ctx.fill()
  // snow cap
  a.ctx.fillStyle = '#eef2f6'
  a.ctx.beginPath()
  a.ctx.moveTo(a.cx - s * 0.1, a.cy - s * 0.7)
  a.ctx.lineTo(a.cx - s * 0.32, a.cy - s * 0.32)
  a.ctx.lineTo(a.cx + s * 0.12, a.cy - s * 0.36)
  a.ctx.closePath()
  a.ctx.fill()
}
function drawEarth(a: DrawArgs) {
  const r = a.px / 2
  fillCirc(a, r, COL.earth)
  a.ctx.save()
  circle(a.ctx, a.cx, a.cy, r)
  a.ctx.clip()
  a.ctx.fillStyle = COL.land
  const rot = a.t / 8000
  for (let i = 0; i < 7; i++) {
    const u = Math.sin(i * 91.7) * 0.5 + 0.5
    const v = Math.sin(i * 47.3) * 0.5 + 0.5
    const x = a.cx + (((u + rot) % 1) * 2 - 1) * r
    const y = a.cy + (v * 2 - 1) * r * 0.8
    blob({ ...a, cx: x, cy: y }, r * (0.18 + u * 0.22), COL.land)
  }
  a.ctx.restore()
  strokeCirc(a, r, 1, COL.earth)
}
function drawMoon(a: DrawArgs) {
  const r = a.px / 2
  fillCirc(a, r, '#b9bdc4')
  a.ctx.fillStyle = '#9aa0a8'
  for (let i = 0; i < 6; i++) {
    const ang = i * 1.7
    circle(a.ctx, a.cx + Math.cos(ang) * r * 0.5, a.cy + Math.sin(ang) * r * 0.5, r * (0.06 + (i % 3) * 0.04))
    a.ctx.fill()
  }
}
function gasPlanet(col: string, ring = false) {
  return (a: DrawArgs) => {
    const r = a.px / 2
    fillCirc(a, r, col)
    a.ctx.save()
    circle(a.ctx, a.cx, a.cy, r)
    a.ctx.clip()
    a.ctx.strokeStyle = '#00000022'
    a.ctx.lineWidth = r * 0.12
    for (let y = -r; y < r; y += r * 0.22) {
      a.ctx.beginPath()
      a.ctx.moveTo(a.cx - r, a.cy + y)
      a.ctx.lineTo(a.cx + r, a.cy + y)
      a.ctx.stroke()
    }
    a.ctx.restore()
    if (ring) {
      a.ctx.strokeStyle = '#d8c79a'
      a.ctx.lineWidth = Math.max(1, r * 0.08)
      a.ctx.save()
      a.ctx.translate(a.cx, a.cy)
      a.ctx.rotate(-0.4)
      a.ctx.beginPath()
      a.ctx.ellipse(0, 0, r * 1.7, r * 0.5, 0, 0, Math.PI * 2)
      a.ctx.stroke()
      a.ctx.restore()
    }
  }
}
function drawSun(a: DrawArgs) {
  const r = a.px / 2
  const grd = a.ctx.createRadialGradient(a.cx, a.cy, r * 0.2, a.cx, a.cy, r)
  grd.addColorStop(0, '#fff3c4')
  grd.addColorStop(0.6, COL.sun)
  grd.addColorStop(1, COL.mars)
  a.ctx.fillStyle = grd
  circle(a.ctx, a.cx, a.cy, r)
  a.ctx.fill()
  // corona flicker
  a.ctx.strokeStyle = COL.sun + '88'
  a.ctx.lineWidth = Math.max(1, r * 0.03)
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2
    const len = r * (0.12 + 0.08 * (0.5 + 0.5 * Math.sin(a.t / 300 + i)))
    a.ctx.beginPath()
    a.ctx.moveTo(a.cx + Math.cos(ang) * r, a.cy + Math.sin(ang) * r)
    a.ctx.lineTo(a.cx + Math.cos(ang) * (r + len), a.cy + Math.sin(ang) * (r + len))
    a.ctx.stroke()
  }
}
function orbitSystem(rings: number) {
  return (a: DrawArgs) => {
    const r = a.px / 2
    fillCirc(a, Math.max(1.5, r * 0.04), COL.sun)
    a.ctx.strokeStyle = a.fg + '66'
    a.ctx.lineWidth = 1
    for (let i = 1; i <= rings; i++) {
      const rr = (i / rings) * r
      circle(a.ctx, a.cx, a.cy, rr)
      a.ctx.stroke()
      const ang = a.t / (700 + i * 400) + i
      a.ctx.fillStyle = i % 2 ? COL.earth : COL.gas
      circle(a.ctx, a.cx + Math.cos(ang) * rr, a.cy + Math.sin(ang) * rr, Math.max(1, r * 0.03))
      a.ctx.fill()
    }
  }
}
function drawGalaxy(a: DrawArgs) {
  const r = a.px / 2
  a.ctx.save()
  a.ctx.translate(a.cx, a.cy)
  a.ctx.rotate(a.t / 16000)
  // core
  const grd = a.ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.35)
  grd.addColorStop(0, '#fff7d6')
  grd.addColorStop(1, COL.galaxy + '00')
  a.ctx.fillStyle = grd
  circle(a.ctx, 0, 0, r * 0.35)
  a.ctx.fill()
  // spiral arms
  a.ctx.fillStyle = COL.galaxy
  for (let arm = 0; arm < 2; arm++) {
    for (let i = 0; i < 220; i++) {
      const f = i / 220
      const ang = arm * Math.PI + f * 5.5
      const rad = f * r
      const jitter = Math.sin(i * 12.9) * r * 0.04
      a.ctx.globalAlpha *= 1
      circle(a.ctx, Math.cos(ang) * rad + jitter, Math.sin(ang) * rad * 0.62, Math.max(0.5, r * 0.012 * (1 - f)))
      a.ctx.fill()
    }
  }
  a.ctx.restore()
}
function drawCluster(a: DrawArgs) {
  const r = a.px / 2
  for (let i = 0; i < 14; i++) {
    const u = Math.sin(i * 33.1) * 0.5 + 0.5
    const v = Math.sin(i * 71.7) * 0.5 + 0.5
    const x = a.cx + (u * 2 - 1) * r * 0.9
    const y = a.cy + (v * 2 - 1) * r * 0.9
    a.ctx.save()
    a.ctx.translate(x - a.cx, y - a.cy)
    drawGalaxy({ ...a, px: a.px * (0.12 + u * 0.1) })
    a.ctx.restore()
  }
}
function drawCosmicWeb(a: DrawArgs) {
  const r = a.px / 2
  const nodes: [number, number][] = []
  for (let i = 0; i < 16; i++) {
    const u = Math.sin(i * 12.9898) * 43758.5 % 1
    const v = Math.sin(i * 78.233) * 12543.1 % 1
    nodes.push([a.cx + (u * 2 - 1) * r, a.cy + (v * 2 - 1) * r])
  }
  a.ctx.strokeStyle = COL.cosmic + '55'
  a.ctx.lineWidth = 1
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i][0] - nodes[j][0], dy = nodes[i][1] - nodes[j][1]
      if (Math.hypot(dx, dy) < r * 0.75) {
        a.ctx.beginPath()
        a.ctx.moveTo(nodes[i][0], nodes[i][1])
        a.ctx.lineTo(nodes[j][0], nodes[j][1])
        a.ctx.stroke()
      }
    }
  }
  a.ctx.fillStyle = COL.cosmic
  for (const [x, y] of nodes) {
    circle(a.ctx, x, y, Math.max(1, r * 0.03))
    a.ctx.fill()
  }
}
function drawObsUniverse(a: DrawArgs) {
  const r = a.px / 2
  const grd = a.ctx.createRadialGradient(a.cx, a.cy, r * 0.2, a.cx, a.cy, r)
  grd.addColorStop(0, COL.cosmic + '10')
  grd.addColorStop(0.85, COL.cosmic + '33')
  grd.addColorStop(1, COL.cosmic + '00')
  a.ctx.fillStyle = grd
  circle(a.ctx, a.cx, a.cy, r)
  a.ctx.fill()
  dotCloud(a, r * 0.95, 60, 7, COL.cosmic, 1)
  strokeCirc(a, r, 1, COL.cosmic + '88')
}
function genericGlyph(col: string) {
  return (a: DrawArgs) => {
    fillCirc(a, (a.px / 2) * 0.86, col + '33')
    strokeCirc(a, a.px / 2, 1.5, col)
  }
}

// ── the catalogue (sorted by size; renderer relies on order) ───────────────
export const CATALOG: ScaleObject[] = [
  { id: 'planck', name: 'Planck length', sizeMeters: 1.616e-35, regime: 'quantum',
    blurb: 'The scale where our notion of smooth space is thought to break down. Nothing meaningful is known below it.', draw: drawPlanck },
  { id: 'quark', name: 'Quark', sizeMeters: 1e-18, regime: 'quantum',
    blurb: 'A point-like constituent of protons and neutrons, smaller than anything we can resolve.', draw: drawQuark },
  { id: 'proton', name: 'Proton', sizeMeters: 1.68e-15, regime: 'quantum',
    blurb: 'Three quarks bound by the strong force. A femtometre across.', draw: drawProton },
  { id: 'atom', name: 'Hydrogen atom', sizeMeters: 1.06e-10, regime: 'atomic',
    blurb: 'A single proton with one electron. Mostly empty space.', draw: drawAtom },
  { id: 'dna', name: 'DNA helix', sizeMeters: 2.5e-9, regime: 'atomic',
    blurb: 'The width of the double helix that stores your genome.', draw: drawDNA },
  { id: 'virus', name: 'Virus', sizeMeters: 1e-7, regime: 'atomic',
    blurb: 'A protein shell around a strand of genetic code. Far smaller than a cell.', draw: drawVirus },
  { id: 'bacterium', name: 'Bacterium', sizeMeters: 2e-6, regime: 'atomic',
    blurb: 'A single-celled organism, around two micrometres long.', draw: (a) => { blob(a, a.px / 2, COL.bio); a.ctx.fillStyle = a.fg; } },
  { id: 'redcell', name: 'Red blood cell', sizeMeters: 8e-6, regime: 'atomic',
    blurb: 'A biconcave disc that ferries oxygen around your body.', draw: (a) => { fillCirc(a, a.px / 2, '#c0392b'); strokeCirc(a, a.px / 2, 1, '#7a1f15') } },
  { id: 'cell', name: 'Human cell', sizeMeters: 2.5e-5, regime: 'atomic',
    blurb: 'A typical animal cell with its nucleus. The basic unit of life.', draw: drawCell },
  { id: 'hair', name: 'Human hair (width)', sizeMeters: 9e-5, regime: 'human',
    blurb: 'About 90 micrometres across — near the limit of unaided eyesight.', draw: genericGlyph(COL.bio) },
  { id: 'sand', name: 'Grain of sand', sizeMeters: 5e-4, regime: 'human',
    blurb: 'Half a millimetre of quartz. The smallest thing you can comfortably pick up.', draw: (a) => { fillCirc(a, a.px / 2, '#d8b673'); strokeCirc(a, a.px / 2, 1, '#9c7b3f') } },
  { id: 'ant', name: 'Ant', sizeMeters: 8e-3, regime: 'human',
    blurb: 'A few millimetres of legs, antennae and remarkable strength. Our journey starts here.', draw: drawAnt },
  { id: 'hand', name: 'Human hand', sizeMeters: 0.19, regime: 'human',
    blurb: 'Roughly 19 cm from wrist to fingertip.', draw: genericGlyph(COL.bio) },
  { id: 'human', name: 'Human', sizeMeters: 1.7, regime: 'human',
    blurb: 'You. The reference against which all of this feels large or small.', draw: drawHuman },
  { id: 'car', name: 'Car', sizeMeters: 4.5, regime: 'human',
    blurb: 'About four and a half metres of metal and glass.', draw: (a) => { a.ctx.fillStyle = COL.mars; a.ctx.fillRect(a.cx - a.px / 2, a.cy - a.px * 0.16, a.px, a.px * 0.32) } },
  { id: 'whale', name: 'Blue whale', sizeMeters: 25, regime: 'human',
    blurb: 'The largest animal that has ever lived, up to 30 metres long.', draw: drawWhale },
  { id: 'pitch', name: 'Football pitch', sizeMeters: 105, regime: 'human',
    blurb: 'About 105 metres goal to goal.', draw: (a) => { a.ctx.strokeStyle = COL.bio; a.ctx.lineWidth = 2; a.ctx.strokeRect(a.cx - a.px / 2, a.cy - a.px * 0.32, a.px, a.px * 0.64) } },
  { id: 'skyscraper', name: 'Skyscraper', sizeMeters: 450, regime: 'human',
    blurb: 'A supertall tower. The Empire State is 443 m to the tip.', draw: drawBuilding },
  { id: 'everest', name: 'Mount Everest', sizeMeters: 8849, regime: 'geographic',
    blurb: 'Earth\'s highest peak, 8,849 m above sea level.', draw: drawMountain },
  { id: 'city', name: 'City', sizeMeters: 2e4, regime: 'geographic',
    blurb: 'Tens of kilometres of streets and buildings.', draw: genericGlyph('#94a3b8') },
  { id: 'moon', name: 'The Moon', sizeMeters: 3.474e6, regime: 'planetary',
    blurb: 'Earth\'s companion, a quarter of Earth\'s diameter.', draw: drawMoon },
  { id: 'earth', name: 'Earth', sizeMeters: 1.2742e7, regime: 'planetary',
    blurb: 'Home. 12,742 km across, the only place we know that hosts life.', draw: drawEarth },
  { id: 'jupiter', name: 'Jupiter', sizeMeters: 1.4e8, regime: 'planetary',
    blurb: 'The largest planet, eleven Earths wide.', draw: gasPlanet(COL.gas) },
  { id: 'sun', name: 'The Sun', sizeMeters: 1.3927e9, regime: 'stellar',
    blurb: 'A middling star. A million Earths would fit inside.', draw: drawSun },
  { id: 'earthorbit', name: 'Earth\'s orbit (1 AU)', sizeMeters: 3e11, regime: 'stellar',
    blurb: 'The distance light crosses in about eight minutes.', draw: orbitSystem(1) },
  { id: 'solarsystem', name: 'Solar System', sizeMeters: 2.9e13, regime: 'stellar',
    blurb: 'Out to the orbit of Neptune and the heliosphere beyond.', draw: orbitSystem(5) },
  { id: 'lightyear', name: 'One light-year', sizeMeters: 9.4607e15, regime: 'stellar',
    blurb: 'The distance light travels in a year. Still inside the Oort cloud.', draw: genericGlyph(COL.star) },
  { id: 'proxima', name: 'To Proxima Centauri', sizeMeters: 4e16, regime: 'stellar',
    blurb: 'The nearest star beyond the Sun, 4.2 light-years away.', draw: genericGlyph(COL.star) },
  { id: 'nebula', name: 'Orion Nebula', sizeMeters: 2.2e17, regime: 'stellar',
    blurb: 'A stellar nursery 24 light-years across, lit by newborn stars.', draw: (a) => { dotCloud(a, a.px / 2, 40, 2, COL.galaxy, 1.4); fillCirc(a, a.px * 0.06, COL.star) } },
  { id: 'cluster-stars', name: 'Star cluster', sizeMeters: 1e18, regime: 'galactic',
    blurb: 'Hundreds of thousands of stars bound together.', draw: (a) => dotCloud(a, a.px / 2, 70, 5, COL.star, 1.2) },
  { id: 'milkyway', name: 'Milky Way', sizeMeters: 9.5e20, regime: 'galactic',
    blurb: 'Our galaxy: a few hundred billion stars in a spiral 100,000 light-years wide.', draw: drawGalaxy },
  { id: 'localgroup', name: 'Local Group', sizeMeters: 3e22, regime: 'galactic',
    blurb: 'The Milky Way, Andromeda and dozens of smaller galaxies.', draw: drawCluster },
  { id: 'virgo', name: 'Galaxy cluster', sizeMeters: 1e23, regime: 'cosmic',
    blurb: 'Thousands of galaxies bound by gravity and dark matter.', draw: drawCluster },
  { id: 'laniakea', name: 'Supercluster', sizeMeters: 5e24, regime: 'cosmic',
    blurb: 'Laniakea, our home supercluster, threads 100,000 galaxies together.', draw: drawCosmicWeb },
  { id: 'cosmicweb', name: 'Cosmic web', sizeMeters: 1e25, regime: 'cosmic',
    blurb: 'Galaxies strung along filaments around vast empty voids.', draw: drawCosmicWeb },
  { id: 'universe', name: 'Observable universe', sizeMeters: 8.8e26, regime: 'cosmic',
    blurb: 'Everything we could ever see: 93 billion light-years across. Its mass sits at its own Schwarzschild scale.', draw: drawObsUniverse },
]

/** Look up a catalogue object by id. */
export function objectById(id: string): ScaleObject | undefined {
  return CATALOG.find((o) => o.id === id)
}
