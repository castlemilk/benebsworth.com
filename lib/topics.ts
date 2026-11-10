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
  indigo: '#6366f1', // cosmology / astrophysics
  rose: '#f472b6', // chemistry
  lime: '#a3e635', // life sciences
  sky: '#38bdf8', // earth & space science
  hiking: '#5b9e6f', // trail guides / the hiking desk
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
  cosmology: { icon: '/topics/technology.png', label: 'Cosmology', accent: ACCENT.indigo },
  chemistry: { icon: '/topics/technology.png', label: 'Chemistry', accent: ACCENT.rose },
  biology: { icon: '/topics/technology.png', label: 'Life Sciences', accent: ACCENT.lime },
  earth: { icon: '/topics/technology.png', label: 'Earth & Space', accent: ACCENT.sky },
  hiking: { icon: '/topics/technology.png', label: 'Hiking', accent: ACCENT.hiking },
} satisfies Record<string, Topic>

export { TOPIC }

/** Explicit, hand-curated per-slug overrides — the source of truth. */
const BY_SLUG: Record<string, Topic> = {
  'singular-values-are-stretches': TOPIC.maths,
  'a-loop-on-a-sphere-turns-an-arrow': TOPIC.maths,
  'complex-roots-need-another-floor': TOPIC.maths,
  'light-draws-an-ellipse': TOPIC.physics,
  'a-wave-packet-has-two-speeds': TOPIC.physics,
  'a-gyroscope-falls-sideways': TOPIC.physics,
  'steering-a-beam-without-moving-an-antenna': TOPIC.ee,
  'three-phases-make-a-rotating-field': TOPIC.ee,
  'a-waveguide-is-a-high-pass-filter': TOPIC.ee,
  'power-flows-around-the-wire': TOPIC.ee,
  'a-p-electron-is-never-between-its-lobes': TOPIC.chemistry,
  'a-lone-pair-takes-more-room-than-an-atom': TOPIC.chemistry,
  'two-crystals-hide-in-one-stack-of-oranges': TOPIC.chemistry,
  'every-virus-shell-has-twelve-pentagons': TOPIC.biology,
  'the-nautilus-is-not-a-golden-spiral': TOPIC.biology,
  'dna-strands-are-not-opposite': TOPIC.biology,
  'earth-is-closest-to-the-sun-in-winter': TOPIC.earth,
  'the-sun-pulls-harder-but-the-moon-makes-the-tides': TOPIC.earth,
  'a-ring-of-silence-proves-the-core-is-liquid': TOPIC.earth,
  'stable-lagrange-points-sit-on-hilltops': TOPIC.earth,
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
  'chaos-in-one-equation': TOPIC.maths,
  'lorenz-and-the-limits-of-prediction': TOPIC.maths,
  'phase-portraits-of-differential-equations': TOPIC.maths,
  'every-wave-is-a-circle': TOPIC.maths,
  'how-the-leopard-got-its-spots': TOPIC.maths,
  'every-qubit-gate-is-a-rotation': TOPIC.physics,
  'band-gaps-are-bragg-reflection': TOPIC.physics,
  'normal-modes-to-chaos': TOPIC.physics,
  'quantum-tunnelling-you-can-see': TOPIC.physics,
  'how-a-magnet-makes-up-its-mind': TOPIC.physics,
  'a-neural-net-learns-a-shape': TOPIC.software,
  'a-star-search-visually': TOPIC.software,
  'how-python-dicts-really-work': TOPIC.software,
  'b-trees-vs-lsm-trees': TOPIC.software,
  'shrinking-the-kv-cache': TOPIC.software,
  'learning-by-rolling-downhill': TOPIC.software,
  'repair-is-just-solving': TOPIC.software,
  'a-transformer-reads-everything-at-once': TOPIC.software,
  'backprop-is-just-the-chain-rule': TOPIC.software,
  'how-to-paint-with-noise': TOPIC.software,
  'three-rules-build-a-computer': TOPIC.software,
  'why-everything-becomes-a-bell-curve': TOPIC.maths,
  'why-time-only-runs-forwards': TOPIC.physics,
  'why-your-shower-temperature-oscillates': TOPIC.ee,
  'why-thinking-longer-makes-models-smarter': TOPIC.software,
  'how-kimi-k3-works': TOPIC.software,
  'benchmarking-kimi-k3': TOPIC.software,
  'delta-rule-linear-attention': TOPIC.software,
  'the-loop-that-beats-attention': TOPIC.software,
  'robots-that-act-by-denoising': TOPIC.software,
  'remembering-a-qubit-that-forgets': TOPIC.physics,
  'what-jpeg-throws-away': TOPIC.ee,
  'every-wire-is-an-rlc-circuit': TOPIC.ee,
  'am-fm-qam-the-modulation-zoo': TOPIC.ee,
  'software-defined-radio-in-100-lines': TOPIC.ee,
  'smith-chart-is-geometry': TOPIC.ee,
  'pll-from-first-principles': TOPIC.ee,
  'filters-from-poles-and-zeros': TOPIC.ee,
  'how-dram-remembers-a-bit': TOPIC.ee,
  'usb-wifi-in-userspace': TOPIC.ee,
  'backpressure-is-the-system-saying-no': TOPIC.software,
  'dspark-speculative-decoding': TOPIC.software,
  // Physics foundations for the cosmology desk (violet)
  'why-gravity-is-geometry': TOPIC.physics,
  'anatomy-of-a-black-hole': TOPIC.physics,
  'simulating-a-black-hole': TOPIC.physics,
  'the-universe-on-a-surface': TOPIC.physics,
  'how-space-itself-expands': TOPIC.physics,
  // Cosmology & astrophysics desk (indigo)
  'universe-inside-a-black-hole': TOPIC.cosmology,
  'the-cosmic-distance-ladder': TOPIC.cosmology,
  'the-cosmic-microwave-background': TOPIC.cosmology,
  'dark-matter-the-unseen-gravity': TOPIC.cosmology,
  'dark-energy-and-the-runaway-universe': TOPIC.cosmology,
  'how-stars-live-and-die': TOPIC.cosmology,
  'gravitational-waves': TOPIC.cosmology,
  'why-the-night-sky-is-dark': TOPIC.cosmology,
  'the-fine-tuned-universe': TOPIC.cosmology,
  'the-first-three-minutes': TOPIC.cosmology,
  // Hiking desk (trail guides)
  'overland-track-guide': TOPIC.hiking,
  'haute-route-guide': TOPIC.hiking,
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
  { match: ['cosmology', 'astrophysics', 'black hole', 'cosmic', 'relativity', 'spacetime'], topic: TOPIC.cosmology },
  { match: ['chemistry', 'biochemistry', 'molecules'], topic: TOPIC.chemistry },
  { match: ['biology', 'life sciences', 'epidemiology', 'ecology', 'evolution'], topic: TOPIC.biology },
  { match: ['earth science', 'geoscience', 'geophysics', 'climate', 'oceanography', 'meteorology', 'planetary science', 'orbital mechanics'], topic: TOPIC.earth },
  { match: ['hiking', 'trail-guide', 'trek', 'trekking'], topic: TOPIC.hiking },
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
