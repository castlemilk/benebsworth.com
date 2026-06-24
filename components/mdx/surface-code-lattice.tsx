'use client'

/**
 * SurfaceCodeLattice — the centrepiece for "Remembering a qubit that forgets"
 * (quantum error correction with surface codes).
 *
 * A surface code stores ONE logical qubit across a d×d patch of physical "data"
 * qubits, protected by two families of parity checks ("stabilisers"):
 *
 *   • Z-stabilisers (teal squares) measure Z over the data qubits they touch.
 *     A Z-check ANTICOMMUTES with an X error → it flips (lights up) for X errors.
 *   • X-stabilisers (purple diamonds) measure X over their data qubits.
 *     An X-check anticommutes with a Z error → it flips for Z errors.
 *
 * Each stabiliser's outcome is a parity:  s = Π_{q∈check} (−1)^[error on q
 * anticommutes with this check].  A stabiliser lights as a "syndrome" iff that
 * product is −1, i.e. an ODD number of its data qubits carry an anticommuting
 * error. So a single error lights the (≤2) incident checks of the opposite type;
 * a CHAIN of collinear errors lights only its two ENDPOINTS because every
 * interior check sees an even number of flips and stays dark. That is the whole
 * trick: you never see the errors, only the boundary of the error chain.
 *
 * Click a data qubit (with the X/Z toggle) to paint a Pauli error; the parities
 * recompute instantly. The optional decoder brute-forces a minimum-weight perfect
 * matching over the lit syndromes (Manhattan edge weights) and draws the inferred
 * correction; error+correction nets to either a stabiliser (CORRECTED) or a
 * logical operator spanning the patch (a LOGICAL error).
 *
 * Everything is deterministic (no Math.random / Date.now). The only rAF is the
 * syndrome glow pulse, gated on in-view + running + reduced-motion (static rings
 * under reduced motion). Lit-syndrome set and per-qubit error state are exposed
 * as data-* attributes so a test can snapshot parity without pixel-peeping.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useInViewport } from './use-in-viewport'

// ── role colours (explicit, separate from the page accent var(--color-blog)) ──
const Z_COLOR = '#00E0B8' // Z-stabilisers (teal) and Z errors
const X_COLOR = '#7C5CFF' // X-stabilisers (purple) and X errors

type Distance = 3 | 5 | 7
type Pauli = 'I' | 'X' | 'Z' | 'Y' // Y = both X and Z on one qubit
type ErrType = 'X' | 'Z'

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

// ── lattice geometry ─────────────────────────────────────────────────────────
// Rotated surface code: data qubits sit on a d×d integer grid (row r, col c).
// Stabilisers live on the "plaquettes" between four data qubits, plus boundary
// half-plaquettes touching two. We checkerboard the bulk into Z and X families.
//
//   data qubit (r,c):  r,c ∈ [0, d−1]            → grid point (c, r)
//   plaquette (pr,pc): pr,pc ∈ [0, d−2]          → centre (pc+0.5, pr+0.5)
//                      touches qubits (pr,pc),(pr,pc+1),(pr+1,pc),(pr+1,pc+1)
//
// Boundary stabilisers (half-plaquettes) hang off the top/bottom (Z family) and
// left/right (X family) edges so the code is a proper distance-d patch.

interface DataQubit {
  id: number
  r: number
  c: number
  x: number // viewBox coords
  y: number
}

interface Stabiliser {
  id: number
  type: ErrType // 'Z' (teal square) or 'X' (purple diamond)
  cx: number
  cy: number
  qubits: number[] // data-qubit ids this check touches
}

interface Lattice {
  qubits: DataQubit[]
  stabs: Stabiliser[]
  qubitAt: Map<string, number> // "r,c" → qubit id
}

function buildLattice(d: number): Lattice {
  const qubits: DataQubit[] = []
  const qubitAt = new Map<string, number>()
  let qid = 0
  for (let r = 0; r < d; r++) {
    for (let c = 0; c < d; c++) {
      qubits.push({ id: qid, r, c, x: c, y: r })
      qubitAt.set(`${r},${c}`, qid)
      qid++
    }
  }

  const stabs: Stabiliser[] = []
  let sid = 0
  const at = (r: number, c: number) => qubitAt.get(`${r},${c}`)!

  // bulk plaquettes — checkerboard Z / X by (pr+pc) parity
  for (let pr = 0; pr < d - 1; pr++) {
    for (let pc = 0; pc < d - 1; pc++) {
      const type: ErrType = (pr + pc) % 2 === 0 ? 'Z' : 'X'
      stabs.push({
        id: sid++,
        type,
        cx: pc + 0.5,
        cy: pr + 0.5,
        qubits: [
          at(pr, pc),
          at(pr, pc + 1),
          at(pr + 1, pc),
          at(pr + 1, pc + 1),
        ],
      })
    }
  }

  // boundary half-plaquettes (weight-2 checks) — extend the bulk checkerboard
  // one cell OUT past each edge and keep the virtual plaquette only when its
  // parity gives the right family. Top/bottom edges carry Z (teal) checks;
  // left/right edges carry X (purple) checks. This is the canonical rotated
  // patch: each family gets exactly (d²−1)/2 checks and every error chain
  // terminates on a boundary of the matching family.
  const mod2 = (v: number) => ((v % 2) + 2) % 2
  // Top edge: virtual centre (pc+0.5, −0.5), parity (pc−1) → Z when even (pc odd)
  for (let pc = 0; pc < d - 1; pc++) {
    if (mod2(pc - 1) === 0) {
      stabs.push({
        id: sid++,
        type: 'Z',
        cx: pc + 0.5,
        cy: -0.5,
        qubits: [at(0, pc), at(0, pc + 1)],
      })
    }
  }
  // Bottom edge: virtual centre (pc+0.5, d−0.5), parity (d−1+pc) → Z when even
  for (let pc = 0; pc < d - 1; pc++) {
    if (mod2(d - 1 + pc) === 0) {
      stabs.push({
        id: sid++,
        type: 'Z',
        cx: pc + 0.5,
        cy: d - 1 + 0.5,
        qubits: [at(d - 1, pc), at(d - 1, pc + 1)],
      })
    }
  }
  // Left edge: virtual centre (−0.5, pr+0.5), parity (pr−1) → X when odd (pr even)
  for (let pr = 0; pr < d - 1; pr++) {
    if (mod2(pr - 1) === 1) {
      stabs.push({
        id: sid++,
        type: 'X',
        cx: -0.5,
        cy: pr + 0.5,
        qubits: [at(pr, 0), at(pr + 1, 0)],
      })
    }
  }
  // Right edge: virtual centre (d−0.5, pr+0.5), parity (pr+d−1) → X when odd
  for (let pr = 0; pr < d - 1; pr++) {
    if (mod2(pr + d - 1) === 1) {
      stabs.push({
        id: sid++,
        type: 'X',
        cx: d - 1 + 0.5,
        cy: pr + 0.5,
        qubits: [at(pr, d - 1), at(pr + 1, d - 1)],
      })
    }
  }

  return { qubits, stabs, qubitAt }
}

// ── parity ──────────────────────────────────────────────────────────────────
// A Z-stabiliser anticommutes with an X (or Y) error on a touched qubit; an
// X-stabiliser anticommutes with a Z (or Y). Lit iff an ODD count anticommutes.
function anticommutes(check: ErrType, err: Pauli): boolean {
  if (err === 'I') return false
  if (err === 'Y') return true // Y = X·Z anticommutes with both check types
  return check === 'Z' ? err === 'X' : err === 'Z'
}

function litSyndromes(stabs: Stabiliser[], errors: Map<number, Pauli>): Set<number> {
  const lit = new Set<number>()
  for (const s of stabs) {
    let parity = 0
    for (const q of s.qubits) {
      if (anticommutes(s.type, errors.get(q) ?? 'I')) parity ^= 1
    }
    if (parity === 1) lit.add(s.id)
  }
  return lit
}

// ── error algebra on a qubit (paint = toggle the chosen component) ────────────
function paint(prev: Pauli, paintType: ErrType): Pauli {
  // toggle the X or Z component independently; Y holds both.
  const hasX = prev === 'X' || prev === 'Y'
  const hasZ = prev === 'Z' || prev === 'Y'
  const nx = paintType === 'X' ? !hasX : hasX
  const nz = paintType === 'Z' ? !hasZ : hasZ
  if (nx && nz) return 'Y'
  if (nx) return 'X'
  if (nz) return 'Z'
  return 'I'
}

// ── exact min-weight matcher over a handful of syndromes ─────────────────────
// Surface-code decoding for ONE family: match each lit check of that family to
// another (or to the boundary of its family) so total Manhattan weight is min.
// With ≤ a handful of lit checks, brute-force pairing is trivial and exact.
interface MatchResult {
  // pairs of stabiliser ids matched to each other; boundary matches use -1 + edge id
  pairs: [number, number][] // -2 = matched to boundary
  weight: number
}

function manhattan(a: Stabiliser, b: Stabiliser): number {
  return Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy)
}

// distance from a stabiliser to the nearest code boundary of ITS family.
// Z-checks live on top/bottom edges, so their family boundary is the nearest
// horizontal edge; X-checks on left/right edges → nearest vertical edge.
function boundaryDist(s: Stabiliser, d: number): number {
  if (s.type === 'Z') return Math.min(s.cy + 0.5, d - 0.5 - s.cy)
  return Math.min(s.cx + 0.5, d - 0.5 - s.cx)
}

// recursively pick the minimum-weight perfect matching of a small list,
// allowing any node to instead match the boundary.
function minWeightMatch(nodes: Stabiliser[], d: number): MatchResult {
  const best: MatchResult = { pairs: [], weight: Infinity }
  const rec = (remaining: Stabiliser[], pairs: [number, number][], w: number) => {
    if (w >= best.weight) return
    if (remaining.length === 0) {
      best.pairs = pairs.map((p) => [...p] as [number, number])
      best.weight = w
      return
    }
    const [head, ...rest] = remaining
    // option A: head → boundary
    rec(rest, [...pairs, [head.id, -2]], w + boundaryDist(head, d))
    // option B: head → some other node
    for (let i = 0; i < rest.length; i++) {
      const partner = rest[i]
      const nextRest = rest.filter((_, j) => j !== i)
      rec(
        nextRest,
        [...pairs, [head.id, partner.id]],
        w + manhattan(head, partner),
      )
    }
  }
  rec(nodes, [], 0)
  if (best.weight === Infinity) return { pairs: [], weight: 0 }
  return best
}

// Turn a matching into actual data-qubit FLIPS (the physical correction).
// Walk an L-shaped path between the two matched check centres; each unit step
// crosses exactly one data qubit (at the step's midpoint), which we toggle.
// Matching Z-checks yields an X-correction; matching X-checks yields a Z one.
function pathFlips(
  lattice: Lattice,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  out: Set<number>,
) {
  let x = ax
  let y = ay
  const cross = (nx: number, ny: number) => {
    const mr = Math.round((y + ny) / 2)
    const mc = Math.round((x + nx) / 2)
    const id = lattice.qubitAt.get(`${mr},${mc}`)
    if (id != null) {
      if (out.has(id)) out.delete(id)
      else out.add(id)
    }
    x = nx
    y = ny
  }
  while (Math.abs(x - bx) > 1e-9) cross(x + Math.sign(bx - x), y)
  while (Math.abs(y - by) > 1e-9) cross(x, y + Math.sign(by - y))
}

function correctionFlips(
  lattice: Lattice,
  d: number,
  match: MatchResult,
  fam: ErrType,
  byId: Map<number, Stabiliser>,
): Set<number> {
  const flips = new Set<number>()
  for (const [a, b] of match.pairs) {
    const sa = byId.get(a)!
    let bx = sa.cx
    let by = sa.cy
    if (b === -2) {
      // matched to its family's nearest boundary
      if (fam === 'Z') by = sa.cy + 0.5 <= d - 0.5 - sa.cy ? -0.5 : d - 0.5
      else bx = sa.cx + 0.5 <= d - 0.5 - sa.cx ? -0.5 : d - 0.5
    } else {
      const sb = byId.get(b)!
      bx = sb.cx
      by = sb.cy
    }
    pathFlips(lattice, sa.cx, sa.cy, bx, by, flips)
  }
  return flips
}

// ─────────────────────────────────────────────────────────────────────────────
//  SurfaceCodeLattice
// ─────────────────────────────────────────────────────────────────────────────
export function SurfaceCodeLattice({
  distance = 3,
  showDecoder = true,
}: {
  distance?: Distance
  showDecoder?: boolean
}) {
  const [inViewRef, inView] = useInViewport<HTMLDivElement>('120px')
  const [d, setD] = useState<Distance>(distance)
  const [paintType, setPaintType] = useState<ErrType>('X')
  const [errors, setErrors] = useState<Map<number, Pauli>>(new Map())
  const [decoded, setDecoded] = useState(false)
  const [pulse, setPulse] = useState(0) // glow phase 0..1
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  const lattice = useMemo(() => buildLattice(d), [d])
  const lit = useMemo(
    () => litSyndromes(lattice.stabs, errors),
    [lattice, errors],
  )

  // a fresh lattice (distance change) clears the canvas.
  useEffect(() => {
    setErrors(new Map())
    setDecoded(false)
  }, [d])

  // any edit invalidates a previous decode.
  const setError = (qid: number) => {
    setDecoded(false)
    setErrors((prev) => {
      const next = new Map(prev)
      const cur = next.get(qid) ?? 'I'
      const np = paint(cur, paintType)
      if (np === 'I') next.delete(qid)
      else next.set(qid, np)
      return next
    })
  }

  const clear = () => {
    setErrors(new Map())
    setDecoded(false)
  }

  // ── decoder: match each family, build the physical correction, test logical ─
  const decode = useMemo(() => {
    const litStabs = lattice.stabs.filter((s) => lit.has(s.id))
    const zNodes = litStabs.filter((s) => s.type === 'Z')
    const xNodes = litStabs.filter((s) => s.type === 'X')
    const zMatch = minWeightMatch(zNodes, d)
    const xMatch = minWeightMatch(xNodes, d)
    const byId = new Map(lattice.stabs.map((s) => [s.id, s]))

    // physical correction: matching Z-checks (which catch X errors) → X flips;
    // matching X-checks → Z flips.
    const xCorr = correctionFlips(lattice, d, zMatch, 'Z', byId)
    const zCorr = correctionFlips(lattice, d, xMatch, 'X', byId)

    // correction polylines for drawing (centre→centre or centre→boundary point)
    type Chain = { type: ErrType; pts: [number, number][] }
    const chains: Chain[] = []
    const addChains = (m: MatchResult, fam: ErrType) => {
      for (const [a, b] of m.pairs) {
        const sa = byId.get(a)!
        if (b === -2) {
          let bx = sa.cx
          let by = sa.cy
          if (fam === 'Z') by = sa.cy + 0.5 <= d - 0.5 - sa.cy ? -0.5 : d - 0.5
          else bx = sa.cx + 0.5 <= d - 0.5 - sa.cx ? -0.5 : d - 0.5
          chains.push({ type: fam, pts: [[sa.cx, sa.cy], [bx, by]] })
        } else {
          const sb = byId.get(b)!
          chains.push({ type: fam, pts: [[sa.cx, sa.cy], [sb.cx, sb.cy]] })
        }
      }
    }
    addChains(zMatch, 'Z')
    addChains(xMatch, 'X')

    // LOGICAL test: combine error ⊕ correction, then measure the two logical
    // observables. Logical Z is represented by Z on column 0; it anticommutes
    // with the residual X-support iff that column carries an odd number of X's
    // → the stored qubit's Z flipped. Symmetrically, logical X = X on row 0
    // detects residual Z. After decoding the syndromes always clear, so any
    // residual that anticommutes a logical observable is an UNCORRECTABLE
    // logical error — the chain wrapped the patch.
    const exResid = new Set<number>()
    const ezResid = new Set<number>()
    for (const [q, p] of errors) {
      if (p === 'X' || p === 'Y') exResid.add(q)
      if (p === 'Z' || p === 'Y') ezResid.add(q)
    }
    const toggle = (set: Set<number>, q: number) =>
      set.has(q) ? set.delete(q) : set.add(q)
    for (const q of xCorr) toggle(exResid, q)
    for (const q of zCorr) toggle(ezResid, q)

    let lz = 0 // logical-Z observable (Z on column 0) ⋅ residual X
    let lx = 0 // logical-X observable (X on row 0)    ⋅ residual Z
    for (let r = 0; r < d; r++) {
      const id = lattice.qubitAt.get(`${r},0`)!
      if (exResid.has(id)) lz ^= 1
    }
    for (let c = 0; c < d; c++) {
      const id = lattice.qubitAt.get(`0,${c}`)!
      if (ezResid.has(id)) lx ^= 1
    }
    const logical = lz === 1 || lx === 1

    return {
      chains,
      logical,
      totalWeight: zMatch.weight + xMatch.weight,
      nLit: litStabs.length,
    }
  }, [lattice, lit, d, errors])

  // ── glow pulse rAF (the ONLY animation) ────────────────────────────────────
  useEffect(() => {
    const active = lit.size > 0
    if (!active || !inView || reducedMotion()) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      startRef.current = null
      // static rings under reduced motion / off-screen: full-strength glow
      setPulse(1)
      return
    }
    const tick = (now: number) => {
      if (startRef.current == null) startRef.current = now
      const elapsed = (now - startRef.current) / 1000
      // 0.5 .. 1 sinusoid, ~1.4 s period
      setPulse(0.75 + 0.25 * Math.sin((elapsed / 1.4) * 2 * Math.PI))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [lit, inView])

  // ── viewBox: margin around the d×d grid (account for boundary checks at ±0.5)
  const PAD = 1.2
  const span = d - 1
  const VB_MIN = -PAD
  const VB_SIZE = span + 2 * PAD
  // scale to a comfortable on-screen size via a unit-per-px factor
  const U = 56 // px per lattice unit in the rendered viewBox space
  const vb = {
    x: VB_MIN * U,
    y: VB_MIN * U,
    w: VB_SIZE * U,
    h: VB_SIZE * U,
  }
  const px = (v: number) => v * U

  // sorted, comma-joined readouts for tests
  const litList = useMemo(() => [...lit].sort((a, b) => a - b).join(','), [lit])
  const errList = useMemo(
    () =>
      [...errors.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([q, p]) => `${q}:${p}`)
        .join(','),
    [errors],
  )

  const verdict = !decoded
    ? null
    : decode.logical
      ? 'LOGICAL'
      : 'CORRECTED'

  const qColor = (p: Pauli) =>
    p === 'X' ? X_COLOR : p === 'Z' ? Z_COLOR : p === 'Y' ? '#d98b5f' : null

  const glow = (base: number) => 0.35 + base * (0.55 + 0.45 * pulse)

  return (
    <figure
      ref={inViewRef}
      className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface"
      data-lit-syndromes={litList}
      data-errors={errList}
      data-distance={d}
      data-decoded={decoded ? '1' : '0'}
      data-verdict={verdict ?? ''}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          surface code · d = {d} · click a qubit
        </span>
        <div className="flex items-center gap-2">
          {/* X / Z paint toggle */}
          <div className="flex overflow-hidden rounded-md border border-[var(--color-border)]">
            {(['X', 'Z'] as ErrType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPaintType(t)}
                aria-pressed={paintType === t}
                className="px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider transition-colors"
                style={{
                  background:
                    paintType === t
                      ? `color-mix(in srgb, ${t === 'X' ? X_COLOR : Z_COLOR} 22%, transparent)`
                      : 'transparent',
                  color:
                    paintType === t
                      ? t === 'X'
                        ? X_COLOR
                        : Z_COLOR
                      : 'var(--color-muted)',
                }}
              >
                {t} err
              </button>
            ))}
          </div>
          {showDecoder && (
            <button
              type="button"
              onClick={() => setDecoded((v) => !v)}
              disabled={errors.size === 0}
              className="rounded-md border border-[var(--color-border)] bg-surface px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider text-fg transition-colors hover:border-[var(--color-muted)] disabled:opacity-40"
            >
              {decoded ? 'undecode' : 'decode'}
            </button>
          )}
          <button
            type="button"
            onClick={clear}
            disabled={errors.size === 0}
            className="rounded-md border border-[var(--color-border)] bg-surface px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider text-fg transition-colors hover:border-[var(--color-muted)] disabled:opacity-40"
          >
            clear
          </button>
        </div>
      </div>

      <div className="px-2 py-4 sm:px-4">
        <svg
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          className="block h-auto w-full"
          style={{ maxWidth: 460, margin: '0 auto' }}
          role="img"
          aria-label={`A distance ${d} surface-code patch. Data qubits are dots on a ${d} by ${d} grid; teal squares are Z parity checks and purple diamonds are X parity checks. Painted Pauli errors light the checks whose parity is odd as glowing syndromes.`}
        >
          {/* faint lattice grid lines */}
          <g
            stroke="color-mix(in srgb, var(--color-border) 60%, transparent)"
            strokeWidth={1}
          >
            {Array.from({ length: d }).map((_, r) => (
              <line
                key={`h-${r}`}
                x1={px(0)}
                y1={px(r)}
                x2={px(span)}
                y2={px(r)}
              />
            ))}
            {Array.from({ length: d }).map((_, c) => (
              <line
                key={`v-${c}`}
                x1={px(c)}
                y1={px(0)}
                x2={px(c)}
                y2={px(span)}
              />
            ))}
          </g>

          {/* stabilisers: Z squares (teal), X diamonds (purple) */}
          {lattice.stabs.map((s) => {
            const isLit = lit.has(s.id)
            const color = s.type === 'Z' ? Z_COLOR : X_COLOR
            const half = 0.34 * U
            const cx = px(s.cx)
            const cy = px(s.cy)
            const fillOpacity = isLit ? glow(0.5) : 0.1
            return (
              <g key={`s-${s.id}`}>
                {s.type === 'Z' ? (
                  <rect
                    x={cx - half}
                    y={cy - half}
                    width={half * 2}
                    height={half * 2}
                    rx={4}
                    fill={color}
                    fillOpacity={fillOpacity}
                    stroke={color}
                    strokeWidth={isLit ? 2 : 1}
                    strokeOpacity={isLit ? 1 : 0.5}
                  />
                ) : (
                  <rect
                    x={cx - half}
                    y={cy - half}
                    width={half * 2}
                    height={half * 2}
                    rx={4}
                    fill={color}
                    fillOpacity={fillOpacity}
                    stroke={color}
                    strokeWidth={isLit ? 2 : 1}
                    strokeOpacity={isLit ? 1 : 0.5}
                    transform={`rotate(45 ${cx} ${cy})`}
                  />
                )}
                {/* syndrome glow ring */}
                {isLit && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={half * 1.7}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeOpacity={0.35 + 0.45 * pulse}
                    data-syndrome={s.id}
                  />
                )}
              </g>
            )
          })}

          {/* decoder correction chains */}
          {decoded &&
            decode.chains.map((ch, i) => {
              const color = ch.type === 'Z' ? Z_COLOR : X_COLOR
              const dpath = ch.pts
                .map((p, j) => `${j === 0 ? 'M' : 'L'} ${px(p[0])} ${px(p[1])}`)
                .join(' ')
              return (
                <path
                  key={`chain-${i}`}
                  d={dpath}
                  fill="none"
                  stroke={color}
                  strokeWidth={3}
                  strokeDasharray="2 4"
                  strokeLinecap="round"
                  opacity={0.85}
                  data-correction={ch.type}
                />
              )
            })}

          {/* data qubits — clickable dots on the grid */}
          {lattice.qubits.map((q) => {
            const p = errors.get(q.id) ?? 'I'
            const fc = qColor(p)
            const cx = px(q.x)
            const cy = px(q.y)
            return (
              <g
                key={`q-${q.id}`}
                role="button"
                tabIndex={0}
                aria-label={`data qubit row ${q.r} column ${q.c}, error ${p}`}
                onClick={() => setError(q.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setError(q.id)
                  }
                }}
                style={{ cursor: 'pointer' }}
                data-qubit={q.id}
                data-error={p}
              >
                {/* generous invisible hit area for touch */}
                <circle cx={cx} cy={cy} r={U * 0.42} fill="transparent" />
                {/* Y = both: split-fill ring in X colour + Z core */}
                {p === 'Y' ? (
                  <>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={9}
                      fill="none"
                      stroke={X_COLOR}
                      strokeWidth={3}
                    />
                    <circle cx={cx} cy={cy} r={5} fill={Z_COLOR} />
                  </>
                ) : (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={fc ? 8 : 5}
                    fill={fc ?? 'var(--color-fg)'}
                    stroke={fc ? fc : 'var(--color-border)'}
                    strokeWidth={fc ? 0 : 1}
                    fillOpacity={fc ? 0.95 : 0.55}
                  />
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <label
            htmlFor="scl-d"
            className="whitespace-nowrap font-mono text-[0.7rem] uppercase tracking-wider text-muted"
          >
            distance
          </label>
          <input
            id="scl-d"
            type="range"
            min={3}
            max={7}
            step={2}
            value={d}
            onChange={(e) => setD(Number(e.target.value) as Distance)}
            className="h-1.5 min-w-[120px] flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-blog)]"
          />
          <span className="w-12 text-right font-mono text-[0.78rem] tabular-nums text-fg">
            d = {d}
          </span>
          {/* live readouts */}
          <div className="flex items-center gap-3 font-mono text-[0.66rem] uppercase tracking-wider">
            <span className="flex items-center gap-1.5" style={{ color: Z_COLOR }}>
              <span
                className="inline-block h-2.5 w-2.5 rounded-[2px]"
                style={{ background: Z_COLOR }}
              />
              Z check
            </span>
            <span className="flex items-center gap-1.5" style={{ color: X_COLOR }}>
              <span
                className="inline-block h-2.5 w-2.5 rotate-45"
                style={{ background: X_COLOR }}
              />
              X check
            </span>
            <span className="text-muted">
              lit:{' '}
              <span className="tabular-nums text-fg">{lit.size}</span>
            </span>
          </div>
        </div>

        {decoded && (
          <p className="mt-3 font-mono text-[0.7rem] leading-snug">
            <span className="uppercase tracking-wider text-muted">
              decoder ·{' '}
            </span>
            <span
              className="font-semibold uppercase tracking-wider"
              style={{ color: decode.logical ? X_COLOR : Z_COLOR }}
            >
              {decode.logical ? 'LOGICAL error' : 'CORRECTED'}
            </span>
            <span className="text-muted">
              {' '}
              — matched {decode.nLit} syndrome
              {decode.nLit === 1 ? '' : 's'} at total weight{' '}
              <span className="tabular-nums text-fg">{decode.totalWeight}</span>.{' '}
              {decode.logical
                ? 'error + correction wraps a logical operator across the patch — the stored qubit flipped.'
                : 'error + correction forms a closed loop (a stabiliser) — the stored qubit survives.'}
            </span>
          </p>
        )}

        <p className="mt-2 font-mono text-[0.66rem] leading-snug text-muted">
          Each check lights iff an{' '}
          <span className="text-fg">odd</span> number of its data qubits carry an
          anticommuting error: a{' '}
          <span style={{ color: Z_COLOR }}>Z-check</span> flips for{' '}
          <span style={{ color: X_COLOR }}>X errors</span>, an{' '}
          <span style={{ color: X_COLOR }}>X-check</span> flips for{' '}
          <span style={{ color: Z_COLOR }}>Z errors</span>. A single error lights
          its two neighbouring checks; a <em>chain</em> of errors lights only its
          two endpoints, because every interior check sees two flips and cancels.
          You never see the errors — only the boundary of the chain.
        </p>
      </div>
    </figure>
  )
}
