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

interface CircuitEditorState {
  circuit: Circuit
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
  /** Simulation timestep in seconds */
  dt: number
  /** Total simulation time limit */
  simDuration: number
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

export function useCircuitEditor() {
  const [state, setState] = useState<CircuitEditorState>({
    circuit: newCircuit(),
    placingType: null,
    draggingId: null,
    wiringFrom: null,
    wiringFromNode: null,
    selectedId: null,
    sim: null,
    dt: 1e-5,
    simDuration: 0.1,
    probes: [],
    scopeSettings: DEFAULT_SCOPE_SETTINGS,
    analysisMode: 'transient',
    acOptions: { fStart: 1, fStop: 1e6, points: 140 },
    bode: null,
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

  const mutate = useCallback((fn: (s: CircuitEditorState) => Partial<CircuitEditorState>) => {
    setState(prev => {
      const updates = fn(prev)
      return { ...prev, ...updates }
    })
  }, [])

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
      circuit.components.push(comp)
      return {
        circuit: { ...circuit, nextNodeId: circuit.nextNodeId, nextCompId: circuit.nextCompId },
        placingType: null,
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
      const components = [...s.circuit.components]
      components[idx] = { ...components[idx], x: gx, y: gy }
      return { circuit: { ...s.circuit, components } }
    })
  }, [mutate])

  const deleteComponent = useCallback((id: string) => {
    mutate(s => {
      const comp = s.circuit.components.find(c => c.id === id)
      if (!comp) return {}
      const components = s.circuit.components.filter(c => c.id !== id)
      // Remove wires connected to deleted nodes
      const deletedNodes = new Set([comp.nodeA, comp.nodeB])
      const wires = s.circuit.wires.filter(w => !deletedNodes.has(w.nodeA) && !deletedNodes.has(w.nodeB))
      return {
        circuit: { ...s.circuit, components, wires },
        selectedId: s.selectedId === id ? null : s.selectedId,
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

      // Determine which nodes to connect
      const fromNode = s.wiringFromNode === 'B' ? fromComp.nodeB : fromComp.nodeA
      const toNode = toNodeHint === 'B' ? toComp.nodeB : toComp.nodeA

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
        circuit: { ...s.circuit, components, wires },
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
      return { circuit: { ...s.circuit, components } }
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
      return { circuit: { ...s.circuit, components } }
    })
  }, [mutate])

  const rotateComponent = useCallback((id: string) => {
    mutate(s => {
      const idx = s.circuit.components.findIndex(c => c.id === id)
      if (idx === -1) return {}
      const components = [...s.circuit.components]
      const comp = components[idx]
      components[idx] = { ...comp, rotation: ((comp.rotation + 90) % 360) as 0 | 90 | 180 | 270 }
      return { circuit: { ...s.circuit, components } }
    })
  }, [mutate])

  const setPan = useCallback((x: number, y: number) => {
    mutate(() => ({ panX: x, panY: y }))
  }, [mutate])

  const setZoom = useCallback((z: number) => {
    mutate(() => ({ zoom: Math.max(0.3, Math.min(3, z)) }))
  }, [mutate])

  // ── Simulation ───────────────────────────────────────────────────

  const resetSimulation = useCallback(() => {
    mutate(() => ({
      sim: newSimState(),
      probes: [],
      errors: [],
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

  const setScopeSettings = useCallback((partial: Partial<ScopeSettings>) => {
    mutate(s => ({ scopeSettings: { ...s.scopeSettings, ...partial } }))
  }, [mutate])

  const setAnalysisMode = useCallback((mode: AnalysisMode) => {
    if (mode === 'ac' && rafRef.current) cancelAnimationFrame(rafRef.current)
    mutate(s => ({
      analysisMode: mode,
      sim: mode === 'ac' && s.sim ? { ...s.sim, running: false } : s.sim,
    }))
  }, [mutate])

  const setAcOptions = useCallback((partial: Partial<ACOptions>) => {
    mutate(s => ({ acOptions: { ...s.acOptions, ...partial } }))
  }, [mutate])

  const runSimulation = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    mutate(s => {
      const errors = validateCircuit(s.circuit)
      if (errors.some(e => e.severity === 'error')) {
        return { errors }
      }

      const sim = newSimState()
      sim.running = true
      sim.time = 0

      // Allocate voltage array
      const maxNode = s.circuit.nextNodeId
      sim.nodeVoltages = new Float64Array(maxNode).fill(0)

      return { sim, errors }
    })

    // Use ref-based approach for the rAF loop to avoid stale closures
    // We'll trigger the loop outside the state update
    setTimeout(() => {
      startSimLoop()
    }, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // This approach of calling mutate inside raf is problematic due to stale closures.
  // Instead we use a ref-based simulation loop.
  const stateRef = useRef(state)
  stateRef.current = state

  const startSimLoop = useCallback(() => {
    function loop() {
      const s = stateRef.current
      if (!s.sim?.running) return

      const targetTime = Math.min(s.sim.time + s.dt * 100, s.simDuration)
      let t = s.sim.time
      const dt = s.dt
      const simState = { ...s.sim, capState: new Map(s.sim.capState), indState: new Map(s.sim.indState) }
      let probes = [...s.probes]
      // Clone each probe's ring buffer once per frame, then write in place.
      if (probes.length > 0) {
        probes = probes.map(p => ({ ...p, samples: p.samples.slice() }))
      }

      let stepCount = 0
      while (t < targetTime && stepCount < 200) {
        const voltages = transientStep(s.circuit, simState, dt)
        if (!voltages) break

        simState.nodeVoltages = voltages
        simState.time = t + dt

        // Record one sample per probe (value depends on probe kind).
        for (const p of probes) {
          let val = 0
          if (p.kind === 'nodeV') {
            val = nodeVoltage(simState, p.ref as number)
          } else {
            const comp = s.circuit.components.find(c => c.id === p.ref)
            if (comp) val = p.kind === 'compI' ? componentCurrent(s.circuit, comp, simState) : componentVoltage(simState, comp)
          }
          p.samples[p.writeIdx] = val
          p.writeIdx = (p.writeIdx + 1) % MAX_SCOPE_SAMPLES
          p.count = Math.min(p.count + 1, MAX_SCOPE_SAMPLES)
        }

        t += dt
        stepCount++
      }

      simState.time = t

      // Continuous sweep: when time reaches duration, reset for next sweep
      if (t >= s.simDuration) {
        simState.time = 0
        simState.capState.clear()
        simState.indState.clear()
        simState.nodeVoltages = new Float64Array(s.circuit.nextNodeId).fill(0)
      }

      // Update state via functional setState to avoid stale closure issues
      setState(prev => ({
        ...prev,
        sim: simState as SimulationState,
        probes,
      }))

      if (simState.running) {
        rafRef.current = requestAnimationFrame(loop)
      }
    }

    rafRef.current = requestAnimationFrame(loop)
  }, [])

  const stopSimulation = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    mutate(s => ({
      sim: s.sim ? { ...s.sim, running: false } : null,
    }))
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

      mutate(() => ({
        circuit,
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
    dt: state.dt,
    simDuration: state.simDuration,
    probes: state.probes,
    scopeSettings: state.scopeSettings,
    analysisMode: state.analysisMode,
    acOptions: state.acOptions,
    bode: state.bode,
    errors: state.errors,
    panX: state.panX,
    panY: state.panY,
    zoom: state.zoom,
    // Actions
    setPlacingType,
    placeComponent,
    selectComponent,
    moveComponent,
    deleteComponent,
    startWire,
    completeWire,
    cancelWiring,
    updateComponentValue,
    updateComponentWaveform,
    rotateComponent,
    setPan,
    setZoom,
    resetSimulation,
    addProbe,
    removeProbe,
    setScopeSettings,
    setAnalysisMode,
    setAcOptions,
    runSimulation,
    stopSimulation,
    setDt,
    setSimDuration,
    getDCSolution,
    exportYaml,
    importYaml,
  }
}
