'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ArchSpec } from '@/lib/neural-graph/archs'
import type { Layer, Node, NodeRole } from '@/lib/neural-graph/types'
import { colourFor, nodeStyleFor, roleDescription, roleLabel } from '@/lib/neural-graph/visuals'

/**
 * Tiny SVG swatch that mirrors the colour/shape/fill/arc encoding
 * used in the post's main colour-legend block, but for ONE role.
 * Rendered inside the per-figure inline legend below the toolbar.
 */
export function SwatchSVG({ role, size = 14 }: { role: NodeRole; size?: number }) {
  const colour = colourFor(role)
  const style = nodeStyleFor(role)
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.35
  const stroke = colour
  const isHollow = style.fill === 'hollow'
  const fill = isHollow ? 'var(--color-surface, #0f0f0f)' : colour
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      {style.shape === 'circle' && (
        <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={isHollow ? 1.2 : 0.4} />
      )}
      {style.shape === 'square' && (
        <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={fill} stroke={stroke} strokeWidth={isHollow ? 1.2 : 0.4} />
      )}
      {style.shape === 'triangle' && (
        <polygon
          points={`${cx},${cy - r} ${cx + r},${cy + r} ${cx - r},${cy + r}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={isHollow ? 1.2 : 0.4}
        />
      )}
      {style.selfLoop && (
        <path
          d={`M ${cx - r * 0.5} ${cy - r * 0.9} A ${r * 0.7} ${r * 0.7} 0 0 1 ${cx + r * 0.5} ${cy - r * 0.9}`}
          fill="none"
          stroke={stroke}
          strokeWidth={1}
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

/**
 * Floating, styled tooltip that pops up when the user hovers a node
 * (in the graph) or a value in the activations panel. Renders into
 * a portal at the document body so it escapes any `overflow: hidden`
 * ancestors and any stacking-context quirks.
 *
 * The tooltip is element-anchored (not cursor-following): when the
 * user hovers a node, the tooltip appears above that node, centered
 * horizontally. It flips below the node if it would overflow the top
 * of the viewport. There's a small caret pointing at the node.
 *
 * Renders nothing if there's no hovered node, or if we're on the
 * server (no document.body to portal into).
 */
const TOOLTIP_WIDTH = 280
const TOOLTIP_GAP = 10

export function NodeTooltip({
  data,
}: {
  data: {
    node: Node
    layer: Layer
    activation: number
    anchor: { left: number; top: number; width: number; height: number }
  } | null
}) {
  const [pos, setPos] = useState<{
    left: number
    top: number
    placement: 'above' | 'below'
  } | null>(null)

  useEffect(() => {
    if (!data) {
      setPos(null)
      return
    }
    const { anchor } = data
    // Center horizontally on the anchor. Clamp to viewport.
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight
    let left = anchor.left + anchor.width / 2 - TOOLTIP_WIDTH / 2
    left = Math.max(8, Math.min(viewportW - TOOLTIP_WIDTH - 8, left))
    // Default: above the anchor. Flip below if there isn't enough
    // room. We don't know the tooltip's exact rendered height, so
    // we estimate it (~150px for the 5-row layout) and adjust on
    // a second pass if needed via state.
    let top = anchor.top - 150 - TOOLTIP_GAP
    let placement: 'above' | 'below' = 'above'
    if (top < 8) {
      top = anchor.top + anchor.height + TOOLTIP_GAP
      placement = 'below'
    }
    // Clamp vertically to viewport.
    top = Math.max(8, Math.min(viewportH - 160, top))
    setPos({ left, top, placement })
    // `data` is excluded intentionally: it is a newly-allocated object every render
    // (computed inline in the parent JSX), so adding it would re-run the effect on
    // every render. The individual properties we actually read are in the deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.node.id, data?.anchor.left, data?.anchor.top])

  if (typeof document === 'undefined') return null
  if (!data || !pos) return null
  const { node, layer, activation } = data
  const role: NodeRole = node.role ?? 'hidden'
  const colour = colourFor(role)
  const style = nodeStyleFor(role)
  // Caret x: relative to the tooltip, how far from its left edge is
  // the anchor's centre? The tooltip was placed so that
  // (left + TOOLTIP_WIDTH/2) ≈ (anchor.left + anchor.width/2), so
  // the caret should be at TOOLTIP_WIDTH/2. But if the tooltip was
  // clamped, this shifts. Recompute from the actual positions.
  const anchorCenterX = data.anchor.left + data.anchor.width / 2
  const caretX = Math.max(12, Math.min(TOOLTIP_WIDTH - 12, anchorCenterX - pos.left))

  return createPortal(
    <div
      role="tooltip"
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        width: TOOLTIP_WIDTH,
        zIndex: 100,
        pointerEvents: 'none',
      }}
      className="rounded-md border border-[var(--color-border)] bg-surface text-fg shadow-2xl"
    >
      {/* Caret pointing at the node */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: caretX - 6,
          width: 0,
          height: 0,
          ...(pos.placement === 'above'
            ? {
                bottom: -6,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '6px solid var(--color-border)',
              }
            : {
                top: -6,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderBottom: '6px solid var(--color-border)',
              }),
        }}
      />
      <div className="px-3.5 py-2.5">
        {/* Header: swatch + role label */}
        <div className="flex items-center gap-2">
          <SwatchSVG role={role} size={18} />
          <div className="font-mono text-[0.78rem] font-semibold uppercase tracking-wider text-fg">
            {roleLabel(role)}
          </div>
        </div>
        {/* Description */}
        <p className="mt-1.5 text-[0.78rem] leading-snug text-fg/70">
          {roleDescription(role)}
        </p>
        {/* Divider */}
        <div className="my-2 h-px bg-[var(--color-border)]" />
        {/* Data rows */}
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[0.72rem]">
          <span className="text-muted">Layer</span>
          <span className="text-fg/85">{layer.title}</span>
          <span className="text-muted">Row</span>
          <span className="text-fg/85">{node.row + 1}</span>
          <span className="text-muted">Role colour</span>
          <span className="flex items-center gap-1.5 text-fg/85">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: colour, border: `1px solid ${colour}55` }}
            />
            {colour}
          </span>
          <span className="text-muted">Activation</span>
          <span
            className="font-semibold"
            style={{ color: activation >= 0 ? '#7ed4a3' : '#ff8a8a' }}
          >
            {activation >= 0 ? '+' : ''}
            {activation.toFixed(3)}
          </span>
          {node.tag && (
            <>
              <span className="text-muted">Tag</span>
              <span className="text-fg/85">{node.tag}</span>
            </>
          )}
          {style.selfLoop && (
            <>
              <span className="text-muted">Recurrent</span>
              <span className="text-fg/85">yes</span>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

/**
 * Inline legend strip for one figure. Lists the unique NodeRole
 * values used in this figure's spec, in the order they first appear
 * (input → output direction). Each entry is a clickable button —
 * clicking it toggles a "highlight" mode where only nodes of that
 * role stay at full opacity, and other roles are dimmed. Clicking
 * the same swatch again (or the "All" button) clears the highlight.
 *
 * Deduplicates roles that appear in multiple layers (e.g. multiple
 * hidden layers all share the "hidden" role).
 */
export function FigureLegend({
  spec,
  highlightRole,
  onToggle,
}: {
  spec: ArchSpec
  highlightRole: NodeRole | null
  onToggle: (r: NodeRole | null) => void
}) {
  const seen = new Set<NodeRole>()
  const roles: NodeRole[] = []
  for (const l of spec.layers) {
    for (const n of l.nodes) {
      const r = n.role ?? 'hidden'
      if (!seen.has(r)) {
        seen.add(r)
        roles.push(r)
      }
    }
  }
  if (roles.length === 0) return null
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-1.5 text-[0.7rem]"
      aria-label="Cell types in this diagram"
    >
      <span className="font-mono uppercase tracking-wider text-muted">Legend</span>
      {roles.map((r) => {
        const active = highlightRole === r
        return (
          <button
            key={r}
            type="button"
            onClick={() => onToggle(active ? null : r)}
            aria-pressed={active}
            title={
              active
                ? `Click to clear highlight on ${roleLabel(r)}`
                : `Click to highlight all ${roleLabel(r)} nodes`
            }
            className={`flex items-center gap-1.5 rounded font-mono text-fg/75 transition-colors px-1.5 py-0.5 ${
              active
                ? 'bg-blog/15 text-blog ring-1 ring-blog/40'
                : 'hover:bg-surface-2'
            }`}
          >
            <SwatchSVG role={r} size={14} />
            <span className="text-[0.7rem]">{roleLabel(r)}</span>
          </button>
        )
      })}
      {highlightRole !== null && (
        <button
          type="button"
          onClick={() => onToggle(null)}
          className="ml-1 rounded border border-[var(--color-border)] px-1.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-muted transition-colors hover:border-blog hover:text-blog"
        >
          Show all
        </button>
      )}
    </div>
  )
}
