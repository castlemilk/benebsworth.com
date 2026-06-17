# Circuit Simulator Skill

Reference for building and extending web-based circuit simulators with MNA solvers and canvas rendering.

## Project Architecture

The circuit simulator has three independent layers:

```
lib/lab/circuit-sim/     ← Headless engine (no React, no canvas)
  types.ts               → Component/Circuit/Simulation/Wire data models
  solver.ts              → DC MNA + LU decomposition
  transient.ts           → Transient analysis (trapezoidal integration)
  validator.ts           → Structured diagnostics + CircuitBuilder + assertDC/assertTransient
  yaml.ts                → YAML round-trip serialization
  wiring.ts              → Auto-generate Manhattan-routed wires
  draw.ts                → Terminal positions, grid snapping, symbol drawing (Canvas 2D only)
  placement.ts           → Headless render + placement validation (no browser needed)
  samples.ts             → 7 pre-built example circuits

components/lab/circuit-sim/  ← React/Canvas rendering layer
  circuit-canvas.tsx     → Interactive canvas: drag/drop/wire/pan/zoom
  component-palette.tsx  → Component picker sidebar
  scope-panel.tsx        → Oscilloscope graticule + trace rendering
  toolbar.tsx            → Run/Stop/Reset + timestep + YAML save/load + samples

app/lab/circuit-sim/     ← Next.js route
  page.tsx               → Server component: metadata, layout
  circuit-sim-page.tsx   → Client component: wires everything together
```

**Critical rule**: The engine (`lib/lab/circuit-sim/`) must remain headless. Never import React, JSX, or browser APIs there. Tests run in vitest `node` environment without DOM. Placement validation runs headless too — it calls `getTerminalPositions` and `computeManhattanPath` without a canvas.

## Placement & Drawing Rules (FIELD-TESTED)

These rules were validated against 7 sample circuits via headless testing.

### Terminal Offset Grid Alignment (CRITICAL)

ALL terminal offsets MUST be multiples of `GRID_SIZE` (20px). Terminals at non-grid positions cause:
- Diagonal wires (Manhattan routing breaks when endpoints aren't aligned)
- Junction dots at wrong positions
- Ugly wire routing

```ts
// CORRECT — all offsets are GRID_SIZE multiples
function getOffset(type: string): number {
  switch (type) {
    case 'R': return 40   // 22 body + 8 lead, padded to grid
    case 'L': return 40   // 28 body + 8 lead, padded to grid
    case 'C': return 20   // 6 gap-half + 8 lead, padded
    case 'V': return 20   // 16 radius + 8 lead, padded to 20
    case 'GND': return 0  // single-point, centered
  }
}
```

### Rotation Semantics

```
Rotation 0°:   A left, B right     [A]───[Component]───[B]
Rotation 90°:  A top, B bottom     [A] down through [Component] to [B]
Rotation 180°: A right, B left     (A and B swap — A is now on right)
Rotation 270°: A bottom, B top     (A and B swap — A is now on bottom)
```

Terminal positions are computed in WORLD coordinates, not local. The drawing functions use `ctx.translate(x, y)` + `ctx.rotate(rot)` for the symbol body, and lead wires are drawn from body edge to the terminal offset.

### Ground Component (GND)

GND is a special single-point component. Both terminals return the SAME position (the connection point at the top of the ground symbol):

```ts
if (comp.type === 'GND') {
  return [cx, cy - 20, cx, cy - 20]  // both terminals at same grid-aligned point
}
```

The GND symbol draws: lead wire up from terminal, then three decreasing horizontal bars downward.

### Wire Routing: Hub-based Star Topology

Auto-generated wires use a star topology for each shared node:
1. Collect all unique terminal grid positions for the node
2. Pick the median-x terminal as the hub
3. From the hub, route Manhattan paths to all other terminals
4. Each wire stores `fromCompId` and `toCompId` to preserve endpoint ordering

**Critical**: Wire waypoints MUST be computed with the SAME endpoint ordering used during rendering. Without `fromCompId`/`toCompId` hints, the renderer may reverse endpoints, causing waypoints to produce diagonal segments.

### Wire Endpoint Matching

Wires that terminate AT a component's terminal will touch the component's bounding box. This is EXPECTED — do NOT flag as "wire through body". The headless validator checks:
1. Is either wire endpoint inside the component body? If yes, skip (the wire connects there)
2. Does the wire segment cross the body with BOTH endpoints outside? Then flag as warning.

### Manhattan Path Computation

```ts
function computeManhattanPath(ax, ay, bx, by):
  if ax === bx or ay === by: return []  // already axis-aligned
  return [{ x: bx, y: ay }]            // horizontal-first routing
```

Produces at most one corner. Both endpoints must be grid-snapped before calling.

### Junction Dot Rules

A junction dot (filled circle, radius 4px) is drawn at every grid point where ≥2 terminals or wire waypoints coincide. This is computed by collecting all terminal positions and wire segment endpoints, counting occurrences per grid position.

### Sample Circuit Layout Rules

Sample circuits must follow these rules (validated by `placement.test.ts`):
1. All component centers on grid (multiples of 20)
2. Components spaced ≥2 grid units apart to avoid overlap
3. Every component connected to at least one other (no orphans)
4. Signal flow left-to-right, power top-to-bottom where possible
5. Each sample must pass `validatePlacement()` with zero errors

## Solver Gotchas (FIELD-TESTED)

### Companion Current Sign Convention

The most subtle bug in transient analysis is the sign of the companion current source injection:

```ts
// CORRECT: current injected INTO node a, extracted FROM node b
z[ai] += iEq   // +iEq INTO node a
z[bi] -= iEq   // -iEq OUT of node b

// WRONG (was in v1 — caused oscillating voltages):
z[ai] -= iEq
z[bi] += iEq
```

Derivation: Norton equivalent has I_eq flowing INTO node a. In MNA, the RHS vector z gets +I_eq at row a and -I_eq at row b.

### LU Decomposition Algorithm

Must use proper Doolittle algorithm with partial pivoting, NOT simplified Crout:

```
For each column j:
  1. Compute U[i][j] for i = 0..j (upper triangle)
  2. Compute raw L[i][j] for i = j+1..n-1 (before division)
  3. Find pivot row with max |raw value| in column j
  4. Swap if needed (swap both A rows AND pivot array entries)
  5. Divide L[i][j] by U[j][j] for i > j
```

Common bug: computing upper triangle values during the pivot scan step — this overwrites U[j][j].

### Inductor at DC

Inductors at DC are short circuits (0V). They need an extra MNA row treating them as a 0V voltage source. In transient analysis, they use the trapezoidal companion model instead (no extra row needed).

## Validation Framework

### Validation Rules (enforced by `validateCircuit`)

1. **EMPTY** — circuit has no components (info)
2. **NO_GROUND** — no GND component (error)
3. **INVALID_VALUE** — R/L/C/V value ≤ 0 (error)
4. **ZERO_VOLTAGE** — V source set to 0V (warning)
5. **FLOATING_NODE** — node has no DC path to ground via R/V/L (error)
6. **OPEN_LOOP** — voltage source has no closed current path from + to − through circuit (error)
7. **PARALLEL_VS** — two voltage sources share both terminals (warning)
8. **SINGULAR** — DC solve fails, matrix is singular (error)
9. **DEAD_END** — node connects to only one component, useful as probe point (info)
10. **READY** — circuit is valid and runnable (info)

### Closed Loop Rule

Every voltage source must form a complete circuit. Current flows from the + terminal, through the circuit, and back to the − terminal. If there's no DC-conducting path (through R, V, L — capacitors are DC-open) from + back to −, the source has no current and the circuit is an open loop.

```ts
function hasDCPath(circuit, from, to):
  BFS from 'from' through R/V/L components
  returns true if 'to' is reachable
```

### Structured Diagnostics

```ts
interface CircuitDiagnostic {
  severity: 'error' | 'warning' | 'info'
  code: string          // 'FLOATING_NODE', 'NO_GROUND', 'INVALID_VALUE', etc.
  message: string
  nodes: number[]
  components: string[]
}
```

Same `validateCircuit()` powers both the UI sidebar and vitest assertions.

### Programmatic Test API

```ts
// DC assertion
assertDC(circuit, { 1: 5, 2: 3.33 }, 0.01)  // returns string[] of failures

// Transient assertion at specific step indices  
assertTransient(circuit, dt, steps, { 100: { 2: 3.16 } }, 0.5)

// Fluent builder
circuit().v(5, 1, 0).r(1000, 1, 2).r(2000, 2, 0).gnd().build()
```

### Placement Validation (Headless)

```ts
renderCircuit(circuit)      // → VisualElement[] (no canvas needed)
validatePlacement(circuit)  // → PlacementIssue[]
checkTerminalPositions(type, x, y, rot)  // → terminal coordinates
```

## Interactive Editor Gotchas (FIELD-TESTED)

### Placing Mode

- Place on mouse **UP** (not down) — prevents accidental placement when clicking to select
- Right-click or Escape cancels placing mode
- `onCancelPlacing` prop needed on canvas for Escape handling
- `setPlacingType(null)` called from page when component selected

### Wiring Mode

- Shift+click starts wiring; stores `wiringFrom` compId AND `wiringFromNode` (A/B)
- Click second terminal to complete; uses stored node hint for correct endpoint
- Escape or right-click cancels
- `completeWire` both merges node IDs (electrical) AND creates a CircuitWire (visual)

### Grid Constraint

The page wrapper must NOT use `aspect-[16/9] w-full` — this creates a reflow loop where scrollbar appearance changes the computed width. Use a clamped height instead:
```tsx
<div style={{ height: 'clamp(340px, 55vh, 700px)' }}>
```

## References

- Litovski, V. "Modified Nodal Analysis"
- Pillage, Rohrer, Visweswariah. "Electronic Circuit and System Simulation Methods"
- Vladimirescu, A. "The SPICE Book"
- Nagel, L.W. "SPICE2: A Computer Program to Simulate Semiconductor Circuits"
- IEC 60617: Graphical Symbols for Diagrams
- IEEE 315: Graphic Symbols for Electrical and Electronics Diagrams
