'use client'

/**
 * FfnStep — the feed-forward sublayer, where most of a model's knowledge lives.
 *
 * After attention has gathered context, each token is processed alone by a tiny
 * 2-layer network: project UP to a wider hidden space (here 4×), apply a nonlinearity
 * that decides which features fire, then project back DOWN. Slide the input and watch
 * which hidden units switch on; flip ReLU↔GELU to see the gate soften.
 *
 * Real numbers, fixed deterministic weights — the bars are a genuine forward pass of a
 * 4→16→4 MLP. Static render + CSS transitions, no rAF.
 */

import { useMemo, useState } from 'react'

const D_IN = 4
const D_HID = 16
const D_OUT = 4

const w1 = (h: number, i: number) => 0.9 * Math.sin(1.7 * h + 2.3 * i + 0.5)
const w2 = (o: number, h: number) => 0.5 * Math.cos(1.1 * h + 1.9 * o)
const gelu = (p: number) => 0.5 * p * (1 + Math.tanh(0.79788456 * (p + 0.044715 * p * p * p)))
const relu = (p: number) => Math.max(0, p)

const barFill = (v: number, dim = false) => {
  const m = Math.round(Math.min(1, Math.abs(v)) * 100)
  const base = v >= 0 ? 'var(--color-blog)' : '#d98b5f'
  return `color-mix(in srgb, ${base} ${dim ? Math.round(m * 0.3) : m}%, transparent)`
}

export function FfnStep() {
  const [phase, setPhase] = useState(1.2)
  const [act, setAct] = useState<'gelu' | 'relu'>('gelu')

  const { x, hid, out, firedCount } = useMemo(() => {
    const x = Array.from({ length: D_IN }, (_, i) => Math.sin(phase + i * 0.9))
    const fn = act === 'gelu' ? gelu : relu
    const pre = Array.from({ length: D_HID }, (_, h) => x.reduce((s, xi, i) => s + w1(h, i) * xi, 0))
    const hid = pre.map(fn)
    const out = Array.from({ length: D_OUT }, (_, o) => hid.reduce((s, hv, h) => s + w2(o, h) * hv, 0))
    const firedCount = pre.filter((p) => p > 0).length
    return { x, hid, out, firedCount }
  }, [phase, act])

  const accent = 'var(--color-blog)'

  // geometry
  const IN_X = 80
  const HID_X = 270
  const OUT_X = 452
  const inRowH = 30
  const hidRowH = 16
  const outRowH = 30
  const inY = (i: number) => 70 + i * inRowH
  const hidY = (h: number) => 56 + h * hidRowH
  const outY = (o: number) => 70 + o * outRowH
  const SCALE_IN = 32
  const SCALE_HID = 42
  const SCALE_OUT = 26

  const Bar = ({ cx, cy, v, scale, dim }: { cx: number; cy: number; v: number; scale: number; dim?: boolean }) => (
    <rect
      x={v >= 0 ? cx : cx + v * scale}
      y={cy - 5}
      width={Math.max(1, Math.abs(v) * scale)}
      height={10}
      rx={2}
      fill={barFill(v, dim)}
      style={{ transition: 'width 120ms ease, x 120ms ease, fill 160ms ease' }}
    />
  )

  return (
    <figure className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          feed-forward · expand → gate → contract
        </span>
        <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-surface p-0.5">
          {(['gelu', 'relu'] as const).map((a) => (
            <button key={a} type="button" onClick={() => setAct(a)} aria-pressed={act === a} className={`rounded-md px-2.5 py-1 font-mono text-[0.68rem] uppercase tracking-wider transition-colors ${act === a ? 'bg-blog/15 text-blog ring-1 ring-blog/40' : 'text-muted hover:text-fg'}`}>
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="px-2 py-4 sm:px-4">
        <svg viewBox="0 0 520 330" className="block h-auto w-full" style={{ maxWidth: 580, margin: '0 auto' }} role="img" aria-label="A feed-forward sublayer: a 4-dim input projected up to 16 hidden units, gated by an activation, projected back to 4 dims.">
          {/* column headers */}
          <text x={IN_X} y={36} textAnchor="middle" className="font-mono" style={{ fontSize: 10.5, fill: 'var(--color-fg)', fontWeight: 600 }}>in · d=4</text>
          <text x={HID_X} y={36} textAnchor="middle" className="font-mono" style={{ fontSize: 10.5, fill: accent, fontWeight: 600 }}>hidden · 4× wider</text>
          <text x={OUT_X} y={36} textAnchor="middle" className="font-mono" style={{ fontSize: 10.5, fill: 'var(--color-fg)', fontWeight: 600 }}>out · d=4</text>

          {/* connections — only through units that FIRE, so signal flow tracks
              the activation story and the bars stay legible */}
          <g stroke="color-mix(in srgb, var(--color-blog) 16%, transparent)" strokeWidth={0.5}>
            {hid.map((hv, h) =>
              hv > 0.001 ? (
                <g key={`cf-${h}`}>
                  {x.map((_, i) => (
                    <line key={`c1-${i}-${h}`} x1={IN_X + 2} y1={inY(i)} x2={HID_X - 3} y2={hidY(h)} />
                  ))}
                  {out.map((_, o) => (
                    <line key={`c2-${h}-${o}`} x1={HID_X + 3} y1={hidY(h)} x2={OUT_X - 2} y2={outY(o)} />
                  ))}
                </g>
              ) : null,
            )}
          </g>

          {/* input bars */}
          {x.map((v, i) => (
            <g key={`in-${i}`}>
              <line x1={IN_X} y1={inY(i) - 7} x2={IN_X} y2={inY(i) + 7} stroke="var(--color-border)" strokeWidth={1} />
              <Bar cx={IN_X} cy={inY(i)} v={v} scale={SCALE_IN} />
            </g>
          ))}

          {/* hidden column baseline + bars — fired full, gated-off faint */}
          <line x1={HID_X} y1={hidY(0) - 8} x2={HID_X} y2={hidY(D_HID - 1) + 8} stroke="color-mix(in srgb, var(--color-border) 80%, transparent)" strokeWidth={1} />
          {hid.map((v, h) => {
            const fired = v > 0.001
            return (
              <g key={`hid-${h}`}>
                <Bar cx={HID_X} cy={hidY(h)} v={v} scale={SCALE_HID} dim={!fired} />
                {fired && (
                  <circle cx={HID_X + Math.max(3, v * SCALE_HID)} cy={hidY(h)} r={2} fill="var(--color-blog)" />
                )}
              </g>
            )
          })}

          {/* output bars */}
          {out.map((v, o) => (
            <g key={`out-${o}`}>
              <line x1={OUT_X} y1={outY(o) - 7} x2={OUT_X} y2={outY(o) + 7} stroke="var(--color-border)" strokeWidth={1} />
              <Bar cx={OUT_X} cy={outY(o)} v={v} scale={SCALE_OUT} />
            </g>
          ))}

          <text x={HID_X} y={312} textAnchor="middle" className="font-mono" style={{ fontSize: 9.5, fill: 'var(--color-muted)' }}>
            {firedCount} / {D_HID} units firing
          </text>
        </svg>
      </div>

      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <div className="flex items-center gap-4">
          <label htmlFor="ffn-in" className="font-mono text-[0.7rem] uppercase tracking-wider text-muted whitespace-nowrap">input</label>
          <input id="ffn-in" type="range" min={0} max={628} step={1} value={Math.round(phase * 100)} onChange={(e) => setPhase(Number(e.target.value) / 100)} className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-blog)]" />
        </div>
        <p className="mt-2 font-mono text-[0.66rem] leading-snug text-muted">
          The up-projection blows the token into a wider space; the activation decides which of those
          units fire (ReLU snaps the negatives to zero, GELU eases them); the down-projection folds it
          back. Most of a transformer&rsquo;s parameters live in these two matrices — this is where the
          model keeps what it knows.
        </p>
      </div>
    </figure>
  )
}
