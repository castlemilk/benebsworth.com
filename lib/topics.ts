import type { LoadedPost } from '@/lib/content'

/**
 * Topic system for the blog. Each post resolves to a single *topic marker* —
 * a small refined glyph + label + accent — that color-codes the post by subject.
 *
 * Accents map to MEANING (per .impeccable.md), not decoration:
 *   - teal   (#00e0b8) — kubernetes / platform / cloud-native tooling (the bulk)
 *   - purple (#7c5cff) — istio / service mesh
 *   - orange (#ff7a59) — GCP, algorithms & personal / general posts
 *
 * Icons reuse the ORIGINAL site assets, copied (lowercased) into /public/topics/.
 * A topic icon is a *category* marker (e.g. kubernetes is shared by several
 * posts), not a per-post identity — so the treatment in the UI stays light.
 */
export type Topic = {
  /** absolute path to the topic icon under /public/topics (lowercase, static-export safe) */
  icon: string
  /** short human label shown beside the glyph */
  label: string
  /** brand accent hex keyed to the topic's meaning */
  accent: string
}

const ACCENT = {
  teal: '#00e0b8',
  purple: '#7c5cff',
  orange: '#ff7a59',
  // Science-desk accents (the deep-dive essays): distinct, mid-luminance hues
  // that read on both light and dark backgrounds.
  blue: '#4c9be8', // mathematics
  violet: '#b16cea', // physics
  green: '#34d399', // software / computer science
  amber: '#f5a623', // electrical engineering / signals
} as const

const TOPIC = {
  kubernetes: { icon: '/topics/kubernetes.png', label: 'Kubernetes', accent: ACCENT.teal },
  istio: { icon: '/topics/istio.png', label: 'Service Mesh', accent: ACCENT.purple },
  tekton: { icon: '/topics/tekton.png', label: 'CI/CD · Tekton', accent: ACCENT.teal },
  kustomize: { icon: '/topics/kustomize.png', label: 'Config · Kustomize', accent: ACCENT.teal },
  minikube: { icon: '/topics/minikube.png', label: 'Local Dev', accent: ACCENT.teal },
  gcp: { icon: '/topics/gcp.png', label: 'Google Cloud', accent: ACCENT.orange },
  react: { icon: '/topics/react.png', label: 'React', accent: ACCENT.teal },
  algorithms: { icon: '/topics/technology.png', label: 'Algorithms', accent: ACCENT.orange },
  general: { icon: '/topics/technology.png', label: 'Field Notes', accent: ACCENT.orange },
  technology: { icon: '/topics/technology.png', label: 'Engineering', accent: ACCENT.teal },
  // Science desks
  maths: { icon: '/topics/technology.png', label: 'Mathematics', accent: ACCENT.blue },
  physics: { icon: '/topics/technology.png', label: 'Physics', accent: ACCENT.violet },
  software: { icon: '/topics/technology.png', label: 'Software', accent: ACCENT.green },
  ee: { icon: '/topics/technology.png', label: 'Electrical Eng', accent: ACCENT.amber },
} satisfies Record<string, Topic>

export { TOPIC }

/** Explicit, hand-curated per-slug overrides — the source of truth. */
const BY_SLUG: Record<string, Topic> = {
  'istio-patterns': TOPIC.istio,
  'kubernetes-cicd-part-1': TOPIC.kubernetes,
  'kubernetes-cicd-part-2': TOPIC.kubernetes,
  'kubernetes-cicd-part-3': TOPIC.kubernetes,
  'getting-started-with-tekton': TOPIC.tekton,
  'kustomize-examples': TOPIC.kustomize,
  'using-helm': TOPIC.kubernetes,
  'using-kapitan': TOPIC.kubernetes,
  'install-minikube': TOPIC.minikube,
  'gke-development-auto-scale-down': TOPIC.gcp,
  'nextjs-starter-project': TOPIC.react,
  'common-hooks': TOPIC.react,
  'binary-search-tree': TOPIC.algorithms,
  'two-number-sum': TOPIC.algorithms,
  'hello-world': TOPIC.general,
  // Science deep-dives
  'lorenz-and-the-limits-of-prediction': TOPIC.maths,
  'phase-portraits-of-differential-equations': TOPIC.maths,
  'every-wave-is-a-circle': TOPIC.maths,
  'how-the-leopard-got-its-spots': TOPIC.maths,
  'every-qubit-gate-is-a-rotation': TOPIC.physics,
  'band-gaps-are-bragg-reflection': TOPIC.physics,
  'normal-modes-to-chaos': TOPIC.physics,
  'quantum-tunnelling-you-can-see': TOPIC.physics,
  'a-star-search-visually': TOPIC.software,
  'how-python-dicts-really-work': TOPIC.software,
  'b-trees-vs-lsm-trees': TOPIC.software,
  'shrinking-the-kv-cache': TOPIC.software,
  'learning-by-rolling-downhill': TOPIC.software,
  'repair-is-just-solving': TOPIC.software,
  'every-wire-is-an-rlc-circuit': TOPIC.ee,
  'am-fm-qam-the-modulation-zoo': TOPIC.ee,
  'software-defined-radio-in-100-lines': TOPIC.ee,
  'smith-chart-is-geometry': TOPIC.ee,
  'pll-from-first-principles': TOPIC.ee,
  'filters-from-poles-and-zeros': TOPIC.ee,
}

/**
 * Tag-priority fallback so posts added in future resolve sensibly without an
 * explicit slug entry. Ordered most → least specific; first match wins.
 */
const TAG_RULES: Array<{ match: string[]; topic: Topic }> = [
  { match: ['istio', 'service mesh', 'envoy'], topic: TOPIC.istio },
  { match: ['tekton'], topic: TOPIC.tekton },
  { match: ['kustomize'], topic: TOPIC.kustomize },
  { match: ['minikube'], topic: TOPIC.minikube },
  { match: ['react'], topic: TOPIC.react },
  { match: ['algorithms'], topic: TOPIC.algorithms },
  { match: ['gcp'], topic: TOPIC.gcp },
  { match: ['kubernetes', 'containers', 'ci/cd', 'knative', 'skaffold'], topic: TOPIC.kubernetes },
  { match: ['personal', 'general'], topic: TOPIC.general },
]

/** Resolve a post → its topic marker. Slug overrides win; else tag rules; else generic. */
export function topicFor(post: Pick<LoadedPost, 'slug' | 'tags'>): Topic {
  const explicit = BY_SLUG[post.slug]
  if (explicit) return explicit

  const tags = (post.tags ?? []).map((t) => t.toLowerCase().trim())
  for (const rule of TAG_RULES) {
    if (rule.match.some((m) => tags.includes(m))) return rule.topic
  }
  return TOPIC.technology
}
