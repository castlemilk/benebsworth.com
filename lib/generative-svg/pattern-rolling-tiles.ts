import type { InkRole, Mark, Point, Study } from './definition'

const TAU = 2 * Math.PI
const ROOT_THREE = Math.sqrt(3)
const line = (points: readonly Point[], role: InkRole = 'ink', closed = false): Mark => ({ kind: 'line', points, role, closed, stroke: 'fine' })
const circle = (center: Point, radius: number, role: InkRole = 'ink'): Mark => ({ kind: 'circle', center, radius, role, stroke: 'fine' })
const integerIn = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max
const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)

export const EPITROCHOID_RATIOS = [[3, 1], [4, 1], [5, 2]] as const
export const EPITROCHOID_SEGMENTS = 2048
export const EPITROCHOID_PEN_OFFSETS = [-.1, 0, .1] as const

/** The entire family shares a single radial scale and a complete closure period. */
export function epitrochoidCrown(ratio: number, pen: number): Point[][] {
  if (!integerIn(ratio, 1, 3) || !integerIn(pen, 80, 140) || (pen - 80) % 20 !== 0) throw new Error('Invalid epitrochoid parameters')
  const [R, r] = EPITROCHOID_RATIOS[ratio - 1], a = R + r
  const reach = r * (pen / 100 + .1), scale = 96 / (a + reach), period = TAU * r / gcd(R, r)
  const contours = EPITROCHOID_PEN_OFFSETS.map(offset => {
    const d = r * (pen / 100 + offset)
    const points: Point[] = Array.from({ length: EPITROCHOID_SEGMENTS }, (_, i) => {
      const t = period * i / EPITROCHOID_SEGMENTS
      return [160 + scale * (a * Math.cos(t) - d * Math.cos(a * t / r)), 120 - scale * (a * Math.sin(t) - d * Math.sin(a * t / r))]
    })
    return [...points, points[0]]
  })
  return contours
}

export interface HexagonalTile {
  axial: readonly [number, number]
  center: Point
  vertices: readonly Point[]
}

export interface HexagonalArc {
  tile: readonly [number, number]
  vertex: number
  center: Point
  radius: number
  nodes: readonly [string, string]
  points: readonly Point[]
  accent: boolean
}

const HEX_VERTICES = [[2, 0], [1, 1], [-1, 1], [-2, 0], [-1, -1], [1, -1]] as const
const HEX_MIDPOINTS = [[3, 1], [0, 2], [-3, 1], [-3, -1], [0, -2], [3, -1]] as const
export const HEXAGON_ARC_SEGMENTS = 32

/** Flat-topped axial hexagons, with an exactly 192-unit overall patch height. */
export function hexagonalPatch(patch: number): { side: number; tiles: HexagonalTile[] } {
  if (!integerIn(patch, 1, 2)) throw new Error('Invalid hexagonal patch radius')
  const side = 192 / (ROOT_THREE * (2 * patch + 1)), tiles: HexagonalTile[] = []
  for (let q = -patch; q <= patch; q++) for (let r = -patch; r <= patch; r++) {
    if (Math.abs(q + r) > patch) continue
    const center: Point = [160 + 3 * q * side / 2, 120 + (2 * r + q) * ROOT_THREE * side / 2]
    const vertices = HEX_VERTICES.map(([x, y]): Point => [160 + (3 * q + x) * side / 2, 120 + (2 * r + q + y) * ROOT_THREE * side / 2])
    tiles.push({ axial: [q, r], center, vertices })
  }
  return { side, tiles }
}

/** Each of the two local pairings covers the six edge midpoints exactly once. */
export function hexagonalTruchetArcs(patch: number, seed: number): HexagonalArc[] {
  if (!integerIn(seed, 0, 7)) throw new Error('Invalid hexagonal seed')
  const { side, tiles } = hexagonalPatch(patch), nodes = new Map<string, Point>(), arcs: HexagonalArc[] = []
  const node = (u: number, v: number): readonly [string, Point] => {
    const key = `${u},${v}`
    if (!nodes.has(key)) nodes.set(key, [160 + u * side / 4, 120 + v * ROOT_THREE * side / 4])
    return [key, nodes.get(key)!]
  }
  for (const { axial: [q, r], vertices } of tiles) {
    const residue = ((q * q + 3 * r * r + 5 * q * r + 7 * seed + seed * q + 2 * seed * r) % 11 + 11) % 11
    const parity = residue < 5 ? 0 : 1
    const endpoints = HEX_MIDPOINTS.map(([u, v]) => node(6 * q + u, 4 * r + 2 * q + v))
    for (let vertex = parity; vertex < 6; vertex += 2) {
      const center = vertices[vertex], a = endpoints[(vertex + 5) % 6], b = endpoints[vertex]
      const points: Point[] = Array.from({ length: HEXAGON_ARC_SEGMENTS + 1 }, (_, i) => {
        const angle = vertex * Math.PI / 3 - TAU / 3 - TAU * i / (3 * HEXAGON_ARC_SEGMENTS)
        return [center[0] + side / 2 * Math.cos(angle), center[1] + side / 2 * Math.sin(angle)]
      })
      points[0] = a[1]
      points[HEXAGON_ARC_SEGMENTS] = b[1]
      arcs.push({ tile: [q, r], vertex, center, radius: side / 2, nodes: [a[0], b[0]], points, accent: false })
    }
  }
  const incident = new Map<string, number[]>()
  arcs.forEach((arc, i) => arc.nodes.forEach(key => incident.set(key, [...(incident.get(key) ?? []), i])))
  const visited = new Set<number>(), loops: number[][] = [], openPaths: number[][] = []
  for (let first = 0; first < arcs.length; first++) {
    if (visited.has(first)) continue
    const pending = [first], component: number[] = []
    let closed = true
    while (pending.length) {
      const i = pending.pop()!
      if (visited.has(i)) continue
      visited.add(i)
      component.push(i)
      for (const key of arcs[i].nodes) {
        const neighbors = incident.get(key)!
        if (neighbors.length !== 2) closed = false
        for (const next of neighbors) if (!visited.has(next)) pending.push(next)
      }
    }
    if (closed) loops.push(component)
    else openPaths.push(component)
  }
  const candidates = loops.length ? loops : openPaths
  candidates.sort((a, b) => b.length - a.length || a[0] - b[0])
  for (const i of candidates[0]) arcs[i].accent = true
  return arcs
}

/** Append the reversed prior path rotated clockwise about its final vertex. */
export function dragonFoldLattice(order: number): Point[] {
  if (!integerIn(order, 0, 9)) throw new Error('Invalid dragon order')
  const points: Point[] = [[0, 0], [1, 0]]
  for (let fold = 0; fold < order; fold++) {
    const count = points.length, [ex, ey] = points[count - 1]
    for (let i = count - 2; i >= 0; i--) {
      const [x, y] = points[i]
      points.push([ex + y - ey, ey - x + ex])
    }
  }
  return points
}

/** One similarity transform preserves right angles and equal lattice edge lengths. */
export function dragonFoldPath(order: number): Point[] {
  const points = dragonFoldLattice(order), xs = points.map(p => p[0]), ys = points.map(p => p[1])
  const left = Math.min(...xs), right = Math.max(...xs), bottom = Math.min(...ys), top = Math.max(...ys)
  const scale = Math.min(244 / (right - left || 1), 184 / (top - bottom || 1))
  const mx = (left + right) / 2, my = (bottom + top) / 2
  return points.map(([x, y]): Point => [160 + (x - mx) * scale, 120 - (y - my) * scale])
}

export const STUDIES: readonly Study[] = [
  {
    id: 'epitrochoid-crown', title: 'Epitrochoid crown', category: 'Mathematics', provenance: 'math-derived',
    description: 'Three exterior rolling-circle curves build a scalloped crown beside separated, paired registration arcs. Radius ratio and pen reach change the lobes and loops.',
    basis: 'Epitrochoid x(t) = (R+r) cos t − d cos((R+r)t/r), y(t) = (R+r) sin t − d sin((R+r)t/r). Ratio choices 1, 2, 3 mean (R,r) = (3,1), (4,1), (5,2). Pen reach p is a percentage of r; the three curves use d = r(p/100 + h), h = −0.1, 0, 0.1. Each samples its complete closure period 2πr/gcd(R,r) in 2048 straight segments, with the first endpoint repeated exactly. All share scale 96/((R+r)+r(p/100+0.1)) about (160,120), with screen y inverted. The middle curve is accented. Four paired registration arcs at radii 101 and 104 drawing units span 15° each, centered on the diagonal directions; each uses eight straight segments, not a complete circular frame. Decorative sampled geometry, not a physical rolling mechanism, guilloché machine simulation or smooth exact SVG curve.',
    tags: ['pattern', 'epitrochoid', 'engraving', 'parametric-curves'], aliases: ['external rolling circle', 'epitrochoid ornament', 'rolling circle crown'],
    parameters: [{ key: 'ratio', label: 'Radius ratio (1: 3/1, 2: 4/1, 3: 5/2)', min: 1, max: 3, step: 1, initial: 3 }, { key: 'pen', label: 'Pen reach (% of rolling radius)', min: 80, max: 140, step: 20, initial: 140 }],
    model: p => {
      const contours = epitrochoidCrown(p.ratio, p.pen)
      const registers = [101, 104].flatMap(radius => Array.from({ length: 4 }, (_, quadrant) => line(Array.from({ length: 9 }, (_, i): Point => {
        const angle = Math.PI / 4 + quadrant * Math.PI / 2 + (i / 8 - .5) * Math.PI / 12
        return [160 + radius * Math.cos(angle), 120 - radius * Math.sin(angle)]
      }))))
      return { marks: [...contours.map((points, i) => line(points, i === 1 ? 'accent' : 'ink', true)), ...registers] }
    },
  },
  {
    id: 'hexagonal-arc-mosaic', title: 'Hexagonal arc mosaic', category: 'Mathematics', provenance: 'topology',
    description: 'Three circular arcs in each hexagon connect a honeycomb patch into winding paths and small closed circuits. A repeatable seed selects between its two tile pairings.',
    basis: 'Flat-topped axial hexagons (q,r), max(|q|,|r|,|q+r|) ≤ h, h = 1 or 2, give 1+3h(h+1) tiles. Side s = 192/(√3(2h+1)); tile centers are (160+3sq/2,120+√3s(r+q/2)). Vertices advance clockwise on screen by π/3 from the right. Choose alternating vertex indices {0,2,4} if the nonnegative residue (q²+3r²+5qr+7z+zq+2zr) mod 11 is below 5, otherwise {1,3,5}, seed z = 0…7. At each chosen vertex a radius-s/2 arc sweeps −120° from the preceding edge midpoint to the following one, sampled in 32 straight segments. These are exactly two pairings, not six orientations. Integer midpoint keys produce identical shared endpoints. Interior graph vertices have degree two; exposed boundary vertices degree one. The longest closed component is accented, or the longest boundary-to-boundary component if there is no closed one; ties use the first arc. Optional guides show unique tile edges. Finite planar paths, not periodic tiling or over/under weaving.',
    tags: ['pattern', 'truchet', 'hexagons', 'tiling', 'topology'], aliases: ['hexagonal truchet', 'honeycomb arc paths', 'hexagon arc tiling'],
    parameters: [{ key: 'patch', label: 'Hexagon rings around center', min: 1, max: 2, step: 1, initial: 2 }, { key: 'seed', label: 'Pairing seed', min: 0, max: 7, step: 1, initial: 3 }],
    model: p => {
      const marks = hexagonalTruchetArcs(p.patch, p.seed).map(arc => line(arc.points, arc.accent ? 'accent' : 'ink'))
      const edges = new Set<string>()
      for (const { vertices } of hexagonalPatch(p.patch).tiles) for (let i = 0; i < 6; i++) {
        const a = vertices[i], b = vertices[(i + 1) % 6], key = [a.join(','), b.join(',')].sort().join(';')
        if (!edges.has(key)) { edges.add(key); marks.push(line([a, b], 'guide')) }
      }
      return { marks }
    },
  },
  {
    id: 'dragon-fold', title: 'Dragon fold', category: 'Mathematics', provenance: 'math-derived',
    description: 'A finite paper-folding path turns through a compact, asymmetric labyrinth. The last recursive quarter is picked out in accent ink without smoothing its right angles.',
    basis: 'Finite Heighway dragon polygon. Start D₀ = [(0,0),(1,0)]. For each fold, append the reverse of the previous path, excluding its final vertex E, after rotating each point clockwise by π/2 about E: (x,y) ↦ (Eₓ+y−Eᵧ,Eᵧ−x+Eₓ). Order k has exactly 2ᵏ unit lattice edges; its endpoint is the complex number (1+i)ᵏ. Supported display orders are 7…9. A single uniform scale min(244/(xmax−xmin),184/(ymax−ymin)) centers the path at (160,120), inverting screen y, without changing right angles or relative edge lengths. The last 2ᵏ/4 edges are overlaid in accent; radius-2.4 circles mark the two endpoints. This open polygon may touch earlier vertices; it is a finite recursive construction, not a smooth curve, a physical fold simulation or the infinite fractal.',
    tags: ['pattern', 'dragon-curve', 'recursion', 'fractals'], aliases: ['heighway dragon', 'paper folding curve', 'dragon lattice path'],
    parameters: [{ key: 'order', label: 'Folding order', min: 7, max: 9, step: 1, initial: 8 }],
    model: p => {
      const points = dragonFoldPath(p.order), quarter = (points.length - 1) / 4
      return { marks: [line(points), line(points.slice(3 * quarter), 'accent'), circle(points[0], 2.4), circle(points.at(-1)!, 2.4)] }
    },
  },
]
