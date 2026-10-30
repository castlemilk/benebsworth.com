import { sketchPath } from '@/components/mdx/annotation-geometry'

export type CalloutType = 'info' | 'warning' | 'success' | 'error' | 'thinking' | 'feeling' | 'doing'

// Original folio glyphs, drawn on one 40-unit sheet. These describe ideas rather
// than measurements. Small details use restrained roughness to survive at 28px.
const drawings: Record<CalloutType, { seed: number; paths: string[] }> = {
  info: { seed: 1103, paths: [
    'M14 27 C14 23 8 22 8 15 C8 1 32 1 32 15 C32 22 26 23 26 27 Z',
    'M15 31 L25 31 M17 35 Q20 38 23 35',
    'M17 26 L17 19 L23 19 L23 26',
    'M3 12 L1 11 M35 12 L39 11 M7 4 L5 2 M33 4 L35 2',
  ] },
  thinking: { seed: 1201, paths: [
    'M20 8 C15 1 8 5 8 11 C2 12 3 20 6 22 C1 29 9 36 15 32 C18 37 22 33 20 29 Z',
    'M20 8 C25 1 32 5 32 11 C38 12 37 20 34 22 C39 29 31 36 25 32 C22 37 18 33 20 29',
    'M8 11 Q15 10 14 17 M6 22 Q13 19 14 25 M15 32 Q12 29 15 27',
    'M32 11 Q25 10 26 17 M34 22 Q27 19 26 25 M25 32 Q28 29 25 27',
  ] },
  warning: { seed: 1301, paths: [
    'M18 5 Q20 1 22 5 L37 32 Q39 36 34 36 L6 36 Q1 36 4 31 Z',
    'M20 13 L20 24 M20 29 L20 30',
  ] },
  success: { seed: 1409, paths: [
    'M20 4 C30 3 37 11 36 21 C37 31 28 37 18 36 C7 37 2 27 4 18 C4 9 11 3 20 4 Z',
    'M10 20 L17 27 L30 13',
  ] },
  error: { seed: 1511, paths: [
    'M20 4 C30 3 37 11 36 21 C37 31 28 37 18 36 C7 37 2 27 4 18 C4 9 11 3 20 4 Z',
    'M13 13 L27 27 M27 13 L13 27',
  ] },
  feeling: { seed: 1601, paths: [
    'M20 34 C15 29 3 23 3 14 C3 4 15 2 20 11 C25 2 37 4 37 14 C37 23 25 29 20 34 Z',
  ] },
  doing: { seed: 1709, paths: [
    'M8 12 L17 3 L29 13 L24 18 L20 15 L16 19 Z',
    'M18 18 L31 32 Q32 35 29 36 L14 22 Z',
    'M28 9 L34 9 M29 4 L32 1',
  ] },
}

const ink = Object.fromEntries(Object.entries(drawings).map(([type, drawing]) => [
  type, drawing.paths.map((path, i) => sketchPath(path, drawing.seed + i, .65)),
])) as Record<CalloutType, string[]>

/** Label-adjacent decoration; the visible type text carries the accessible name. */
export function CalloutInkIcon({ type, className }: { type: CalloutType; className?: string }) {
  return <svg className={className} data-callout-ink-icon={type} viewBox="-3 -3 46 46"
    width="28" height="28" fill="none" aria-hidden="true" focusable="false">
    {ink[type].map((d, i) => <path key={i} d={d} stroke="currentColor" strokeWidth="1.55"
      strokeLinecap="round" strokeLinejoin="round" />)}
  </svg>
}
