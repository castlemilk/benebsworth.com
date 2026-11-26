'use client'

/**
 * LocalityBoundDemo — the locality invariant as an interactive rejection test.
 *
 * The reader sets payload size, uplink bandwidth, distance, compute time, and
 * the frame deadline (or picks a preset: drone inspection, emergency braking,
 * wake word). The component stacks the three lower-bound terms of the remote
 * path — transmission, propagation, compute — against the deadline and
 * verdicts pass/fail with the miss ratio.
 *
 * The myth-buster is the "infinite bandwidth" readout: the same arithmetic
 * with transmission deleted. Whatever remains is the floor no network upgrade
 * can buy down — propagation at light-speed-in-fiber plus compute. For small
 * payloads the bandwidth slider turns out to be almost irrelevant, which is
 * the point of the figure.
 *
 * Pure calculation on input events — no animation loop. Self-contained React
 * + SVG, no new deps.
 */

import { useMemo, useState } from 'react'

/* ------------------------------------------------------------------ *
 * Model — all times in milliseconds
 * ------------------------------------------------------------------ */

/** Light in fiber ≈ 200,000 km/s → RTT floor for one-way distance D km. */
function propagationMs(distanceKm: number): number {
  return (2 * distanceKm) / 200 // 200,000 km/s → (2D/200000)s ×1000 ms
}

function transmissionMs(payloadMbit: number, bandwidthMbps: number): number {
  return (payloadMbit / bandwidthMbps) * 1000
}

type Preset = {
  label: string
  payloadMb: number // megabytes
  bandwidthMbps: number
  distanceKm: number
  computeMs: number
  deadlineMs: number
  note: string
}

const PRESETS: Preset[] = [
  {
    label: 'drone 4K frame',
    payloadMb: 24.9,
    bandwidthMbps: 100,
    distanceKm: 500,
    computeMs: 50,
    deadlineMs: 16.7,
    note: 'video-rate tracking, off by ~125×',
  },
  {
    label: 'emergency braking',
    payloadMb: 2,
    bandwidthMbps: 50,
    distanceKm: 2000,
    computeMs: 30,
    deadlineMs: 100,
    note: '2.8 m of travel at 100 km/h per 100 ms',
  },
  {
    label: 'wake word',
    payloadMb: 0.02,
    bandwidthMbps: 20,
    distanceKm: 1000,
    computeMs: 100,
    deadlineMs: 200,
    note: 'a case the cloud can actually serve',
  },
]

const C_TRANS = '#7c5cff' // transmission — purchasable
const C_PROP = '#ff7a59' // propagation — physics, brand orange
const C_COMPUTE = '#00a896' // remote compute — purchasable
const C_GREEN = '#34d399'
const C_BAD = '#ef4444'

export function LocalityBoundDemo() {
  const [payloadMb, setPayloadMb] = useState(24.9)
  const [bandwidthMbps, setBandwidthMbps] = useState(100)
  const [distanceKm, setDistanceKm] = useState(500)
  const [computeMs, setComputeMs] = useState(50)
  const [deadlineMs, setDeadlineMs] = useState(16.7)
  const [presetNote, setPresetNote] = useState(PRESETS[0].note)

  const apply = (p: Preset) => {
    setPayloadMb(p.payloadMb)
    setBandwidthMbps(p.bandwidthMbps)
    setDistanceKm(p.distanceKm)
    setComputeMs(p.computeMs)
    setDeadlineMs(p.deadlineMs)
    setPresetNote(p.note)
  }

  const r = useMemo(() => {
    const payloadMbit = payloadMb * 8
    const trans = transmissionMs(payloadMbit, bandwidthMbps)
    const prop = propagationMs(distanceKm)
    const total = trans + prop + computeMs
    const floor = prop + computeMs // infinite-bandwidth residue
    const ratio = total / deadlineMs
    const floorRatio = floor / deadlineMs
    return { trans, prop, total, floor, ratio, floorRatio }
  }, [payloadMb, bandwidthMbps, distanceKm, computeMs, deadlineMs])

  const passes = r.total <= deadlineMs
  const floorPasses = r.floor <= deadlineMs

  /* geometry: log scale so 16.7 ms and 2,000 ms share one bar sensibly */
  const W = 660
  const H = 120
  const PAD = { l: 10, r: 10, t: 34, b: 30 }
  const tMin = 1
  const tMax = Math.max(5000, r.total * 1.3)
  const lx = (ms: number) => {
    const f = (Math.log10(Math.max(ms, tMin)) - Math.log10(tMin)) / (Math.log10(tMax) - Math.log10(tMin))
    return PAD.l + f * (W - PAD.l - PAD.r)
  }
  const barY = PAD.t + 8
  const barH = 30

  const segs = [
    { key: 'transmission', ms: r.trans, color: C_TRANS, x0: 0 },
    { key: 'propagation', ms: r.prop, color: C_PROP, x0: r.trans },
    { key: 'compute', ms: computeMs, color: C_COMPUTE, x0: r.trans + r.prop },
  ]

  const fmt = (ms: number) =>
    ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : ms >= 100 ? `${ms.toFixed(0)} ms` : `${ms.toFixed(1)} ms`

  const slider = (
    label: string,
    value: number,
    set: (v: number) => void,
    min: number,
    max: number,
    step: number,
    display: string,
  ) => (
    <label className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
      <span className="w-24 shrink-0 text-right">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="w-32 accent-[var(--color-blog,#ff7a59)] sm:w-40"
        aria-label={label}
      />
      <span className="w-20 tabular-nums">{display}</span>
    </label>
  )

  const btn =
    'rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800'

  return (
    <figure className="my-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-950/60 p-4 sm:p-5">
      {/* presets */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className={btn} onClick={() => apply(p)}>
            {p.label}
          </button>
        ))}
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">{presetNote}</span>
      </div>

      {/* stacked lower-bound bar vs deadline */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-4 w-full"
        role="img"
        aria-label={`Remote path lower bound ${fmt(r.total)} against deadline ${fmt(
          deadlineMs,
        )}: ${passes ? 'passes' : `misses by ${r.ratio.toFixed(1)} times`}`}
      >
        {/* segments, each starting where the last ended, in time order along the log axis */}
        {(() => {
          let acc = 0
          return segs.map((s) => {
            const x1 = lx(acc)
            acc += s.ms
            const x2 = lx(acc)
            return (
              <g key={s.key}>
                <rect x={x1} y={barY} width={Math.max(0, x2 - x1)} height={barH} fill={s.color} fillOpacity={0.75} rx={2} />
                {x2 - x1 > 60 && (
                  <text x={(x1 + x2) / 2} y={barY + barH / 2 + 4} textAnchor="middle" fontSize={10.5} fill="#fff" fontWeight={600}>
                    {s.key} {fmt(s.ms)}
                  </text>
                )}
              </g>
            )
          })
        })()}
        {/* deadline marker */}
        <line x1={lx(deadlineMs)} y1={barY - 8} x2={lx(deadlineMs)} y2={barY + barH + 8} stroke={passes ? C_GREEN : C_BAD} strokeWidth={2.4} />
        <text x={lx(deadlineMs)} y={barY - 12} textAnchor="middle" fontSize={11} fontWeight={700} fill={passes ? C_GREEN : C_BAD}>
          deadline {fmt(deadlineMs)}
        </text>
        {/* total marker */}
        <text x={lx(r.total)} y={barY + barH + 22} textAnchor="middle" fontSize={11} fill="currentColor" fontWeight={600}>
          lower bound {fmt(r.total)}
        </text>
        {/* log axis note */}
        <text x={W - PAD.r} y={H - 4} textAnchor="end" fontSize={9.5} fill="currentColor" opacity={0.5}>
          log time scale
        </text>
      </svg>

      {/* verdict + myth-buster */}
      <div className="mt-2 flex flex-wrap items-baseline justify-center gap-x-6 gap-y-1 text-sm">
        <div>
          {passes ? (
            <span style={{ color: C_GREEN }} className="font-bold">
              passes with {(deadlineMs - r.total).toFixed(1)} ms slack
            </span>
          ) : (
            <span style={{ color: C_BAD }} className="font-bold">
              misses by {r.ratio >= 10 ? Math.round(r.ratio) : r.ratio.toFixed(1)}×
            </span>
          )}
        </div>
        <div className="tabular-nums text-neutral-500 dark:text-neutral-400">
          transmission {fmt(r.trans)} · propagation {fmt(r.prop)} · compute {fmt(computeMs)}
        </div>
      </div>
      <div className="mt-2 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 px-3 py-2 text-center text-xs text-neutral-600 dark:text-neutral-300">
        <strong>Infinite bandwidth, free:</strong> delete the transmission term entirely and the floor is{' '}
        <span className="tabular-nums font-semibold" style={{ color: C_PROP }}>
          {fmt(r.floor)}
        </span>{' '}
        — {floorPasses ? 'which passes, so this path is merely expensive, not impossible' : (
          <>
            which <em>still misses by {r.floorRatio >= 10 ? Math.round(r.floorRatio) : r.floorRatio.toFixed(1)}×</em>. That residue
            is propagation plus compute: the part no network upgrade sells.
          </>
        )}
      </div>

      {/* controls */}
      <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {slider('payload', payloadMb, setPayloadMb, 0.01, 30, 0.01, `${payloadMb.toFixed(2)} MB`)}
        {slider('uplink bw', bandwidthMbps, setBandwidthMbps, 1, 1000, 1, `${bandwidthMbps} Mbps`)}
        {slider('distance', distanceKm, setDistanceKm, 10, 10000, 10, `${distanceKm} km`)}
        {slider('compute', computeMs, setComputeMs, 1, 200, 1, `${computeMs} ms`)}
        {slider('deadline', deadlineMs, setDeadlineMs, 5, 500, 0.1, `${deadlineMs.toFixed(1)} ms`)}
      </div>

      <figcaption className="mt-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
        The remote path lower bound, stacked: transmission is purchasable, compute is purchasable,
        propagation is physics. Drag the uplink to 1 Gbps and watch what does not move.
      </figcaption>
    </figure>
  )
}
