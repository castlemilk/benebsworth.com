'use client'

/**
 * DctBlock — "What JPEG throws away".
 *
 * JPEG never stores pixels directly. It chops the image into 8×8 blocks and runs a
 * 2-D Discrete Cosine Transform on each one, re-sorting the 64 values by spatial
 * frequency: the DC term (block average) lands top-left, and detail ramps up toward
 * the bottom-right. Quantisation then divides each coefficient by a table that is
 * gentle on low frequencies and brutal on high ones, rounding most of the fine detail
 * to zero — the part of the signal the eye barely registers. Inverse-DCT the survivors
 * and you get a block that looks almost the same with a fraction of the numbers.
 *
 * Three 8×8 panels: the original block, the DCT coefficient magnitudes (log heatmap,
 * DC at top-left), and the reconstruction after quantise → de-quantise → inverse-DCT.
 * Drag quality down and watch the kept-coefficient count collapse, the reconstruction
 * go blocky, and RMSE climb. Real maths — every panel is a genuine forward/inverse
 * DCT of a procedurally-defined sample block. Static render + useMemo, no rAF.
 */

import { useMemo, useState } from 'react'

const N = 8

// ── Standard JPEG luminance quantisation table (Q50) ──────────────────────────
const Q50: readonly number[] = [
  16, 11, 10, 16, 24, 40, 51, 61,
  12, 12, 14, 19, 26, 58, 60, 55,
  14, 13, 16, 24, 40, 57, 69, 56,
  14, 17, 22, 29, 51, 87, 80, 62,
  18, 22, 37, 56, 68, 109, 103, 77,
  24, 35, 55, 64, 81, 104, 113, 92,
  49, 64, 78, 87, 103, 121, 120, 101,
  72, 92, 95, 98, 112, 100, 103, 99,
]

// ── DCT cosine basis, precomputed once: cosT[k][x] = cos[(2x+1)kπ/16] ──────────
const cosT: number[][] = Array.from({ length: N }, (_, k) =>
  Array.from({ length: N }, (_, x) => Math.cos(((2 * x + 1) * k * Math.PI) / (2 * N))),
)
const C = (k: number): number => (k === 0 ? 1 / Math.SQRT2 : 1)

type Block = number[][] // [row=y][col=x], values 0..255

// ── Sample blocks (procedural, no external images) ────────────────────────────
type SampleKey = 'gradient' | 'edge' | 'texture'

function makeSample(key: SampleKey): Block {
  const b: Block = Array.from({ length: N }, () => new Array<number>(N).fill(0))
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let v: number
      if (key === 'gradient') {
        // smooth diagonal ramp — mostly low frequency
        v = ((x + y) / (2 * (N - 1))) * 255
      } else if (key === 'edge') {
        // a hard diagonal edge — concentrated mid/high frequency along one axis
        v = x + y < N - 1 ? 40 : 215
      } else {
        // a little checker-ish texture — energy spread into the high frequencies
        v =
          128 +
          70 * Math.sin((x * Math.PI) / 2) * Math.cos((y * Math.PI) / 2) +
          35 * Math.sin((x + y) * 1.1)
      }
      b[y][x] = Math.max(0, Math.min(255, Math.round(v)))
    }
  }
  return b
}

// ── Forward 2-D DCT-II ────────────────────────────────────────────────────────
// F(u,v) = (1/4)·C(u)·C(v)·Σx Σy f(x,y)·cos[(2x+1)uπ/16]·cos[(2y+1)vπ/16]
// Indexing here: f[y][x], F[v][u] — so u indexes columns (x), v indexes rows (y),
// matching the on-screen layout (DC top-left, u → right, v → down).
function forwardDct(f: Block): number[][] {
  const F: number[][] = Array.from({ length: N }, () => new Array<number>(N).fill(0))
  for (let v = 0; v < N; v++) {
    for (let u = 0; u < N; u++) {
      let sum = 0
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          sum += f[y][x] * cosT[u][x] * cosT[v][y]
        }
      }
      F[v][u] = 0.25 * C(u) * C(v) * sum
    }
  }
  return F
}

// ── Inverse 2-D DCT ───────────────────────────────────────────────────────────
// f(x,y) = (1/4)·Σu Σv C(u)·C(v)·F(u,v)·cos[(2x+1)uπ/16]·cos[(2y+1)vπ/16]
function inverseDct(F: number[][]): number[][] {
  const f: Block = Array.from({ length: N }, () => new Array<number>(N).fill(0))
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let sum = 0
      for (let v = 0; v < N; v++) {
        for (let u = 0; u < N; u++) {
          sum += C(u) * C(v) * F[v][u] * cosT[u][x] * cosT[v][y]
        }
      }
      f[y][x] = 0.25 * sum
    }
  }
  return f
}

// ── Quality → scaled quantisation table (canonical JPEG scaling) ──────────────
function scaledTable(quality: number): number[] {
  const q = Math.max(1, Math.min(100, quality))
  const S = q < 50 ? Math.floor(5000 / q) : 200 - 2 * q
  return Q50.map((t) => {
    const scaled = Math.floor((t * S + 50) / 100)
    return Math.max(1, scaled)
  })
}

// ── Theme-token cell fills ────────────────────────────────────────────────────
// Grayscale pixel cell: literal rgb(v,v,v) for true content; themed border around it.
function grayFill(v: number): string {
  const c = Math.max(0, Math.min(255, Math.round(v)))
  return `rgb(${c}, ${c}, ${c})`
}
// DCT heatmap: accent intensity by normalised log-magnitude (DC dominates → clamp).
function coeffFill(norm: number): string {
  const pct = Math.round(Math.max(0, Math.min(1, norm)) * 100)
  return `color-mix(in srgb, var(--color-blog) ${pct}%, transparent)`
}

export function DctBlock() {
  const [sample, setSample] = useState<SampleKey>('gradient')
  const [quality, setQuality] = useState(50)
  const accent = 'var(--color-blog)'

  const { block, recon, logNorm, kept, rmse } = useMemo(() => {
    const block = makeSample(sample)
    const F = forwardDct(block)
    const qtab = scaledTable(quality)

    // quantise → dequantise
    const deq: number[][] = Array.from({ length: N }, () => new Array<number>(N).fill(0))
    let kept = 0
    for (let v = 0; v < N; v++) {
      for (let u = 0; u < N; u++) {
        const step = qtab[v * N + u]
        const q = Math.round(F[v][u] / step)
        if (q !== 0) kept++
        deq[v][u] = q * step
      }
    }

    // reconstruction (clamped 0..255 for display)
    const reconRaw = inverseDct(deq)
    const recon: Block = reconRaw.map((row) => row.map((p) => Math.max(0, Math.min(255, p))))

    // log-magnitude heatmap of the ORIGINAL coefficients, normalised to peak
    const logMag: number[][] = F.map((row) => row.map((c) => Math.log(1 + Math.abs(c))))
    let peak = 0
    for (let v = 0; v < N; v++) for (let u = 0; u < N; u++) peak = Math.max(peak, logMag[v][u])
    const logNorm: number[][] = logMag.map((row) => row.map((m) => (peak > 0 ? m / peak : 0)))

    // RMSE between original and reconstruction
    let sq = 0
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const d = block[y][x] - recon[y][x]
        sq += d * d
      }
    const rmse = Math.sqrt(sq / (N * N))

    return { block, recon, logNorm, kept, rmse }
  }, [sample, quality])

  // ── geometry: three 8×8 panels side by side ────────────────────────────────
  const VB_W = 600
  const VB_H = 300
  const CELL = 22
  const GRID = N * CELL // 176
  const GAP = (VB_W - 3 * GRID) / 4 // even gutters
  const TOP = 60
  const panelX = (i: number): number => GAP + i * (GRID + GAP)

  const samples: { key: SampleKey; label: string }[] = [
    { key: 'gradient', label: 'gradient' },
    { key: 'edge', label: 'edge' },
    { key: 'texture', label: 'texture' },
  ]

  const PanelGray = ({ x, b, title }: { x: number; b: Block; title: string }) => (
    <g>
      <text
        x={x + GRID / 2}
        y={TOP - 14}
        textAnchor="middle"
        className="font-mono"
        style={{ fontSize: 10.5, fill: 'var(--color-fg)', fontWeight: 600 }}
      >
        {title}
      </text>
      {b.map((row, y) =>
        row.map((v, cx) => (
          <rect
            key={`g-${title}-${y}-${cx}`}
            x={x + cx * CELL}
            y={TOP + y * CELL}
            width={CELL}
            height={CELL}
            fill={grayFill(v)}
            stroke="color-mix(in srgb, var(--color-border) 50%, transparent)"
            strokeWidth={0.5}
            shapeRendering="crispEdges"
            style={{ transition: 'fill 140ms ease' }}
          />
        )),
      )}
      <rect
        x={x}
        y={TOP}
        width={GRID}
        height={GRID}
        fill="none"
        stroke="color-mix(in srgb, var(--color-border) 90%, transparent)"
        strokeWidth={1}
      />
    </g>
  )

  return (
    <figure className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          DCT · what JPEG keeps
        </span>
        <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-surface p-0.5">
          {samples.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSample(s.key)}
              aria-pressed={sample === s.key}
              className={`rounded-md px-2.5 py-1 font-mono text-[0.68rem] uppercase tracking-wider transition-colors ${
                sample === s.key ? 'bg-blog/15 text-blog ring-1 ring-blog/40' : 'text-muted hover:text-fg'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-2 py-4 sm:px-4">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="block h-auto w-full"
          style={{ maxWidth: 600, margin: '0 auto' }}
          role="img"
          aria-label="Three 8 by 8 panels: the original grayscale block, its DCT coefficient magnitudes as a log heatmap with the DC term top-left, and the reconstruction after quantisation and inverse DCT."
        >
          {/* panel 1 — original block */}
          <PanelGray x={panelX(0)} b={block} title="block" />

          {/* panel 2 — DCT coefficient magnitudes (log heatmap) */}
          <text
            x={panelX(1) + GRID / 2}
            y={TOP - 14}
            textAnchor="middle"
            className="font-mono"
            style={{ fontSize: 10.5, fill: accent, fontWeight: 600 }}
          >
            DCT coefficients
          </text>
          {logNorm.map((row, v) =>
            row.map((m, u) => (
              <rect
                key={`c-${v}-${u}`}
                x={panelX(1) + u * CELL}
                y={TOP + v * CELL}
                width={CELL}
                height={CELL}
                fill={coeffFill(m)}
                stroke="color-mix(in srgb, var(--color-border) 50%, transparent)"
                strokeWidth={0.5}
                shapeRendering="crispEdges"
                style={{ transition: 'fill 140ms ease' }}
              />
            )),
          )}
          <rect
            x={panelX(1)}
            y={TOP}
            width={GRID}
            height={GRID}
            fill="none"
            stroke="color-mix(in srgb, var(--color-border) 90%, transparent)"
            strokeWidth={1}
          />
          {/* DC marker — top-left coefficient */}
          <text
            x={panelX(1) + 3}
            y={TOP + 12}
            className="font-mono"
            style={{ fontSize: 8, fill: 'var(--color-bg)', fontWeight: 700 }}
          >
            DC
          </text>

          {/* panel 3 — reconstruction */}
          <PanelGray x={panelX(2)} b={recon} title="reconstructed" />

          {/* readouts under the panels */}
          <text
            x={panelX(1) + GRID / 2}
            y={TOP + GRID + 24}
            textAnchor="middle"
            className="font-mono"
            style={{ fontSize: 11, fill: 'var(--color-fg)' }}
          >
            <tspan fill={accent} fontWeight={700}>{kept}</tspan>
            <tspan fill="var(--color-muted)"> / 64 coefficients kept</tspan>
          </text>
          <text
            x={panelX(1) + GRID / 2}
            y={TOP + GRID + 42}
            textAnchor="middle"
            className="font-mono"
            style={{ fontSize: 11, fill: 'var(--color-muted)' }}
          >
            RMSE <tspan fill="#d98b5f" fontWeight={700}>{rmse.toFixed(1)}</tspan>
          </text>
        </svg>
      </div>

      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <div className="flex items-center gap-4">
          <label
            htmlFor="dct-quality"
            className="font-mono text-[0.7rem] uppercase tracking-wider text-muted whitespace-nowrap"
          >
            quality
          </label>
          <input
            id="dct-quality"
            type="range"
            min={1}
            max={100}
            step={1}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-blog)]"
          />
          <span className="w-12 text-right font-mono text-[0.78rem] tabular-nums text-fg">{quality}</span>
        </div>
        <p className="mt-2 font-mono text-[0.66rem] leading-snug text-muted">
          The DCT re-sorts the block by spatial frequency — the bright cell top-left is the average
          brightness, detail ramps toward the bottom-right. Quantisation divides each coefficient by a
          table that is gentle on the low frequencies and harsh on the high ones, then rounds. Drop the
          quality and most of the high-frequency cells round to zero: fewer numbers to store, a blockier
          reconstruction, and rising error — but for a while the eye barely notices what was thrown away.
        </p>
      </div>
    </figure>
  )
}
