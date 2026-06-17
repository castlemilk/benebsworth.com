/**
 * Per-tag pastel colors for lab effect and blog post tag pills.
 * Known tags get a curated pastel; anything else is assigned via
 * deterministic hash so the same tag always gets the same colour.
 *
 * The palette is shared with lib/tech-colors.ts so skill chips and
 * tag pills feel like the same system.
 */
const PALETTE = [
  '#8ab4f8', // soft blue
  '#b39ddb', // lavender
  '#f6a5c0', // pink
  '#ffcc80', // peach
  '#80deea', // cyan
  '#a5d6a7', // mint
  '#fff59d', // butter
  '#ce93d8', // orchid
  '#ffab91', // coral
  '#90caf9', // sky
  '#c5e1a5', // light green
  '#9fa8da', // periwinkle
  '#f48fb1', // rose
  '#b0bec5', // slate
]

const MAP: Record<string, string> = {
  // ── art / lab ─────────────────────────────────────────
  trails: '#a5d6a7',
  trig: '#80deea',
  noise: '#90caf9',
  particles: '#b39ddb',
  '3d': '#ce93d8',
  parallax: '#9fa8da',
  automata: '#ffab91',
  grid: '#c5e1a5',
  waves: '#80deea',
  wireframe: '#b0bec5',
  voronoi: '#ce93d8',
  gradient: '#f6a5c0',
  ink: '#90caf9',
  organic: '#a5d6a7',
  parametric: '#ffcc80',
  curves: '#f48fb1',
  // ── maths ────────────────────────────────────────────
  chaos: '#ffab91',
  ode: '#8ab4f8',
  'dynamical systems': '#9fa8da',
  'complex analysis': '#b39ddb',
  'differential geometry': '#ce93d8',
  statistics: '#c5e1a5',
  probability: '#a5d6a7',
  analysis: '#80deea',
  fourier: '#90caf9',
  'butterfly effect': '#ffcc80',
  // ── physics ──────────────────────────────────────────
  interference: '#80deea',
  quantum: '#b39ddb',
  qm: '#b39ddb',
  'condensed matter': '#9fa8da',
  'solid state': '#8ab4f8',
  tunneling: '#ce93d8',
  mechanics: '#c5e1a5',
  'normal modes': '#a5d6a7',
  beats: '#f48fb1',
  // ── engineering ──────────────────────────────────────
  circuits: '#ffab91',
  transient: '#ffcc80',
  dsp: '#80deea',
  spectrum: '#90caf9',
  control: '#8ab4f8',
  feedback: '#a5d6a7',
  communications: '#f6a5c0',
  modulation: '#ce93d8',
  rf: '#b39ddb',
  impedance: '#9fa8da',
  robotics: '#c5e1a5',
  kinematics: '#b0bec5',
  pll: '#ffab91',
  filters: '#80deea',
  tdr: '#b0bec5',
  // ── blog / tech ──────────────────────────────────────
  algorithms: '#b39ddb',
  python: '#fff59d',
  react: '#90caf9',
  kubernetes: '#8ab4f8',
  istio: '#b39ddb',
  'service mesh': '#b39ddb',
  gcp: '#f6a5c0',
  aws: '#ffcc80',
  go: '#80deea',
  terraform: '#c5b3f5',
  docker: '#90caf9',
  prometheus: '#ffab91',
  grafana: '#ffcc80',
  ci: '#c5e1a5',
  'ci/cd': '#c5e1a5',
  containers: '#90caf9',
  'developer experience': '#a5d6a7',
  'signal processing': '#80deea',
  'electrical engineering': '#ffab91',
  'machine-learning': '#f6a5c0',
  'deep-learning': '#ce93d8',
  physics: '#b39ddb',
  technology: '#90caf9',
  nodejs: '#a5d6a7',
  gatsby: '#b39ddb',
  blogging: '#c5e1a5',
  general: '#b0bec5',
  lambda: '#ffcc80',
  envoy: '#ce93d8',
  knative: '#80deea',
  skaffold: '#80deea',
  kustomize: '#80cbc4',
  tekton: '#a5d6a7',
  personal: '#f6a5c0',
  jaeger: '#90caf9',
  kiali: '#ce93d8',
  azure: '#8ab4f8',
  ibm: '#b39ddb',
}

export function tagColor(tag: string): string {
  const k = tag.trim().toLowerCase()
  if (MAP[k]) return MAP[k]
  let h = 0
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}
