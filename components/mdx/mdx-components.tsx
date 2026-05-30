import type { MDXComponents } from 'mdx/types'
import { IngressFlowBasic, EgressFlowBasic, EgressFlowAdvanced } from './istio-flows'

export const mdxComponents: MDXComponents = {
  // Interactive Istio flow diagrams (used by the istio-patterns post).
  IngressFlowBasic,
  EgressFlowBasic,
  EgressFlowAdvanced,
  h2: (p) => <h2 className="font-display mt-12 text-[clamp(1.85rem,1.35rem+2vw,3rem)] font-semibold leading-[1.05] tracking-[-0.025em] text-fg" {...p} />,
  h3: (p) => <h3 className="font-display mt-8 text-[clamp(1.3rem,1.1rem+0.75vw,1.65rem)] font-semibold leading-[1.25] tracking-[-0.015em] text-fg" {...p} />,
  p: (p) => <p className="font-sans mt-5 text-[clamp(1.0625rem,1rem+0.22vw,1.1875rem)] leading-[1.8] text-fg/85" {...p} />,
  a: (p) => <a className="text-project underline underline-offset-4 decoration-project/40 transition-colors hover:decoration-project" {...p} />,
  ul: (p) => <ul className="font-sans mt-4 list-disc space-y-1.5 pl-6 leading-[1.7] text-fg/85" {...p} />,
  code: (p) => <code className="font-mono rounded bg-white/5 px-1.5 py-0.5 text-[0.85em]" {...p} />,
}
