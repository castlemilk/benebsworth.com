'use client'

import { useId, useState } from 'react'

/**
 * A single SVG overlay layer positioned over the background.
 * - `src`   absolute public path to the overlay SVG
 * - `top`   vertical position of the layer's top edge as a % of background height
 * - `width` layer width as a % of background width (may exceed 100; centered)
 * - `alt`   accessible label
 */
export type FlowLayer = {
  src: string
  top: number
  width: number
  alt: string
}

/**
 * A step in the walkthrough. Layers are revealed cumulatively: step `i`
 * shows the background plus every layer from steps `1..i`. Step 0 shows only
 * the background. `description` is raw markdown-ish text (prose + ```fenced```
 * code blocks) ported verbatim from the legacy diagrams.
 */
export type FlowStep = {
  header: string
  description: string
  /** Layers introduced at this step (revealed and kept visible thereafter). */
  layers: FlowLayer[]
}

export type FlowDiagramProps = {
  /** Absolute public path to the background SVG. */
  background: string
  /** Intrinsic background dimensions; drives the container aspect ratio. */
  width: number
  height: number
  steps: FlowStep[]
  /** Accessible name for the diagram, e.g. "Istio ingress flow". */
  label: string
}

/**
 * Splits a description into ordered blocks of prose and fenced code so each
 * can be rendered with the correct element. Static-safe: no markdown library.
 */
function parseBlocks(description: string): Array<
  { kind: 'code'; text: string } | { kind: 'prose'; text: string }
> {
  const blocks: Array<{ kind: 'code' | 'prose'; text: string }> = []
  const parts = description.split(/```[a-zA-Z]*\n?/)
  // Odd indices are inside fenced code (split on the fence delimiter).
  parts.forEach((part, i) => {
    const isCode = i % 2 === 1
    if (isCode) {
      const text = part.replace(/\n$/, '')
      if (text.trim()) blocks.push({ kind: 'code', text })
    } else {
      const text = part.trim()
      if (text) blocks.push({ kind: 'prose', text })
    }
  })
  return blocks
}

/**
 * Renders light inline markdown (**bold**, _em_, `code`) within a prose block,
 * preserving paragraph breaks. Kept intentionally small and static-safe.
 */
function InlineProse({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim())
  return (
    <>
      {paragraphs.map((para, pi) => (
        <p key={pi} className="mt-3 text-sm leading-6 text-fg/80 first:mt-0">
          {renderInline(para)}
        </p>
      ))}
    </>
  )
}

function renderInline(text: string) {
  // Tokenise on `code`, **bold**, _em_, *em* while preserving order. Bold
  // (**…**) is matched before single-* emphasis so it wins.
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g)
  return tokens.map((tok, i) => {
    if (/^`[^`]+`$/.test(tok)) {
      return (
        <code
          key={i}
          className="rounded bg-fg/10 px-1 py-0.5 font-mono text-[0.8em] text-blog"
        >
          {tok.slice(1, -1)}
        </code>
      )
    }
    if (/^\*\*[^*]+\*\*$/.test(tok)) {
      return (
        <strong key={i} className="font-semibold text-fg">
          {renderInline(tok.slice(2, -2))}
        </strong>
      )
    }
    if (/^\*[^*]+\*$/.test(tok)) {
      return <em key={i}>{renderInline(tok.slice(1, -1))}</em>
    }
    if (/^_[^_]+_$/.test(tok)) {
      return <em key={i}>{renderInline(tok.slice(1, -1))}</em>
    }
    return <span key={i}>{tok}</span>
  })
}

export function FlowDiagram({
  background,
  width,
  height,
  steps,
  label,
}: FlowDiagramProps) {
  const [current, setCurrent] = useState(0)
  const baseId = useId()
  const last = steps.length - 1

  // Layers visible at the current step: cumulative across steps 1..current.
  const visibleSrcs = new Set<string>()
  for (let i = 1; i <= current; i++) {
    for (const layer of steps[i]?.layers ?? []) visibleSrcs.add(layer.src)
  }

  // Flatten all layers so every overlay <img> is always present in the DOM
  // (visibility toggled by opacity) — required for static prerender + content
  // preservation. Later steps' layers stack above earlier ones.
  const allLayers: FlowLayer[] = steps.flatMap((s) => s.layers)

  return (
    <figure
      className="not-prose my-8 overflow-hidden rounded-lg border border-[var(--color-border)] bg-surface"
      aria-roledescription="interactive diagram"
      aria-label={label}
    >
      <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Diagram stage */}
        <div className="flex items-center justify-center border-b border-[var(--color-border)] p-5 md:border-b-0 md:border-r">
          <div
            className="relative w-full max-w-[360px] rounded-xl border border-black/10 bg-[var(--color-diagram-paper)]"
            style={{ aspectRatio: `${width} / ${height}` }}
          >
            <img
              src={background}
              alt={`${label} background`}
              className="absolute inset-0 h-full w-full"
              loading="lazy"
            />
            {allLayers.map((layer, i) => {
              const active = visibleSrcs.has(layer.src)
              return (
                <img
                  key={`${baseId}-layer-${i}`}
                  src={layer.src}
                  alt={layer.alt}
                  loading="lazy"
                  aria-hidden={!active}
                  className="absolute transition-opacity duration-500 ease-out motion-reduce:transition-none"
                  style={{
                    top: `${layer.top}%`,
                    left: '50%',
                    width: `${layer.width}%`,
                    transform: 'translateX(-50%)',
                    opacity: active ? 1 : 0,
                  }}
                />
              )
            })}
          </div>
        </div>

        {/* Message panel */}
        <div className="flex flex-col p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[0.7rem] uppercase tracking-wider text-muted">
              Step {current + 1} / {steps.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
                aria-label="Previous step"
                className="rounded border border-[var(--color-border)] px-2.5 py-1 font-mono text-xs text-fg/80 transition-colors hover:border-blog hover:text-blog disabled:cursor-not-allowed disabled:opacity-30"
              >
                &larr; Prev
              </button>
              <button
                type="button"
                onClick={() => setCurrent((c) => Math.min(last, c + 1))}
                disabled={current === last}
                aria-label="Next step"
                className="rounded border border-[var(--color-border)] px-2.5 py-1 font-mono text-xs text-fg/80 transition-colors hover:border-blog hover:text-blog disabled:cursor-not-allowed disabled:opacity-30"
              >
                Next &rarr;
              </button>
            </div>
          </div>

          {/* Step indicator dots */}
          <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label={`${label} steps`}>
            {steps.map((s, i) => (
              <button
                key={`${baseId}-dot-${i}`}
                type="button"
                role="tab"
                aria-selected={i === current}
                aria-label={`Step ${i + 1}: ${s.header}`}
                onClick={() => setCurrent(i)}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  i === current ? 'bg-blog' : i < current ? 'bg-blog/40' : 'bg-fg/15'
                }`}
              />
            ))}
          </div>

          {/* Every step's panel is rendered into the DOM (content preserved /
              static-prerendered); inactive ones are hidden via CSS. */}
          <div className="mt-4 min-h-0 flex-1">
            {steps.map((s, si) => {
              const stepBlocks = parseBlocks(s.description)
              return (
                <div key={`${baseId}-panel-${si}`} hidden={si !== current}>
                  <h4 className="font-mono text-lg font-semibold text-fg">{s.header}</h4>
                  <div className="mt-2">
                    {stepBlocks.map((block, i) =>
                      block.kind === 'code' ? (
                        <pre
                          key={i}
                          className="mt-3 overflow-x-auto rounded-md border border-[var(--color-border)] bg-surface-2 p-3 font-mono text-[0.78rem] leading-5 text-fg first:mt-0"
                        >
                          <code>{block.text}</code>
                        </pre>
                      ) : (
                        <InlineProse key={i} text={block.text} />
                      ),
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </figure>
  )
}
