/** Pure, deterministic geometry. Appearance never enters a model function. */
export type Point = readonly [number, number]
export type InkRole = 'ink' | 'accent' | 'guide'
export type Mark = { emphasis?: boolean } & (
  | { kind: 'line'; points: readonly Point[]; role: InkRole; closed?: boolean }
  | { kind: 'circle'; center: Point; radius: number; role: InkRole }
  | { kind: 'text'; at: Point; text: string; role: InkRole })
export interface Geometry { marks: Mark[] }
export interface Parameter { key: string; label: string; min: number; max: number; step: number; initial: number }
export interface Study {
  id: string
  title: string
  category: 'Mathematics' | 'Algorithms' | 'Physics' | 'Electronics' | 'Distributed systems'
  provenance: 'math-derived' | 'topology' | 'illustrative' | 'simulated'
  description: string
  basis: string
  tags: readonly string[]
  aliases: readonly string[]
  parameters: readonly Parameter[]
  model: (parameters: Readonly<Record<string, number>>) => Geometry
}


export function parametersFor(study: Study, values: Readonly<Record<string, number>> = {}): Record<string, number> {
  for (const key of Object.keys(values)) if (!study.parameters.some(p => p.key === key)) throw new Error(`Unknown parameter: ${key}`)
  return Object.fromEntries(study.parameters.map(p => {
    const value = Object.hasOwn(values, p.key) ? values[p.key] : p.initial
    if (!Number.isFinite(value) || value < p.min || value > p.max || Math.abs((value - p.min) / p.step - Math.round((value - p.min) / p.step)) > 1e-7) throw new Error(`Invalid parameter: ${p.key}`)
    return [p.key, value]
  }))
}
