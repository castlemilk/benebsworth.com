/**
 * The /uses page (uses.tech convention): the tools, stack and machine behind
 * the work. Every entry is data — edit freely. Kept honest: the stack rows are
 * what this very site and the day job actually run on.
 */
export type UsesItem = { name: string; note: string }
export type UsesGroup = { id: string; group: string; items: UsesItem[] }

export const USES: UsesGroup[] = [
  {
    id: 'languages',
    group: 'Languages I reach for',
    items: [
      { name: 'Go', note: 'services, CLIs, anything that should be fast and boring' },
      { name: 'TypeScript', note: 'the web — and increasingly everything else' },
      { name: 'Python', note: 'glue, data, scripting, ML' },
      { name: 'C / C++', note: 'embedded, and when the metal matters' },
    ],
  },
  {
    id: 'platform',
    group: 'Platform & cloud',
    items: [
      { name: 'Kubernetes', note: 'EKS & GKE, in production at scale' },
      { name: 'Istio', note: "service mesh — I shipped Australia's first prod deployment" },
      { name: 'AWS / GCP', note: 'multi-cloud, certified on both' },
      { name: 'Terraform', note: 'infrastructure as code (this site included)' },
      { name: 'Prometheus + Grafana', note: 'observability, SLIs/SLOs' },
    ],
  },
  {
    id: 'ai',
    group: 'AI-native toolchain',
    items: [
      { name: 'Coding agents', note: 'LLMs as a daily driver, not a bolt-on' },
      { name: 'Anthropic & OpenAI APIs', note: 'the model layer behind tools and agents' },
      { name: 'MCP', note: 'wiring real tools into agents' },
      { name: 'RAG + embeddings', note: 'retrieval and vector search' },
    ],
  },
  {
    id: 'site',
    group: 'This site is built with',
    items: [
      { name: 'Next.js 16 + React 19', note: 'statically exported — no server to run' },
      { name: 'Tailwind CSS v4', note: 'styling and the design tokens' },
      { name: 'MDX', note: 'posts are React-in-Markdown, so figures are live' },
      { name: 'Shiki + KaTeX', note: 'code highlighting and typeset math' },
      { name: 'HTML canvas', note: 'every lab simulation, hand-rolled' },
      { name: 'Cloudflare Pages', note: 'global edge CDN + DNS, Terraform-managed' },
    ],
  },
  {
    id: 'machine',
    group: 'Machine',
    items: [
      { name: 'macOS + zsh', note: 'the daily environment' },
      // TODO(Ben): drop in your actual laptop / keyboard / monitor / desk here.
    ],
  },
]
