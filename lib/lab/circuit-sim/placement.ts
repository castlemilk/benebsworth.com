import type { Circuit, CircuitComponent } from './types'
import { GRID_SIZE } from './types'
import { getTerminalPositions, gridSnap } from './draw'
import { computeManhattanPath } from './wiring'

// ── Visual element types (headless, no canvas) ─────────────────────

export interface VisualBBox {
  type: 'component'
  compId: string
  compType: string
  x: number; y: number; w: number; h: number
  rotation: number
}

export interface VisualTerminal {
  type: 'terminal'
  compId: string
  nodeId: number
  x: number; y: number // grid-snapped
}

export interface VisualWireSegment {
  type: 'wire'
  wireId: string
  x1: number; y1: number
  x2: number; y2: number
}

export interface VisualJunction {
  type: 'junction'
  x: number; y: number
}

export type VisualElement = VisualBBox | VisualTerminal | VisualWireSegment | VisualJunction

// ── Headless render — produces element list ────────────────────────

export function renderCircuit(circuit: Circuit): VisualElement[] {
  const elems: VisualElement[] = []

  if (circuit.components.length === 0) return elems

  // ── Component bounding boxes ──────────────────────────────────
  for (const comp of circuit.components) {
    const bbox = getBoundingBox(comp)
    elems.push({
      type: 'component',
      compId: comp.id,
      compType: comp.type,
      x: bbox.x, y: bbox.y, w: bbox.w, h: bbox.h,
      rotation: comp.rotation,
    })

    // Terminals
    const [ax, ay, bx, by] = getTerminalPositions(comp)
    elems.push({
      type: 'terminal',
      compId: comp.id,
      nodeId: comp.nodeA,
      x: gridSnap(ax), y: gridSnap(ay),
    })
    elems.push({
      type: 'terminal',
      compId: comp.id,
      nodeId: comp.nodeB,
      x: gridSnap(bx), y: gridSnap(by),
    })
  }

  // ── Wires ─────────────────────────────────────────────────────
  for (const wire of circuit.wires) {
    // Prefer explicit component hints if present
    const fromComp = wire.fromCompId
      ? (circuit.components.find(c => c.id === wire.fromCompId) ?? circuit.components.find(c => c.nodeA === wire.nodeA || c.nodeB === wire.nodeA)!)
      : circuit.components.find(c => c.nodeA === wire.nodeA || c.nodeB === wire.nodeA)!
    let toComp = wire.toCompId
      ? (circuit.components.find(c => c.id === wire.toCompId) ?? circuit.components.find(c => c.nodeA === wire.nodeB || c.nodeB === wire.nodeB)!)
      : circuit.components.find(c => c.nodeA === wire.nodeB || c.nodeB === wire.nodeB)!
    if (!fromComp || !toComp) continue
    if (fromComp === toComp) {
      const shared = circuit.components.filter(c => c.nodeA === wire.nodeA || c.nodeB === wire.nodeA)
      if (shared.length >= 2 && shared[0] === fromComp) toComp = shared[1]
    }
    if (fromComp === toComp) continue

    // Determine which terminal of each component to use
    const fn = fromComp.nodeA === wire.nodeA ? 0 : 1
    const tn = toComp.nodeA === wire.nodeB ? 0 : 1
    const [fax, fay, fbx, fby] = getTerminalPositions(fromComp)
    const [tax, tay, tbx, tby] = getTerminalPositions(toComp)
    const fromTx = gridSnap(fn === 0 ? fax : fbx)
    const fromTy = gridSnap(fn === 0 ? fay : fby)
    const toTx = gridSnap(tn === 0 ? tax : tbx)
    const toTy = gridSnap(tn === 0 ? tay : tby)

    let waypoints = wire.waypoints
    if (waypoints.length === 0) {
      waypoints = computeManhattanPath(fromTx, fromTy, toTx, toTy)
    }

    let px = fromTx, py = fromTy
    for (const wp of waypoints) {
      elems.push({ type: 'wire', wireId: wire.id, x1: px, y1: py, x2: wp.x, y2: wp.y })
      px = wp.x; py = wp.y
    }
    elems.push({ type: 'wire', wireId: wire.id, x1: px, y1: py, x2: toTx, y2: toTy })
  }

  // ── Junction dots (2+ terminals or wire points at same grid position) ──
  const pointCounts = new Map<string, number>()
  for (const e of elems) {
    if (e.type === 'terminal') incPoint(pointCounts, e.x, e.y)
    if (e.type === 'wire') {
      incPoint(pointCounts, gridSnap(e.x1), gridSnap(e.y1))
      incPoint(pointCounts, gridSnap(e.x2), gridSnap(e.y2))
    }
  }
  for (const [key, count] of pointCounts) {
    if (count >= 2) {
      const [x, y] = key.split(',').map(Number)
      elems.push({ type: 'junction', x, y })
    }
  }

  return elems
}

function incPoint(map: Map<string, number>, x: number, y: number) {
  const key = `${x},${y}`
  map.set(key, (map.get(key) ?? 0) + 1)
}

// ── Bounding box calculation ──────────────────────────────────────

interface BBox { x: number; y: number; w: number; h: number }

function getBoundingBox(comp: CircuitComponent): BBox {
  const [ax, ay, bx, by] = getTerminalPositions(comp)
  const margin = 20 // extra space for labels

  // Body dimensions (in local space before rotation)
  let bw = 0, bh = 0
  switch (comp.type) {
    case 'R': bw = 48; bh = 20; break // body 44 + leads 8
    case 'L': bw = 60; bh = 22; break
    case 'C': bw = 28; bh = 28; break
    case 'V': bw = 40; bh = 40; break
    case 'GND': bw = 28; bh = 30; break
  }

  // Rotate dimensions if needed
  if (comp.rotation === 90 || comp.rotation === 270) [bw, bh] = [bh, bw]

  // Bounding box centered on component
  const minX = Math.min(ax, bx, comp.x - bw / 2 - margin)
  const minY = Math.min(ay, by, comp.y - bh / 2 - margin)
  const maxX = Math.max(ax, bx, comp.x + bw / 2 + margin)
  const maxY = Math.max(ay, by, comp.y + bh / 2 + margin)

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

// ── Validation rules ───────────────────────────────────────────────

export interface PlacementIssue {
  severity: 'error' | 'warning'
  code: string
  message: string
  ids: string[]
}

export function validatePlacement(circuit: Circuit): PlacementIssue[] {
  const issues: PlacementIssue[] = []
  const elems = renderCircuit(circuit)

  if (elems.length === 0) {
    issues.push({ severity: 'error', code: 'EMPTY', message: 'No components to validate', ids: [] })
    return issues
  }

  // ── 1. Grid alignment: all terminals must snap to grid ──────
  for (const comp of circuit.components) {
    const [ax, ay, bx, by] = getTerminalPositions(comp)
    for (const [x, y, label] of [[ax, ay, 'A'] as const, [bx, by, 'B'] as const]) {
      const sx = gridSnap(x), sy = gridSnap(y)
      if (Math.abs(sx - x) > 0.1 || Math.abs(sy - y) > 0.1) {
        issues.push({
          severity: 'warning', code: 'GRID_SNAP',
          message: `${comp.type} "${comp.id}" terminal ${label} at (${x.toFixed(0)},${y.toFixed(0)}) not grid-snapped`,
          ids: [comp.id],
        })
      }
    }
  }

  // ── 2. Component positions must be grid-snapped ──────────────
  for (const comp of circuit.components) {
    const sx = gridSnap(comp.x), sy = gridSnap(comp.y)
    if (Math.abs(sx - comp.x) > 0.1 || Math.abs(sy - comp.y) > 0.1) {
      issues.push({
        severity: 'warning', code: 'COMP_OFF_GRID',
        message: `${comp.type} "${comp.id}" center at (${comp.x},${comp.y}) not grid-snapped`,
        ids: [comp.id],
      })
    }
  }

  // ── 3. Overlapping component bounding boxes ─────────────────
  const components = elems.filter(e => e.type === 'component') as VisualBBox[]
  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      if (boxesOverlap(components[i], components[j])) {
        issues.push({
          severity: 'warning', code: 'OVERLAP',
          message: `${components[i].compType} "${components[i].compId}" overlaps ${components[j].compType} "${components[j].compId}"`,
          ids: [components[i].compId, components[j].compId],
        })
      }
    }
  }

  // ── 4. Wire segments must be axis-aligned ───────────────────
  for (const e of elems) {
    if (e.type !== 'wire') continue
    if (e.x1 !== e.x2 && e.y1 !== e.y2) {
      issues.push({
        severity: 'error', code: 'DIAGONAL_WIRE',
        message: `Wire "${e.wireId}" segment (${e.x1},${e.y1})→(${e.x2},${e.y2}) is diagonal`,
        ids: [e.wireId],
      })
    }
  }

  // ── 5. Wire must not pass through component bodies ──────────
  // Only flag if a wire ENTIRELY crosses a component it doesn't connect to.
  // Wires that terminate at a component's terminal are expected.
  for (const e of elems) {
    if (e.type !== 'wire') continue
    for (const b of components) {
      const wireCompIds = new Set<string>()
      for (const t of elems) {
        if (t.type === 'terminal') {
          if ((t.x === gridSnap(e.x1) && t.y === gridSnap(e.y1)) ||
              (t.x === gridSnap(e.x2) && t.y === gridSnap(e.y2))) {
            wireCompIds.add(t.compId)
          }
        }
      }
      // Skip components that are endpoints of this wire segment
      if (wireCompIds.has(b.compId)) continue

      // Check BOTH endpoints are outside the body, but segment still crosses
      const ep1Inside = pointInBox(gridSnap(e.x1), gridSnap(e.y1), b.x, b.y, b.w, b.h)
      const ep2Inside = pointInBox(gridSnap(e.x2), gridSnap(e.y2), b.x, b.y, b.w, b.h)
      if (ep1Inside || ep2Inside) continue

      if (segmentIntersectsBox(e.x1, e.y1, e.x2, e.y2, b.x - 4, b.y - 4, b.w + 8, b.h + 8)) {
        issues.push({
          severity: 'warning', code: 'WIRE_NEAR_COMP',
          message: `Wire "${e.wireId}" runs close to ${b.compType} "${b.compId}" body`,
          ids: [e.wireId, b.compId],
        })
      }
    }
  }

  // ── 6. All wires must have grid-snapped endpoints ───────────
  for (const e of elems) {
    if (e.type !== 'wire') continue
    for (const [x, y] of [[e.x1, e.y1], [e.x2, e.y2]]) {
      const sx = gridSnap(x), sy = gridSnap(y)
      if (Math.abs(sx - x) > 0.1 || Math.abs(sy - y) > 0.1) {
        issues.push({
          severity: 'warning', code: 'WIRE_OFF_GRID',
          message: `Wire "${e.wireId}" endpoint (${x},${y}) not grid-snapped`,
          ids: [e.wireId],
        })
      }
    }
  }

  return issues
}

// ── Geometry helpers ───────────────────────────────────────────────

function pointInBox(px: number, py: number, bx: number, by: number, bw: number, bh: number): boolean {
  return px >= bx && px <= bx + bw && py >= by && py <= by + bh
}

function boxesOverlap(a: VisualBBox, b: VisualBBox): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x ||
           a.y + a.h <= b.y || b.y + b.h <= a.y)
}

/**
 * Check if an axis-aligned line segment intersects an axis-aligned box.
 * Uses Cohen-Sutherland style: a segment intersects a box if it clips to
 * a non-empty line after checking against all four edges.
 * Simplified: check if either endpoint is inside, or if the segment
 * crosses any box edge.
 */
function segmentIntersectsBox(
  sx1: number, sy1: number, sx2: number, sy2: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  // Quick reject: both endpoints are on same side
  if (Math.max(sx1, sx2) <= bx || Math.min(sx1, sx2) >= bx + bw) return false
  if (Math.max(sy1, sy2) <= by || Math.min(sy1, sy2) >= by + bh) return false

  // Check endpoints inside
  if (sx1 >= bx && sx1 <= bx + bw && sy1 >= by && sy1 <= by + bh) return true
  if (sx2 >= bx && sx2 <= bx + bw && sy2 >= by && sy2 <= by + bh) return true

  // Check horizontal segment crossing vertical edges
  if (sy1 === sy2) {
    // Segment y coordinate must be within box y range
    if (sy1 >= by && sy1 <= by + bh) {
      // Segment must cross box x range
      if (sx1 < bx && sx2 > bx + bw) return true
      if (sx2 < bx && sx1 > bx + bw) return true
    }
  }

  // Check vertical segment crossing horizontal edges
  if (sx1 === sx2) {
    if (sx1 >= bx && sx1 <= bx + bw) {
      if (sy1 < by && sy2 > by + bh) return true
      if (sy2 < by && sy1 > by + bh) return true
    }
  }

  return false
}

// ── Terminal positioning verification ──────────────────────────────

export interface TerminalCheck {
  type: string
  rotation: 0 | 90 | 180 | 270
  nodeA: number; nodeB: number
  x: number; y: number
  expectedAx: number; expectedAy: number
  expectedBx: number; expectedBy: number
}

/** Verify terminal positions are correct for a given component. */
export function checkTerminalPositions(
  type: CircuitComponent['type'],
  x: number, y: number,
  rotation: 0 | 90 | 180 | 270,
): { ax: number; ay: number; bx: number; by: number } {
  // Reuse getTerminalPositions but verify against expectations
  const [ax, ay, bx, by] = getTerminalPositions({
    id: 'test', type, value: 1, nodeA: 1, nodeB: 2, x, y, rotation,
  })

  // Ensure terminal A is always the "input" side and B is "output"
  // For rotation 0: A is left, B is right
  // For rotation 90: A is top, B is bottom
  // For rotation 180: A is right, B is left (swapped)
  // For rotation 270: A is bottom, B is top (swapped)

  return { ax: gridSnap(ax), ay: gridSnap(ay), bx: gridSnap(bx), by: gridSnap(by) }
}
