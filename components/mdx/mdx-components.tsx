import type { MDXComponents } from 'mdx/types'
import { Callout } from '@/components/ui/callout'
import { Equation } from './equation'
import { StatGroup, Stat, PullQuote, Figure } from './editorial-components'
import {
  IngressFlowBasic,
  EgressFlowBasic,
  EgressFlowAdvanced,
  FfnnFlow,
  RnnFlow,
  LstmFlow,
  VaeFlow,
  GanFlow,
  TransformerFlow,
  LabCanvas,
  LabSide,
  ColorLegend,
  ZooMiniMap,
  PllDiagram,
  AttentionHeatmap,
  SoftmaxLab,
  TokenSampler,
  MoEBlock,
  HashTableDemo,
  StorageEngineSim,
  KvCacheCompressor,
  KvQuantDial,
  KvEvictionWindow,
  KvAblationLedger,
  KvContextHistogram,
} from './lazy-mdx-components'

export const mdxComponents: MDXComponents = {
  StatGroup,
  Stat,
  PullQuote,
  Figure,
  PllDiagram,
  AttentionHeatmap,
  SoftmaxLab,
  TokenSampler,
  MoEBlock,
  HashTableDemo,
  StorageEngineSim,
  KvCacheCompressor,
  KvQuantDial,
  KvEvictionWindow,
  KvAblationLedger,
  KvContextHistogram,
  IngressFlowBasic,
  EgressFlowBasic,
  EgressFlowAdvanced,
  FfnnFlow,
  RnnFlow,
  LstmFlow,
  VaeFlow,
  GanFlow,
  TransformerFlow,
  LabCanvas,
  LabSide,
  ColorLegend,
  ZooMiniMap,
  Callout,
  Equation,
  h2: (p) => <h2 className="font-display mt-12 scroll-mt-32 text-[clamp(1.85rem,1.35rem+2vw,3rem)] font-semibold leading-[1.05] tracking-[-0.025em] text-fg" {...p} />,
  h3: (p) => <h3 className="font-display mt-8 scroll-mt-32 text-[clamp(1.3rem,1.1rem+0.75vw,1.65rem)] font-semibold leading-[1.25] tracking-[-0.015em] text-fg" {...p} />,
  p: (p) => <p className="font-sans mt-5 text-[clamp(1.0625rem,1rem+0.22vw,1.1875rem)] leading-[1.8] text-fg/85" {...p} />,
  a: (p) => <a className="text-project underline underline-offset-4 decoration-project/40 transition-colors hover:decoration-project" {...p} />,
  ul: (p) => <ul className="font-sans mt-4 list-disc space-y-1.5 pl-6 leading-[1.7] text-fg/85" {...p} />,
  code: (p) => <code className="font-mono rounded bg-white/5 px-1.5 py-0.5 text-[0.85em]" {...p} />,
  Video: (p: { src?: string; width?: number; height?: number; alt?: string }) => (
    <video
      src={p.src}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={p.alt}
      width={p.width}
      height={p.height}
      className="not-prose my-7 w-full rounded-xl border border-[var(--color-border)]"
      style={p.width && p.height ? { aspectRatio: `${p.width} / ${p.height}` } : undefined}
    />
  ),
  GithubLink: (p: { url?: string }) => {
    const href = p.url ?? ''
    const repo = href.replace(/^https:\/\/github\.com\//, '').replace(/\/$/, '')
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="not-prose my-6 inline-flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-surface px-4 py-3 font-mono text-sm text-fg no-underline transition-colors hover:border-[var(--color-muted)]"
      >
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        <span>{repo || 'View on GitHub'}</span>
        <span aria-hidden className="text-muted">→</span>
      </a>
    )
  },
}
