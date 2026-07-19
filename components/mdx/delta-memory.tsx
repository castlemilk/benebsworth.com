'use client'

/**
 * DeltaMemory — why a matrix memory needs the delta rule.
 *
 * Linear attention folds the whole past into a fixed-size matrix memory M
 * instead of a per-token cache. This widget is a step-through demo of the
 * smallest interesting such memory: a 4×4 M shown as 4 slots (K1…K4), each
 * holding a 4-dim value vector. Toy keys are unit basis vectors (k = eᵢ), so
 * writing (name, v) with key eᵢ lands in slot i — and two names that map to
 * the same key collide in the same slot.
 *
 * A scripted sequence of 6 writes is designed so collisions happen: "moon"
 * writes slot K2 twice with different values, then "mars" collides into K2
 * again. A segmented control picks the write rule and re-runs the same
 * script, so both modes can be compared at every step:
 *
 *   • additive:  M ← M + v kᵀ              collisions smear (values pile up)
 *   • delta:     M ← M + β (v − M k) kᵀ    the old value under k is removed
 *                (β = 1)                    before the new one is written, so
 *                                          collisions replace instead of blur
 *
 * The matrix math is real: both updates are applied literally to a 4×4 float
 * array, and every readout (the per-step query M k, and the punchline "what
 * the memory now thinks 'moon' is") is computed from that array, not canned.
 * The verdict chips ("exact" / "replaced" / "smeared") come from numerically
 * comparing the retrieved vector against every value actually written.
 *
 * Step-through UI (no rAF): prev/next/reset, step counter, clickable script
 * chips, caption spelling out the current write. Theme-token styled,
 * light/dark legible, mobile-safe.
 */

import { useMemo, useState } from 'react'

const ADD = '#FF7A59' // additive write (smears)
const DEL = '#00E0B8' // delta rule (replaces)

type Mode = 'additive' | 'delta'
type Write = { name: string; slot: number; v: number[] }

// The fixed script. Slots are 0-indexed here and displayed as K1…K4.
// "moon" → K2 (slot 1) twice with different values, then "mars" → K2 again.
const WRITES: Write[] = [
  { name: 'moon', slot: 1, v: [0.8, 0.1, 0.3, 0.2] },
  { name: 'mars', slot: 0, v: [0.2, 0.7, 0.4, 0.6] },
  { name: 'moon', slot: 1, v: [0.1, 0.6, 0.8, 0.3] },
  { name: 'venus', slot: 3, v: [0.3, 0.3, 0.2, 0.9] },
  { name: 'mars', slot: 1, v: [0.6, 0.2, 0.1, 0.7] },
  { name: 'io', slot: 2, v: [0.5, 0.4, 0.6, 0.2] },
]
const MOON_SLOT = 1 // the slot "moon" writes to — the punchline watches this one

// toy keys: unit basis vectors
const basis = (slot: number): number[] => [0, 1, 2, 3].map((i) => (i === slot ? 1 : 0))

// One write, applied literally to the 4×4 matrix (row-major float array).
//   additive: M ← M + v kᵀ
//   delta:    M ← M + β (v − M k) kᵀ   with β = 1
function applyWrite(M: number[], k: number[], v: number[], mode: Mode): number[] {
  const beta = 1
  const next = [...M]
  if (mode === 'additive') {
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) next[i * 4 + j] += v[i] * k[j]
  } else {
    const Mk = [0, 0, 0, 0]
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) Mk[i] += M[i * 4 + j] * k[j]
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) next[i * 4 + j] += beta * (v[i] - Mk[i]) * k[j]
  }
  return next
}

// Retrieval: y = M k
function query(M: number[], k: number[]): number[] {
  const out = [0, 0, 0, 0]
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) out[i] += M[i * 4 + j] * k[j]
  return out
}

const close = (a: number[], b: number[]) => a.every((x, i) => Math.abs(x - b[i]) < 1e-9)
const fmt = (x: number) => (Object.is(x, -0) ? '0.00' : x.toFixed(2))
const vecText = (v: number[]) => `(${v.map(fmt).join(', ')})`
const SUB = ['₁', '₂', '₃', '₄']

export function DeltaMemory() {
  const [mode, setMode] = useState<Mode>('additive')
  const [step, setStep] = useState(0)
  const accent = mode === 'additive' ? ADD : DEL

  // Replay the script from scratch so the state at every step is exact.
  const M = useMemo(() => {
    let m = new Array<number>(16).fill(0)
    for (let i = 0; i < step; i++) {
      m = applyWrite(m, basis(WRITES[i].slot), WRITES[i].v, mode)
    }
    return m
  }, [mode, step])

  const applied = WRITES.slice(0, step)
  const currentWrite = step > 0 ? WRITES[step - 1] : null
  const queryVec = currentWrite ? query(M, basis(currentWrite.slot)) : null
  const queryExact = currentWrite && queryVec ? close(queryVec, currentWrite.v) : false

  // Punchline: what does the memory think "moon" is right now?
  const moonVec = query(M, basis(MOON_SLOT))
  const moonWrites = applied.filter((w) => w.slot === MOON_SLOT)
  const moonMatch = applied.find((w) => close(w.v, moonVec))
  const moonVerdict =
    moonWrites.length === 0
      ? { chip: 'empty', colour: 'var(--color-muted)', note: 'nothing stored under “moon” yet' }
      : moonMatch
        ? moonMatch.name === 'moon'
          ? { chip: 'exact', colour: DEL, note: 'the latest write to K2, returned verbatim' }
          : { chip: 'replaced', colour: ADD, note: `“moon” now returns ${moonMatch.name}’s value — the old one was removed first` }
        : { chip: 'smeared', colour: ADD, note: `the sum of every write that hit K2 — no single one of them` }

  return (
    <figure className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface">
      {/* header: title + mode toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-4 py-3 sm:px-5">
        <div className="font-mono text-[0.72rem] text-fg/75">
          a tiny matrix memory <span className="text-muted">· M is 4×4, keys are unit basis vectors</span>
        </div>
        <div role="group" aria-label="Write rule" className="flex overflow-hidden rounded-lg border border-[var(--color-border)]">
          {(['additive', 'delta'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-wider transition-colors ${
                mode === m ? 'text-[#0a0a0a]' : 'text-muted hover:text-fg'
              }`}
              style={mode === m ? { background: m === 'additive' ? ADD : DEL } : undefined}
            >
              {m === 'additive' ? 'additive write' : 'delta rule'}
            </button>
          ))}
        </div>
      </div>

      {/* the rule in force */}
      <div className="border-b border-[var(--color-border)] px-4 py-2 sm:px-5">
        <p className="font-mono text-[0.68rem] text-fg/80">
          update:{' '}
          <span style={{ color: accent }}>
            {mode === 'additive' ? 'M ← M + v kᵀ' : 'M ← M + β (v − M k) kᵀ · β = 1'}
          </span>
          <span className="text-muted">
            {mode === 'additive'
              ? ' — new values pile on top of whatever the slot already holds'
              : ' — read what the slot holds for this key, remove it, then write'}
          </span>
        </p>
      </div>

      {/* the memory: one row per slot, 4 value cells each */}
      <div className="px-4 py-4 sm:px-5" aria-live="polite">
        <div className="space-y-1.5">
          {[0, 1, 2, 3].map((slot) => {
            const isTarget = currentWrite?.slot === slot
            // slot's stored value = column `slot` of M, shown as a row
            const row = [0, 1, 2, 3].map((i) => M[i * 4 + slot])
            return (
              <div
                key={slot}
                className="grid grid-cols-[2.6rem_repeat(4,1fr)] items-center gap-1.5 rounded-lg px-1 py-1"
                style={isTarget ? { boxShadow: `inset 0 0 0 1.5px ${accent}` } : undefined}
              >
                <span
                  className="rounded-md border border-[var(--color-border)] px-1.5 py-1 text-center font-mono text-[0.68rem] font-semibold"
                  style={{ color: isTarget ? accent : 'var(--color-fg)' }}
                >
                  K{slot + 1}
                </span>
                {row.map((x, i) => (
                  <span
                    key={i}
                    className="rounded-md px-1 py-1 text-center font-mono text-[0.72rem] tabular-nums text-fg"
                    style={{
                      backgroundColor:
                        Math.abs(x) > 0.005
                          ? `${accent}${Math.round(Math.min(0.3, Math.abs(x) * 0.18) * 255).toString(16).padStart(2, '0')}`
                          : undefined,
                    }}
                  >
                    {fmt(x)}
                  </span>
                ))}
              </div>
            )
          })}
        </div>

        {/* the script as clickable chips */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {WRITES.map((w, i) => {
            const done = i < step
            const isCurrent = i === step - 1
            return (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i + 1)}
                aria-label={`Jump to write ${i + 1}: ${w.name} to K${w.slot + 1}`}
                className={`rounded-md border px-2 py-1 font-mono text-[0.6rem] transition-colors ${
                  isCurrent
                    ? 'border-transparent text-[#0a0a0a]'
                    : done
                      ? 'border-[var(--color-border)] text-fg/80 hover:text-fg'
                      : 'border-[var(--color-border)] text-muted/70 hover:text-fg'
                }`}
                style={isCurrent ? { background: accent } : undefined}
              >
                {i + 1} {w.name}→K{w.slot + 1}
              </button>
            )
          })}
        </div>
      </div>

      {/* stepper */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            aria-label="Previous write"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--color-border)] text-fg transition-colors hover:border-[var(--color-muted)] disabled:opacity-30"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(WRITES.length, s + 1))}
            disabled={step === WRITES.length}
            aria-label="Next write"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--color-border)] text-fg transition-colors hover:border-[var(--color-muted)] disabled:opacity-30"
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => setStep(0)}
            className="ml-1 rounded-lg border border-[var(--color-border)] px-3 py-2 font-mono text-[0.62rem] uppercase tracking-wider text-muted transition-colors hover:text-fg"
          >
            reset
          </button>
        </div>
        <div className="font-mono text-[0.68rem] text-muted">
          step <span className="text-fg tabular-nums">{step}</span> / {WRITES.length}
        </div>
      </div>

      {/* caption: the write in plain words */}
      <div className="border-t border-[var(--color-border)] px-4 py-2.5 sm:px-5">
        <p className="font-mono text-[0.68rem] leading-snug text-fg/80">
          <span className="text-blog">›</span>{' '}
          {currentWrite
            ? `write ${step}: “${currentWrite.name}” → K${currentWrite.slot + 1} with v = ${vecText(currentWrite.v)} (k = e${SUB[currentWrite.slot]})`
            : 'empty memory — press › to run the first write of the script'}
        </p>
      </div>

      {/* readouts: query of the current key + the "moon" punchline */}
      <div className="grid gap-px border-t border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2">
        <div className="bg-surface px-4 py-3 sm:px-5">
          <div className="font-mono text-[0.58rem] uppercase tracking-wider text-muted">
            query {currentWrite ? `“${currentWrite.name}”` : '—'} · y = M k
          </div>
          <div className="mt-1 font-mono text-[0.78rem] tabular-nums text-fg">
            {queryVec ? vecText(queryVec) : '(—, —, —, —)'}
          </div>
          {currentWrite && (
            <div className="mt-1 font-mono text-[0.62rem]" style={{ color: queryExact ? DEL : ADD }}>
              {queryExact
                ? '✓ returns the value just written'
                : '✗ returns a smear of every write to this slot'}
            </div>
          )}
        </div>
        <div className="bg-surface px-4 py-3 sm:px-5">
          <div className="font-mono text-[0.58rem] uppercase tracking-wider text-muted">
            the memory now thinks “moon” is
          </div>
          <div className="mt-1 font-mono text-[0.78rem] tabular-nums text-fg">{vecText(moonVec)}</div>
          <div className="mt-1 font-mono text-[0.62rem]" style={{ color: moonVerdict.colour }}>
            {moonVerdict.chip} — {moonVerdict.note}
          </div>
        </div>
      </div>
    </figure>
  )
}
