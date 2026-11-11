import type { Study } from '../definition'

/** Executable authoring example, deliberately not registered in the public gallery. */
export const LISSAJOUS_EXAMPLE: Study = {
  id: 'lissajous-curve', title: 'Lissajous curve', category: 'Mathematics', provenance: 'math-derived',
  tags: ['parametric-curves', 'oscillation'], aliases: ['Lissajous figure'],
  description: 'A parametric curve from two perpendicular harmonic motions.',
  basis: 'x=sin(at+δ), y=sin(bt), t∈[0,2π]; a,b are integers 1…4 and δ is a multiple of π/2. Equal axis scales; 512 straight segments approximate the curve. No time animation.',
  parameters: [
    { key: 'a', label: 'Horizontal frequency', min: 1, max: 4, step: 1, initial: 3 },
    { key: 'b', label: 'Vertical frequency', min: 1, max: 4, step: 1, initial: 2 },
    { key: 'phase', label: 'Phase (π/2)', min: 0, max: 3, step: 1, initial: 1 },
  ],
  model: p => ({ marks: [{ kind: 'line', role: 'ink', closed: true,
    points: Array.from({ length: 513 }, (_, i) => {
      const t = i * Math.PI / 256
      return [160 + 90 * Math.sin(p.a * t + p.phase * Math.PI / 2), 120 - 90 * Math.sin(p.b * t)] as const
    }),
  }] }),
}
