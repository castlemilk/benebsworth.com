import type { BenchmarkTask, Scorer } from '../types'
import { htmlScorer } from './html'
import { textScorer } from './text'
import { behavioralScorer } from './behavioral'

const HTML_CATEGORIES = new Set([
  '3d-physics-animation',
  'advanced-game-building',
  'advanced-physics',
  'advanced-electronics',
  'ui-building',
])

export function selectScorer(task: BenchmarkTask): Scorer {
  if (HTML_CATEGORIES.has(task.category)) return behavioralScorer
  return textScorer
}

export { htmlScorer, textScorer, behavioralScorer }
