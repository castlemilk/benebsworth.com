export type ComponentType = 'R' | 'L' | 'C' | 'V' | 'I' | 'GND'

export type WaveformKind = 'dc' | 'sine' | 'pulse' | 'square'

export interface Waveform {
  kind: WaveformKind
  amplitude: number // V (or A for current sources)
  offset: number    // DC bias
  freq: number      // Hz
  phase: number     // radians
  duty: number      // 0..1, for pulse/square
}

export const DEFAULT_WAVEFORM: Waveform = {
  kind: 'dc',
  amplitude: 5,
  offset: 0,
  freq: 1000,
  phase: 0,
  duty: 0.5,
}

export interface CircuitComponent {
  id: string
  type: ComponentType
  value: number // R in Ω, L in H, C in F, V in volts, I in amps
  nodeA: number // positive terminal node index
  nodeB: number // negative terminal node index
  x: number
  y: number
  rotation: 0 | 90 | 180 | 270
  /** Source waveform (V/I). Absent → DC source at `value`. */
  waveform?: Waveform
  /** AC analysis stimulus magnitude (V/I sources). Default 1 for the input. */
  acMag?: number
}

export interface CircuitWire {
  id: string
  nodeA: number
  nodeB: number
  waypoints: { x: number; y: number }[]
  /** Optional: explicit component endpoints to avoid ambiguity when multiple components share a node */
  fromCompId?: string
  toCompId?: string
}

export interface Circuit {
  components: CircuitComponent[]
  wires: CircuitWire[]
  nextNodeId: number
  nextCompId: number
}

export interface CompanionState {
  /** Previous voltage across element (v_prev) */
  vPrev: number
  /** Previous current through element (i_prev) */
  iPrev: number
}

export interface SimulationState {
  /** Node voltages at current timestep [nodeIndex] = volts */
  nodeVoltages: Float64Array
  /** Voltage source currents at current timestep */
  vsCurrents: Float64Array
  /** Companion state for each capacitor (keyed by component id) */
  capState: Map<string, CompanionState>
  /** Companion state for each inductor (keyed by component id) */
  indState: Map<string, CompanionState>
  /** Current simulation time in seconds */
  time: number
  /** Whether simulation is actively running */
  running: boolean
}

/** What a probe measures. */
export type ProbeKind =
  | 'nodeV' // voltage at a node (ref = nodeId)
  | 'compI' // current through a component (ref = compId)
  | 'compV' // voltage across a component (ref = compId)

export interface Probe {
  /** Stable id, e.g. "nodeV:2" or "compI:c3". */
  id: string
  kind: ProbeKind
  /** nodeId for nodeV, compId for compI/compV. */
  ref: number | string
  /** Display label, e.g. "N2", "I(R1)", "V(C1)". */
  label: string
  color: string
  visible: boolean
  /** Unit suffix for readouts: 'V' or 'A'. */
  unit: 'V' | 'A'
  /** Ring buffer of samples. */
  samples: Float64Array
  /** Write index in ring buffer. */
  writeIdx: number
  /** Number of valid samples. */
  count: number
}

/** Oscilloscope display settings. */
export interface ScopeSettings {
  /** Auto-fit vertical scale vs. fixed volts/div. */
  autoFit: boolean
  voltsPerDiv: number
  triggerEnabled: boolean
  triggerLevel: number
  triggerEdge: 'rising' | 'falling'
  /** Probe id used as the trigger source, or null for the first channel. */
  triggerSource: string | null
  /** Freeze the display (stop scrolling) without stopping the sim. */
  frozen: boolean
}

export const DEFAULT_SCOPE_SETTINGS: ScopeSettings = {
  autoFit: true,
  voltsPerDiv: 2,
  triggerEnabled: false,
  triggerLevel: 0,
  triggerEdge: 'rising',
  triggerSource: null,
  frozen: false,
}

export const GRID_SIZE = 20
export const TERMINAL_RADIUS = 5
export const SNAP_RADIUS = 15

export const DEFAULT_COMPONENT_VALUES: Record<ComponentType, number> = {
  R: 1000,
  L: 0.001,
  C: 1e-6,
  V: 5,
  I: 0.001,
  GND: 0,
}

export const COMPONENT_LABELS: Record<ComponentType, string> = {
  R: 'Resistor',
  L: 'Inductor',
  C: 'Capacitor',
  V: 'Voltage Source',
  I: 'Current Source',
  GND: 'Ground',
}

export function formatValue(type: ComponentType, value: number): string {
  switch (type) {
    case 'R':
      if (value >= 1e6) return `${(value / 1e6).toFixed(1)}MΩ`
      if (value >= 1e3) return `${(value / 1e3).toFixed(1)}kΩ`
      return `${value.toFixed(0)}Ω`
    case 'L':
      if (value >= 1) return `${value.toFixed(2)}H`
      if (value >= 1e-3) return `${(value * 1e3).toFixed(1)}mH`
      return `${(value * 1e6).toFixed(0)}µH`
    case 'C':
      if (value >= 1e-3) return `${(value * 1e3).toFixed(0)}mF`
      if (value >= 1e-6) return `${(value * 1e6).toFixed(1)}µF`
      if (value >= 1e-9) return `${(value * 1e9).toFixed(0)}nF`
      return `${(value * 1e12).toFixed(0)}pF`
    case 'V':
      return `${value.toFixed(1)}V`
    case 'I':
      if (Math.abs(value) >= 1) return `${value.toFixed(2)}A`
      if (Math.abs(value) >= 1e-3) return `${(value * 1e3).toFixed(1)}mA`
      return `${(value * 1e6).toFixed(0)}µA`
    case 'GND':
      return 'GND'
  }
}
