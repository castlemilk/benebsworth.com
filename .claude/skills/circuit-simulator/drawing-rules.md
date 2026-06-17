# Circuit Schematic Drawing Rules

Drawing/terminal reference for `draw.ts` + the Canvas layer. Grid = `GRID_SIZE` (20px); everything snaps to it.

## Terminals — `getAllTerminals` is the source of truth

A component is NOT always two terminals. Use these helpers (all return grid-snapped WORLD coords):

```ts
getAllTerminals(comp): { node, x, y }[]   // 1 for GND, 3 for op-amp, 2 otherwise
terminalForNode(comp, node): {x,y} | null // the terminal on a given node
getTerminalPositions(comp): [ax,ay,bx,by] // 2-terminal only — internal; do NOT use for OP/GND consumers
```

**Every consumer** (wiring, placement, canvas hit-test/render/junctions, probe markers) iterates `getAllTerminals` / resolves with `terminalForNode`. Using `getTerminalPositions` directly drops the op-amp's 3rd terminal and double-counts GND.

### Terminal offsets (all multiples of GRID_SIZE — non-grid offsets cause diagonal wires)

`getOffset(type)`: `R 40 · L 40 · C 20 · V 20 · I 20 · D 20 · SW 20 · GND 0`.

For a 2-terminal component at rotation 0: A = (x − off, y), B = (x + off, y).

Rotation maps the offset around the center:
- 0°: (±off, 0) — A left, B right
- 90°: (0, ±off) — A top, B bottom
- 180°: (∓off, 0) — A/B swap (A right)
- 270°: (0, ∓off) — A/B swap (A bottom)

### Op-amp (3 terminals)

Offsets at rotation 0 (rotated by `comp.rotation`): **in+ (nodeA) = (−40, −20), in− (nodeB) = (−40, +20), out (nodeC) = (+40, 0)**. All grid-aligned.

### Ground (1 terminal)

`getAllTerminals(GND)` returns a **single** point at `(cx, cy − 20)` (the connection at the top of the symbol). (Historical note: the old code returned two duplicate terminals — it does not anymore.)

## Symbols (`draw.ts`, Canvas 2D, `ctx.translate(x,y)` + `ctx.rotate(rot)`)

| Type | Symbol | Body | Leads |
|------|--------|------|-------|
| R | IEC rounded rectangle | 44×16, radius 3 | 8px each end |
| C | two parallel plates | gap 12, plateH 24 | 8px |
| L | 4 half-circle loops | r 7, width 56 | 8px |
| V | circle + `+`/`−` marks | r 16 | 8px |
| I | circle + current arrow (→ nodeA) | r 16 | 8px |
| D | triangle → cathode bar | tw 8, th 8 | 8px |
| SW | two contact dots + lever | contacts ±10 | 8px; lever horizontal+green when `closed`, lifted otherwise |
| OP | triangle (apex = output) + `+`/`−` inputs | ~52 wide × 56 tall | input leads left (±20 y), output lead right |
| GND | stem + 3 decreasing bars | — | lead up from terminal |

Bodies are drawn semi-opaque (`rgba(8,10,16,0.85–0.9)`) so wires show through. Value labels (`formatValue`) sit below horizontal components.

## Colors — the INSTRUMENT palette (`instrument.ts`)

The console is a **theme-independent dark instrument** in both site themes (an oscilloscope is always dark). Import `INSTRUMENT` (a `DrawColors` superset) — do NOT use site CSS tokens on the canvas.

- While a simulation runs, wires + terminals are **heat-tinted by node voltage** via `voltageColor(v, vmax)` (cool = low/negative → warm = high) with a phosphor glow; `drawFlowParticles` animates current along wires.
- Probe markers: colored ring + label + live reading at the probed node/component.

## Wire routing

- **Manhattan only** — every segment strictly horizontal or vertical, both endpoints grid-snapped. `computeManhattanPath(ax,ay,bx,by)` returns `[]` if already axis-aligned, else one corner `[{x:bx,y:ay}]` (horizontal-first).
- **Hub-star per node** (`generateWires`): collect the node's unique terminal positions, pick the median-x as hub, route Manhattan paths from hub to each other terminal. Each wire stores `fromCompId`/`toCompId` so the renderer reconstructs endpoints with `terminalForNode` (without them, endpoints can flip → diagonal segments).
- **Junction dot** at every grid point where ≥2 terminals/waypoints coincide (radius ~5).
- A wire ending AT a component's terminal touches its bbox — that's expected, NOT a "wire through body". `validatePlacement` only flags a segment that crosses a body with BOTH endpoints outside.

## Interaction (`circuit-canvas.tsx`)

- **Pointer Events** (mouse/touch/pen), not mouse events. `touch-action: none`.
- **Pinch-zoom**: lock the two pointer ids in `pinchRef`; re-seed when the active count drops to 2 (lifting a non-tracked finger must not swap the pair).
- Place on pointer-**up**; Esc/right-click/2nd-finger cancels. Shift+click a terminal/body starts a wire (nearest terminal, hint `'A'|'B'|'C'`). Click an empty wire → toggle a `nodeV` probe. Alt+click rotates.

## Sample layout rules (validated by `placement.test.ts`)

1. Component centers + all terminals on grid (×20).
2. Spaced ≥2 grid units apart (no overlap).
3. Every component connected; no orphans.
4. Signal flow left→right, power top→bottom where possible.
5. Must pass `validatePlacement()` with **zero error-severity** issues (the only error codes are `DIAGONAL_WIRE` and `EMPTY` — warnings like `OVERLAP`/`WIRE_NEAR_COMP` are allowed).

## Anti-patterns

Diagonal segments · off-grid terminals · 4-way junctions (offset into two Ts) · site CSS tokens on the canvas · enumerating terminals via `nodeA`/`nodeB` instead of `getAllTerminals` · hardcoding a per-type terminal count.
