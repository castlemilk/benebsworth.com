import type { MDXComponents } from 'mdx/types'
import { IngressFlowBasic, EgressFlowBasic, EgressFlowAdvanced } from './istio-flows'

export const mdxComponents: MDXComponents = {
  // Interactive Istio flow diagrams (used by the istio-patterns post).
  IngressFlowBasic,
  EgressFlowBasic,
  EgressFlowAdvanced,
  h2: (p) => <h2 className="font-display mt-12 text-[var(--text-h2)] font-semibold tracking-[-0.025em] text-fg" {...p} />,
  h3: (p) => <h3 className="font-display mt-8 text-[var(--text-h3)] font-semibold tracking-[-0.015em] text-fg" {...p} />,
  p: (p) => <p className="font-sans mt-4 text-[1.0625rem] leading-[1.75] text-fg/85" {...p} />,
  a: (p) => <a className="text-project underline underline-offset-4 decoration-project/40 transition-colors hover:decoration-project" {...p} />,
  ul: (p) => <ul className="font-sans mt-4 list-disc space-y-1.5 pl-6 leading-[1.7] text-fg/85" {...p} />,
  code: (p) => <code className="font-mono rounded bg-white/5 px-1.5 py-0.5 text-[0.85em]" {...p} />,
}
