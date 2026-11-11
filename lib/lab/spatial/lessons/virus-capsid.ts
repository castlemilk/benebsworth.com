import { TAU } from '../geometry'
import type { SpatialFrame, SpatialLesson, SpatialPoint, Vec3 } from '../types'

const LIME = '#a3e635'
const CYAN = '#55e6d0'
const VIOLET = '#b59aff'
const AMBER = '#ffc46b'
const FAINT = '#53617d'

/** Circumradius of the icosahedron in world units; the shell is lifted so its exploded state clears the floor grid. */
export const SHELL_RADIUS = 2
export const SHELL_CENTRE: Vec3 = [0, 0.3, 0]
/** Radial overshoot of a fully disassembled capsomer: 1.25 × 2 + 0.3 = 2.8 ≤ 3 world units. */
export const EXPLODE = 0.25
const PHI = (1 + Math.sqrt(5)) / 2

export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))
/** Caspar–Klug triangulation number T = h² + hk + k² (a Löschian number). */
export const triangulationNumber = (h: number, k: number) => h * h + h * k + k * k
export const quasiEquivalentPositions = (T: number) => 60 * T
export const capsomerCount = (T: number) => 10 * T + 2
/** Pick's theorem on the lattice triangle: interior points per icosahedron face. */
export const pickInterior = (h: number, k: number) => triangulationNumber(h, k) / 2 - 1.5 * gcd(h, k) + 1
/** Edge points per icosahedron edge, excluding the corners. */
export const edgePoints = (h: number, k: number) => gcd(h, k) - 1

/** Every T that h² + hk + k² can take up to a limit, with h ≥ 1 and k ≥ 0. */
export function loeschianNumbers(limit: number): number[] {
  const found = new Set<number>()
  for (let h = 1; h * h <= limit; h++) for (let k = 0; k <= h; k++) { const T = triangulationNumber(h, k); if (T <= limit) found.add(T) }
  return [...found].sort((a, b) => a - b)
}

/**
 * Convention (Caspar & Klug 1962; Baker, Olson & Fuller 1999): from a pentamer, walk h steps along a lattice row,
 * turn 60° left as seen from outside the shell, walk k steps to the next pentamer. h > k > 0 is laevo.
 */
export function capsidHand(h: number, k: number): 'laevo' | 'dextro' | 'achiral' {
  if (k === 0 || h === 0 || h === k) return 'achiral'
  return h > k ? 'laevo' : 'dextro'
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: Vec3) => Math.hypot(a[0], a[1], a[2])
const unit = (a: Vec3): Vec3 => scale(a, 1 / norm(a))

/** Unit direction of the lab's default camera (6.8, 4.6, 8.5); the (h, k) walk is drawn on the face that looks at it. */
export const DEFAULT_CAMERA: Vec3 = unit([6.8, 4.6, 8.5])

/** The twelve vertices (0, ±1, ±φ) and cyclic permutations, scaled to the given circumradius. */
export function icosahedronVertices(radius: number): Vec3[] {
  const raw: Vec3[] = []
  for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) raw.push([0, s1, s2 * PHI], [s1, s2 * PHI, 0], [s2 * PHI, 0, s1])
  const factor = radius / Math.hypot(1, PHI)
  return raw.map(v => scale(v, factor))
}

/** Edge length of an icosahedron with the given circumradius: 2R / √(φ + 2). */
export const icosahedronEdge = (radius: number) => 2 * radius / Math.hypot(1, PHI)

/** The 20 faces as vertex triples, wound counter-clockwise when viewed from outside. */
export function icosahedronFaces(vertices: Vec3[]): [number, number, number][] {
  const edge = icosahedronEdge(norm(vertices[0]))
  const near = (a: number, b: number) => Math.abs(norm(sub(vertices[a], vertices[b])) - edge) < 1e-6 * edge
  const faces: [number, number, number][] = []
  for (let a = 0; a < vertices.length; a++) for (let b = a + 1; b < vertices.length; b++) for (let c = b + 1; c < vertices.length; c++) {
    if (!near(a, b) || !near(b, c) || !near(a, c)) continue
    const outward = dot(cross(sub(vertices[b], vertices[a]), sub(vertices[c], vertices[a])), add(add(vertices[a], vertices[b]), vertices[c]))
    faces.push(outward > 0 ? [a, b, c] : [a, c, b])
  }
  return faces
}

/** Depth-first traversal that returns along every edge, so one polyline draws a whole graph (each edge twice). */
export function tracePath(adjacency: number[][], start = 0): number[] {
  const seen = new Uint8Array(adjacency.length)
  const used = new Set<string>()
  const path = [start]
  const stack: [number, number][] = [[start, 0]]
  seen[start] = 1
  while (stack.length) {
    const top = stack[stack.length - 1]
    const [node, cursor] = top
    if (cursor < adjacency[node].length) {
      top[1] += 1
      const next = adjacency[node][cursor]
      const key = node < next ? `${node},${next}` : `${next},${node}`
      if (used.has(key)) continue
      used.add(key)
      if (!seen[next]) { seen[next] = 1; path.push(next); stack.push([next, 0]) }
      else path.push(next, node)
    } else {
      stack.pop()
      if (stack.length) path.push(stack[stack.length - 1][0])
    }
  }
  return path
}

export type CapsidRest = {
  h: number; k: number; T: number; g: number
  /** Flat (faceted) capsomer positions relative to the shell centre; indices 0–11 are the pentamers. */
  positions: Vec3[]
  /** Exact combinatorial identity of each capsomer: v<vertex>, e<edge>,<j> or f<face>,<n>,<m>. */
  keys: string[]
  triangles: [number, number, number][]
  edges: [number, number][]
  /** Capsomer indices of the (h, k) walk: h steps, a left turn, k steps, ending on a pentamer. */
  walk: number[]
  /** Triangle indices visited by the honeycomb traversal (triangle centroids are the honeycomb corners). */
  dualPath: number[]
  /** Icosahedron vertex indices visited by the edge traversal. */
  icoPath: number[]
}

function affine(a: Vec3, b: Vec3, c: Vec3, s: number, t: number): Vec3 {
  return add(a, add(scale(sub(b, a), s), scale(sub(c, a), t)))
}

function barycentric(a: Vec3, b: Vec3, c: Vec3, q: Vec3): [number, number] {
  const e1 = sub(b, a), e2 = sub(c, a), r = sub(q, a)
  const d11 = dot(e1, e1), d12 = dot(e1, e2), d22 = dot(e2, e2), r1 = dot(r, e1), r2 = dot(r, e2)
  const det = d11 * d22 - d12 * d12
  return [(d22 * r1 - d12 * r2) / det, (d11 * r2 - d12 * r1) / det]
}

/** Rotate a point of the extended face plane about the shared edge p1–p2 into the plane of the neighbouring face containing d. */
function foldAcross(p1: Vec3, p2: Vec3, d: Vec3, q: Vec3): Vec3 {
  const u = unit(sub(p2, p1))
  const r = sub(q, p1), along = dot(r, u)
  const away = norm(sub(r, scale(u, along)))
  const dd = sub(d, p1)
  const w = unit(sub(dd, scale(u, dot(dd, u))))
  return add(p1, add(scale(u, along), scale(w, away)))
}

function buildRest(h: number, k: number): CapsidRest {
  const T = triangulationNumber(h, k), g = gcd(h, k)
  const ico = icosahedronVertices(SHELL_RADIUS)
  const faces = icosahedronFaces(ico)
  const positions: Vec3[] = ico.map(v => [...v] as Vec3)
  const keys = ico.map((_, i) => `v${i}`)
  const index = new Map<string, number>(keys.map((key, i) => [key, i]))
  const faceAcross = (a: number, b: number, exclude: number) => faces.findIndex((f, i) => i !== exclude && f.includes(a) && f.includes(b))
  const bary = (n: number, m: number): [number, number] => [n * (h + k) + m * k, h * m - k * n]
  const inside = (sT: number, tT: number) => sT >= 0 && tT >= 0 && sT + tT <= T

  const keyFor = (f: number, n: number, m: number, sT: number, tT: number) => {
    const [A, B, C] = faces[f]
    if (tT === 0 && sT === 0) return `v${A}`
    if (tT === 0 && sT === T) return `v${B}`
    if (sT === 0 && tT === T) return `v${C}`
    const edgeKey = (P: number, Q: number, j: number) => (P < Q ? `e${P},${Q},${j}` : `e${Q},${P},${g - j}`)
    if (tT === 0) return edgeKey(A, B, sT * g / T)
    if (sT === 0) return edgeKey(A, C, tT * g / T)
    if (sT + tT === T) return edgeKey(B, C, tT * g / T)
    return `f${f},${n},${m}`
  }
  const place = (f: number, n: number, m: number, sT: number, tT: number) => {
    const key = keyFor(f, n, m, sT, tT)
    const existing = index.get(key)
    if (existing !== undefined) return existing
    const [A, B, C] = faces[f]
    index.set(key, positions.length)
    positions.push(affine(ico[A], ico[B], ico[C], sT / T, tT / T))
    keys.push(key)
    return positions.length - 1
  }
  /** Lattice point (n, m) of face f, folded into the neighbouring face when it lies outside. */
  const resolve = (f: number, n: number, m: number): number => {
    const [sT, tT] = bary(n, m)
    if (inside(sT, tT)) return place(f, n, m, sT, tT)
    const [A, B, C] = faces[f]
    const q = affine(ico[A], ico[B], ico[C], sT / T, tT / T)
    const [P1, P2] = tT < 0 ? [A, B] : sT < 0 ? [A, C] : [B, C]
    const nf = faceAcross(P1, P2, f)
    const D = faces[nf].find(v => v !== P1 && v !== P2)!
    const folded = foldAcross(ico[P1], ico[P2], ico[D], q)
    const [s2, t2] = barycentric(ico[faces[nf][0]], ico[faces[nf][1]], ico[faces[nf][2]], folded)
    const n2 = Math.round(s2 * h - t2 * k), m2 = Math.round(s2 * k + t2 * (h + k))
    const [sT2, tT2] = bary(n2, m2)
    return place(nf, n2, m2, sT2, tT2)
  }

  // Capsomers: every lattice point inside each face, in the exact bounding box of the lattice triangle.
  for (let f = 0; f < faces.length; f++) for (let n = -k; n <= h; n++) for (let m = 0; m <= h + k; m++) {
    const [sT, tT] = bary(n, m)
    if (inside(sT, tT)) place(f, n, m, sT, tT)
  }
  // Unit triangles whose centroid lies in a face; vertices outside that face fold into the neighbour.
  const triangles: [number, number, number][] = []
  const triangleKeys = new Set<string>()
  const corners: [number, number][][] = [[[0, 0], [1, 0], [0, 1]], [[1, 0], [1, 1], [0, 1]]]
  for (let f = 0; f < faces.length; f++) for (let n = -k - 1; n <= h + 1; n++) for (let m = -1; m <= h + k + 1; m++) {
    for (const shape of corners) {
      const points = shape.map(([dn, dm]) => [n + dn, m + dm] as [number, number])
      const centroid = points.reduce((acc, [pn, pm]) => { const [sT, tT] = bary(pn, pm); return [acc[0] + sT, acc[1] + tT] }, [0, 0])
      if (centroid[0] < 0 || centroid[1] < 0 || centroid[0] + centroid[1] > 3 * T) continue
      const ids = points.map(([pn, pm]) => resolve(f, pn, pm))
      const key = [...ids].sort((a, b) => a - b).join(',')
      if (triangleKeys.has(key)) continue
      triangleKeys.add(key)
      const [a, b, c] = ids
      const outward = dot(cross(sub(positions[b], positions[a]), sub(positions[c], positions[a])), add(add(positions[a], positions[b]), positions[c]))
      triangles.push(outward > 0 ? [a, b, c] : [a, c, b])
    }
  }
  const edgeIndex = new Map<string, number>()
  const edges: [number, number][] = []
  const edgeTriangles: number[][] = []
  triangles.forEach((tri, t) => {
    for (let i = 0; i < 3; i++) {
      const a = tri[i], b = tri[(i + 1) % 3]
      const key = a < b ? `${a},${b}` : `${b},${a}`
      let e = edgeIndex.get(key)
      if (e === undefined) { e = edges.length; edgeIndex.set(key, e); edges.push(a < b ? [a, b] : [b, a]); edgeTriangles.push([]) }
      edgeTriangles[e].push(t)
    }
  })
  const dualAdjacency: number[][] = triangles.map(() => [])
  for (const pair of edgeTriangles) if (pair.length === 2) { dualAdjacency[pair[0]].push(pair[1]); dualAdjacency[pair[1]].push(pair[0]) }
  const icoAdjacency: number[][] = ico.map(() => [])
  const edgeLength = icosahedronEdge(SHELL_RADIUS)
  for (let a = 0; a < ico.length; a++) for (let b = a + 1; b < ico.length; b++) if (Math.abs(norm(sub(ico[a], ico[b])) - edgeLength) < 1e-6) { icoAdjacency[a].push(b); icoAdjacency[b].push(a) }

  // Draw the walk on the face that looks at the default camera so the chirality is legible without orbiting.
  const facing = (f: number) => dot(unit(add(add(ico[faces[f][0]], ico[faces[f][1]]), ico[faces[f][2]])), DEFAULT_CAMERA)
  const walkFace = faces.reduce((best, _, f) => (facing(f) > facing(best) ? f : best), 0)
  const walk: number[] = []
  for (let j = h; j >= 0; j--) walk.push(resolve(walkFace, j, k))
  for (let j = k - 1; j >= 0; j--) walk.push(resolve(walkFace, 0, j))

  return { h, k, T, g, positions, keys, triangles, edges, walk, dualPath: tracePath(dualAdjacency), icoPath: tracePath(icoAdjacency) }
}

const restCache = new Map<string, CapsidRest>()
/** Deterministic rest geometry for an (h, k) lattice, memoised because build() runs every frame. */
export function capsidRest(h: number, k: number): CapsidRest {
  const key = `${h},${k}`
  let rest = restCache.get(key)
  if (!rest) { rest = buildRest(h, k); restCache.set(key, rest) }
  return rest
}

/** Sign of the turn at the walk's corner as seen from outside the shell: positive means a left turn. */
export function walkTurnSign(h: number, k: number): number {
  if (k === 0) return 0
  const rest = capsidRest(h, k)
  const corner = rest.walk[h], before = rest.walk[h - 1], after = rest.walk[h + 1]
  const u = sub(rest.positions[corner], rest.positions[before])
  const w = sub(rest.positions[after], rest.positions[corner])
  return Math.sign(dot(cross(u, w), rest.positions[corner]))
}

const smooth = (x: number) => { const u = Math.min(1, Math.max(0, x)); return u * u * (3 - 2 * u) }
/**
 * How far capsomer i has moved off the shell at this phase, 0 (in place) to 1 (fully apart).
 * Zero at phase 0 and 2π so the loop closes; the shell is wholly apart between 0.8π and 1.15π.
 */
export function disassembly(i: number, phase: number): number {
  const stagger = (0.618034 * i) % 1
  const leave = smooth((phase - (0.05 + 0.225 * stagger) * TAU) / (0.125 * TAU))
  const land = smooth((phase - (0.575 + 0.225 * stagger) * TAU) / (0.125 * TAU))
  return leave * (1 - land)
}

/** World position of a capsomer: sphericity lerps flat face → sphere radially, then the assembly offset scales radially too. */
export function capsomerPosition(rest: Vec3, sphericity: number, apart: number): Vec3 {
  const radial = SHELL_RADIUS / norm(rest)
  const factor = (1 - sphericity + sphericity * radial) * (1 + EXPLODE * apart)
  return add(scale(rest, factor), SHELL_CENTRE)
}

export const hexamerSize = (T: number) => 0.08 * Math.min(1, 3 / Math.sqrt(T))
export const pentamerSize = (T: number) => Math.max(0.07, 1.6 * hexamerSize(T))

export const lesson: SpatialLesson = {
  slug: 'virus-capsid', title: 'Caspar–Klug capsids', category: 'biology',
  blogSlug: 'every-virus-shell-has-twelve-pentagons', accent: LIME,
  cameraDistance: 8.5,
  description: 'Tile one protein across an icosahedron with two lattice integers and count the twelve pentagons that every closed shell must carry.',
  defaults: { h: 2, k: 1, sphericity: 0.85 },
  controls: [
    { key: 'h', label: 'Lattice step h', min: 1, max: 5, step: 1 },
    { key: 'k', label: 'Lattice step k', min: 0, max: 3, step: 1 },
    { key: 'sphericity', label: 'Sphericity (0 faceted, 1 round)', min: 0, max: 1, step: 0.05 },
  ],
  presets: [
    { label: 'T = 3 (1, 1): 32 capsomers', params: { h: 1, k: 1, sphericity: 1 } },
    { label: 'T = 16 herpes simplex (4, 0)', params: { h: 4, k: 0, sphericity: 1 } },
    { label: 'Pseudo-T = 25 adenovirus (5, 0)', params: { h: 5, k: 0, sphericity: 0.3 } },
  ],
  legend: [
    { label: 'Pentamers at the twelve 5-fold vertices', color: AMBER },
    { label: 'Hexamers', color: CYAN },
    { label: 'Capsomer outlines (honeycomb)', color: LIME },
    { label: '(h, k) walk between neighbouring pentamers', color: VIOLET },
  ],
  explanation: 'Amber spheres are the twelve pentamers at the icosahedron\'s five-fold vertices; cyan spheres are hexamers at every other lattice site. The lime honeycomb outlines each capsomer\'s cell, so it draws exactly twelve pentagons however many hexagons surround them. The violet path walks from one pentamer to the next: h steps along a lattice row, a 60° left turn as seen from outside, then k steps. The timeline pulls the shell apart along radial lines and lets it reassemble capsomer by capsomer.',
  limitation: 'Capsomers are points on an ideal Caspar–Klug lattice, not proteins, and the honeycomb is the dual of that lattice rather than a molecular surface. Real shells break the pattern: polyomavirus builds 72 pentamers and no hexamers, herpesvirus swaps one penton for a portal, and adenovirus hexons are trimers (pseudo-T = 25). The shell radius is fixed at 2 world units for every T, so capsomer spacing shrinks as T grows instead of the virus growing. The assembly animation is a radial staging, not a kinetic model, and the hand label follows the stated walking convention.',
  readouts: p => {
    const T = triangulationNumber(p.h, p.k)
    return [
      { label: 'Triangulation number T', value: `${T.toFixed(0)} (h ${p.h.toFixed(0)}, k ${p.k.toFixed(0)})` },
      { label: 'Quasi-equivalent positions 60T', value: quasiEquivalentPositions(T).toFixed(0) },
      { label: 'Capsomers 10T + 2 and hand', value: `${capsomerCount(T).toFixed(0)} (12 + ${(10 * T - 10).toFixed(0)}), ${capsidHand(p.h, p.k)}` },
    ]
  },
  build: (p, phase) => {
    const rest = capsidRest(Math.round(p.h), Math.round(p.k))
    const positions = rest.positions.map((v, i) => capsomerPosition(v, p.sphericity, disassembly(i, phase)))
    const centroid = (t: number): Vec3 => {
      const [a, b, c] = rest.triangles[t]
      return scale(add(add(positions[a], positions[b]), positions[c]), 1 / 3)
    }
    const ico = icosahedronVertices(SHELL_RADIUS).map(v => add(v, SHELL_CENTRE))
    const lines: SpatialFrame['lines'] = [
      { points: rest.icoPath.map(i => ico[i]), color: FAINT, opacity: 0.45 },
      { points: rest.dualPath.map(centroid), color: LIME, opacity: 0.55 },
      { points: rest.walk.map(i => positions[i]), color: VIOLET },
    ]
    const points: SpatialPoint[] = positions.map((position, i) => (i < 12
      ? { position, color: AMBER, size: pentamerSize(rest.T) }
      : { position, color: CYAN, size: hexamerSize(rest.T) }))
    return { lines, points }
  },
}

export default lesson
