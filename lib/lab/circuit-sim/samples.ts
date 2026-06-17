export interface SampleCircuit {
  name: string
  description: string
  yaml: string
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
]
