import type { BenchmarkTask, Scorer } from '../types'
import { htmlScorer } from './html'
import { textScorer } from './text'

const HTML_CATEGORIES = new Set([
  '3d-physics-animation',
  'advanced-game-building',
  'advanced-physics',
  'advanced-electronics',
  'ui-building',
])

export function selectScorer(task: BenchmarkTask): Scorer {
  if (HTML_CATEGORIES.has(task.category)) return htmlScorer
  return textScorer
}

export { htmlScorer, textScorer }
