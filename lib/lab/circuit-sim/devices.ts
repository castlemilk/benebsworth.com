import type { CircuitComponent, ComponentType, SimulationState } from './types'
import { sourceValue } from './sources'

/**
 * Per-device "stamp" abstraction. Each component type contributes entries to a
 * Modified Nodal Analysis (MNA) system through a StampContext. One assembler
 * (mna.ts) loops components and dispatches the right stamp for the current
 * solve mode. This keeps DC / transient / nonlinear / AC stamping in one place
 * per device instead of scattered across solver.ts and transient.ts.
 */

export interface StampContext {
  /** Total matrix dimension (non-ground nodes + branch rows). */
  size: number
  /** Matrix row for a node, or null for ground (node 0). */
  row(node: number): number | null
  /** Allocate the next branch/voltage-source row. */
  vsRow(): number
  /** Accumulate into the A matrix (row-major). */
  addG(r: number, c: number, v: number): void
  /** Accumulate into the z (RHS) vector. */
  addZ(r: number, v: number): void
  /** Optional: record which branch row a component's current variable lives in. */
  branchRows?: Map<string, number>
}

export interface SolveEnv {
  mode: 'dc' | 'transient'
  /** Timestep (transient only). */
  dt: number
  /** Current simulation time in seconds (for time-varying sources). */
  time: number
  /** Companion + voltage state carried across timesteps. */
  state: SimulationState
  /** Current Newton-Raphson guess (node voltages + branch currents). */
  prev?: Float64Array
  /** Per-device nonlinear state across NR iterations (diode: last junction voltage). */
  nrState?: Map<string, number>
  /** Set by a device when its junction voltage was actively limited this iteration. */
  nrFlags?: { limited: boolean }
}

export type StampFn = (comp: CircuitComponent, ctx: StampContext, env: SolveEnv) => void

// ── Shared stamp primitives ────────────────────────────────────────

/** Stamp a conductance g across (ai, bi); null = ground. */
function stampConductance(ctx: StampContext, ai: number | null, bi: number | null, g: number) {
  if (ai !== null) {
    ctx.addG(ai, ai, g)
    if (bi !== null) {
      ctx.addG(bi, bi, g)
      ctx.addG(ai, bi, -g)
      ctx.addG(bi, ai, -g)
    }
  } else if (bi !== null) {
    ctx.addG(bi, bi, g)
  }
}

/** Inject a Norton-equivalent current iEq INTO node a, OUT of node b. */
function stampCurrent(ctx: StampContext, ai: number | null, bi: number | null, iEq: number) {
  if (ai !== null) ctx.addZ(ai, iEq)
  if (bi !== null) ctx.addZ(bi, -iEq)
}

/** Stamp an ideal voltage source of `value` volts across (nodeA, nodeB). */
function stampVoltageSource(comp: CircuitComponent, ctx: StampContext, value: number) {
  const ai = ctx.row(comp.nodeA), bi = ctx.row(comp.nodeB)
  const vr = ctx.vsRow()
  if (ai !== null) { ctx.addG(ai, vr, 1); ctx.addG(vr, ai, 1) }
  if (bi !== null) { ctx.addG(bi, vr, -1); ctx.addG(vr, bi, -1) }
  ctx.addZ(vr, value)
  ctx.branchRows?.set(comp.id, vr)
}

// ── DC stamps ──────────────────────────────────────────────────────

const stampResistor: StampFn = (c, ctx) => {
  if (c.value <= 0) return
  stampConductance(ctx, ctx.row(c.nodeA), ctx.row(c.nodeB), 1 / c.value)
}

const noop: StampFn = () => { /* no contribution */ }

const stampInductorDC: StampFn = (c, ctx) => {
  // Inductor at DC is a short circuit → 0V voltage source (extra branch row).
  stampVoltageSource(c, ctx, 0)
}

const stampVoltage: StampFn = (c, ctx, env) => {
  stampVoltageSource(c, ctx, sourceValue(c, env.mode, env.time))
}

const stampCurrentSource: StampFn = (c, ctx, env) => {
  // Inject source current INTO nodeA, OUT of nodeB.
  stampCurrent(ctx, ctx.row(c.nodeA), ctx.row(c.nodeB), sourceValue(c, env.mode, env.time))
}

// ── Diode (nonlinear, Newton-Raphson companion) ────────────────────

const D_IS = 1e-14      // saturation current
const D_N = 1           // emission coefficient
const D_VT = 0.025852   // thermal voltage @ ~300K
const D_GMIN = 1e-12    // shunt conductance for convergence
const D_VCRIT = D_N * D_VT * Math.log((D_N * D_VT) / (Math.SQRT2 * D_IS))

/** SPICE-style junction voltage limiting to keep Newton iterations stable. */
function pnjlim(vnew: number, vold: number): number {
  if (vnew > D_VCRIT && Math.abs(vnew - vold) > 2 * D_N * D_VT) {
    if (vold > 0) {
      const arg = 1 + (vnew - vold) / (D_N * D_VT)
      return arg > 0 ? vold + D_N * D_VT * Math.log(arg) : D_VCRIT
    }
    return vnew > 0 ? D_N * D_VT * Math.log(vnew / (D_N * D_VT)) : vnew
  }
  return vnew
}

const stampDiode: StampFn = (c, ctx, env) => {
  const ai = ctx.row(c.nodeA), bi = ctx.row(c.nodeB)
  const va = ai === null ? 0 : (env.prev ? env.prev[ai] : 0)
  const vb = bi === null ? 0 : (env.prev ? env.prev[bi] : 0)
  const rawVd = va - vb
  let vd = rawVd
  if (env.nrState) {
    // Seed the limiter at 0 (not vd) so the first iteration's jump is damped.
    vd = pnjlim(rawVd, env.nrState.get(c.id) ?? 0)
    if (env.nrFlags && Math.abs(vd - rawVd) > 1e-12) env.nrFlags.limited = true
    env.nrState.set(c.id, vd)
  }
  const evd = Math.exp(Math.min(vd / (D_N * D_VT), 80)) // clamp exponent against overflow
  const id = D_IS * (evd - 1)
  const geq = (D_IS / (D_N * D_VT)) * evd + D_GMIN
  const ieq = id - geq * vd
  // Companion: conductance geq across (a,b) + current source removing ieq from a.
  stampConductance(ctx, ai, bi, geq)
  stampCurrent(ctx, ai, bi, -ieq)
}

// ── Switch (linear, state-dependent conductance) ───────────────────

const SW_ON = 1e3   // closed ≈ 1 mΩ
const SW_OFF = 1e-9 // open ≈ 1 GΩ

const stampSwitch: StampFn = (c, ctx) => {
  stampConductance(ctx, ctx.row(c.nodeA), ctx.row(c.nodeB), c.closed ? SW_ON : SW_OFF)
}

// ── Transient stamps (trapezoidal companion models) ────────────────

const stampCapacitorTransient: StampFn = (c, ctx, env) => {
  const C = c.value
  if (C <= 0 || env.dt <= 0) return
  const gEq = (2 * C) / env.dt
  let cs = env.state.capState.get(c.id)
  if (!cs) { cs = { vPrev: 0, iPrev: 0 }; env.state.capState.set(c.id, cs) }
  // I_eq = (2C/dt)·v_prev + i_prev
  const iEq = gEq * cs.vPrev + cs.iPrev
  const ai = ctx.row(c.nodeA), bi = ctx.row(c.nodeB)
  stampConductance(ctx, ai, bi, gEq)
  stampCurrent(ctx, ai, bi, iEq)
}

const stampInductorTransient: StampFn = (c, ctx, env) => {
  const L = c.value
  if (L <= 0 || env.dt <= 0) return
  const gEq = env.dt / (2 * L)
  let cs = env.state.indState.get(c.id)
  if (!cs) { cs = { vPrev: 0, iPrev: 0 }; env.state.indState.set(c.id, cs) }
  // I_eq = i_prev + (dt/2L)·v_prev
  const iEq = cs.iPrev + gEq * cs.vPrev
  const ai = ctx.row(c.nodeA), bi = ctx.row(c.nodeB)
  stampConductance(ctx, ai, bi, gEq)
  stampCurrent(ctx, ai, bi, iEq)
}

// ── Registries ─────────────────────────────────────────────────────

export const DC_STAMPS: Record<ComponentType, StampFn> = {
  R: stampResistor,
  C: noop, // open circuit at DC
  L: stampInductorDC,
  V: stampVoltage,
  I: stampCurrentSource,
  D: stampDiode,
  SW: stampSwitch,
  GND: noop,
}

export const TRANSIENT_STAMPS: Record<ComponentType, StampFn> = {
  R: stampResistor,
  C: stampCapacitorTransient,
  L: stampInductorTransient,
  V: stampVoltage,
  I: stampCurrentSource,
  D: stampDiode,
  SW: stampSwitch,
  GND: noop,
}

// Exposed for reuse by later phases (current source, diode, op-amp, etc.)
export { stampConductance, stampCurrent, stampVoltageSource }
