'use client'

/**
 * ConstraintCascadeDemo — the day-153 failure as an interactive invoice.
 *
 * The reader drags the day the 500 MB memory constraint gets written into the
 * project contract. Stage work-bars accrue along a 153-day timeline; work
 * hardened *before* the constraint is written is exposed and must be revised,
 * repeated and re-validated, so the rework bill grows with every week the
 * paperwork lags the physics.
 *
 * The punchline is the ghost marker pinned at day zero: the device's memory
 * reservation was true the entire time. Nothing physical changes when the
 * slider moves — only the paperwork does.
 *
 * Pure calculation on input events — no animation loop. Self-contained React
 * + SVG, no new deps.
 */

import { useMemo, useState } from 'react'

/* ------------------------------------------------------------------ *
 * Model — the DR project's stage schedule, in days
 * ------------------------------------------------------------------ */

type Stage = {
  label: string
  start: number
  end: number
  /** true → work depends on the architecture choice the constraint binds */
  dependent: boolean
}

const DEPLOY_DAY = 153
const TIMELINE_END = 165

const STAGES: Stage[] = [
  { label: 'problem definition', start: 0, end: 14, dependent: false },
  { label: 'data collection', start: 10, end: 80, dependent: true },
  { label: 'model development', start: 40, end: 130, dependent: true },
  { label: 'evaluation', start: 110, end: 153, dependent: true },
  { label: 'deployment', start: 150, end: 158, dependent: true },
]

/** Fixed repair cost (weeks) once the constraint is finally honoured. */
const REPAIR_WEEKS = 1.2 // the book's six-day sequential fix

const C_EXPOSED = '#f59e0b' // amber — work hardened around the violation
const C_INFORMED = '#34d399' // green — work shaped by the written constraint
const C_DESTROYED = '#ef4444'
const C_VIOLET = '#7c5cff'

const fmtWk = (d: number) => (d / 7).toFixed(1)

function exposedDays(stage: Stage, writtenDay: number): number {
  if (!stage.dependent) return 0
  if (writtenDay <= stage.start) return 0
  return Math.min(writtenDay, stage.end) - stage.start
}

export function ConstraintCascadeDemo() {
  const [writtenDay, setWrittenDay] = useState(153)

  const model = useMemo(() => {
    const rows = STAGES.map((s) => {
      const total = s.end - s.start
      const exposed = exposedDays(s, writtenDay)
      return { ...s, total, exposed, informed: total - exposed }
    })
    const destroyedDays = rows.reduce((acc, r) => acc + r.exposed, 0)
    const destroyedWeeks = destroyedDays / 7
    const atKickoff = writtenDay <= 14
    const repair = atKickoff ? 0 : REPAIR_WEEKS
    const bill = destroyedWeeks + repair
    return { rows, destroyedWeeks, repair, bill, atKickoff }
  }, [writtenDay])

  /* ---------------- layout ---------------- */
  const W = 680
  const laneH = 34
  const laneGap = 10
  const padL = 132
  const padR = 14
  const topH = 46
  const plotW = W - padL - padR
  const x = (day: number) => padL + (day / TIMELINE_END) * plotW
  const svgH = topH + STAGES.length * (laneH + laneGap) + 34

  const preset = (d: number) => (
    <button
      key={d}
      onClick={() => setWrittenDay(d)}
      style={{
        padding: '6px 12px',
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: writtenDay === d ? C_VIOLET : 'transparent',
        color: writtenDay === d ? '#fff' : 'var(--foreground)',
        fontSize: 13,
        cursor: 'pointer',
      }}
    >
      {d === 1 ? 'day 1 — kickoff' : d === 30 ? 'day 30 — first prototype' : 'never — the day-153 case'}
    </button>
  )

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '20px 20px 14px',
        background: 'var(--card, rgba(127,127,127,0.04))',
      }}
    >
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {[1, 30, 153].map(preset)}
        <span style={{ marginLeft: 'auto', fontSize: 12.5, opacity: 0.66, alignSelf: 'center', fontStyle: 'italic' }}>
          constraint propagation, priced in work-weeks
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${svgH}`} width="100%" role="img" aria-label="Rework cost of a constraint written late into the project contract">
        {/* ghost marker — the device, true since day zero */}
        <line x1={x(0)} y1={topH - 26} x2={x(0)} y2={svgH - 30} stroke={C_VIOLET} strokeWidth={1.4} strokeDasharray="3 4" opacity={0.75} />
        <text x={x(0) + 6} y={topH - 30} fontSize={11.5} fill={C_VIOLET} fontWeight={600}>
          device ships with 500 MB spare — true since day 0
        </text>

        {/* written-constraint marker */}
        <line x1={x(writtenDay)} y1={topH - 16} x2={x(writtenDay)} y2={svgH - 30} stroke={C_INFORMED} strokeWidth={1.8} />
        <text
          x={x(writtenDay)}
          y={topH - 20}
          fontSize={11.5}
          fill={C_INFORMED}
          fontWeight={700}
          textAnchor={writtenDay > 100 ? 'end' : writtenDay < 25 ? 'start' : 'middle'}
          dx={writtenDay > 100 ? -5 : writtenDay < 25 ? 5 : 0}
        >
          written · day {writtenDay}
        </text>

        {/* deployment discovery marker */}
        <line x1={x(DEPLOY_DAY)} y1={topH - 8} x2={x(DEPLOY_DAY)} y2={svgH - 30} stroke={C_DESTROYED} strokeWidth={1.4} strokeDasharray="5 4" opacity={0.9} />
        <text x={x(DEPLOY_DAY)} y={topH - 12 + 14} fontSize={11} fill={C_DESTROYED} fontWeight={600} textAnchor="end" dx={-4}>
          day 153 · deployment prices the model
        </text>

        {model.rows.map((r, i) => {
          const y = topH + i * (laneH + laneGap)
          const xStart = x(r.start)
          const xEnd = Math.min(r.end, TIMELINE_END)
          const exposedEndDay = r.dependent ? Math.min(Math.max(writtenDay, r.start), xEnd) : r.start
          const xWritten = x(exposedEndDay)
          const xEndPx = x(xEnd)
          const exposedW = Math.max(0, xWritten - xStart)
          const informedW = Math.max(0, xEndPx - Math.max(xWritten, xStart))
          return (
            <g key={r.label}>
              <text x={padL - 10} y={y + laneH / 2 + 4} fontSize={12} fill="var(--foreground)" textAnchor="end" opacity={0.85}>
                {r.label}
              </text>
              {/* exposed span */}
              {r.dependent && exposedW > 0.5 && (
                <rect x={xStart} y={y} width={exposedW} height={laneH} rx={5} fill={C_EXPOSED} opacity={0.85} />
              )}
              {/* informed span */}
              {informedW > 0.5 && (
                <rect
                  x={r.dependent ? Math.max(xWritten, xStart) : xStart}
                  y={y}
                  width={r.dependent ? informedW : xEndPx - xStart}
                  height={laneH}
                  rx={5}
                  fill={r.dependent ? C_INFORMED : '#94a3b8'}
                  opacity={r.dependent ? 0.8 : 0.45}
                />
              )}
              {/* exposed label */}
              {r.dependent && r.exposed > 12 && (
                <text x={xStart + exposedW / 2} y={y + laneH / 2 + 4} fontSize={11} fontWeight={700} fill="#1a1a1a" textAnchor="middle">
                  {fmtWk(r.exposed)} wk exposed
                </text>
              )}
            </g>
          )
        })}

        {/* time axis */}
        {Array.from({ length: 6 }, (_, i) => i * 30).map((d) => (
          <g key={d}>
            <line x1={x(d)} y1={svgH - 28} x2={x(d)} y2={svgH - 23} stroke="var(--foreground)" opacity={0.35} />
            <text x={x(d)} y={svgH - 10} fontSize={10.5} fill="var(--foreground)" opacity={0.55} textAnchor="middle">
              day {d}
            </text>
          </g>
        ))}
      </svg>

      {/* readouts */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', margin: '10px 0 12px' }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: model.bill === 0 ? C_INFORMED : C_DESTROYED, fontVariantNumeric: 'tabular-nums' }}>
          {model.bill === 0 ? 'no rework' : `${model.bill.toFixed(1)} weeks destroyed`}
        </span>
        <span style={{ fontSize: 13.5, opacity: 0.8 }}>
          {model.destroyedWeeks.toFixed(1)} wk of hardened work must be revised, repeated and re-validated
          {model.repair > 0 ? ` · plus ${fmtWk(REPAIR_WEEKS * 7 * 1)} wk for the feasible fix` : ''}
        </span>
      </div>

      <div
        style={{
          border: '1px dashed var(--border)',
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: 13.5,
          lineHeight: 1.55,
          opacity: 0.92,
        }}
      >
        <strong>The paperwork moves; the physics doesn&rsquo;t.</strong> Slide the day back and forth and watch the
        violet line at day zero: the 500 MB reservation never changes. Written at kickoff, the constraint costs one
        meeting and shapes everything downstream. Written never, the same constraint costs{' '}
        {writtenDay === 153 ? <strong>the whole project plus the repair</strong> : 'whatever hardened before it'} —
        because the dataset, the training pipeline and the validation evidence were all built for a model that
        cannot ship.
      </div>

      {/* slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12.5, opacity: 0.75, minWidth: 190 }}>
          constraint written into contract
        </label>
        <input
          type="range"
          min={1}
          max={153}
          value={writtenDay}
          onChange={(e) => setWrittenDay(Number(e.target.value))}
          style={{ flex: 1, minWidth: 160, accentColor: C_VIOLET }}
          aria-label="Day the memory constraint is written into the contract"
        />
        <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', minWidth: 56, textAlign: 'right' }}>
          day {writtenDay}
        </span>
      </div>

      <p style={{ fontSize: 12.5, opacity: 0.62, margin: '12px 2px 2px', lineHeight: 1.5, textAlign: 'center' }}>
        Stage schedule follows the book&rsquo;s running case; dependent stages overlap because real projects pipeline.
        The amber spans are work that hardened around the violation — the rework bill is their sum.
      </p>
    </div>
  )
}
