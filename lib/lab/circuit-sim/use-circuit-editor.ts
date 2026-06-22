'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import type {
  Circuit,
  CircuitComponent,
  CircuitWire,
  ComponentType,
  SimulationState,
  Probe,
  ProbeKind,
  ScopeSettings,
  AnalysisMode,
} from './types'
import { DEFAULT_COMPONENT_VALUES, DEFAULT_WAVEFORM, DEFAULT_SCOPE_SETTINGS } from './types'
import type { Waveform } from './types'
import { transientStep } from './transient'
import { validateCircuit, type CircuitDiagnostic } from './validator'
import { solveDC } from './solver'
import { solveOperatingPoint, type OperatingPoint } from './operating-point'
import { nodeVoltage, componentCurrent, componentVoltage } from './results'
import { acSweep, type ACOptions, type BodeResult } from './ac'
import { serializeCircuit, deserializeCircuit } from './yaml'
import { generateWires } from './wiring'

/** Build a probe with a stable id, display label, and unit. */
function makeProbe(kind: ProbeKind, ref: number | string, circuit: Circuit, colorIdx: number): Probe {
  let label: string
  let unit: 'V' | 'A' = 'V'
  if (kind === 'nodeV') {
    label = `N${ref}`
  } else {
    const comp = circuit.components.find(c => c.id === ref)
    const name = comp ? `${comp.type}${String(comp.id).replace(/^c/, '')}` : String(ref)
    if (kind === 'compI') { label = `I(${name})`; unit = 'A' } else { label = `V(${name})` }
  }
  return {
    id: `${kind}:${ref}`,
    kind, ref, label, unit,
    color: TRACE_COLORS[colorIdx % TRACE_COLORS.length],
    visible: true,
    samples: new Float64Array(MAX_SCOPE_SAMPLES),
    writeIdx: 0,
    count: 0,
  }
}

const MAX_SCOPE_SAMPLES = 2000
const HISTORY_LIMIT = 80

interface CircuitEditorState {
  circuit: Circuit
  /** Undo stack (older circuit snapshots, most recent last). */
  past: Circuit[]
  /** Redo stack (newer circuit snapshots, most recent first). */
  future: Circuit[]
  /** Coalescing key for the in-flight gesture (drags/typing collapse to one undo step). */
  historyCoalesce: string | null
  /** Currently active tool/component type being placed */
  placingType: ComponentType | null
  /** Currently dragging component id */
  draggingId: string | null
  /** Currently wiring: source comp id */
  wiringFrom: string | null
  /** Which terminal of wiringFrom was selected ('A' or 'B') */
  wiringFromNode: string | null
  /** Selected component id */
  selectedId: string | null
  /** Simulation state */
  sim: SimulationState | null
  /** True when the sim is stopped mid-run with state intact (Run resumes vs restarts). */
  paused: boolean
  /** Simulation timestep in seconds */
  dt: number
  /** Total simulation time limit */
  simDuration: number
  /** Playback rate multiplier for the transient loop (sim-seconds per frame). */
  simSpeed: number
  /** Active probes (scope channels) */
  probes: Probe[]
  /** Oscilloscope display settings */
  scopeSettings: ScopeSettings
  /** Time-domain (transient) vs frequency-domain (AC) analysis */
  analysisMode: AnalysisMode
  /** AC sweep options */
  acOptions: ACOptions
  /** Latest computed Bode result (AC mode) */
  bode: BodeResult | null
  /** Show the DC operating point (node V + branch I) overlaid on the schematic. */
  showDcOverlay: boolean
  /** Latest solved DC operating point (when the overlay is on and no sim is running). */
  dcOp: OperatingPoint | null
  /** Validation errors */
  errors: CircuitDiagnostic[]
  /** View offset (pan) */
  panX: number
  panY: number
  /** Zoom scale */
  zoom: number
}

const TRACE_COLORS = ['#ff7a59', '#6bcb77', '#00b4d8', '#ffd93d', '#7c5cff', '#ff6b9d']

function newCircuit(): Circuit {
  return { components: [], wires: [], nextNodeId: 1, nextCompId: 1 }
}

function newSimState(): SimulationState {
  return {
    nodeVoltages: new Float64Array(0),
    vsCurrents: new Float64Array(0),
    capState: new Map(),
    indState: new Map(),
    time: 0,
    running: false,
  }
}

/**
 * Advance the transient sim by one animation frame's worth of steps. Pure:
 * clones the incoming sim state + probe ring buffers, never mutates them, so it's
 * safe to call from both the rAF loop and a manual single-step. Returns the new
 * sim state and probe array (or the originals if nothing could be stepped).
 */
function runFrame(
  circuit: Circuit,
  simIn: SimulationState,
  probesIn: Probe[],
  dt: number,
  simDuration: number,
  speed: number,
): { sim: SimulationState; probes: Probe[] } {
  // Deep-copy companion state: transientStep mutates {vPrev,iPrev} objects in place,
  // so the *values* must be cloned too (a shallow new Map would share them by reference
  // and leak mutations back into the caller's sim — breaking this function's purity).
  const simState: SimulationState = {
    ...simIn,
    capState: new Map([...simIn.capState].map(([k, v]) => [k, { ...v }])),
    indState: new Map([...simIn.indState].map(([k, v]) => [k, { ...v }])),
  }
  const probes = probesIn.length > 0 ? probesIn.map(p => ({ ...p, samples: p.samples.slice() })) : probesIn

  let t = simState.time
  const targetTime = Math.min(t + dt * 100 * speed, simDuration)
  const maxSteps = Math.min(2000, Math.max(20, Math.round(200 * speed)))
  let stepCount = 0
  while (t < targetTime && stepCount < maxSteps) {
    const voltages = transientStep(circuit, simState, dt)
    if (!voltages) break
    simState.nodeVoltages = voltages
    simState.time = t + dt

    for (const p of probes) {
      let val = 0
      if (p.kind === 'nodeV') {
        val = nodeVoltage(simState, p.ref as number)
      } else {
        const comp = circuit.components.find(c => c.id === p.ref)
        if (comp) val = p.kind === 'compI' ? componentCurrent(circuit, comp, simState) : componentVoltage(simState, comp)
      }
      p.samples[p.writeIdx] = val
      p.writeIdx = (p.writeIdx + 1) % MAX_SCOPE_SAMPLES
      p.count = Math.min(p.count + 1, MAX_SCOPE_SAMPLES)
    }

    t += dt
    stepCount++
  }
  simState.time = t

  // Continuous sweep: when time reaches the window end, wrap for the next pass.
  if (t >= simDuration) {
    simState.time = 0
    simState.capState.clear()
    simState.indState.clear()
    simState.nodeVoltages = new Float64Array(circuit.nextNodeId).fill(0)
  }
  return { sim: simState, probes }
}

export function useCircuitEditor() {
  const [state, setState] = useState<CircuitEditorState>({
    circuit: newCircuit(),
    past: [],
    future: [],
    historyCoalesce: null,
    placingType: null,
    draggingId: null,
    wiringFrom: null,
    wiringFromNode: null,
    selectedId: null,
    sim: null,
    paused: false,
    dt: 1e-5,
    simDuration: 0.1,
    simSpeed: 1,
    probes: [],
    scopeSettings: DEFAULT_SCOPE_SETTINGS,
    analysisMode: 'transient',
    acOptions: { fStart: 1, fStop: 1e6, points: 140 },
    bode: null,
    showDcOverlay: false,
    dcOp: null,
    errors: [],
    panX: 0,
    panY: 0,
    zoom: 1,
  })

  const rafRef = useRef(0)

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  // Live validation on every circuit change
  useEffect(() => {
    const errors = validateCircuit(state.circuit)
    setState(prev => ({ ...prev, errors }))
  }, [state.circuit])

  // AC mode: recompute the Bode sweep whenever the circuit, probes, or options change.
  useEffect(() => {
    if (state.analysisMode !== 'ac') return
    const errors = validateCircuit(state.circuit)
    if (errors.some(e => e.severity === 'error')) {
      setState(prev => ({ ...prev, bode: null }))
      return
    }
    const bode = acSweep(state.circuit, state.acOptions, state.probes)
    setState(prev => ({ ...prev, bode }))
  }, [state.analysisMode, state.circuit, state.probes, state.acOptions])

  // DC operating-point overlay: resolve the steady state whenever the overlay is
  // on and no live transient is running (the running sim owns the heat coloring).
  useEffect(() => {
    if (!state.showDcOverlay || state.sim?.running) {
      setState(prev => (prev.dcOp ? { ...prev, dcOp: null } : prev))
      return
    }
    const errors = validateCircuit(state.circuit)
    if (errors.some(e => e.severity === 'error')) {
      setState(prev => (prev.dcOp ? { ...prev, dcOp: null } : prev))
      return
    }
    const op = solveOperatingPoint(state.circuit)
    setState(prev => ({ ...prev, dcOp: op }))
  }, [state.showDcOverlay, state.circuit, state.sim?.running])

  const mutate = useCallback((fn: (s: CircuitEditorState) => Partial<CircuitEditorState>) => {
    setState(prev => {
      const updates = fn(prev)
      return { ...prev, ...updates }
    })
  }, [])

  // ── Edit history ─────────────────────────────────────────────────
  // Commit a new circuit, checkpointing the previous one for undo. A coalesce key
  // collapses a continuous gesture (a drag, a burst of keystrokes) into one step.
  function commit(s: CircuitEditorState, nextCircuit: Circuit, coalesceKey?: string): Partial<CircuitEditorState> {
    if (coalesceKey && coalesceKey === s.historyCoalesce) {
      return { circuit: nextCircuit }
    }
    const past = [...s.past, s.circuit]
    if (past.length > HISTORY_LIMIT) past.shift()
    return { circuit: nextCircuit, past, future: [], historyCoalesce: coalesceKey ?? null }
  }

  /** Close the current coalescing window so the next edit starts a fresh undo step. */
  const endInteraction = useCallback(() => {
    mutate(s => (s.historyCoalesce ? { historyCoalesce: null } : {}))
  }, [mutate])

  const undo = useCallback(() => {
    mutate(s => {
      if (s.past.length === 0) return {}
      const prev = s.past[s.past.length - 1]
      const selValid = prev.components.some(c => c.id === s.selectedId)
      return {
        circuit: prev,
        past: s.past.slice(0, -1),
        future: [s.circuit, ...s.future].slice(0, HISTORY_LIMIT),
        historyCoalesce: null,
        selectedId: selValid ? s.selectedId : null,
        probes: pruneProbes(s.probes, prev),
      }
    })
  }, [mutate])

  const redo = useCallback(() => {
    mutate(s => {
      if (s.future.length === 0) return {}
      const next = s.future[0]
      const selValid = next.components.some(c => c.id === s.selectedId)
      return {
        circuit: next,
        past: [...s.past, s.circuit].slice(-HISTORY_LIMIT),
        future: s.future.slice(1),
        historyCoalesce: null,
        selectedId: selValid ? s.selectedId : null,
        probes: pruneProbes(s.probes, next),
      }
    })
  }, [mutate])

  // ── Circuit editing ──────────────────────────────────────────────

  const setPlacingType = useCallback((type: ComponentType | null) => {
    mutate(() => ({ placingType: type, selectedId: null }))
  }, [mutate])

  const placeComponent = useCallback((type: ComponentType, gx: number, gy: number) => {
    mutate(s => {
      const circuit = { ...s.circuit, components: [...s.circuit.components] }
      const nodeA = circuit.nextNodeId++
      const nodeB = type === 'GND' ? 0 : circuit.nextNodeId++
      const id = `c${circuit.nextCompId++}`
      const comp: CircuitComponent = {
        id, type,
        value: DEFAULT_COMPONENT_VALUES[type],
        nodeA, nodeB,
        x: gx, y: gy,
        rotation: 0,
      }
      if (type === 'GND') {
        comp.nodeA = 0
        comp.nodeB = 0
        comp.value = 0
      }
      if (type === 'OP') {
        comp.nodeC = circuit.nextNodeId++ // output terminal
      }
      circuit.components.push(comp)
      return {
        ...commit(s, { ...circuit, nextNodeId: circuit.nextNodeId, nextCompId: circuit.nextCompId }),
        placingType: null,
        selectedId: id,
      }
    })
  }, [mutate])

  const duplicateComponent = useCallback((id: string) => {
    mutate(s => {
      const src = s.circuit.components.find(c => c.id === id)
      if (!src || src.type === 'GND') return {}
      const circuit = { ...s.circuit, components: [...s.circuit.components] }
      const newId = `c${circuit.nextCompId++}`
      // Fresh, unconnected nodes so the copy is independent of the original.
      const clone: CircuitComponent = {
        ...src,
        id: newId,
        nodeA: circuit.nextNodeId++,
        nodeB: circuit.nextNodeId++,
        nodeC: src.nodeC !== undefined ? circuit.nextNodeId++ : undefined,
        x: src.x + 60,
        y: src.y + 40,
        waveform: src.waveform ? { ...src.waveform } : undefined,
      }
      circuit.components.push(clone)
      return {
        ...commit(s, { ...circuit, nextNodeId: circuit.nextNodeId, nextCompId: circuit.nextCompId }),
        selectedId: newId,
      }
    })
  }, [mutate])

  const selectComponent = useCallback((id: string | null) => {
    mutate(() => ({ selectedId: id }))
  }, [mutate])

  const moveComponent = useCallback((id: string, gx: number, gy: number) => {
    mutate(s => {
      const idx = s.circuit.components.findIndex(c => c.id === id)
      if (idx === -1) return {}
      const cur = s.circuit.components[idx]
      if (cur.x === gx && cur.y === gy) return {}
      const components = [...s.circuit.components]
      components[idx] = { ...cur, x: gx, y: gy }
      // Coalesce the whole drag into a single undo step.
      return commit(s, { ...s.circuit, components }, `move:${id}`)
    })
  }, [mutate])

  const deleteComponent = useCallback((id: string) => {
    mutate(s => {
      const comp = s.circuit.components.find(c => c.id === id)
      if (!comp) return {}
      const components = s.circuit.components.filter(c => c.id !== id)
      // Remove wires connected to deleted nodes (op-amp has a 3rd terminal)
      const deletedNodes = new Set([comp.nodeA, comp.nodeB, comp.nodeC ?? -1])
      const wires = s.circuit.wires.filter(w => !deletedNodes.has(w.nodeA) && !deletedNodes.has(w.nodeB))
      return {
        ...commit(s, { ...s.circuit, components, wires }),
        selectedId: s.selectedId === id ? null : s.selectedId,
        probes: s.probes.filter(p => !((p.kind === 'compI' || p.kind === 'compV') && p.ref === id)),
      }
    })
  }, [mutate])

  const startWire = useCallback((compId: string, nodeHint?: string) => {
    mutate(() => ({ wiringFrom: compId, wiringFromNode: nodeHint ?? null, placingType: null }))
  }, [mutate])

  const completeWire = useCallback((toCompId: string, fromNodeHint?: string, toNodeHint?: string) => {
    mutate(s => {
      if (!s.wiringFrom) return {}
      const fromComp = s.circuit.components.find(c => c.id === s.wiringFrom)
      const toComp = s.circuit.components.find(c => c.id === toCompId)
      if (!fromComp || !toComp || fromComp.id === toComp.id) return { wiringFrom: null }

      // Determine which nodes to connect (C = op-amp output)
      const fromNode = s.wiringFromNode === 'C' ? (fromComp.nodeC ?? 0) : s.wiringFromNode === 'B' ? fromComp.nodeB : fromComp.nodeA
      const toNode = toNodeHint === 'C' ? (toComp.nodeC ?? 0) : toNodeHint === 'B' ? toComp.nodeB : toComp.nodeA

      // Merge nodes: reuse the lower node id across all components/wires
      const keep = Math.min(fromNode, toNode)
      const drop = Math.max(fromNode, toNode)
      const needsMerge = keep !== drop

      let components = s.circuit.components
      let wires = [...s.circuit.wires]

      if (needsMerge) {
        components = components.map(c => {
          let nc = c
          if (c.nodeA === drop) nc = { ...nc, nodeA: keep }
          if (c.nodeB === drop) nc = { ...nc, nodeB: keep }
          if (c.nodeC === drop) nc = { ...nc, nodeC: keep }
          return nc
        })
        wires = wires.map(w => {
          let nw = w
          if (w.nodeA === drop) nw = { ...nw, nodeA: keep }
          if (w.nodeB === drop) nw = { ...nw, nodeB: keep }
          return nw
        })
      }

      // Create a visual wire connecting the two components. Both endpoints
      // are now the merged node `keep`; the renderer resolves which terminal of
      // each component to draw from via fromCompId/toCompId — so they MUST be set.
      const wireId = `w_man_${wires.length}`
      const newWire: CircuitWire = {
        id: wireId,
        nodeA: keep,
        nodeB: keep,
        waypoints: [],
        fromCompId: fromComp.id,
        toCompId: toComp.id,
      }
      wires.push(newWire)

      return {
        ...commit(s, { ...s.circuit, components, wires }),
        wiringFrom: null,
        wiringFromNode: null,
      }
    })
  }, [mutate])

  const cancelWiring = useCallback(() => {
    mutate(() => ({ wiringFrom: null, wiringFromNode: null }))
  }, [mutate])

  const updateComponentValue = useCallback((id: string, value: number) => {
    mutate(s => {
      const idx = s.circuit.components.findIndex(c => c.id === id)
      if (idx === -1) return {}
      const components = [...s.circuit.components]
      components[idx] = { ...components[idx], value }
      return commit(s, { ...s.circuit, components }, `val:${id}`)
    })
  }, [mutate])

  const updateComponentWaveform = useCallback((id: string, partial: Partial<Waveform>) => {
    mutate(s => {
      const idx = s.circuit.components.findIndex(c => c.id === id)
      if (idx === -1) return {}
      const components = [...s.circuit.components]
      const comp = components[idx]
      const base: Waveform = comp.waveform ?? { ...DEFAULT_WAVEFORM, amplitude: comp.value || DEFAULT_WAVEFORM.amplitude }
      const wf: Waveform = { ...base, ...partial }
      if (wf.kind === 'dc') {
        // A plain DC source carries no waveform — value is canonical.
        const next = { ...comp, value: wf.amplitude + wf.offset }
        delete next.waveform
        components[idx] = next
      } else {
        components[idx] = { ...comp, waveform: wf }
      }
      // Switching the waveform kind is a discrete edit; field tweaks coalesce.
      const key = partial.kind !== undefined ? undefined : `wf:${id}`
      return commit(s, { ...s.circuit, components }, key)
    })
  }, [mutate])

  const toggleSwitch = useCallback((id: string) => {
    mutate(s => {
      const idx = s.circuit.components.findIndex(c => c.id === id)
      if (idx === -1 || s.circuit.components[idx].type !== 'SW') return {}
      const components = [...s.circuit.components]
      components[idx] = { ...components[idx], closed: !components[idx].closed }
      return commit(s, { ...s.circuit, components })
    })
  }, [mutate])

  const rotateComponent = useCallback((id: string) => {
    mutate(s => {
      const idx = s.circuit.components.findIndex(c => c.id === id)
      if (idx === -1) return {}
      const components = [...s.circuit.components]
      const comp = components[idx]
      components[idx] = { ...comp, rotation: ((comp.rotation + 90) % 360) as 0 | 90 | 180 | 270 }
      return commit(s, { ...s.circuit, components })
    })
  }, [mutate])

  const setPan = useCallback((x: number, y: number) => {
    mutate(() => ({ panX: x, panY: y }))
  }, [mutate])

  const setZoom = useCallback((z: number) => {
    mutate(() => ({ zoom: Math.max(0.3, Math.min(3, z)) }))
  }, [mutate])

  const resetView = useCallback(() => {
    mutate(() => ({ panX: 0, panY: 0, zoom: 1 }))
  }, [mutate])

  // ── Simulation ───────────────────────────────────────────────────

  const resetSimulation = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    mutate(s => ({
      sim: null,
      paused: false,
      // Keep the probe channels but clear their captured traces.
      probes: s.probes.map(p => ({ ...p, samples: new Float64Array(MAX_SCOPE_SAMPLES), writeIdx: 0, count: 0 })),
    }))
  }, [mutate])

  const addProbe = useCallback((kind: ProbeKind, ref: number | string) => {
    mutate(s => {
      const id = `${kind}:${ref}`
      if (s.probes.some(p => p.id === id)) return {}
      return { probes: [...s.probes, makeProbe(kind, ref, s.circuit, s.probes.length)] }
    })
  }, [mutate])

  const removeProbe = useCallback((id: string) => {
    mutate(s => ({ probes: s.probes.filter(p => p.id !== id) }))
  }, [mutate])

  const clearProbes = useCallback(() => {
    mutate(() => ({ probes: [] }))
  }, [mutate])

  const renameProbe = useCallback((id: string, label: string) => {
    mutate(s => ({ probes: s.probes.map(p => (p.id === id ? { ...p, label } : p)) }))
  }, [mutate])

  const setProbeColor = useCallback((id: string, color: string) => {
    mutate(s => ({ probes: s.probes.map(p => (p.id === id ? { ...p, color } : p)) }))
  }, [mutate])

  const toggleProbeVisible = useCallback((id: string) => {
    mutate(s => ({ probes: s.probes.map(p => (p.id === id ? { ...p, visible: !p.visible } : p)) }))
  }, [mutate])

  const setScopeSettings = useCallback((partial: Partial<ScopeSettings>) => {
    mutate(s => ({ scopeSettings: { ...s.scopeSettings, ...partial } }))
  }, [mutate])

  const setAnalysisMode = useCallback((mode: AnalysisMode) => {
    if (mode === 'ac' && rafRef.current) cancelAnimationFrame(rafRef.current)
    mutate(s => ({
      analysisMode: mode,
      sim: mode === 'ac' && s.sim ? { ...s.sim, running: false } : s.sim,
      paused: mode === 'ac' ? false : s.paused,
    }))
  }, [mutate])

  const setAcOptions = useCallback((partial: Partial<ACOptions>) => {
    mutate(s => ({ acOptions: { ...s.acOptions, ...partial } }))
  }, [mutate])

  const setSimSpeed = useCallback((speed: number) => {
    mutate(() => ({ simSpeed: Math.max(0.1, Math.min(8, speed)) }))
  }, [mutate])

  const setShowDcOverlay = useCallback((show: boolean) => {
    mutate(() => ({ showDcOverlay: show }))
  }, [mutate])

  // Ref mirror so the rAF loop always reads the latest state without stale closures.
  const stateRef = useRef(state)
  stateRef.current = state

  const startSimLoop = useCallback(() => {
    function loop() {
      const s = stateRef.current
      if (!s.sim?.running) return
      const { sim, probes } = runFrame(s.circuit, s.sim, s.probes, s.dt, s.simDuration, s.simSpeed)
      sim.running = true
      setState(prev => ({ ...prev, sim, probes }))
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  /** Initialise a fresh sim state sized to the current circuit (t = 0). */
  function freshSim(circuit: Circuit): SimulationState {
    const sim = newSimState()
    sim.time = 0
    sim.nodeVoltages = new Float64Array(circuit.nextNodeId).fill(0)
    return sim
  }

  const runSimulation = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    mutate(s => {
      const errors = validateCircuit(s.circuit)
      if (errors.some(e => e.severity === 'error')) return { errors }
      // Resume from a paused state, otherwise start a fresh sweep at t = 0. If the
      // topology changed while paused (node count differs), restart fresh so we don't
      // carry stale companion energy / mis-sized arrays into the new circuit.
      const canResume = s.paused && s.sim && s.sim.nodeVoltages.length === s.circuit.nextNodeId
      const sim = canResume ? { ...s.sim!, running: true } : (() => { const x = freshSim(s.circuit); x.running = true; return x })()
      return { sim, paused: false, errors }
    })
    setTimeout(() => startSimLoop(), 0)
  }, [mutate, startSimLoop])

  const stopSimulation = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    mutate(s => ({
      sim: s.sim ? { ...s.sim, running: false } : null,
      paused: s.sim ? true : false,
    }))
  }, [mutate])

  const stepSimulation = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    mutate(s => {
      const errors = validateCircuit(s.circuit)
      if (errors.some(e => e.severity === 'error')) return { errors }
      const base = s.paused && s.sim && s.sim.nodeVoltages.length > 0 ? s.sim : freshSim(s.circuit)
      const { sim, probes } = runFrame(s.circuit, base, s.probes, s.dt, s.simDuration, s.simSpeed)
      sim.running = false
      return { sim, probes, paused: true, errors }
    })
  }, [mutate])

  const setDt = useCallback((dt: number) => {
    mutate(() => ({ dt }))
  }, [mutate])

  const setSimDuration = useCallback((dur: number) => {
    mutate(() => ({ simDuration: dur }))
  }, [mutate])

  const getDCSolution = useCallback((): Float64Array | null => {
    return solveDC(state.circuit)
  }, [state.circuit])

  // ── YAML save/load ────────────────────────────────────────────────

  const exportYaml = useCallback((): string => {
    return serializeCircuit(state.circuit)
  }, [state.circuit])

  const importYaml = useCallback((yaml: string) => {
    try {
      const circuit = deserializeCircuit(yaml)
      circuit.wires = generateWires(circuit)

      // Auto-probe the most-connected non-ground node
      const nodeCounts = new Map<number, number>()
      for (const c of circuit.components) {
        if (c.nodeA > 0) nodeCounts.set(c.nodeA, (nodeCounts.get(c.nodeA) ?? 0) + 1)
        if (c.nodeB > 0) nodeCounts.set(c.nodeB, (nodeCounts.get(c.nodeB) ?? 0) + 1)
      }
      let bestNode = 0, bestCount = 0
      for (const [n, count] of nodeCounts) {
        if (count > bestCount) { bestCount = count; bestNode = n }
      }

      mutate(s => ({
        ...commit(s, circuit),
        selectedId: null,
        probes: bestNode > 0 ? [makeProbe('nodeV', bestNode, circuit, 0)] : [],
      }))
      return true
    } catch {
      return false
    }
  }, [mutate])

  return {
    circuit: state.circuit,
    placingType: state.placingType,
    draggingId: state.draggingId,
    wiringFrom: state.wiringFrom,
    selectedId: state.selectedId,
    sim: state.sim,
    paused: state.paused,
    dt: state.dt,
    simDuration: state.simDuration,
    simSpeed: state.simSpeed,
    probes: state.probes,
    scopeSettings: state.scopeSettings,
    analysisMode: state.analysisMode,
    acOptions: state.acOptions,
    bode: state.bode,
    showDcOverlay: state.showDcOverlay,
    dcOp: state.dcOp,
    errors: state.errors,
    panX: state.panX,
    panY: state.panY,
    zoom: state.zoom,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    // Actions
    setPlacingType,
    placeComponent,
    duplicateComponent,
    selectComponent,
    moveComponent,
    deleteComponent,
    startWire,
    completeWire,
    cancelWiring,
    updateComponentValue,
    updateComponentWaveform,
    toggleSwitch,
    rotateComponent,
    setPan,
    setZoom,
    resetView,
    endInteraction,
    undo,
    redo,
    resetSimulation,
    addProbe,
    removeProbe,
    clearProbes,
    renameProbe,
    setProbeColor,
    toggleProbeVisible,
    setScopeSettings,
    setAnalysisMode,
    setAcOptions,
    setSimSpeed,
    setShowDcOverlay,
    runSimulation,
    stopSimulation,
    stepSimulation,
    setDt,
    setSimDuration,
    getDCSolution,
    exportYaml,
    importYaml,
  }
}

/** Drop component-referencing probes whose component no longer exists (post undo/redo). */
function pruneProbes(probes: Probe[], circuit: Circuit): Probe[] {
  const ids = new Set(circuit.components.map(c => c.id))
  const kept = probes.filter(p => !((p.kind === 'compI' || p.kind === 'compV') && !ids.has(p.ref as string)))
  return kept.length === probes.length ? probes : kept
}

export type CircuitEditor = ReturnType<typeof useCircuitEditor>
