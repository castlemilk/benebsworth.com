export type Vec3 = [number, number, number]
export type SpatialParams = Record<string, number>
export type SpatialLine = { points: Vec3[]; color: string; opacity?: number }
export type SpatialSurface = { vertices: Vec3[]; indices: number[]; color: string; opacity?: number }
export type SpatialPoint = { position: Vec3; color: string; size?: number }
export type SpatialFrame = { lines: SpatialLine[]; surfaces?: SpatialSurface[]; points?: SpatialPoint[] }
export type SpatialControl = { key: string; label: string; min: number; max: number; step: number; unit?: string }
export type SpatialLesson = {
  slug: string
  title: string
  description: string
  category: 'maths' | 'physics' | 'chemistry' | 'biology' | 'earth' | 'engineering'
  blogSlug: string
  accent: string
  /** Default camera distance at a square or wider aspect ratio. */
  cameraDistance?: number
  defaults: SpatialParams
  controls: SpatialControl[]
  presets: { label: string; params: SpatialParams }[]
  legend: { label: string; color: string }[]
  explanation: string
  limitation: string
  readouts: (params: SpatialParams) => { label: string; value: string }[]
  /** Phase is a scrubbable angle in [0, 2π]. Keep scenes within ±3 world units. */
  build: (params: SpatialParams, phase: number) => SpatialFrame
}
