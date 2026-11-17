/** Pure, deterministic geometry. Appearance never enters a model function. */
export type Point = readonly [number, number]
export type InkRole = 'ink' | 'accent' | 'guide'
/** Absolute, structured commands only. Cubic control points share the canvas bounds. */
export type PathCommand =
  | { op: 'M'; to: Point }
  | { op: 'L'; to: Point }
  | { op: 'C'; control1: Point; control2: Point; to: Point }
  | { op: 'Z' }

export const moveTo = (to: Point): Extract<PathCommand, { op: 'M' }> => ({ op: 'M', to })
export const lineTo = (to: Point): Extract<PathCommand, { op: 'L' }> => ({ op: 'L', to })
export const cubicTo = (control1: Point, control2: Point, to: Point): Extract<PathCommand, { op: 'C' }> => ({ op: 'C', control1, control2, to })
export const closePath = (): Extract<PathCommand, { op: 'Z' }> => ({ op: 'Z' })

// Fine engraving is an authored stroke tier, not a geometry perturbation or optional guide.
type StrokeStyle = { emphasis?: boolean; stroke?: 'fine' }
/** Fill contours are explicitly closed and use even-odd holes, never background-colored paint. */
export type PathMark = { kind: 'path'; commands: readonly PathCommand[]; role: InkRole } & (
  | ({ paint: 'stroke' } & StrokeStyle)
  | { paint: 'fill'; emphasis?: never; stroke?: never })
export type Mark = PathMark | (StrokeStyle & (
  | { kind: 'line'; points: readonly Point[]; role: InkRole; closed?: boolean }
  | { kind: 'circle'; center: Point; radius: number; role: InkRole }
  | { kind: 'text'; at: Point; text: string; role: InkRole }))

/** Includes cubic controls, so bounding these points conservatively bounds each curve. */
export function pathPoints(commands: readonly PathCommand[]): Point[] {
  return commands.flatMap(command => {
    switch (command.op) {
      case 'M': case 'L': return [command.to]
      case 'C': return [command.control1, command.control2, command.to]
      case 'Z': return []
      default: { const unknown: never = command; throw new Error(`Invalid path command: ${String(unknown)}`) }
    }
  })
}

/** Exhaustive point access for validators and model reviews, including all path controls. */
export function markPoints(mark: Mark): readonly Point[] {
  switch (mark.kind) {
    case 'line': return mark.points
    case 'circle': return [mark.center]
    case 'text': return [mark.at]
    case 'path': return pathPoints(mark.commands)
    default: { const unknown: never = mark; throw new Error(`Invalid mark: ${String(unknown)}`) }
  }
}
export interface Geometry { marks: Mark[] }
export interface Parameter { key: string; label: string; min: number; max: number; step: number; initial: number }
export interface Study {
  id: string
  title: string
  category: 'Mathematics' | 'Algorithms' | 'Physics' | 'Electronics' | 'Distributed systems' | 'Illustration'
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
