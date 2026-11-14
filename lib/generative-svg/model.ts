import { ADDITIONAL_STUDIES } from './additional-studies'
import { ORNAMENTAL_STUDIES } from './ornamental-studies'
import { PATTERN_ATLAS_STUDIES } from './pattern-atlas'

import { createStudyRegistry } from './registry'
import { parametersFor, type Study, type Point, type InkRole, type Mark, type Geometry } from './definition'
export { parametersFor } from './definition'
export type { Study, Point, InkRole, Mark, Geometry, Parameter } from './definition'

const line = (points: readonly Point[], role: InkRole = 'ink', closed = false): Mark => ({ kind: 'line', points, role, closed })
const circle = (center: Point, radius: number, role: InkRole = 'ink'): Mark => ({ kind: 'circle', center, radius, role })
const axes = (): Mark[] => [line([[28, 120], [292, 120]], 'guide'), line([[32, 28], [32, 212]], 'guide')]
export function sampleCurve(fn: (x: number) => number, from: number, to: number, count = 256): Point[] {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || !Number.isInteger(count) || count < 2 || count > 4096) throw new Error('Invalid sampling domain')
  return Array.from({ length: count + 1 }, (_, index) => {
    const x = from + (to - from) * index / count
    const y = fn(x)
    if (!Number.isFinite(y)) throw new Error('Non-finite curve: split discontinuities before sampling')
    return [x, y] as const
  })
}

const DEFINITIONS: readonly Study[] = [
  {
    id: 'sine-wave', tags: ["trigonometry", "periodic", "signal-processing"], aliases: ["sinusoid", "sine"], title: 'Sine wave', category: 'Mathematics', provenance: 'math-derived',
    description: 'A periodic curve, sampled from its equation. Change amplitude or cycle count without changing its drawing language.',
    basis: 'y = A sin(kx), x ∈ [0, 2π]. 256 equal intervals; the maximum interpolation error is below 0.1 viewBox units over the supported parameters.',
    parameters: [{ key: 'amplitude', label: 'Amplitude', min: 0.2, max: 1, step: 0.1, initial: 0.8 }, { key: 'cycles', label: 'Cycles', min: 1, max: 4, step: 1, initial: 2 }],
    model: p => {
      const points = sampleCurve(x => p.amplitude * Math.sin(p.cycles * x), 0, Math.PI * 2).map(([x, y]) => [32 + x / (Math.PI * 2) * 256, 120 - y * 76] as const)
      // Accent is an exact subset of the same samples, never a redrawn approximation.
      return { marks: [...axes(), line(points), line(points.slice(8, 25), 'accent')] }
    },
  },
  {
    id: 'cartesian-parabola', tags: ["algebra", "quadratic", "curves"], aliases: ["quadratic curve"], title: 'Parabola', category: 'Mathematics', provenance: 'math-derived',
    description: 'A symmetric quadratic with a fixed origin. Its curvature changes; the vertex and axes remain exact.',
    basis: 'y = ax², x ∈ [−1, 1]. 128 equal intervals; maximum interpolation error below 0.01 viewBox units. Display axes use separate x/y scales.',
    parameters: [{ key: 'curvature', label: 'Curvature', min: 0.3, max: 1, step: 0.1, initial: 0.8 }],
    model: p => ({ marks: [line([[28, 200], [292, 200]], 'guide'), line([[160, 28], [160, 212]], 'guide'), line(sampleCurve(x => p.curvature * x * x, -1, 1, 128).map(([x, y]) => [160 + x * 124, 200 - y * 160])), circle([160, 200], 4, 'accent')] }),
  },
  {
    id: 'fourier-harmonics', tags: ["fourier", "harmonics", "signal-processing"], aliases: ["Fourier series", "square-wave approximation"], title: 'Fourier harmonics', category: 'Mathematics', provenance: 'math-derived',
    description: 'Odd harmonics approach a square wave. Overshoot is retained rather than smoothed away.',
    basis: 'y = (4/π) Σ sin((2n−1)x)/(2n−1), n = 1…N, x ∈ [0, 2π]. 512 intervals; N ≤ 5. This is a finite partial sum, not an exact square wave.',
    parameters: [{ key: 'terms', label: 'Odd harmonics', min: 1, max: 5, step: 1, initial: 3 }],
    model: p => {
      const points = sampleCurve(x => Array.from({ length: p.terms }, (_, i) => Math.sin((2 * i + 1) * x) / (2 * i + 1)).reduce((a, b) => a + b, 0) * 4 / Math.PI, 0, Math.PI * 2, 512).map(([x, y]) => [32 + x / (Math.PI * 2) * 256, 120 - y * 62] as const)
      return { marks: [...axes(), line(points), line(points.slice(80, 128), 'accent')] }
    },
  },
  {
    id: 'vector-field', tags: ["vector-calculus", "rotation", "fields"], aliases: ["rotational vector field"], title: 'Rotational field', category: 'Mathematics', provenance: 'math-derived',
    description: 'A rotation field drawn as a regular set of vectors. Direction and magnitude come from the same rule.',
    basis: 'F(x, y) = (−y, x), sampled on a 5 × 5 grid. Vector lengths use one common scale; the zero vector is a point.',
    parameters: [],
    model: () => {
      const marks: Mark[] = []
      for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) {
        const start: Point = [160 + x * 40, 120 - y * 40]
        const end: Point = [start[0] - y * 7, start[1] - x * 7]
        const role = x === 1 && y === 1 ? 'accent' : 'ink'
        if (x === 0 && y === 0) { marks.push(circle(start, 2)); continue }
        const angle = Math.atan2(end[1] - start[1], end[0] - start[0])
        marks.push(line([start, end], role), line([[end[0] - 5 * Math.cos(angle - 0.5), end[1] - 5 * Math.sin(angle - 0.5)], end, [end[0] - 5 * Math.cos(angle + 0.5), end[1] - 5 * Math.sin(angle + 0.5)]], role))
      }
      return { marks }
    },
  },
  {
    id: 'binary-search-tree', tags: ["data-structures", "trees", "search"], aliases: ["BST", "binary tree"], title: 'Binary search tree', category: 'Algorithms', provenance: 'topology',
    description: 'Seven ordered keys and six parent-child edges. The highlighted path follows the search for a selected key.',
    basis: 'Balanced binary search tree over keys 1…7. Left descendants are smaller; right descendants are larger. Accent follows comparisons from root 4 to the selected key.',
    parameters: [{ key: 'target', label: 'Find key', min: 1, max: 7, step: 1, initial: 1 }],
    model: p => {
      const nodes: Record<number, Point> = { 4: [160, 42], 2: [92, 116], 6: [228, 116], 1: [48, 196], 3: [132, 196], 5: [188, 196], 7: [272, 196] }
      const edges = [[4, 2], [4, 6], [2, 1], [2, 3], [6, 5], [6, 7]]
      const visited = [4]
      if (p.target !== 4) { visited.push(p.target < 4 ? 2 : 6); if (p.target !== 2 && p.target !== 6) visited.push(p.target) }
      const marks: Mark[] = edges.map(([a, b]) => {
        const start = nodes[a], end = nodes[b], length = Math.hypot(end[0] - start[0], end[1] - start[1])
        const dx = (end[0] - start[0]) / length * 18, dy = (end[1] - start[1]) / length * 18
        const emphasis = visited.includes(a) && visited.includes(b)
        return { ...line([[start[0] + dx, start[1] + dy], [end[0] - dx, end[1] - dy]], emphasis ? 'accent' : 'ink'), emphasis }
      })
      for (const [key, center] of Object.entries(nodes)) {
        const emphasis = visited.includes(Number(key)), role = emphasis ? 'accent' : 'ink'
        marks.push({ ...circle(center, 18, role), emphasis }, { kind: 'text', at: center, text: key, role, emphasis })
      }
      return { marks }
    },
  },
  {
    id: 'prism-dispersion', tags: ["optics", "geometry", "illustrative"], aliases: ["prism", "dispersion illustration"], title: 'Prism study', category: 'Physics', provenance: 'illustrative',
    description: 'A triangular prism and a fan of emerging rays, kept as an illustrative geometric study.',
    basis: 'Illustrative geometry only. These rays are not computed with Snell’s law, wavelength-dependent refractive indices or a physical glass model.',
    parameters: [],
    model: () => ({ marks: [line([[154, 40], [76, 198], [240, 198]], 'ink', true), line([[37, 130], [154 + 86 * 90 / 158, 130]], 'ink'), line([[154 + 86 * 90 / 158, 130], [286, 104]], 'ink'), line([[154 + 86 * 90 / 158, 130], [286, 130]], 'accent'), line([[154 + 86 * 90 / 158, 130], [286, 156]], 'ink')] }),
  },
  {
    id: 'phase-space-orbit', tags: ["mechanics", "oscillation", "phase-space"], aliases: ["SHO", "simple harmonic oscillator"], title: 'Phase-space orbit', category: 'Physics', provenance: 'math-derived',
    description: 'An ideal harmonic oscillator in normalized position–momentum space. Pick a phase to inspect its state along a closed orbit.',
    basis: 'q = A cos θ, p = −A sin θ; normalized m = ω = 1, H = (q² + p²)/2 = A²/2. Equal axis scales; 256 straight segments approximate the orbit. No damping, forcing or time animation.',
    parameters: [{ key: 'amplitude', label: 'Orbit amplitude', min: 0.3, max: 1, step: 0.1, initial: 0.8 }, { key: 'phase', label: 'Phase (π/4)', min: 0, max: 7, step: 1, initial: 1 }],
    model: p => {
      const point = (theta: number): Point => [160 + 78 * p.amplitude * Math.cos(theta), 120 + 78 * p.amplitude * Math.sin(theta)]
      const theta = p.phase * Math.PI / 4
      return { marks: [line([[54, 120], [266, 120]], 'guide'), line([[160, 20], [160, 220]], 'guide'), line(Array.from({ length: 257 }, (_, i) => point(i * Math.PI / 128))), { ...circle(point(theta), 5, 'accent'), emphasis: true }, { kind: 'text', at: [280, 120], text: 'q', role: 'ink' }, { kind: 'text', at: [160, 16], text: 'p', role: 'ink' }] }
    },
  },
  {
    id: 'qam-constellation', tags: ["modulation", "radio-frequency", "signal-processing"], aliases: ["QAM", "RF constellation", "4 QAM", "16 QAM", "64 QAM"], title: 'QAM constellation', category: 'Electronics', provenance: 'math-derived',
    description: 'Ideal square constellation points with equal average symbol energy. Compare 4, 16 and 64 symbols without adding simulated noise.',
    basis: 'L = 2ᵇ levels per axis, M = L² symbols. I,Q ∈ {−L+1, −L+3, …, L−1}/√(2(L²−1)/3), so mean(I²+Q²) = 1. Equal axis scales. No channel, pulse shaping, decision regions or bit labelling.',
    parameters: [{ key: 'bits', label: 'Bits per axis', min: 1, max: 3, step: 1, initial: 2 }],
    model: p => {
      const levels = 2 ** p.bits, norm = Math.sqrt(2 * (levels ** 2 - 1) / 3)
      const marks: Mark[] = [line([[48, 120], [272, 120]], 'guide'), line([[160, 16], [160, 224]], 'guide')]
      for (let i = 0; i < levels; i++) for (let q = 0; q < levels; q++) marks.push(circle([160 + 76 * (2 * i - levels + 1) / norm, 120 - 76 * (2 * q - levels + 1) / norm], 3.5))
      marks.push({ kind: 'text', at: [286, 120], text: 'I', role: 'ink' }, { kind: 'text', at: [160, 12], text: 'Q', role: 'ink' })
      return { marks }
    },
  },
  {
    id: 'state-machine', tags: ["automata", "state-machines", "graphs"], aliases: ["FSM", "DFA", "deterministic finite automaton"], title: 'Finite state machine', category: 'Algorithms', provenance: 'topology',
    description: 'A three-state deterministic automaton. Inspect its active state while keeping every transition and accepting-state ring intact.',
    basis: 'States {0,1,2}, alphabet {next}, δ(s,next) = (s+1) mod 3. Initial state 0, accepting state 2 (double ring). The control selects a state; it does not run a simulation.',
    parameters: [{ key: 'state', label: 'Active state', min: 0, max: 2, step: 1, initial: 0 }],
    model: p => {
      const nodes: Point[] = [[160, 46], [72, 190], [248, 190]], marks: Mark[] = []
      const arrow = (start: Point, end: Point) => {
        const a = Math.atan2(end[1] - start[1], end[0] - start[0])
        marks.push(line([start, end]), line([[end[0] - 7 * Math.cos(a - 0.5), end[1] - 7 * Math.sin(a - 0.5)], end, [end[0] - 7 * Math.cos(a + 0.5), end[1] - 7 * Math.sin(a + 0.5)]]))
      }
      arrow([160, 10], [160, 22])
      nodes.forEach((start, i) => {
        const end = nodes[(i + 1) % 3], length = Math.hypot(end[0] - start[0], end[1] - start[1]), dx = (end[0] - start[0]) / length * 24, dy = (end[1] - start[1]) / length * 24
        arrow([start[0] + dx, start[1] + dy], [end[0] - dx, end[1] - dy])
      })
      for (const at of ([[98, 110], [160, 174], [222, 110]] as Point[])) marks.push({ kind: 'text', at, text: 'next', role: 'ink' })
      nodes.forEach((center, state) => {
        const emphasis = state === p.state, role = emphasis ? 'accent' : 'ink'
        marks.push({ ...circle(center, 24, role), emphasis }, { kind: 'text', at: center, text: String(state), role, emphasis })
        if (state === 2) marks.push({ ...circle(center, 14, role), emphasis })
      })
      return { marks }
    },
  },
  ...ADDITIONAL_STUDIES,
  ...ORNAMENTAL_STUDIES,
  ...PATTERN_ATLAS_STUDIES,
]

export const STUDY_REGISTRY = createStudyRegistry(DEFINITIONS)
export const STUDIES = STUDY_REGISTRY.studies

export function geometryFor(study: Study, values: Readonly<Record<string, number>> = {}): Geometry {
  const geometry = study.model(parametersFor(study, values))
  for (const mark of geometry.marks) {
    if (mark.stroke !== undefined && mark.stroke !== 'fine') throw new Error('Invalid stroke tier')
    const points = mark.kind === 'line' ? mark.points : [mark.kind === 'circle' ? mark.center : mark.at]
    for (const [x, y] of points) if (!Number.isFinite(x) || !Number.isFinite(y) || x < 8 || x > 312 || y < 8 || y > 232) throw new Error('Geometry exceeds the drawing bounds')
    if (mark.kind === 'circle' && (!Number.isFinite(mark.radius) || mark.radius <= 0 || mark.center[0] - mark.radius < 8 || mark.center[0] + mark.radius > 312 || mark.center[1] - mark.radius < 8 || mark.center[1] + mark.radius > 232)) throw new Error('Circle exceeds the drawing bounds')
  }
  return geometry
}
