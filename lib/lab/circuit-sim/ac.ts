import type { Circuit, CircuitComponent, Probe } from './types'
import { componentNodes } from './types'
import { cluSolve } from './complex-solver'
import { solveDC } from './solver'
import { diodeSmallSignalG, SW_ON, SW_OFF } from './devices'

/**
 * AC (phasor) small-signal frequency sweep.
 *
 * Builds a complex Modified Nodal Analysis system per frequency and solves it
 * with the complex LU solver. One source is the unit stimulus (the "input");
 * all other independent sources are AC-grounded. Reactive elements use their
 * complex admittances (C → jωC, L → 1/jωL). Result is Bode data (magnitude in
 * dB + phase in degrees) per probe.
 *
 * Headless: no React/DOM/canvas.
 */

export interface ACOptions {
  fStart: number
  fStop: number
  points: number
}

export interface BodeChannel {
  id: string
  label: string
  color: string
  /** magnitude in dB per frequency */
  mag: number[]
  /** phase in degrees per frequency */
  phase: number[]
}

export interface BodeResult {
  freqs: number[]
  channels: BodeChannel[]
  /** id of the source used as the unit stimulus, or null if none. */
  stimulusId: string | null
}

const DEFAULT_OPTIONS: ACOptions = { fStart: 1, fStop: 1e6, points: 100 }

/** Log-spaced frequency list. */
function logFreqs(o: ACOptions): number[] {
  const n = Math.max(1, Math.floor(o.points))
  if (n === 1) return [o.fStart]
  const ratio = o.fStop / o.fStart
  const out: number[] = []
  for (let i = 0; i < n; i++) out.push(o.fStart * Math.pow(ratio, i / (n - 1)))
  return out
}

export function acSweep(circuit: Circuit, options: Partial<ACOptions>, probes: Probe[]): BodeResult {
  const o = { ...DEFAULT_OPTIONS, ...options }
  const freqs = logFreqs(o)

  // ── Node ordering (non-ground; includes op-amp 3rd terminal) ─────
  const nodeSet = new Set<number>()
  for (const c of circuit.components) {
    for (const nd of componentNodes(c)) if (nd > 0) nodeSet.add(nd)
  }
  const nodeOrder = [...nodeSet].sort((a, b) => a - b)
  const rowOf = new Map<number, number>()
  nodeOrder.forEach((nid, i) => rowOf.set(nid, i))
  const n = nodeOrder.length

  // ── Voltage sources + op-amps get branch rows ───────────────────
  const branchComps = circuit.components.filter(c => c.type === 'V' || c.type === 'OP')
  const vBranch = new Map<string, number>()
  branchComps.forEach((c, i) => vBranch.set(c.id, n + i))
  const size = n + branchComps.length

  // ── Stimulus: first source with acMag, else first V source, else first I ──
  const stimulus =
    circuit.components.find(c => (c.type === 'V' || c.type === 'I') && c.acMag !== undefined) ??
    circuit.components.find(c => c.type === 'V') ??
    circuit.components.find(c => c.type === 'I') ??
    null
  const inputMag = stimulus ? (stimulus.acMag ?? 1) : 1

  const empty: BodeResult = {
    freqs,
    channels: probes.map(p => ({ id: p.id, label: p.label, color: p.color, mag: [], phase: [] })),
    stimulusId: stimulus?.id ?? null,
  }
  if (size === 0 || !stimulus) return empty

  const row = (node: number) => (node === 0 ? -1 : (rowOf.get(node) ?? -1))

  // Diodes linearize to a small-signal conductance about the DC operating point.
  const diodeG = new Map<string, number>()
  if (circuit.components.some(c => c.type === 'D')) {
    const dc = solveDC(circuit)
    for (const c of circuit.components) {
      if (c.type !== 'D') continue
      const vd = dc ? (dc[c.nodeA] ?? 0) - (dc[c.nodeB] ?? 0) : 0
      diodeG.set(c.id, diodeSmallSignalG(vd))
    }
  }

  const channels: BodeChannel[] = probes.map(p => ({ id: p.id, label: p.label, color: p.color, mag: [], phase: [] }))

  for (const f of freqs) {
    const w = 2 * Math.PI * f
    const A = new Float64Array(size * size * 2)
    const b = new Float64Array(size * 2)
    const addA = (r: number, c: number, re: number, im: number) => {
      const k = (r * size + c) * 2
      A[k] += re; A[k + 1] += im
    }
    const addB = (r: number, re: number, im: number) => { b[r * 2] += re; b[r * 2 + 1] += im }

    const stampY = (a: number, bb: number, re: number, im: number) => {
      if (a >= 0) addA(a, a, re, im)
      if (bb >= 0) addA(bb, bb, re, im)
      if (a >= 0 && bb >= 0) { addA(a, bb, -re, -im); addA(bb, a, -re, -im) }
    }

    for (const c of circuit.components) {
      const a = row(c.nodeA), bb = row(c.nodeB)
      switch (c.type) {
        case 'R': if (c.value > 0) stampY(a, bb, 1 / c.value, 0); break
        case 'C': stampY(a, bb, 0, w * c.value); break
        case 'L': if (c.value > 0 && w > 0) stampY(a, bb, 0, -1 / (w * c.value)); break
        case 'D': stampY(a, bb, diodeG.get(c.id) ?? 0, 0); break
        case 'SW': stampY(a, bb, c.closed ? SW_ON : SW_OFF, 0); break
        case 'I': {
          const mag = c === stimulus ? inputMag : 0
          if (a >= 0) addB(a, mag, 0)
          if (bb >= 0) addB(bb, -mag, 0)
          break
        }
        case 'V': {
          const vr = vBranch.get(c.id)!
          if (a >= 0) { addA(a, vr, 1, 0); addA(vr, a, 1, 0) }
          if (bb >= 0) { addA(bb, vr, -1, 0); addA(vr, bb, -1, 0) }
          addB(vr, c === stimulus ? inputMag : 0, 0)
          break
        }
        case 'OP': {
          // Ideal nullor: output current into nodeC; constraint V(in+) − V(in−) = 0.
          const br = vBranch.get(c.id)!
          const out = row(c.nodeC ?? 0)
          if (out >= 0) addA(out, br, 1, 0)
          if (a >= 0) addA(br, a, 1, 0)
          if (bb >= 0) addA(br, bb, -1, 0)
          break
        }
      }
    }

    const x = cluSolve(size, A, b)

    for (let pi = 0; pi < probes.length; pi++) {
      const p = probes[pi]
      let re = 0, im = 0
      let ref = inputMag
      if (!x) { channels[pi].mag.push(-200); channels[pi].phase.push(0); continue }

      const nodePhasor = (node: number): [number, number] => {
        const r = row(node)
        return r < 0 ? [0, 0] : [x[r * 2], x[r * 2 + 1]]
      }

      if (p.kind === 'nodeV') {
        [re, im] = nodePhasor(p.ref as number)
      } else {
        const comp = circuit.components.find(cc => cc.id === p.ref)
        if (comp) {
          const [ar, ai] = nodePhasor(comp.nodeA)
          const [br, bi] = nodePhasor(comp.nodeB)
          if (p.kind === 'compV') {
            re = ar - br; im = ai - bi
          } else {
            // compI: admittance · Vacross (R/L/C), branch current (V), source (I)
            const dvr = ar - br, dvi = ai - bi
            ref = 1
            if (comp.type === 'R' && comp.value > 0) { re = dvr / comp.value; im = dvi / comp.value }
            else if (comp.type === 'C') { re = -w * comp.value * dvi; im = w * comp.value * dvr }
            else if (comp.type === 'L' && comp.value > 0 && w > 0) { const yl = -1 / (w * comp.value); re = -yl * dvi; im = yl * dvr }
            else if (comp.type === 'V') { const vr = vBranch.get(comp.id); if (vr !== undefined) { re = x[vr * 2]; im = x[vr * 2 + 1] } }
            else if (comp.type === 'I') { re = comp === stimulus ? inputMag : 0; im = 0 }
            else if (comp.type === 'D') { const g = diodeG.get(comp.id) ?? 0; re = g * dvr; im = g * dvi }
            else if (comp.type === 'SW') { const g = comp.closed ? SW_ON : SW_OFF; re = g * dvr; im = g * dvi }
          }
        }
      }

      const m = Math.hypot(re, im)
      const db = m > 0 && ref > 0 ? 20 * Math.log10(m / ref) : -200
      const deg = (Math.atan2(im, re) * 180) / Math.PI
      channels[pi].mag.push(db)
      channels[pi].phase.push(deg)
    }
  }

  return { freqs, channels, stimulusId: stimulus.id }
}

/** Convenience: AC magnitude/phase of a single node at one frequency (for tests). */
export function acPointAtNode(circuit: Circuit, freq: number, nodeId: number): { db: number; deg: number } {
  const probe: Probe = {
    id: `nodeV:${nodeId}`, kind: 'nodeV', ref: nodeId, label: `N${nodeId}`,
    color: '#fff', visible: true, unit: 'V', samples: new Float64Array(0), writeIdx: 0, count: 0,
  }
  const r = acSweep(circuit, { fStart: freq, fStop: freq, points: 1 }, [probe])
  return { db: r.channels[0].mag[0], deg: r.channels[0].phase[0] }
}

export type { CircuitComponent }
