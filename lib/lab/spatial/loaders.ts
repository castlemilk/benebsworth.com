import type { SpatialLesson } from './types'

type LessonModule = Promise<{ default?: SpatialLesson } & Record<string, unknown>>

/** The original collection ships one module per desk; later lessons ship one module per lab. */
const DESK_MODULES: Record<string, () => Promise<SpatialLesson[]>> = {
  maths: () => import('./maths').then(m => m.mathsLessons),
  physics: () => import('./physics').then(m => m.physicsLessons),
  engineering: () => import('./engineering').then(m => m.engineeringLessons),
}
const DESK_OF_SLUG: Record<string, keyof typeof DESK_MODULES> = {
  'singular-values': 'maths', 'parallel-transport': 'maths', 'complex-roots': 'maths',
  'polarisation': 'physics', 'group-velocity': 'physics', 'gyroscope': 'physics',
  'phased-array': 'engineering', 'rotating-field': 'engineering', 'waveguide': 'engineering', 'poynting-flow': 'engineering',
}
/** One chunk per lesson: `lib/lab/spatial/lessons/<slug>.ts` exports `lesson`. */
export const LESSON_MODULES: Record<string, () => LessonModule> = {
  'hydrogen-orbitals': () => import('./lessons/hydrogen-orbitals'),
  'vsepr': () => import('./lessons/vsepr'),
  'close-packing': () => import('./lessons/close-packing'),
  'virus-capsid': () => import('./lessons/virus-capsid'),
  'shell-coiling': () => import('./lessons/shell-coiling'),
  'dna-grooves': () => import('./lessons/dna-grooves'),
  'seasons': () => import('./lessons/seasons'),
  'tides': () => import('./lessons/tides'),
  'seismic-shadow': () => import('./lessons/seismic-shadow'),
  'lagrange-points': () => import('./lessons/lagrange-points'),
}

export async function loadSpatialLesson(slug: string): Promise<SpatialLesson> {
  const desk = DESK_OF_SLUG[slug]
  if (desk) {
    const lesson = (await DESK_MODULES[desk]()).find(item => item.slug === slug)
    if (lesson) return lesson
  }
  const loader = LESSON_MODULES[slug]
  if (loader) {
    const mod = await loader()
    const lesson = (mod.lesson ?? mod.default) as SpatialLesson | undefined
    if (lesson?.slug === slug) return lesson
  }
  throw new Error(`Unknown spatial lesson: ${slug}`)
}
