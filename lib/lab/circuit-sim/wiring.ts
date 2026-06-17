import type { Circuit, CircuitWire, CircuitComponent } from './types'
import { getTerminalPositions, gridSnap } from './draw'

/**
 * Auto-generate Manhattan-routed wires for components sharing node IDs.
 * Uses star topology: for each shared node with ≥2 terminals, picks the
 * centroid-aligned terminal as hub and routes Manhattan paths to all others.
 * Also computes which grid points need junction dots (3+ meeting segments).
 */
export function generateWires(circuit: Circuit): CircuitWire[] {
  const nodeTerminals = new Map<number, { compId: string; x: number; y: number }[]>()

  for (const comp of circuit.components) {
    const [ax, ay, bx, by] = getTerminalPositions(comp)
    for (const [nodeId, tx, ty] of [[comp.nodeA, ax, ay] as const, [comp.nodeB, bx, by] as const]) {
      if (!nodeTerminals.has(nodeId)) nodeTerminals.set(nodeId, [])
      nodeTerminals.get(nodeId)!.push({ compId: comp.id, x: gridSnap(tx), y: gridSnap(ty) })
    }
  }

  const wires: CircuitWire[] = []
  let wireId = 0

  for (const [nodeId, terms] of nodeTerminals) {
    if (terms.length < 2) continue

    // Deduplicate terminals at the same grid position
    const unique = new Map<string, { compId: string; x: number; y: number }>()
    for (const t of terms) {
      const key = `${t.x},${t.y}`
      if (!unique.has(key)) unique.set(key, t)
    }
    const ut = [...unique.values()]
    if (ut.length < 2) continue

    // Choose hub: the terminal with the median x position
    const sorted = [...ut].sort((a, b) => a.x - b.x)
    const hub = sorted[Math.floor(sorted.length / 2)]

    for (const t of ut) {
      if (t.compId === hub.compId && t.x === hub.x && t.y === hub.y) continue

      const waypoints = computeManhattanPath(hub.x, hub.y, t.x, t.y)
      wires.push({
        id: `w_${wireId++}`,
        nodeA: nodeId,
        nodeB: nodeId,
        waypoints,
        fromCompId: hub.compId,
        toCompId: t.compId,
      })
    }
  }

  return wires
}

/**
 * Compute Manhattan path waypoints between two grid-snapped points.
 * Two possible paths: horizontal-first or vertical-first.
 * Picks the one with shorter total length or, if equal, horizontal-first.
 * Returns intermediate corner points only (excludes start and end).
 */
export function computeManhattanPath(
  ax: number, ay: number,
  bx: number, by: number,
): { x: number; y: number }[] {
  if (ax === bx || ay === by) {
    // Already axis-aligned — direct line, no waypoints
    return []
  }

  // Horizontal-first: (ax,ay) → (bx,ay) → (bx,by)
  // Vertical-first:   (ax,ay) → (ax,by) → (bx,by)
  const hDist = Math.abs(ax - bx) + Math.abs(ay - by) // same for both paths
  // Prefer horizontal-first for shorter first segment, or just always h-first
  return [{ x: bx, y: ay }]
}

/**
 * Find all grid positions where junction dots should be drawn.
 * A junction exists where 3+ wire endpoints or corners coincide.
 */
export function findJunctions(
  components: CircuitComponent[],
  wires: CircuitWire[],
): Set<string> {
  const points = new Map<string, number>()

  // Terminal endpoints
  for (const comp of components) {
    const [ax, ay, bx, by] = getTerminalPositions(comp)
    incPoint(points, gridSnap(ax), gridSnap(ay))
    incPoint(points, gridSnap(bx), gridSnap(by))
  }

  // Wire endpoints and corners
  for (const wire of wires) {
    // Need terminal positions to get actual endpoints
    // For now, waypoints are the only data we have
    // We'll handle this in the canvas renderer instead
    for (let i = 0; i < wire.waypoints.length; i++) {
      incPoint(points, gridSnap(wire.waypoints[i].x), gridSnap(wire.waypoints[i].y))
    }
  }

  // Return keys for points with ≥3 segments meeting
  const junctions = new Set<string>()
  for (const [key, count] of points) {
    if (count >= 3) junctions.add(key)
  }
  return junctions
}

function incPoint(map: Map<string, number>, x: number, y: number) {
  const key = `${x},${y}`
  map.set(key, (map.get(key) ?? 0) + 1)
}
