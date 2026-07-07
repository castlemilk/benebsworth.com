export const LAB_POSTERS: Record<string, string> = {
  'universe-scale': '/lab/previews/universe-scale.jpg',
  'aliasing-and-nyquist': '/lab/previews/aliasing-and-nyquist.webp',
  'feedback-stability-margins': '/lab/previews/feedback-stability-margins.webp',
  'complex-maps-and-airfoils': '/lab/previews/complex-maps-and-airfoils.webp',
  'chaos-sensitivity': '/lab/previews/chaos-sensitivity.webp',
  'turing-patterns': '/lab/previews/turing-patterns.webp',
}

export function labPosterFor(slug: string): string | undefined {
  return LAB_POSTERS[slug]
}
