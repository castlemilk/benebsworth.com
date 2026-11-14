import type { InkRole, Mark, Point, Study } from './definition'

const TAU = Math.PI * 2
const CENTER: Point = [160, 120]
const line = (points: readonly Point[], role: InkRole = 'ink', closed = false): Mark => ({ kind: 'line', points, role, closed, stroke: 'fine' })
const circle = (radius: number): Mark => ({ kind: 'circle', center: CENTER, radius, role: 'ink', stroke: 'fine' })
const polar = (radius: number, angle: number): Point => [160 + radius * Math.cos(angle), 120 - radius * Math.sin(angle)]
const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
const integerIn = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max

export const HYPOTROCHOID_RATIOS = [[5, 2], [7, 3], [8, 3]] as const
export const HYPOTROCHOID_SEGMENTS = 2048

/** Three exact-period samples share one uniform scale, rather than separate fits. */
export function hypotrochoidContours(ratio: number, pen: number): Point[][] {
  if (!integerIn(ratio, 1, 3) || !integerIn(pen, 80, 140) || (pen - 80) % 20 !== 0) throw new Error('Invalid hypotrochoid parameters')
  const [R, r] = HYPOTROCHOID_RATIOS[ratio - 1], a = R - r
  const period = TAU * r / gcd(R, r), scale = 96 / (a + r * (pen / 100 + .1))
  return [-.1, 0, .1].map(offset => {
    const d = r * (pen / 100 + offset)
    const points: Point[] = Array.from({ length: HYPOTROCHOID_SEGMENTS }, (_, i) => {
      const t = period * i / HYPOTROCHOID_SEGMENTS
      const x = a * Math.cos(t) + d * Math.cos(a * t / r)
      const y = a * Math.sin(t) - d * Math.sin(a * t / r)
      return [160 + scale * x, 120 - scale * y]
    })
    return [...points, points[0]]
  })
}

export interface TruchetArc {
  tile: readonly [number, number]
  center: Point
  nodes: readonly [string, string]
  points: readonly Point[]
  accent: boolean
}

/** Integer half-grid keys make adjacent tile endpoints literally the same point. */
export function squareTruchetArcs(cells: number, seed: number): TruchetArc[] {
  if (![6, 8].includes(cells) || !integerIn(seed, 0, 7)) throw new Error('Invalid Truchet parameters')
  const size = 192 / cells, nodes = new Map<string, Point>(), arcs: TruchetArc[] = []
  const node = (x: number, y: number): readonly [string, Point] => {
    const key = `${x},${y}`
    if (!nodes.has(key)) nodes.set(key, [64 + x * size / 2, 24 + y * size / 2])
    return [key, nodes.get(key)!]
  }
  for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) {
    const top = node(2 * x + 1, 2 * y), right = node(2 * x + 2, 2 * y + 1)
    const bottom = node(2 * x + 1, 2 * y + 2), left = node(2 * x, 2 * y + 1)
    const orientation = (x * x + 3 * y * y + 5 * x * y + 7 * seed + seed * x + 2 * seed * y) % 11 < 5
    const add = (cx: number, cy: number, start: number, a: readonly [string, Point], b: readonly [string, Point]) => {
      const center: Point = [64 + cx * size, 24 + cy * size]
      const points: Point[] = Array.from({ length: 25 }, (_, i) => {
        const angle = start + i * Math.PI / 48
        return [center[0] + size / 2 * Math.cos(angle), center[1] + size / 2 * Math.sin(angle)]
      })
      // Avoid trigonometric roundoff at the graph's shared edge midpoints.
      points[0] = a[1]
      points[24] = b[1]
      arcs.push({ tile: [x, y], center, nodes: [a[0], b[0]], points, accent: false })
    }
    if (orientation) {
      add(x, y, 0, top, left)
      add(x + 1, y + 1, Math.PI, bottom, right)
    } else {
      add(x + 1, y, Math.PI / 2, right, top)
      add(x, y + 1, -Math.PI / 2, left, bottom)
    }
  }
  const incident = new Map<string, number[]>()
  arcs.forEach((arc, i) => arc.nodes.forEach(key => incident.set(key, [...(incident.get(key) ?? []), i])))
  const visited = new Set<number>(), circuits: number[][] = []
  arcs.forEach((_, first) => {
    if (visited.has(first)) return
    const pending = [first], component: number[] = []
    let closed = true
    while (pending.length) {
      const index = pending.pop()!
      if (visited.has(index)) continue
      visited.add(index)
      component.push(index)
      for (const key of arcs[index].nodes) {
        const neighbors = incident.get(key)!
        if (neighbors.length !== 2) closed = false
        for (const next of neighbors) if (!visited.has(next)) pending.push(next)
      }
    }
    if (closed) circuits.push(component)
  })
  circuits.sort((a, b) => a.length - b.length || a[0] - b[0])
  for (const component of circuits.slice(0, 2)) for (const index of component) arcs[index].accent = true
  return arcs
}

/** Four transformed copies of the previous order, in standard Hilbert order. */
export function hilbertGrid(order: number): Point[] {
  if (!integerIn(order, 0, 4)) throw new Error('Invalid Hilbert order')
  if (order === 0) return [[0, 0]]
  const half = 2 ** (order - 1), previous = hilbertGrid(order - 1)
  return [
    ...previous.map(([x, y]): Point => [y, x]),
    ...previous.map(([x, y]): Point => [x, y + half]),
    ...previous.map(([x, y]): Point => [x + half, y + half]),
    ...previous.map(([x, y]): Point => [2 * half - 1 - y, half - 1 - x]),
  ]
}

export function modularChordEdges(count: number, multiplier: number): (readonly [number, number])[] {
  if (![48, 72, 96].includes(count) || !integerIn(multiplier, 2, 5)) throw new Error('Invalid modular chord parameters')
  const seen = new Set<string>(), edges: (readonly [number, number])[] = []
  for (let n = 0; n < count; n++) {
    const next = multiplier * n % count, key = `${Math.min(n, next)},${Math.max(n, next)}`
    if (next !== n && !seen.has(key)) {
      seen.add(key)
      edges.push([n, next])
    }
  }
  return edges
}

const edgeKey = (a: number, b: number) => `${Math.min(a, b)},${Math.max(a, b)}`

export const PATTERN_CONSTRUCTIONS: readonly Study[] = [
  {
    id: 'hypotrochoid-filigree', title: 'Hypotrochoid filigree', category: 'Mathematics', provenance: 'math-derived',
    description: 'Three nearby rolling-circle curves form a looping filigree inside a fine circular frame. Change the radius ratio and pen reach to reshape the petals.',
    basis: 'Hypotrochoid x(t) = (R−r) cos t + d cos((R−r)t/r), y(t) = (R−r) sin t − d sin((R−r)t/r). Ratio choices 1, 2, 3 mean (R,r) = (5,2), (7,3), (8,3). Pen reach q is a percentage of r; d = r(q/100 + h), h = −0.1, 0, 0.1. Each curve samples one closure period 2πr/gcd(R,r) with 2048 straight segments and an exact repeated endpoint. One uniform scale, 96/((R−r)+r(q/100+0.1)), fits all three into radius 96 about (160,120), with screen y inverted. The middle contour is accented; the frame has radius 100 drawing units. Sampled decorative geometry, not an engine-turning simulation or a physical weave.',
    tags: ['pattern', 'engraving', 'hypotrochoid', 'parametric-curves'], aliases: ['rolling circle filigree', 'hypotrochoid ornament', 'spirograph curve'],
    parameters: [{ key: 'ratio', label: 'Radius ratio (1: 5/2, 2: 7/3, 3: 8/3)', min: 1, max: 3, step: 1, initial: 2 }, { key: 'pen', label: 'Pen reach (% of inner radius)', min: 80, max: 140, step: 20, initial: 120 }],
    model: p => ({ marks: [...hypotrochoidContours(p.ratio, p.pen).map((points, i) => line(points, i === 1 ? 'accent' : 'ink', true)), circle(100)] }),
  },
  {
    id: 'square-truchet-paths', title: 'Square Truchet paths', category: 'Mathematics', provenance: 'topology',
    description: 'Quarter-circle tiles meet precisely along a square field, creating closed circuits and paths that end at its boundary. A repeatable seed changes the tiling.',
    basis: 'An N×N square grid covers [64,256]×[24,216], N = 6 or 8. Each tile contains two disjoint quarter-circles of radius 96/N, sampled with 24 straight segments apiece, joining neighboring edge midpoints. For zero-based tile (x,y) and seed s, orientation is ((x²+3y²+5xy+7s+sx+2sy) mod 11) < 5: true pairs top/left and bottom/right; false pairs top/right and bottom/left. Shared half-grid endpoints are identical. Interior endpoints have graph degree two; boundary endpoints degree one. Up to two shortest closed connected components are accented, ties by first tile arc. Optional guides show only the square grid. Finite planar Truchet paths, not woven over/under crossings or periodic boundary conditions.',
    tags: ['pattern', 'truchet', 'tiling', 'topology'], aliases: ['truchet tile paths', 'quarter circle tiling', 'square arc maze'],
    parameters: [{ key: 'cells', label: 'Tiles per side', min: 6, max: 8, step: 2, initial: 8 }, { key: 'seed', label: 'Orientation seed', min: 0, max: 7, step: 1, initial: 3 }],
    model: p => {
      const marks = squareTruchetArcs(p.cells, p.seed).map(arc => line(arc.points, arc.accent ? 'accent' : 'ink'))
      for (let i = 0; i <= p.cells; i++) {
        marks.push(line([[64 + i * 192 / p.cells, 24], [64 + i * 192 / p.cells, 216]], 'guide'))
        marks.push(line([[64, 24 + i * 192 / p.cells], [256, 24 + i * 192 / p.cells]], 'guide'))
      }
      return { marks }
    },
  },
  {
    id: 'hilbert-labyrinth', title: 'Hilbert labyrinth', category: 'Mathematics', provenance: 'math-derived',
    description: 'A single open path turns through every vertex of a square lattice exactly once. Its second recursive quarter is traced in accent ink.',
    basis: 'Finite Hilbert polygonal path of order k = 2…4, with 4ᵏ distinct vertices on a 2ᵏ×2ᵏ integer lattice. Starting with H₀ = [(0,0)], Hₖ concatenates (y,x), (x,y+h), (x+h,y+h), (2h−1−y,h−1−x) applied to Hₖ₋₁, h = 2ᵏ⁻¹. Map (x,y) to (64+192x/(2ᵏ−1), 24+192y/(2ᵏ−1)) in drawing units. Consecutive vertices differ by one horizontal or vertical lattice step. The accent is exactly vertices 4ᵏ/4 through 4ᵏ/2−1 of this same path, overlaid without changing it. Small circles mark its two open endpoints. This is a finite recursive approximation, not the infinite space-filling curve or a maze with alternative routes.',
    tags: ['pattern', 'hilbert-curve', 'recursion', 'space-filling-curves'], aliases: ['hilbert path', 'recursive square labyrinth', 'hilbert lattice'],
    parameters: [{ key: 'order', label: 'Recursion order', min: 2, max: 4, step: 1, initial: 4 }],
    model: p => {
      const points = hilbertGrid(p.order).map(([x, y]): Point => [64 + 192 * x / (2 ** p.order - 1), 24 + 192 * y / (2 ** p.order - 1)])
      const quarter = points.length / 4
      return { marks: [line(points), line(points.slice(quarter, quarter * 2), 'accent'), ...[points[0], points.at(-1)!].map((center): Mark => ({ kind: 'circle', center, radius: 2.4, role: 'ink', stroke: 'fine' }))] }
    },
  },
  {
    id: 'modular-chord-orbit', title: 'Modular multiplication chords', category: 'Mathematics', provenance: 'math-derived',
    description: 'Times-table chords form a dense circular envelope. Accent ink follows the finite forward orbit starting at vertex one.',
    basis: 'N = 48, 72 or 96 equally spaced vertices lie on radius 96 about (160,120), starting at the top and advancing counterclockwise in mathematical coordinates. For every n ∈ {0,…,N−1}, connect n to mn mod N, multiplier m = 2…5. Omit fixed-point zero-length edges and draw reversed undirected duplicates only once; retained edges are ordered by their first source index. The edge count is N−(gcd(m−1,N)+gcd(m²−1,N))/2. Accent the undirected edges encountered by iterating n ← mn mod N from n = 1 until its first repeated vertex; this may include a transient tail before a cycle. A radius-100 frame and optional radius-101…104 vertex ticks surround the chords. This discrete straight-chord envelope is not an exact cardioid, continuous envelope, or directed graph.',
    tags: ['pattern', 'modular-arithmetic', 'chords', 'circle-geometry'], aliases: ['times table circle', 'modular chord envelope', 'multiplication circle'],
    parameters: [{ key: 'vertices', label: 'Circle vertices', min: 48, max: 96, step: 24, initial: 72 }, { key: 'multiplier', label: 'Multiplication factor', min: 2, max: 5, step: 1, initial: 2 }],
    model: p => {
      const edges = modularChordEdges(p.vertices, p.multiplier), accent = new Set<string>(), visited = new Set<number>()
      let n = 1
      while (!visited.has(n)) {
        visited.add(n)
        const next = n * p.multiplier % p.vertices
        if (next !== n) accent.add(edgeKey(n, next))
        n = next
      }
      const point = (index: number, radius = 96) => polar(radius, Math.PI / 2 + index * TAU / p.vertices)
      return { marks: [
        ...edges.map(([a, b]) => line([point(a), point(b)], accent.has(edgeKey(a, b)) ? 'accent' : 'ink')),
        circle(100),
        ...Array.from({ length: p.vertices }, (_, i) => line([point(i, 101), point(i, 104)], 'guide')),
      ] }
    },
  },
]
