'use client'

/**
 * ComputeGraph — "backprop is just the chain rule" for the backprop post.
 *
 * The classic toy graph  e = (a + b) * (b + 1):
 *   c = a + b      d = b + 1      e = c * d
 *
 * Two modes, one slider pair:
 *   • forward  — values flow UP: pick a, b and watch c, d, e fill in.
 *   • backward — gradients flow DOWN. Each edge is labelled with its local
 *                derivative (∂c/∂a = 1, ∂e/∂c = d, …) and each node with
 *                ∂e/∂node. The chain rule is just multiply-along-an-edge,
 *                add-where-paths-meet.
 *
 * The teaching beat: b feeds BOTH c and d, so two gradient paths reach it and
 * its gradient is their SUM — ∂e/∂b = d + c. Backward mode highlights those two
 * paths in accent + secondary colour and spells out the addition.
 *
 * Real arithmetic, deterministic — the numbers ARE a genuine forward+backward
 * pass. Static render + CSS transitions, no rAF.
 */

import { useMemo, useState } from 'react'

type Mode = 'forward' | 'backward'

const fmt = (n: number): string => {
  const r = Math.round(n * 100) / 100
  return Object.is(r, -0) ? '0' : String(r)
}

// node geometry in viewBox space — inputs bottom, ops middle, output top
const NODE: Record<string, { x: number; y: number; r: number }> = {
  a: { x: 110, y: 318, r: 26 },
  b: { x: 300, y: 318, r: 26 },
  c: { x: 150, y: 188, r: 28 },
  d: { x: 360, y: 188, r: 28 },
  e: { x: 255, y: 58, r: 30 },
}

// directed edges (from → to) with the local derivative ∂to/∂from as a function
// of the current values. value() is shown only in backward mode.
type EdgeKey = 'a-c' | 'b-c' | 'b-d' | 'c-e' | 'd-e'

export function ComputeGraph() {
  const [mode, setMode] = useState<Mode>('forward')
  const [a, setA] = useState(1)
  const [b, setB] = useState(2)

  const v = useMemo(() => {
    const c = a + b
    const d = b + 1
    const e = c * d
    // reverse-mode gradients
    const ge = 1
    const gc = d // ∂e/∂c
    const gd = c // ∂e/∂d
    const ga = gc * 1 // ∂e/∂a = (∂e/∂c)(∂c/∂a)
    const gb = gc * 1 + gd * 1 // ∂e/∂b = (∂e/∂c)(∂c/∂b) + (∂e/∂d)(∂d/∂b) = d + c
    return { c, d, e, ge, gc, gd, ga, gb }
  }, [a, b])

  // local derivative label for each edge (∂to/∂from)
  const localDeriv: Record<EdgeKey, string> = {
    'a-c': '1',
    'b-c': '1',
    'b-d': '1',
    'c-e': fmt(v.d), // ∂e/∂c = d
    'd-e': fmt(v.c), // ∂e/∂d = c
  }

  const accent = 'var(--color-blog)'
  const accent2 = '#d98b5f'
  const backward = mode === 'backward'

  // the two paths from b to e — highlight in backward mode
  const pathThroughC = new Set<EdgeKey>(['b-c', 'c-e'])
  const pathThroughD = new Set<EdgeKey>(['b-d', 'd-e'])

  const edgeColour = (k: EdgeKey): string => {
    if (!backward) return 'color-mix(in srgb, var(--color-border) 85%, transparent)'
    if (pathThroughC.has(k)) return accent
    if (pathThroughD.has(k)) return accent2
    return 'color-mix(in srgb, var(--color-border) 85%, transparent)'
  }

  // node value / gradient text
  const nodeMain: Record<string, string> = {
    a: backward ? fmt(v.ga) : fmt(a),
    b: backward ? fmt(v.gb) : fmt(b),
    c: backward ? fmt(v.gc) : fmt(v.c),
    d: backward ? fmt(v.gd) : fmt(v.d),
    e: backward ? fmt(v.ge) : fmt(v.e),
  }
  const nodeLabel: Record<string, string> = {
    a: 'a',
    b: 'b',
    c: 'c = a+b',
    d: 'd = b+1',
    e: 'e = c·d',
  }

  // an edge: line from one node's rim to the other's, arrowed in flow direction
  const Edge = ({ from, to, k }: { from: string; to: string; k: EdgeKey }) => {
    const A = NODE[from]
    const B = NODE[to]
    // forward arrows point up (from → to); backward arrows point down (to → from)
    const head = backward ? A : B
    const tail = backward ? B : A
    const ang = Math.atan2(head.y - tail.y, head.x - tail.x)
    const sx = tail.x + Math.cos(ang) * tail.r
    const sy = tail.y + Math.sin(ang) * tail.r
    const ex = head.x - Math.cos(ang) * (head.r + 4)
    const ey = head.y - Math.sin(ang) * (head.r + 4)
    const colour = edgeColour(k)
    const lit = backward && (pathThroughC.has(k) || pathThroughD.has(k))
    // midpoint for the local-derivative label, nudged perpendicular to the edge
    const mx = (A.x + B.x) / 2
    const my = (A.y + B.y) / 2
    const nx = Math.sin(ang) * 16
    const ny = -Math.cos(ang) * 16
    const markerId = backward
      ? lit
        ? pathThroughC.has(k)
          ? 'cg-arrow-acc'
          : 'cg-arrow-acc2'
        : 'cg-arrow-back'
      : 'cg-arrow-fwd'
    return (
      <g>
        <line
          x1={sx}
          y1={sy}
          x2={ex}
          y2={ey}
          stroke={colour}
          strokeWidth={lit ? 2.4 : 1.4}
          markerEnd={`url(#${markerId})`}
          style={{ transition: 'stroke 220ms ease, stroke-width 220ms ease' }}
        />
        {backward && (
          <text
            x={mx + nx}
            y={my + ny}
            textAnchor="middle"
            className="font-mono"
            style={{
              fontSize: 10,
              fill: lit ? colour : 'var(--color-muted)',
              fontWeight: lit ? 700 : 500,
            }}
          >
            ×{localDeriv[k]}
          </text>
        )}
      </g>
    )
  }

  const Node = ({ id }: { id: string }) => {
    const n = NODE[id]
    const isInput = id === 'a' || id === 'b'
    const isOutput = id === 'e'
    // highlight b in backward mode (the fan-in node), and the output
    const highlight = backward && (id === 'b' || isOutput)
    const stroke = highlight ? accent : 'color-mix(in srgb, var(--color-border) 90%, transparent)'
    const fill = highlight
      ? 'color-mix(in srgb, var(--color-blog) 14%, transparent)'
      : isInput
        ? 'color-mix(in srgb, #d98b5f 12%, transparent)'
        : 'var(--color-surface-2, rgba(127,127,127,0.06))'
    return (
      <g style={{ transition: 'opacity 200ms ease' }}>
        <circle
          cx={n.x}
          cy={n.y}
          r={n.r}
          fill={fill}
          stroke={stroke}
          strokeWidth={highlight ? 2 : 1.3}
          style={{ transition: 'fill 220ms ease, stroke 220ms ease' }}
        />
        {/* node name / expression above the bubble */}
        <text
          x={n.x}
          y={n.y - n.r - 7}
          textAnchor="middle"
          className="font-mono"
          style={{ fontSize: 10, fill: 'var(--color-muted)' }}
        >
          {nodeLabel[id]}
        </text>
        {/* the live number */}
        <text
          x={n.x}
          y={n.y + 1}
          textAnchor="middle"
          className="font-mono"
          style={{
            fontSize: 15,
            fontWeight: 700,
            fill: highlight ? accent : 'var(--color-fg)',
          }}
        >
          {nodeMain[id]}
        </text>
        {/* gradient/value caption under the number */}
        <text
          x={n.x}
          y={n.y + 15}
          textAnchor="middle"
          className="font-mono"
          style={{ fontSize: 7.5, fill: 'var(--color-muted)' }}
        >
          {backward ? '∂e/∂' + id : 'value'}
        </text>
      </g>
    )
  }

  return (
    <figure className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          computation graph
        </span>
        <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-surface p-0.5">
          {(['forward', 'backward'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`rounded-md px-2.5 py-1 font-mono text-[0.68rem] uppercase tracking-wider transition-colors ${
                mode === m
                  ? 'bg-blog/15 text-blog ring-1 ring-blog/40'
                  : 'text-muted hover:text-fg'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="px-2 py-4 sm:px-4">
        <svg
          viewBox="0 0 480 380"
          className="block h-auto w-full"
          style={{ maxWidth: 560, margin: '0 auto' }}
          role="img"
          aria-label="The computation graph for e = (a + b) * (b + 1): inputs a and b at the bottom feed c = a + b and d = b + 1, which multiply into e at the top. In backward mode each edge shows its local derivative and each node its gradient of e, with b's two paths highlighted to show its gradient is the sum."
        >
          {/* edges first so nodes sit on top */}
          <Edge from="a" to="c" k="a-c" />
          <Edge from="b" to="c" k="b-c" />
          <Edge from="b" to="d" k="b-d" />
          <Edge from="c" to="e" k="c-e" />
          <Edge from="d" to="e" k="d-e" />

          {/* nodes */}
          {(['a', 'b', 'c', 'd', 'e'] as const).map((id) => (
            <Node key={id} id={id} />
          ))}

          {/* flow-direction legend, top-left */}
          <text
            x={18}
            y={26}
            className="font-mono"
            style={{ fontSize: 9.5, fill: backward ? accent : 'var(--color-muted)', fontWeight: 600 }}
          >
            {backward ? '↓ gradients flow back' : '↑ values flow forward'}
          </text>

          {/* the SUM annotation — only in backward mode, near b */}
          {backward && (
            <g>
              <text
                x={300}
                y={368}
                textAnchor="middle"
                className="font-mono"
                style={{ fontSize: 10.5, fill: 'var(--color-fg)', fontWeight: 700 }}
              >
                <tspan style={{ fill: 'var(--color-fg)' }}>∂e/∂b = </tspan>
                <tspan style={{ fill: accent }}>{fmt(v.gc)}</tspan>
                <tspan style={{ fill: 'var(--color-muted)' }}> + </tspan>
                <tspan style={{ fill: accent2 }}>{fmt(v.gd)}</tspan>
                <tspan style={{ fill: 'var(--color-fg)' }}> = {fmt(v.gb)}</tspan>
              </text>
              <text
                x={300}
                y={356}
                textAnchor="middle"
                className="font-mono"
                style={{ fontSize: 8, fill: 'var(--color-muted)' }}
              >
                two paths meet → add
              </text>
            </g>
          )}

          <defs>
            <marker id="cg-arrow-fwd" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="color-mix(in srgb, var(--color-border) 85%, transparent)" />
            </marker>
            <marker id="cg-arrow-back" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="color-mix(in srgb, var(--color-border) 85%, transparent)" />
            </marker>
            <marker id="cg-arrow-acc" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill={accent} />
            </marker>
            <marker id="cg-arrow-acc2" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill={accent2} />
            </marker>
          </defs>
        </svg>
      </div>

      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
          <div className="flex flex-1 items-center gap-4">
            <label htmlFor="cg-a" className="font-mono text-[0.7rem] uppercase tracking-wider text-muted">
              a
            </label>
            <input
              id="cg-a"
              type="range"
              min={-3}
              max={3}
              step={0.5}
              value={a}
              onChange={(e) => setA(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-blog)]"
            />
            <span className="w-10 text-right font-mono text-[0.78rem] tabular-nums text-fg">{fmt(a)}</span>
          </div>
          <div className="flex flex-1 items-center gap-4">
            <label htmlFor="cg-b" className="font-mono text-[0.7rem] uppercase tracking-wider text-muted">
              b
            </label>
            <input
              id="cg-b"
              type="range"
              min={-3}
              max={3}
              step={0.5}
              value={b}
              onChange={(e) => setB(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-blog)]"
            />
            <span className="w-10 text-right font-mono text-[0.78rem] tabular-nums text-fg">{fmt(b)}</span>
          </div>
        </div>
        <p className="mt-2 font-mono text-[0.66rem] leading-snug text-muted">
          {backward ? (
            <>
              Backprop walks the graph in reverse. Each node already knows{' '}
              <span className="text-blog">∂e/∂itself</span>; to push it back one step you multiply by
              the edge&rsquo;s local derivative — that&rsquo;s the chain rule, one edge at a time. The
              point: <span className="text-blog">b</span> feeds <span className="text-blog">both</span>{' '}
              c and d, so two gradient paths reach it and you <span className="text-blog">add</span> them
              — ∂e/∂b = d + c. No fancy machinery, just multiply along edges and sum where they meet.
            </>
          ) : (
            <>
              Forward pass: pick <span className="text-blog">a</span> and <span className="text-blog">b</span>,
              then each node computes its value from the ones below it — c = a + b, d = b + 1, e = c · d.
              Flip to <span className="text-blog">backward</span> to see how gradients of e with respect to
              every input fall out of the same graph.
            </>
          )}
        </p>
      </div>
    </figure>
  )
}
