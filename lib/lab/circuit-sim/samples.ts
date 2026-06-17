export interface SampleCircuit {
  name: string
  description: string
  yaml: string
}

export type SampleCategory = 'Basics' | 'RC' | 'RLC' | 'Filters' | 'Bridges' | 'Active'

export interface CategorizedSample extends SampleCircuit {
  category: SampleCategory
  lookFor: string
}

/** Category + "what to look for" per sample, keyed by name. */
const SAMPLE_META: Record<string, { category: SampleCategory; lookFor: string }> = {
  'Voltage Divider': { category: 'Basics', lookFor: 'Probe node 2 → 3.33 V (the divider midpoint).' },
  'Resistive Load': { category: 'Basics', lookFor: 'High current (50 mA) — watch the flow particles race.' },
  'Three-Resistor T-Network': { category: 'Basics', lookFor: 'Probe all three junctions for the attenuator levels.' },
  'Current Source → Resistor': { category: 'Basics', lookFor: 'Ohm fixes node 1 at 10 V (I·R).' },
  'RC Low-Pass Filter': { category: 'RC', lookFor: 'Capacitor charges with τ = 1 ms.' },
  'Two-Stage RC Filter': { category: 'Filters', lookFor: 'Probe each stage — the second lags the first.' },
  'Sine → RC Low-Pass': { category: 'Filters', lookFor: 'Switch to AC: the −3 dB knee + 20 dB/dec rolloff.' },
  'Square → RC Integrator': { category: 'Filters', lookFor: 'Exponential charge/discharge ramps.' },
  'LC Pi Filter': { category: 'Filters', lookFor: 'Sharper rolloff than RC — see it in AC mode.' },
  'RLC Ringing': { category: 'RLC', lookFor: 'Under-damped ring — probe node 3.' },
  'RLC Tank with Ringing': { category: 'RLC', lookFor: 'Heavy ringing from the low R.' },
  'LC Oscillator Tank': { category: 'RLC', lookFor: 'Resonant tank exchange between L and C.' },
  'Wheatstone Bridge': { category: 'Bridges', lookFor: 'Measure the imbalance across the centre.' },
  'Half-Wave Rectifier': { category: 'Active', lookFor: 'Probe the output: the diode clips the negative half.' },
  'Switched RC': { category: 'Active', lookFor: 'Select the switch → toggle Open/Closed to charge or hold.' },
  'Non-Inverting Amplifier': { category: 'Active', lookFor: 'Probe the output → 3 V (gain 1 + Rf/Rg).' },
}

const CATEGORY_ORDER: SampleCategory[] = ['Basics', 'RC', 'RLC', 'Filters', 'Bridges', 'Active']

/** Samples grouped by category in display order, with what-to-look-for notes. */
export function groupedSamples(): { category: SampleCategory; samples: CategorizedSample[] }[] {
  const byCat = new Map<SampleCategory, CategorizedSample[]>()
  for (const s of SAMPLES) {
    const meta = SAMPLE_META[s.name] ?? { category: 'Basics' as SampleCategory, lookFor: s.description }
    const entry: CategorizedSample = { ...s, ...meta }
    if (!byCat.has(meta.category)) byCat.set(meta.category, [])
    byCat.get(meta.category)!.push(entry)
  }
  return CATEGORY_ORDER
    .filter(cat => byCat.has(cat))
    .map(cat => ({ category: cat, samples: byCat.get(cat)! }))
}

// All samples use GRID_SIZE=20. Components arranged in rectangular
// closed-loop patterns: V at left, components along top, vertical drop
// at right, ground at bottom left. Wires trace clear closed rectangles.

export const SAMPLES: SampleCircuit[] = [
  {
    name: 'Voltage Divider',
    description: 'Two resistors splitting 5V — Vout = 3.33V at midpoint',
    yaml: `# Voltage Divider — rectangular closed loop
version: 1
nextNodeId: 3
nextCompId: 5
components:
  - id: c1
    type: V
    value: 5
    nodeA: 1
    nodeB: 0
    x: 140
    y: 200
    rotation: 90
  - id: c2
    type: R
    value: 1000
    nodeA: 1
    nodeB: 2
    x: 320
    y: 120
    rotation: 0
  - id: c3
    type: R
    value: 2000
    nodeA: 2
    nodeB: 0
    x: 320
    y: 300
    rotation: 270
  - id: c4
    type: GND
    value: 0
    nodeA: 0
    nodeB: 0
    x: 140
    y: 340
    rotation: 0
wires: []`,
  },
  {
    name: 'RC Low-Pass Filter',
    description: '1k\u03a9 + 1\u00b5F — \u03c4=1ms, probe capacitor at node 2',
    yaml: `# RC Low-Pass Filter — rectangular closed loop
version: 1
nextNodeId: 3
nextCompId: 5
components:
  - id: c1
    type: V
    value: 5
    nodeA: 1
    nodeB: 0
    x: 140
    y: 200
    rotation: 90
  - id: c2
    type: R
    value: 1000
    nodeA: 1
    nodeB: 2
    x: 320
    y: 120
    rotation: 0
  - id: c3
    type: C
    value: 0.000001
    nodeA: 2
    nodeB: 0
    x: 320
    y: 300
    rotation: 270
  - id: c4
    type: GND
    value: 0
    nodeA: 0
    nodeB: 0
    x: 140
    y: 340
    rotation: 0
wires: []`,
  },
  {
    name: 'RLC Ringing',
    description: '10\u03a9 + 10mH + 10\u00b5F — underdamped, probe node 3',
    yaml: `# RLC Ringing — rectangular closed loop
version: 1
nextNodeId: 4
nextCompId: 6
components:
  - id: c1
    type: V
    value: 5
    nodeA: 1
    nodeB: 0
    x: 120
    y: 140
    rotation: 0
  - id: c2
    type: R
    value: 10
    nodeA: 1
    nodeB: 2
    x: 260
    y: 140
    rotation: 0
  - id: c3
    type: L
    value: 0.01
    nodeA: 2
    nodeB: 3
    x: 400
    y: 140
    rotation: 0
  - id: c4
    type: C
    value: 0.00001
    nodeA: 3
    nodeB: 0
    x: 400
    y: 320
    rotation: 270
  - id: c5
    type: GND
    value: 0
    nodeA: 0
    nodeB: 0
    x: 120
    y: 320
    rotation: 0
wires: []`,
  },
  {
    name: 'LC Oscillator Tank',
    description: '10\u00b5H + 100\u00b5F parallel tank',
    yaml: `# LC Parallel Tank — rectangular closed loop
version: 1
nextNodeId: 3
nextCompId: 5
components:
  - id: c1
    type: V
    value: 1
    nodeA: 1
    nodeB: 0
    x: 120
    y: 140
    rotation: 0
  - id: c2
    type: R
    value: 1000
    nodeA: 1
    nodeB: 2
    x: 280
    y: 140
    rotation: 0
  - id: c3
    type: L
    value: 0.00001
    nodeA: 2
    nodeB: 0
    x: 360
    y: 320
    rotation: 270
  - id: c4
    type: C
    value: 0.0001
    nodeA: 2
    nodeB: 0
    x: 180
    y: 320
    rotation: 270
  - id: c5
    type: GND
    value: 0
    nodeA: 0
    nodeB: 0
    x: 120
    y: 360
    rotation: 0
wires: []`,
  },
  {
    name: 'Resistive Load',
    description: '5V \u2192 100\u03a9 — 50mA, high visible current',
    yaml: `# Resistive Load — rectangular closed loop
version: 1
nextNodeId: 3
nextCompId: 4
components:
  - id: c1
    type: V
    value: 5
    nodeA: 1
    nodeB: 0
    x: 120
    y: 140
    rotation: 0
  - id: c2
    type: R
    value: 100
    nodeA: 1
    nodeB: 0
    x: 300
    y: 320
    rotation: 270
  - id: c3
    type: GND
    value: 0
    nodeA: 0
    nodeB: 0
    x: 120
    y: 340
    rotation: 0
wires: []`,
  },
  {
    name: 'Three-Resistor T-Network',
    description: '10V into T-attenuator — probe all three junctions',
    yaml: `# T-Network — rectangular closed loop
version: 1
nextNodeId: 4
nextCompId: 6
components:
  - id: c1
    type: V
    value: 10
    nodeA: 1
    nodeB: 0
    x: 120
    y: 140
    rotation: 0
  - id: c2
    type: R
    value: 1000
    nodeA: 1
    nodeB: 2
    x: 280
    y: 140
    rotation: 0
  - id: c3
    type: R
    value: 1000
    nodeA: 2
    nodeB: 3
    x: 440
    y: 140
    rotation: 0
  - id: c4
    type: R
    value: 500
    nodeA: 2
    nodeB: 0
    x: 280
    y: 320
    rotation: 270
  - id: c5
    type: GND
    value: 0
    nodeA: 0
    nodeB: 0
    x: 120
    y: 320
    rotation: 0
wires: []`,
  },
  {
    name: 'Two-Stage RC Filter',
    description: 'Cascaded RC stages — probe each stage',
    yaml: `# Two-Stage RC Filter — rectangular closed loop
version: 1
nextNodeId: 4
nextCompId: 7
components:
  - id: c1
    type: V
    value: 5
    nodeA: 1
    nodeB: 0
    x: 120
    y: 140
    rotation: 0
  - id: c2
    type: R
    value: 1000
    nodeA: 1
    nodeB: 2
    x: 280
    y: 140
    rotation: 0
  - id: c3
    type: C
    value: 0.000001
    nodeA: 2
    nodeB: 0
    x: 280
    y: 320
    rotation: 270
  - id: c4
    type: R
    value: 1000
    nodeA: 2
    nodeB: 3
    x: 440
    y: 140
    rotation: 0
  - id: c5
    type: C
    value: 0.000001
    nodeA: 3
    nodeB: 0
    x: 440
    y: 320
    rotation: 270
  - id: c6
    type: GND
    value: 0
    nodeA: 0
    nodeB: 0
    x: 120
    y: 360
    rotation: 0
wires: []`,
  },
  {
    name: 'Wheatstone Bridge',
    description: 'Classic bridge — measure imbalance at center',
    yaml: `# Wheatstone Bridge — diamond closed loop
version: 1
nextNodeId: 5
nextCompId: 8
components:
  - id: c1
    type: V
    value: 5
    nodeA: 1
    nodeB: 0
    x: 120
    y: 200
    rotation: 0
  - id: c2
    type: R
    value: 1000
    nodeA: 1
    nodeB: 2
    x: 280
    y: 100
    rotation: 0
  - id: c3
    type: R
    value: 1000
    nodeA: 1
    nodeB: 3
    x: 280
    y: 300
    rotation: 0
  - id: c4
    type: R
    value: 1000
    nodeA: 2
    nodeB: 0
    x: 440
    y: 100
    rotation: 270
  - id: c5
    type: R
    value: 2000
    nodeA: 3
    nodeB: 0
    x: 440
    y: 300
    rotation: 270
  - id: c6
    type: R
    value: 1000
    nodeA: 2
    nodeB: 3
    x: 360
    y: 200
    rotation: 270
  - id: c7
    type: GND
    value: 0
    nodeA: 0
    nodeB: 0
    x: 120
    y: 380
    rotation: 0
wires: []`,
  },
  {
    name: 'RLC Tank with Ringing',
    description: '1\u03a9 + 1mH + 100\u00b5F — heavy ringing',
    yaml: `# RLC Tank — rectangular closed loop
version: 1
nextNodeId: 4
nextCompId: 6
components:
  - id: c1
    type: V
    value: 5
    nodeA: 1
    nodeB: 0
    x: 120
    y: 140
    rotation: 0
  - id: c2
    type: R
    value: 1
    nodeA: 1
    nodeB: 2
    x: 260
    y: 140
    rotation: 0
  - id: c3
    type: L
    value: 0.001
    nodeA: 2
    nodeB: 3
    x: 400
    y: 140
    rotation: 0
  - id: c4
    type: C
    value: 0.0001
    nodeA: 3
    nodeB: 0
    x: 400
    y: 320
    rotation: 270
  - id: c5
    type: GND
    value: 0
    nodeA: 0
    nodeB: 0
    x: 120
    y: 320
    rotation: 0
wires: []`,
  },
  {
    name: 'LC Pi Filter',
    description: '10\u03a9 + 100\u00b5F + 1mH + 100\u00b5F pi filter',
    yaml: `# LC Pi Filter — rectangular closed loop
version: 1
nextNodeId: 5
nextCompId: 7
components:
  - id: c1
    type: V
    value: 5
    nodeA: 1
    nodeB: 0
    x: 120
    y: 140
    rotation: 0
  - id: c2
    type: R
    value: 10
    nodeA: 1
    nodeB: 2
    x: 260
    y: 140
    rotation: 0
  - id: c3
    type: C
    value: 0.0001
    nodeA: 2
    nodeB: 0
    x: 260
    y: 320
    rotation: 270
  - id: c4
    type: L
    value: 0.001
    nodeA: 2
    nodeB: 3
    x: 400
    y: 140
    rotation: 0
  - id: c5
    type: C
    value: 0.0001
    nodeA: 3
    nodeB: 0
    x: 400
    y: 320
    rotation: 270
  - id: c6
    type: GND
    value: 0
    nodeA: 0
    nodeB: 0
    x: 120
    y: 360
    rotation: 0
wires: []`,
  },
  {
    name: 'Sine → RC Low-Pass',
    description: '5V 200Hz sine into 1k/1µF — watch attenuation + phase lag at node 2',
    yaml: `# Sine → RC Low-Pass
version: 1
nextNodeId: 3
nextCompId: 5
components:
  - id: c1
    type: V
    value: 5
    nodeA: 1
    nodeB: 0
    x: 140
    y: 200
    rotation: 90
    wkind: sine
    wamp: 5
    woff: 0
    wfreq: 200
    wphase: 0
    wduty: 0.5
  - id: c2
    type: R
    value: 1000
    nodeA: 1
    nodeB: 2
    x: 320
    y: 120
    rotation: 0
  - id: c3
    type: C
    value: 0.000001
    nodeA: 2
    nodeB: 0
    x: 320
    y: 300
    rotation: 270
  - id: c4
    type: GND
    value: 0
    nodeA: 0
    nodeB: 0
    x: 140
    y: 340
    rotation: 0
wires: []`,
  },
  {
    name: 'Square → RC Integrator',
    description: '5V 150Hz square into 1k/1µF — exponential charge/discharge ramps',
    yaml: `# Square → RC Integrator
version: 1
nextNodeId: 3
nextCompId: 5
components:
  - id: c1
    type: V
    value: 5
    nodeA: 1
    nodeB: 0
    x: 140
    y: 200
    rotation: 90
    wkind: square
    wamp: 5
    woff: 0
    wfreq: 150
    wphase: 0
    wduty: 0.5
  - id: c2
    type: R
    value: 1000
    nodeA: 1
    nodeB: 2
    x: 320
    y: 120
    rotation: 0
  - id: c3
    type: C
    value: 0.000001
    nodeA: 2
    nodeB: 0
    x: 320
    y: 300
    rotation: 270
  - id: c4
    type: GND
    value: 0
    nodeA: 0
    nodeB: 0
    x: 140
    y: 340
    rotation: 0
wires: []`,
  },
  {
    name: 'Half-Wave Rectifier',
    description: '10V 60Hz sine → diode → 1k load — diode clips the negative half',
    yaml: `# Half-Wave Rectifier
version: 1
nextNodeId: 3
nextCompId: 5
components:
  - id: c1
    type: V
    value: 10
    nodeA: 1
    nodeB: 0
    x: 120
    y: 200
    rotation: 90
    wkind: sine
    wamp: 10
    woff: 0
    wfreq: 60
    wphase: 0
    wduty: 0.5
  - id: c2
    type: D
    value: 0
    nodeA: 1
    nodeB: 2
    x: 300
    y: 180
    rotation: 0
  - id: c3
    type: R
    value: 1000
    nodeA: 2
    nodeB: 0
    x: 460
    y: 360
    rotation: 90
  - id: c4
    type: GND
    value: 0
    nodeA: 0
    nodeB: 0
    x: 120
    y: 360
    rotation: 0
wires: []`,
  },
  {
    name: 'Switched RC',
    description: 'Toggle the switch (inspector) to charge/hold the capacitor',
    yaml: `# Switched RC
version: 1
nextNodeId: 4
nextCompId: 6
components:
  - id: c1
    type: V
    value: 5
    nodeA: 1
    nodeB: 0
    x: 120
    y: 200
    rotation: 90
  - id: c2
    type: SW
    value: 0
    nodeA: 1
    nodeB: 2
    x: 300
    y: 180
    rotation: 0
    closed: true
  - id: c3
    type: R
    value: 10000
    nodeA: 2
    nodeB: 3
    x: 440
    y: 180
    rotation: 0
  - id: c4
    type: C
    value: 0.00001
    nodeA: 3
    nodeB: 0
    x: 540
    y: 360
    rotation: 90
  - id: c5
    type: GND
    value: 0
    nodeA: 0
    nodeB: 0
    x: 120
    y: 360
    rotation: 0
wires: []`,
  },
  {
    name: 'Non-Inverting Amplifier',
    description: 'Op-amp with Rf=2k, Rg=1k — gain ×3 (probe the output)',
    yaml: `# Non-Inverting Amplifier (gain = 1 + Rf/Rg = 3)
version: 1
nextNodeId: 4
nextCompId: 6
components:
  - id: c1
    type: V
    value: 1
    nodeA: 3
    nodeB: 0
    x: 140
    y: 200
    rotation: 90
  - id: c2
    type: OP
    value: 0
    nodeA: 3
    nodeB: 1
    nodeC: 2
    x: 340
    y: 200
    rotation: 0
  - id: c3
    type: R
    value: 1000
    nodeA: 1
    nodeB: 0
    x: 300
    y: 320
    rotation: 90
  - id: c4
    type: R
    value: 2000
    nodeA: 2
    nodeB: 1
    x: 340
    y: 120
    rotation: 0
  - id: c5
    type: GND
    value: 0
    nodeA: 0
    nodeB: 0
    x: 140
    y: 360
    rotation: 0
wires: []`,
  },
  {
    name: 'Current Source → Resistor',
    description: '10mA forced through 1kΩ — Ohm fixes node 1 at 10V',
    yaml: `# Current Source → Resistor
version: 1
nextNodeId: 2
nextCompId: 4
components:
  - id: c1
    type: I
    value: 0.01
    nodeA: 1
    nodeB: 0
    x: 120
    y: 140
    rotation: 0
  - id: c2
    type: R
    value: 1000
    nodeA: 1
    nodeB: 0
    x: 300
    y: 320
    rotation: 270
  - id: c3
    type: GND
    value: 0
    nodeA: 0
    nodeB: 0
    x: 120
    y: 340
    rotation: 0
wires: []`,
  },
]
