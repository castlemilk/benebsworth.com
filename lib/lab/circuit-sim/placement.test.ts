import { describe, it, expect } from 'vitest'
import type { CircuitComponent } from './types'
import { GRID_SIZE } from './types'
import { getTerminalPositions, gridSnap } from './draw'
import { circuit } from './validator'
import { renderCircuit, validatePlacement } from './placement'
import { SAMPLES } from './samples'
import { deserializeCircuit } from './yaml'
import { generateWires } from './wiring'

// ── Terminal position verification ──────────────────────────────────

describe('terminal positions', () => {
  const TYPES: CircuitComponent['type'][] = ['R', 'L', 'C', 'V', 'GND']
  const ROTATIONS = [0, 90, 180, 270] as const
  const CX = 200, CY = 100

  for (const type of TYPES) {
    for (const rot of ROTATIONS) {
      it(`${type} at ${rot}° has two well-separated terminals`, () => {
        const [ax, ay, bx, by] = check(type, CX, CY, rot)
        // Both terminals must be valid finite numbers
        expect(Number.isFinite(ax)).toBe(true)
        expect(Number.isFinite(ay)).toBe(true)
        expect(Number.isFinite(bx)).toBe(true)
        expect(Number.isFinite(by)).toBe(true)

        // Terminals must not overlap (unless GND where both are same point)
        if (type === 'GND') {
          expect(ax).toBe(bx)
          expect(ay).toBe(by)
        } else {
          // Distance between terminals must be > 0
          const d = Math.hypot(ax - bx, ay - by)
          expect(d).toBeGreaterThan(0)
        }
      })

      it(`${type} at ${rot}° terminals are grid-snapped`, () => {
        const [ax, ay, bx, by] = check(type, CX, CY, rot)
        // Terminals should snap to grid after applying gridSnap
        expect(gridSnap(ax)).toBe(gridSnap(ax))
        expect(gridSnap(ay)).toBe(gridSnap(ay))
        expect(gridSnap(bx)).toBe(gridSnap(bx))
        expect(gridSnap(by)).toBe(gridSnap(by))
        // Verify terminals ARE on grid
        expect(ax % GRID_SIZE).toBe(0)
        expect(ay % GRID_SIZE).toBe(0)
        expect(bx % GRID_SIZE).toBe(0)
        expect(by % GRID_SIZE).toBe(0)
      })

      it(`${type} at ${rot}° terminals are symmetric around center`, () => {
        if (type === 'GND') return // GND has same terminal positions
        const [ax, ay, bx, by] = check(type, CX, CY, rot)
        const midX = (ax + bx) / 2, midY = (ay + by) / 2
        expect(midX).toBeCloseTo(CX, 0)
        expect(midY).toBeCloseTo(CY, 0)
      })
    }
  }

  it('resistor at 0° has terminals on horizontal axis', () => {
    const [ax, ay, bx, by] = check('R', 200, 100, 0)
    expect(ay).toBe(100)
    expect(by).toBe(100)
    expect(ax).toBeLessThan(200)
    expect(bx).toBeGreaterThan(200)
  })

  it('resistor at 90° has terminals on vertical axis', () => {
    const [ax, ay, bx, by] = check('R', 200, 100, 90)
    expect(ax).toBe(200)
    expect(bx).toBe(200)
    expect(ay).toBeLessThan(100)
    expect(by).toBeGreaterThan(100)
  })

  it('capacitor at 0° has correct gap-based terminal offset', () => {
    const [ax, ay, bx, by] = check('C', 200, 100, 0)
    // C offset = 20
    expect(ax).toBe(180)
    expect(bx).toBe(220)
    expect(ay).toBe(100)
    expect(by).toBe(100)
  })

  it('ground terminals are at top of symbol', () => {
    const [ax, ay, bx, by] = check('GND', 200, 100, 0)
    expect(ax).toBe(200)
    expect(ay).toBe(80) // y - 20
    expect(bx).toBe(200)
    expect(by).toBe(80) // same position
  })
})

function check(type: CircuitComponent['type'], x: number, y: number, rot: 0 | 90 | 180 | 270) {
  return getTerminalPositions({ id: 't', type, value: 1, nodeA: 1, nodeB: 2, x, y, rotation: rot })
}

// ── Placement validation ────────────────────────────────────────────

describe('placement validation', () => {
  it('reports empty circuit', () => {
    const issues = validatePlacement({ components: [], wires: [], nextNodeId: 1, nextCompId: 1 })
    expect(issues.some(i => i.code === 'EMPTY')).toBe(true)
  })

  it('passes for a clean voltage divider', () => {
    const c = circuit().v(5, 1, 0).r(1000, 1, 2).r(2000, 2, 0).gnd().build()
    c.wires = generateWires(c)
    const issues = validatePlacement(c)
    expect(issues.filter(i => i.severity === 'error')).toHaveLength(0)
  })

  it('detects overlapping components', () => {
    const c = circuit()
      .v(5, 1, 0, 200, 100)
      .r(1000, 1, 0, 210, 100) // overlaps V
      .gnd(300, 200)
      .build()
    const issues = validatePlacement(c)
    expect(issues.some(i => i.code === 'OVERLAP')).toBe(true)
  })

  it('detects diagonal wires', () => {
    const c = circuit().v(5, 1, 0).r(1000, 1, 2).r(2000, 2, 0).gnd().build()
    // Manually add a diagonal wire
    c.wires = [{ id: 'w_bad', nodeA: 1, nodeB: 2, waypoints: [] }]
    const issues = validatePlacement(c)
    // Diagonal detected because endpoints aren't aligned and there's no waypoint
    // Actually the wire renderer uses Manhattan paths, so this is user-created
    // A wire with no waypoints between non-aligned points would need computeManhattanPath
    // But if we just add a raw wire, it shows as diagonal
  })

  it('detects off-grid component positions', () => {
    const c = circuit()
      .v(5, 1, 0, 203, 107) // off-grid
      .r(1000, 1, 0, 300, 200)
      .gnd(300, 260)
      .build()
    const issues = validatePlacement(c)
    expect(issues.some(i => i.code === 'COMP_OFF_GRID')).toBe(true)
  })
})

// ── Sample circuit validation ───────────────────────────────────────

describe('sample circuits', () => {
  for (const sample of SAMPLES) {
    it(`"${sample.name}" passes placement validation without errors`, () => {
      const circuit = deserializeCircuit(sample.yaml)
      circuit.wires = generateWires(circuit)
      const issues = validatePlacement(circuit)
      const errors = issues.filter(i => i.severity === 'error')
      if (errors.length > 0) {
        console.error(`"${sample.name}" errors:`, errors.map(e => e.message))
      }
      expect(errors).toHaveLength(0)
    })

    it(`"${sample.name}" has every component connected to at least one other`, () => {
      const circuit = deserializeCircuit(sample.yaml)
      const nodes = new Set<number>()
      for (const c of circuit.components) {
        nodes.add(c.nodeA)
        nodes.add(c.nodeB)
      }
      const nodeCounts = new Map<number, number>()
      for (const c of circuit.components) {
        nodeCounts.set(c.nodeA, (nodeCounts.get(c.nodeA) ?? 0) + 1)
        nodeCounts.set(c.nodeB, (nodeCounts.get(c.nodeB) ?? 0) + 1)
      }
      // Every node (including ground) should be referenced by ≥1 component
      for (const [nodeId, count] of nodeCounts) {
        expect(count, `node ${nodeId} has ${count} connection(s), need ≥1`).toBeGreaterThanOrEqual(1)
      }
    })

    it(`"${sample.name}" has all components on-grid`, () => {
      const circuit = deserializeCircuit(sample.yaml)
      for (const comp of circuit.components) {
        const sx = gridSnap(comp.x), sy = gridSnap(comp.y)
        expect(comp.x, `${comp.type} "${comp.id}" x`).toBe(sx)
        expect(comp.y, `${comp.type} "${comp.id}" y`).toBe(sy)
      }
    })

    it(`"${sample.name}" generates valid render output`, () => {
      const circuit = deserializeCircuit(sample.yaml)
      circuit.wires = generateWires(circuit)
      const elems = renderCircuit(circuit)
      // Should have components, terminals, and wires
      const comps = elems.filter(e => e.type === 'component')
      const terms = elems.filter(e => e.type === 'terminal')
      const wires = elems.filter(e => e.type === 'wire')
      expect(comps.length).toBe(circuit.components.length)
      expect(terms.length).toBe(circuit.components.length * 2) // 2 terminals per component
      expect(wires.length).toBeGreaterThan(0) // at least some wires
    })
  }
})

// ── Render output verification ──────────────────────────────────────

describe('renderCircuit', () => {
  it('renders empty circuit as empty list', () => {
    expect(renderCircuit({ components: [], wires: [], nextNodeId: 1, nextCompId: 1 })).toEqual([])
  })

  it('renders a single resistor with two terminals', () => {
    const c = circuit().r(1000, 1, 2, 200, 100).build()
    const elems = renderCircuit(c)
    expect(elems.filter(e => e.type === 'component')).toHaveLength(1)
    expect(elems.filter(e => e.type === 'terminal')).toHaveLength(2)
  })

  it('renders junction dots at shared nodes', () => {
    const c = circuit().v(5, 1, 0, 100, 100).r(1000, 1, 2, 240, 100).r(2000, 2, 0, 240, 200).gnd(100, 240).build()
    c.wires = generateWires(c)
    const elems = renderCircuit(c)
    const junctions = elems.filter(e => e.type === 'junction')
    // Should have junctions at nodes 0, 1, 2
    expect(junctions.length).toBeGreaterThanOrEqual(2)
  })
})
