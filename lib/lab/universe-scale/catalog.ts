// The catalogue of objects on the size axis, Planck length -> observable
// universe. Each entry knows its real size (metres) and how to draw itself as a
// shaded, dimensional model at an apparent diameter `px`, centred at (cx, cy).
// Models are lit from the upper-left and sit on an isometric stage drawn by the
// renderer, so the scene reads as a 3-D space rather than flat icons.

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

// Light direction (upper-left), shared by every shaded model.
const LX = -0.42
const LY = -0.5

const COL = {
  earthSea: '#2f6fb0',
  earthLand: '#4f9d6b',
  mars: '#c1583a',
  moon: '#aeb3bb',
  gas: '#cdaa78',
  sun: '#ffb02e',
  sunCore: '#fff2c0',
  star: '#ffe08a',
  galaxy: '#a78bfa',
  galaxyCore: '#fff3d6',
  cosmic: '#8b9dff',
  quantum: '#5ad1e6',
  bio: '#5bbf94',
  blood: '#c0392b',
  sand: '#d8b673',
  metal: '#8b96a8',
} as const

// ── colour utilities ───────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function mix([r, g, b]: [number, number, number], t: number, toward: [number, number, number]): string {
  const r2 = Math.round(r + (toward[0] - r) * t)
  const g2 = Math.round(g + (toward[1] - g) * t)
  const b2 = Math.round(b + (toward[2] - b) * t)
  return `rgb(${r2},${g2},${b2})`
}
const WHITE: [number, number, number] = [255, 255, 255]
const BLACK: [number, number, number] = [6, 8, 16]
function lighten(hex: string, t: number) { return mix(hexToRgb(hex), t, WHITE) }
function darken(hex: string, t: number) { return mix(hexToRgb(hex), t, BLACK) }

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.arc(x, y, Math.max(0.2, r), 0, Math.PI * 2)
}

/** A lit sphere with a soft terminator, rim light and a specular dot. */
function sphere(a: DrawArgs, r: number, base: string, opts: { rim?: string; spec?: number } = {}) {
  const { ctx, cx, cy } = a
  const grd = ctx.createRadialGradient(
    cx + LX * r * 0.55, cy + LY * r * 0.55, r * 0.04,
    cx, cy, r,
  )
  grd.addColorStop(0, lighten(base, 0.55))
  grd.addColorStop(0.45, base)
  grd.addColorStop(1, darken(base, 0.6))
  ctx.fillStyle = grd
  circle(ctx, cx, cy, r)
  ctx.fill()
  if (opts.rim) {
    ctx.strokeStyle = opts.rim
    ctx.lineWidth = Math.max(0.6, r * 0.04)
    circle(ctx, cx, cy, r * 0.97)
    ctx.stroke()
  }
  const s = opts.spec ?? 0.45
  if (s > 0) {
    ctx.fillStyle = `rgba(255,255,255,${s})`
    circle(ctx, cx + LX * r * 0.5, cy + LY * r * 0.5, r * 0.14)
    ctx.fill()
  }
}

/** A glowing emissive orb (stars), no terminator. */
function star(a: DrawArgs, r: number, core: string, edge: string) {
  const { ctx, cx, cy } = a
  const grd = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r)
  grd.addColorStop(0, core)
  grd.addColorStop(0.55, edge)
  grd.addColorStop(1, darken(edge, 0.35))
  ctx.fillStyle = grd
  circle(ctx, cx, cy, r)
  ctx.fill()
}

function dotCloud(a: DrawArgs, r: number, n: number, seed: number, col: string, dotR = 1.2) {
  const { ctx, cx, cy } = a
  ctx.fillStyle = col
  for (let i = 0; i < n; i++) {
    const u = Math.sin(seed + i * 12.9898) * 43758.5453
    const v = Math.sin(seed + i * 78.233) * 12543.123
    const ang = (u - Math.floor(u)) * Math.PI * 2
    const rad = Math.sqrt(v - Math.floor(v)) * r
    circle(ctx, cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, dotR)
    ctx.fill()
  }
}

// Isometric helpers: a vector (x, y, z) in unit-ish object space projected to
// screen with a fixed iso tilt. Used by the structure models.
const ISO = 0.55 // vertical squash for the ground plane
function iso(a: DrawArgs, x: number, y: number, z: number, s: number): [number, number] {
  return [a.cx + (x - z) * s * 0.87, a.cy + ((x + z) * 0.5 * ISO - y) * s]
}

// ── celestial / sphere models ───────────────────────────────────────────────
function drawPlanck(a: DrawArgs) {
  const r = a.px / 2
  a.ctx.save()
  dotCloud(a, r * 1.4, 30, 3, COL.quantum, 1.1)
  a.ctx.globalAlpha *= 0.7
  a.ctx.strokeStyle = COL.quantum
  a.ctx.lineWidth = 1
  circle(a.ctx, a.cx, a.cy, r)
  a.ctx.stroke()
  a.ctx.restore()
}
function drawQuark(a: DrawArgs) {
  sphere(a, Math.max(2, a.px / 2 * 0.55), COL.quantum, { spec: 0.6 })
}
function drawProton(a: DrawArgs) {
  const r = a.px / 2
  const cols = [COL.quantum, '#f472b6', '#fbbf24']
  for (let i = 0; i < 3; i++) {
    const ang = a.t / 1400 + (i * Math.PI * 2) / 3
    sphere({ ...a, cx: a.cx + Math.cos(ang) * r * 0.42, cy: a.cy + Math.sin(ang) * r * 0.42 }, r * 0.42, cols[i], { spec: 0.5 })
  }
}
function drawAtom(a: DrawArgs) {
  const r = a.px / 2
  sphere(a, r * 0.18, COL.mars, { spec: 0.5 }) // nucleus
  a.ctx.strokeStyle = COL.quantum + 'cc'
  a.ctx.lineWidth = 1
  for (let i = 0; i < 3; i++) {
    a.ctx.save()
    a.ctx.translate(a.cx, a.cy)
    a.ctx.rotate((i * Math.PI) / 3 + a.t / 6000)
    a.ctx.beginPath()
    a.ctx.ellipse(0, 0, r * 0.95, r * 0.34, 0, 0, Math.PI * 2)
    a.ctx.stroke()
    const ea = a.t / 480 + i * 2.1
    a.ctx.fillStyle = COL.quantum
    circle(a.ctx, Math.cos(ea) * r * 0.95, Math.sin(ea) * r * 0.34, Math.max(1.2, r * 0.07))
    a.ctx.fill()
    a.ctx.restore()
  }
}
function drawDNA(a: DrawArgs) {
  const r = a.px / 2
  a.ctx.lineCap = 'round'
  for (let s = 0; s < 2; s++) {
    a.ctx.strokeStyle = s === 0 ? COL.bio : lighten(COL.bio, 0.3)
    a.ctx.lineWidth = Math.max(1.2, r * 0.08)
    a.ctx.beginPath()
    for (let y = -r; y <= r; y += 2) {
      const x = Math.sin((y / r) * Math.PI * 2 + s * Math.PI + a.t / 1200) * r * 0.42
      if (y === -r) a.ctx.moveTo(a.cx + x, a.cy + y)
      else a.ctx.lineTo(a.cx + x, a.cy + y)
    }
    a.ctx.stroke()
  }
  a.ctx.strokeStyle = a.fg + '88'
  a.ctx.lineWidth = 1
  for (let y = -r; y <= r; y += r * 0.26) {
    const x = Math.sin((y / r) * Math.PI * 2 + a.t / 1200) * r * 0.42
    a.ctx.beginPath()
    a.ctx.moveTo(a.cx + x, a.cy + y)
    a.ctx.lineTo(a.cx - x, a.cy + y)
    a.ctx.stroke()
  }
}
function drawVirus(a: DrawArgs) {
  const r = a.px / 2
  sphere(a, r * 0.7, COL.bio, { spec: 0.3 })
  a.ctx.strokeStyle = darken(COL.bio, 0.2)
  a.ctx.lineWidth = Math.max(1, r * 0.04)
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2
    a.ctx.beginPath()
    a.ctx.moveTo(a.cx + Math.cos(ang) * r * 0.7, a.cy + Math.sin(ang) * r * 0.7)
    a.ctx.lineTo(a.cx + Math.cos(ang) * r, a.cy + Math.sin(ang) * r)
    a.ctx.stroke()
    a.ctx.fillStyle = lighten(COL.bio, 0.2)
    circle(a.ctx, a.cx + Math.cos(ang) * r, a.cy + Math.sin(ang) * r, Math.max(1, r * 0.08))
    a.ctx.fill()
  }
}
function drawCell(a: DrawArgs) {
  const r = a.px / 2
  const { ctx, cx, cy } = a
  const grd = ctx.createRadialGradient(cx + LX * r * 0.4, cy + LY * r * 0.4, r * 0.1, cx, cy, r)
  grd.addColorStop(0, 'rgba(120,220,170,0.35)')
  grd.addColorStop(1, 'rgba(40,120,90,0.12)')
  ctx.fillStyle = grd
  circle(ctx, cx, cy, r)
  ctx.fill()
  ctx.strokeStyle = COL.bio
  ctx.lineWidth = Math.max(1, r * 0.04)
  circle(ctx, cx, cy, r)
  ctx.stroke()
  sphere({ ...a }, r * 0.34, darken(COL.bio, 0.1), { spec: 0.3 }) // nucleus
}
function drawRedCell(a: DrawArgs) {
  const r = a.px / 2
  const { ctx, cx, cy } = a
  sphere(a, r, COL.blood, { spec: 0.25 })
  // central dimple
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.55)
  grd.addColorStop(0, darken(COL.blood, 0.4))
  grd.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grd
  circle(ctx, cx, cy, r * 0.55)
  ctx.fill()
}
function drawMoon(a: DrawArgs) {
  const r = a.px / 2
  sphere(a, r, COL.moon, { spec: 0.15 })
  a.ctx.save()
  circle(a.ctx, a.cx, a.cy, r)
  a.ctx.clip()
  a.ctx.fillStyle = 'rgba(0,0,0,0.18)'
  for (let i = 0; i < 7; i++) {
    const ang = i * 1.7, rad = (0.2 + (i % 3) * 0.22) * r
    circle(a.ctx, a.cx + Math.cos(ang) * r * 0.45, a.cy + Math.sin(ang) * r * 0.45, rad * 0.3)
    a.ctx.fill()
  }
  a.ctx.restore()
}
function drawEarth(a: DrawArgs) {
  const r = a.px / 2
  sphere(a, r, COL.earthSea, { spec: 0.4, rim: 'rgba(120,180,255,0.5)' })
  a.ctx.save()
  circle(a.ctx, a.cx, a.cy, r)
  a.ctx.clip()
  const rot = a.t / 9000
  a.ctx.fillStyle = COL.earthLand
  for (let i = 0; i < 8; i++) {
    const u = Math.sin(i * 91.7) * 0.5 + 0.5
    const v = Math.sin(i * 47.3) * 0.5 + 0.5
    const x = a.cx + (((u + rot) % 1) * 2 - 1) * r
    const y = a.cy + (v * 2 - 1) * r * 0.8
    const rad = r * (0.16 + u * 0.2)
    // re-shade landmasses with the same light
    const grd = a.ctx.createRadialGradient(x + LX * rad, y + LY * rad, 0, x, y, rad)
    grd.addColorStop(0, lighten(COL.earthLand, 0.3))
    grd.addColorStop(1, darken(COL.earthLand, 0.3))
    a.ctx.fillStyle = grd
    circle(a.ctx, x, y, rad)
    a.ctx.fill()
  }
  // night-side terminator
  const tg = a.ctx.createRadialGradient(a.cx + LX * r * 0.5, a.cy + LY * r * 0.5, r * 0.2, a.cx, a.cy, r)
  tg.addColorStop(0, 'rgba(0,0,0,0)')
  tg.addColorStop(1, 'rgba(0,0,10,0.55)')
  a.ctx.fillStyle = tg
  circle(a.ctx, a.cx, a.cy, r)
  a.ctx.fill()
  a.ctx.restore()
}
function gasPlanet(base: string, ring = false) {
  return (a: DrawArgs) => {
    const r = a.px / 2
    if (ring) {
      a.ctx.save()
      a.ctx.translate(a.cx, a.cy)
      a.ctx.rotate(-0.42)
      a.ctx.strokeStyle = 'rgba(216,199,154,0.35)'
      a.ctx.lineWidth = Math.max(1, r * 0.16)
      a.ctx.beginPath()
      a.ctx.ellipse(0, 0, r * 1.7, r * 0.45, 0, Math.PI, Math.PI * 2)
      a.ctx.stroke()
      a.ctx.restore()
    }
    sphere(a, r, base, { spec: 0.3 })
    a.ctx.save()
    circle(a.ctx, a.cx, a.cy, r)
    a.ctx.clip()
    a.ctx.strokeStyle = 'rgba(0,0,0,0.14)'
    a.ctx.lineWidth = r * 0.1
    for (let y = -r; y < r; y += r * 0.2) {
      a.ctx.beginPath()
      a.ctx.moveTo(a.cx - r, a.cy + y + Math.sin(a.t / 1400 + y) * r * 0.02)
      a.ctx.lineTo(a.cx + r, a.cy + y)
      a.ctx.stroke()
    }
    a.ctx.restore()
    if (ring) {
      a.ctx.save()
      a.ctx.translate(a.cx, a.cy)
      a.ctx.rotate(-0.42)
      a.ctx.strokeStyle = 'rgba(216,199,154,0.6)'
      a.ctx.lineWidth = Math.max(1, r * 0.16)
      a.ctx.beginPath()
      a.ctx.ellipse(0, 0, r * 1.7, r * 0.45, 0, 0, Math.PI)
      a.ctx.stroke()
      a.ctx.restore()
    }
  }
}
function drawSun(a: DrawArgs) {
  const r = a.px / 2
  // corona glow
  const glow = a.ctx.createRadialGradient(a.cx, a.cy, r * 0.7, a.cx, a.cy, r * 1.6)
  glow.addColorStop(0, 'rgba(255,176,46,0.4)')
  glow.addColorStop(1, 'rgba(255,176,46,0)')
  a.ctx.fillStyle = glow
  circle(a.ctx, a.cx, a.cy, r * 1.6)
  a.ctx.fill()
  star(a, r, COL.sunCore, COL.sun)
  // flares
  a.ctx.strokeStyle = 'rgba(255,210,120,0.7)'
  a.ctx.lineWidth = Math.max(1, r * 0.03)
  for (let i = 0; i < 18; i++) {
    const ang = (i / 18) * Math.PI * 2
    const len = r * (0.1 + 0.1 * (0.5 + 0.5 * Math.sin(a.t / 320 + i)))
    a.ctx.beginPath()
    a.ctx.moveTo(a.cx + Math.cos(ang) * r, a.cy + Math.sin(ang) * r)
    a.ctx.lineTo(a.cx + Math.cos(ang) * (r + len), a.cy + Math.sin(ang) * (r + len))
    a.ctx.stroke()
  }
}
function orbitSystem(rings: number) {
  return (a: DrawArgs) => {
    const r = a.px / 2
    star(a, Math.max(2, r * 0.05), COL.sunCore, COL.sun)
    for (let i = 1; i <= rings; i++) {
      const rr = (i / rings) * r
      a.ctx.strokeStyle = a.fg + '44'
      a.ctx.lineWidth = 1
      a.ctx.save()
      a.ctx.translate(a.cx, a.cy)
      a.ctx.scale(1, ISO)
      circle(a.ctx, 0, 0, rr)
      a.ctx.stroke()
      a.ctx.restore()
      const ang = a.t / (700 + i * 420) + i
      const px = a.cx + Math.cos(ang) * rr
      const py = a.cy + Math.sin(ang) * rr * ISO
      sphere({ ...a, cx: px, cy: py }, Math.max(1.5, r * 0.035), i % 2 ? COL.earthSea : COL.gas, { spec: 0.4 })
    }
  }
}
function drawGalaxy(a: DrawArgs) {
  const r = a.px / 2
  a.ctx.save()
  a.ctx.translate(a.cx, a.cy)
  a.ctx.rotate(a.t / 18000)
  a.ctx.scale(1, 0.5) // tilt the disk into perspective
  // core glow
  const grd = a.ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.4)
  grd.addColorStop(0, COL.galaxyCore)
  grd.addColorStop(1, 'rgba(167,139,250,0)')
  a.ctx.fillStyle = grd
  circle(a.ctx, 0, 0, r * 0.4)
  a.ctx.fill()
  a.ctx.fillStyle = COL.galaxy
  for (let arm = 0; arm < 2; arm++) {
    for (let i = 0; i < 240; i++) {
      const f = i / 240
      const ang = arm * Math.PI + f * 5.5
      const rad = f * r
      const jit = Math.sin(i * 12.9) * r * 0.05
      a.ctx.globalAlpha = (1 - f) * 0.9
      circle(a.ctx, Math.cos(ang) * rad + jit, Math.sin(ang) * rad, Math.max(0.5, r * 0.014 * (1 - f)))
      a.ctx.fill()
    }
  }
  a.ctx.globalAlpha = 1
  a.ctx.restore()
}
function drawCluster(a: DrawArgs) {
  const r = a.px / 2
  for (let i = 0; i < 16; i++) {
    const u = Math.sin(i * 33.1) * 0.5 + 0.5
    const v = Math.sin(i * 71.7) * 0.5 + 0.5
    const x = (u * 2 - 1) * r * 0.85
    const y = (v * 2 - 1) * r * 0.55
    a.ctx.save()
    a.ctx.translate(x, y)
    drawGalaxy({ ...a, cx: 0, cy: 0, px: a.px * (0.12 + u * 0.1) })
    a.ctx.restore()
  }
}
function drawCosmicWeb(a: DrawArgs) {
  const r = a.px / 2
  const nodes: [number, number][] = []
  for (let i = 0; i < 18; i++) {
    const u = (Math.sin(i * 12.9898) * 43758.5) % 1
    const v = (Math.sin(i * 78.233) * 12543.1) % 1
    nodes.push([a.cx + (u * 2 - 1) * r, a.cy + (v * 2 - 1) * r * 0.8])
  }
  a.ctx.strokeStyle = COL.cosmic + '44'
  a.ctx.lineWidth = 1
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i][0] - nodes[j][0], dy = nodes[i][1] - nodes[j][1]
      if (Math.hypot(dx, dy) < r * 0.7) {
        a.ctx.beginPath()
        a.ctx.moveTo(nodes[i][0], nodes[i][1])
        a.ctx.lineTo(nodes[j][0], nodes[j][1])
        a.ctx.stroke()
      }
    }
  }
  for (const [x, y] of nodes) {
    a.ctx.fillStyle = COL.galaxyCore
    circle(a.ctx, x, y, Math.max(1.2, r * 0.035))
    a.ctx.fill()
  }
}
function drawObsUniverse(a: DrawArgs) {
  const r = a.px / 2
  const grd = a.ctx.createRadialGradient(a.cx, a.cy, r * 0.1, a.cx, a.cy, r)
  grd.addColorStop(0, 'rgba(139,157,255,0.06)')
  grd.addColorStop(0.82, 'rgba(139,157,255,0.22)')
  grd.addColorStop(1, 'rgba(139,157,255,0)')
  a.ctx.fillStyle = grd
  circle(a.ctx, a.cx, a.cy, r)
  a.ctx.fill()
  dotCloud(a, r * 0.95, 80, 7, COL.cosmic, 1.1)
  a.ctx.strokeStyle = COL.cosmic + '99'
  a.ctx.lineWidth = 1
  circle(a.ctx, a.cx, a.cy, r)
  a.ctx.stroke()
}

// ── isometric structure / creature models ──────────────────────────────────
function isoBox(a: DrawArgs, w: number, hgt: number, d: number, base: string) {
  // w,hgt,d in screen-px-ish units; draw three lit faces.
  const s = 1
  const A = a // alias
  const p = (x: number, y: number, z: number) => iso(A, x, y, z, s)
  const top = [p(0, hgt, 0), p(w, hgt, 0), p(w, hgt, d), p(0, hgt, d)]
  const left = [p(0, 0, 0), p(0, hgt, 0), p(0, hgt, d), p(0, 0, d)]
  const front = [p(0, 0, 0), p(w, 0, 0), p(w, hgt, 0), p(0, hgt, 0)]
  const poly = (pts: [number, number][], col: string) => {
    a.ctx.fillStyle = col
    a.ctx.beginPath()
    a.ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) a.ctx.lineTo(pts[i][0], pts[i][1])
    a.ctx.closePath()
    a.ctx.fill()
  }
  poly(left, darken(base, 0.45))
  poly(front, base)
  poly(top, lighten(base, 0.35))
}
function drawBuilding(a: DrawArgs) {
  const H = a.px
  const w = H * 0.34
  const d = H * 0.34
  a.ctx.save()
  a.ctx.translate(-w * 0.1, H * 0.2) // sit the tower so it's roughly centred
  isoBox(a, w, H, d, COL.metal)
  a.ctx.restore()
  // windows on the front face
  a.ctx.fillStyle = 'rgba(220,232,245,0.6)'
  const rows = Math.min(20, Math.max(4, Math.floor(H / 16)))
  for (let r = 1; r < rows; r++) {
    for (let c = 1; c <= 2; c++) {
      const [x, y] = iso(a, (c / 3) * w, (r / rows) * H, 0, 1)
      a.ctx.fillRect(x - w * 0.05 - w * 0.1, y - H * 0.012 + H * 0.2, w * 0.1, H * 0.012)
    }
  }
}
function drawMountain(a: DrawArgs) {
  const s = a.px / 2
  const A = a
  const apex = iso(A, 0.1, 1.4, 0.1, s)
  const b1 = iso(A, -1, 0, -1, s)
  const b2 = iso(A, 1, 0, -1, s)
  const b3 = iso(A, 1, 0, 1, s)
  const b4 = iso(A, -1, 0, 1, s)
  const face = (p1: [number, number], p2: [number, number], col: string) => {
    a.ctx.fillStyle = col
    a.ctx.beginPath()
    a.ctx.moveTo(apex[0], apex[1])
    a.ctx.lineTo(p1[0], p1[1])
    a.ctx.lineTo(p2[0], p2[1])
    a.ctx.closePath()
    a.ctx.fill()
  }
  face(b1, b2, darken('#6b7280', 0.2))
  face(b2, b3, '#6b7280')
  face(b3, b4, darken('#6b7280', 0.35))
  face(b4, b1, lighten('#6b7280', 0.2))
  // snow cap
  a.ctx.fillStyle = '#eef2f6'
  const sc = iso(A, 0.1, 0.85, 0.1, s)
  a.ctx.beginPath()
  a.ctx.moveTo(apex[0], apex[1])
  a.ctx.lineTo(sc[0] - s * 0.28, sc[1])
  a.ctx.lineTo(sc[0] + s * 0.28, sc[1])
  a.ctx.closePath()
  a.ctx.fill()
}
function drawAnt(a: DrawArgs) {
  const s = a.px / 2
  const body = '#5b3a1f'
  a.ctx.strokeStyle = body
  a.ctx.lineWidth = Math.max(1, s * 0.07)
  a.ctx.lineCap = 'round'
  // legs
  for (let i = -1; i <= 1; i++) {
    for (const dir of [-1, 1]) {
      a.ctx.beginPath()
      a.ctx.moveTo(a.cx + i * s * 0.16, a.cy)
      a.ctx.quadraticCurveTo(a.cx + i * s * 0.16 + dir * s * 0.3, a.cy + s * 0.1, a.cx + i * s * 0.16 + dir * s * 0.52, a.cy + dir * s * 0.5)
      a.ctx.stroke()
    }
  }
  // three shaded segments
  for (const [dx, rr] of [[-0.55, 0.3], [0.02, 0.24], [0.6, 0.42]] as const) {
    sphere({ ...a, cx: a.cx + dx * s, cy: a.cy }, rr * s, body, { spec: 0.4 })
  }
  // antennae
  for (const dir of [-1, 1]) {
    a.ctx.beginPath()
    a.ctx.moveTo(a.cx - 0.55 * s, a.cy)
    a.ctx.quadraticCurveTo(a.cx - 0.85 * s, a.cy + dir * s * 0.2, a.cx - 0.98 * s, a.cy + dir * s * 0.42)
    a.ctx.stroke()
  }
}
function drawHuman(a: DrawArgs) {
  const H = a.px
  const s = H / 2
  a.ctx.strokeStyle = a.fg
  a.ctx.fillStyle = a.fg
  a.ctx.lineCap = 'round'
  a.ctx.lineWidth = Math.max(1.5, H * 0.055)
  const headR = H * 0.1
  sphere({ ...a, cx: a.cx, cy: a.cy - s + headR }, headR, a.fg === '#0a0a0a' ? '#333' : '#cfd3da', { spec: 0.3 })
  const neck = a.cy - s + headR * 2
  const hip = a.cy + s * 0.12
  a.ctx.beginPath(); a.ctx.moveTo(a.cx, neck); a.ctx.lineTo(a.cx, hip); a.ctx.stroke()
  a.ctx.beginPath(); a.ctx.moveTo(a.cx - s * 0.32, a.cy); a.ctx.lineTo(a.cx, neck + H * 0.05); a.ctx.lineTo(a.cx + s * 0.32, a.cy); a.ctx.stroke()
  a.ctx.beginPath(); a.ctx.moveTo(a.cx - s * 0.24, a.cy + s); a.ctx.lineTo(a.cx, hip); a.ctx.lineTo(a.cx + s * 0.24, a.cy + s); a.ctx.stroke()
}
function drawWhale(a: DrawArgs) {
  const w = a.px
  const s = w / 2
  const { ctx, cx, cy } = a
  const grd = ctx.createLinearGradient(cx, cy - s * 0.34, cx, cy + s * 0.34)
  grd.addColorStop(0, '#6f93ad')
  grd.addColorStop(1, '#385568')
  ctx.fillStyle = grd
  ctx.beginPath()
  ctx.ellipse(cx, cy, s, s * 0.34, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(cx + s * 0.82, cy)
  ctx.lineTo(cx + s, cy - s * 0.3)
  ctx.lineTo(cx + s, cy + s * 0.3)
  ctx.closePath()
  ctx.fill()
  // belly highlight + eye
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.beginPath(); ctx.ellipse(cx - s * 0.1, cy + s * 0.16, s * 0.6, s * 0.1, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = a.fg
  circle(ctx, cx - s * 0.62, cy - s * 0.05, Math.max(1, s * 0.04)); ctx.fill()
}
function drawCar(a: DrawArgs) {
  const w = a.px
  const { ctx, cx, cy } = a
  const grd = ctx.createLinearGradient(cx, cy - w * 0.18, cx, cy + w * 0.18)
  grd.addColorStop(0, lighten(COL.mars, 0.25))
  grd.addColorStop(1, darken(COL.mars, 0.2))
  ctx.fillStyle = grd
  const rr = w * 0.08
  const x = cx - w / 2, y = cy - w * 0.14, ww = w, hh = w * 0.22
  ctx.beginPath(); ctx.roundRect(x, y, ww, hh, rr); ctx.fill()
  // cabin
  ctx.beginPath(); ctx.roundRect(cx - w * 0.26, cy - w * 0.3, w * 0.5, w * 0.18, rr); ctx.fill()
  ctx.fillStyle = '#1f2937'
  circle(ctx, cx - w * 0.28, cy + w * 0.1, w * 0.1); ctx.fill()
  circle(ctx, cx + w * 0.28, cy + w * 0.1, w * 0.1); ctx.fill()
}
function blobModel(col: string, spec = 0.3) {
  return (a: DrawArgs) => sphere(a, a.px / 2, col, { spec })
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
    blurb: 'A single-celled organism, around two micrometres long.', draw: blobModel(COL.bio) },
  { id: 'redcell', name: 'Red blood cell', sizeMeters: 8e-6, regime: 'atomic',
    blurb: 'A biconcave disc that ferries oxygen around your body.', draw: drawRedCell },
  { id: 'cell', name: 'Human cell', sizeMeters: 2.5e-5, regime: 'atomic',
    blurb: 'A typical animal cell with its nucleus. The basic unit of life.', draw: drawCell },
  { id: 'hair', name: 'Human hair (width)', sizeMeters: 9e-5, regime: 'human',
    blurb: 'About 90 micrometres across, near the limit of unaided eyesight.', draw: blobModel('#c9b27a') },
  { id: 'sand', name: 'Grain of sand', sizeMeters: 5e-4, regime: 'human',
    blurb: 'Half a millimetre of quartz. The smallest thing you can comfortably pick up.', draw: blobModel(COL.sand, 0.5) },
  { id: 'ant', name: 'Ant', sizeMeters: 8e-3, regime: 'human',
    blurb: 'A few millimetres of legs, antennae and remarkable strength. Our journey starts here.', draw: drawAnt },
  { id: 'hand', name: 'Human hand', sizeMeters: 0.19, regime: 'human',
    blurb: 'Roughly 19 cm from wrist to fingertip.', draw: blobModel('#d6a07a') },
  { id: 'human', name: 'Human', sizeMeters: 1.7, regime: 'human',
    blurb: 'You. The reference against which all of this feels large or small.', draw: drawHuman },
  { id: 'car', name: 'Car', sizeMeters: 4.5, regime: 'human',
    blurb: 'About four and a half metres of metal and glass.', draw: drawCar },
  { id: 'whale', name: 'Blue whale', sizeMeters: 25, regime: 'human',
    blurb: 'The largest animal that has ever lived, up to 30 metres long.', draw: drawWhale },
  { id: 'pitch', name: 'Football pitch', sizeMeters: 105, regime: 'human',
    blurb: 'About 105 metres goal to goal.', draw: (a) => { a.ctx.strokeStyle = COL.bio; a.ctx.lineWidth = 2; a.ctx.save(); a.ctx.translate(a.cx, a.cy); a.ctx.scale(1, ISO); a.ctx.strokeRect(-a.px / 2, -a.px / 2, a.px, a.px); a.ctx.beginPath(); a.ctx.arc(0, 0, a.px * 0.16, 0, Math.PI * 2); a.ctx.stroke(); a.ctx.restore() } },
  { id: 'skyscraper', name: 'Skyscraper', sizeMeters: 450, regime: 'human',
    blurb: 'A supertall tower. The Empire State is 443 m to the tip.', draw: drawBuilding },
  { id: 'everest', name: 'Mount Everest', sizeMeters: 8849, regime: 'geographic',
    blurb: 'Earth\'s highest peak, 8,849 m above sea level.', draw: drawMountain },
  { id: 'city', name: 'City', sizeMeters: 2e4, regime: 'geographic',
    blurb: 'Tens of kilometres of streets and buildings.', draw: blobModel('#94a3b8') },
  { id: 'moon', name: 'The Moon', sizeMeters: 3.474e6, regime: 'planetary',
    blurb: 'Earth\'s companion, a quarter of Earth\'s diameter.', draw: drawMoon },
  { id: 'earth', name: 'Earth', sizeMeters: 1.2742e7, regime: 'planetary',
    blurb: 'Home. 12,742 km across, the only place we know that hosts life.', draw: drawEarth },
  { id: 'jupiter', name: 'Jupiter', sizeMeters: 1.4e8, regime: 'planetary',
    blurb: 'The largest planet, eleven Earths wide.', draw: gasPlanet(COL.gas, true) },
  { id: 'sun', name: 'The Sun', sizeMeters: 1.3927e9, regime: 'stellar',
    blurb: 'A middling star. A million Earths would fit inside.', draw: drawSun },
  { id: 'earthorbit', name: 'Earth\'s orbit (1 AU)', sizeMeters: 3e11, regime: 'stellar',
    blurb: 'The distance light crosses in about eight minutes.', draw: orbitSystem(1) },
  { id: 'solarsystem', name: 'Solar System', sizeMeters: 2.9e13, regime: 'stellar',
    blurb: 'Out to the orbit of Neptune and the heliosphere beyond.', draw: orbitSystem(5) },
  { id: 'lightyear', name: 'One light-year', sizeMeters: 9.4607e15, regime: 'stellar',
    blurb: 'The distance light travels in a year. Still inside the Oort cloud.', draw: (a) => star(a, a.px / 2 * 0.3, COL.sunCore, COL.star) },
  { id: 'proxima', name: 'To Proxima Centauri', sizeMeters: 4e16, regime: 'stellar',
    blurb: 'The nearest star beyond the Sun, 4.2 light-years away.', draw: (a) => star(a, a.px / 2 * 0.25, COL.sunCore, COL.star) },
  { id: 'nebula', name: 'Orion Nebula', sizeMeters: 2.2e17, regime: 'stellar',
    blurb: 'A stellar nursery 24 light-years across, lit by newborn stars.', draw: (a) => { dotCloud(a, a.px / 2, 50, 2, COL.galaxy, 1.6); star(a, a.px * 0.06, COL.sunCore, COL.star) } },
  { id: 'cluster-stars', name: 'Star cluster', sizeMeters: 1e18, regime: 'galactic',
    blurb: 'Hundreds of thousands of stars bound together.', draw: (a) => dotCloud(a, a.px / 2, 90, 5, COL.star, 1.3) },
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
