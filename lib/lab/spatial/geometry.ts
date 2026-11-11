import type { SpatialLine, Vec3 } from './types'

export const TAU = 2 * Math.PI
export const linspace = (count: number, fn: (u: number) => Vec3): Vec3[] =>
  Array.from({ length: count }, (_, i) => fn(i / (count - 1)))

export function arrow(from: Vec3, to: Vec3, color: string): SpatialLine[] {
  const d = to.map((v, i) => v - from[i]) as Vec3
  const length = Math.hypot(...d)
  if (length < 1e-8) return []
  const n = d.map(v => v / length) as Vec3
  const ref: Vec3 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  const cross: Vec3 = [n[1] * ref[2] - n[2] * ref[1], n[2] * ref[0] - n[0] * ref[2], n[0] * ref[1] - n[1] * ref[0]]
  const scale = Math.min(0.16, length * 0.23)
  const norm = Math.hypot(...cross)
  const a = to.map((v, i) => v - n[i] * scale + cross[i] / norm * scale * 0.45) as Vec3
  const b = to.map((v, i) => v - n[i] * scale - cross[i] / norm * scale * 0.45) as Vec3
  return [{ points: [from, to], color }, { points: [a, to, b], color }]
}
