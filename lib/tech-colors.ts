/**
 * Per-technology pastel colors for the resume tech lozenges.
 * Known technologies get a curated pastel; anything else is assigned a stable
 * pastel from the palette via a deterministic hash (same tech → same color).
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
  kubernetes: '#8ab4f8',
  k8s: '#8ab4f8',
  istio: '#b39ddb',
  envoy: '#ce93d8',
  'service mesh': '#b39ddb',
  gcp: '#f6a5c0',
  'google cloud': '#f6a5c0',
  gke: '#f6a5c0',
  aws: '#ffcc80',
  go: '#80deea',
  golang: '#80deea',
  python: '#fff59d',
  java: '#ffab91',
  javascript: '#fff59d',
  typescript: '#90caf9',
  react: '#90caf9',
  redux: '#ce93d8',
  'redux-sagas': '#ce93d8',
  node: '#a5d6a7',
  'node.js': '#a5d6a7',
  terraform: '#c5b3f5',
  helm: '#9fa8da',
  kustomize: '#80cbc4',
  tekton: '#a5d6a7',
  skaffold: '#80deea',
  docker: '#90caf9',
  containers: '#90caf9',
  jenkins: '#b0bec5',
  'ci/cd': '#c5e1a5',
  cicd: '#c5e1a5',
  elasticsearch: '#a5d6a7',
  firebase: '#ffcc80',
  jest: '#f48fb1',
  grpc: '#80deea',
  prometheus: '#ffab91',
  grafana: '#ffcc80',
  sre: '#f6a5c0',
  python3: '#fff59d',
  bash: '#c5e1a5',
  cisco: '#90caf9',
  juniper: '#a5d6a7',
  'palo alto': '#ffcc80',
  paramiko: '#fff59d',
  opa: '#b39ddb',
  canary: '#f48fb1',
  observability: '#ffab91',
}

export function techColor(tech: string): string {
  const k = tech.trim().toLowerCase()
  if (MAP[k]) return MAP[k]
  let h = 0
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}
