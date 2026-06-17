---
name: circuit-simulator
description: Use when modeling, validating, drawing, simulating, or extending the /lab/circuit-sim circuit simulator — adding component types, MNA/transient/AC/nonlinear solver work, terminals and symbol drawing, probes, the oscilloscope/Bode views, or YAML/samples/share links.
---

# Circuit Simulator

Reference for the `/lab/circuit-sim` simulator: a device-stamp MNA engine (DC, transient, AC, nonlinear Newton-Raphson) with a Canvas instrument front-end. **Drawing/terminal/symbol detail lives in `drawing-rules.md` (read it for any rendering work).**

## Architecture — three layers

```
lib/lab/circuit-sim/          ← HEADLESS engine (no React/DOM/canvas; vitest node env)
  types.ts        → ComponentType, CircuitComponent, Probe, ScopeSettings, AnalysisMode,
                    Waveform, componentNodes()  ← single source of a component's node list
  devices.ts      → per-device STAMP registry (DC_STAMPS / TRANSIENT_STAMPS), StampContext, SolveEnv
  mna.ts          → assembleMNA(): builds the real MNA system by dispatching stamps
  solver.ts       → solveCircuit() (linear OR Newton-Raphson), solveDC(), LU (luDecompose/luSolve)
  transient.ts    → transientStep(): trapezoidal companion step (delegates to solveCircuit)
  complex-solver.ts → cluSolve(): complex LU (interleaved re/im) for AC
  ac.ts           → acSweep(): complex MNA per log-spaced freq → Bode (mag dB + phase deg)
  sources.ts      → evalSource()/sourceValue(): waveform value at time t
  results.ts      → nodeVoltage/componentVoltage/componentCurrent (probe values)
  measure.ts      → measureTrace(): Vpp/min/max/mean/RMS/freq over a ring buffer
  validator.ts    → validateCircuit() diagnostics + CircuitBuilder + assertDC/assertTransient
  verifier.ts     → verifyCircuit(): structural + KCL/KVL/power sanity (powers sample tests)
  laws.ts         → checkKCL/KVL/power, fuzzing helpers
  draw.ts         → getAllTerminals/terminalForNode/getTerminalPositions, gridSnap, symbol drawing
  wiring.ts       → generateWires() (hub-star Manhattan) + computeManhattanPath
  placement.ts    → renderCircuit()/validatePlacement() (headless geometry validation)
  yaml.ts         → serialize/deserialize round-trip
  storage.ts      → encodeCircuit/decodeShareYaml (base64url share links) + localStorage library
  samples.ts      → SAMPLES + groupedSamples() (6 categories, with "look for" notes)

components/lab/circuit-sim/   ← React/Canvas layer
  instrument.ts        → INSTRUMENT palette (theme-independent dark) + voltageColor() heat ramp
  circuit-canvas.tsx   → Pointer-Events canvas: place/drag/wire/pan/pinch-zoom/click-probe + draw
  inspector.tsx        → selected-component editor: value, waveform editor, switch toggle, probe buttons
  scope-canvas.tsx     → oscilloscope (trigger, volts/div, freeze, per-channel measurements)
  bode-canvas.tsx      → magnitude(dB) + phase(deg) vs log-frequency
  analysis-panel.tsx   → tabs: Transient (scope) | AC (Bode)
  scope-panel.tsx      → drawFlowParticles() (animated current on wires)
  component-palette.tsx, toolbar.tsx, gallery-dialog.tsx

app/lab/circuit-sim/          ← Next route: page.tsx (metadata) + circuit-sim-page.tsx (wires it up, ?c= hydration)
```

**Iron rule:** the engine (`lib/lab/circuit-sim/`) is headless — never import React/JSX/DOM/canvas there. Placement validation, the solver, and all tests run without a browser.

## Data model (`types.ts`)

`ComponentType = 'R'|'L'|'C'|'V'|'I'|'D'|'SW'|'OP'|'GND'`.

`CircuitComponent`: `id, type, value, nodeA, nodeB, x, y, rotation` + optionals:
- `nodeC?` — op-amp **output** node (nodeA = in+, nodeB = in−).
- `waveform?` — `{ kind: 'dc'|'sine'|'pulse'|'square', amplitude, offset, freq, phase, duty }` (V/I sources).
- `acMag?` — AC stimulus magnitude.
- `closed?` — switch state.

**`componentNodes(comp)` returns the node list: 1 (GND), 3 (OP), 2 (everything else). ALWAYS enumerate nodes through it** — `assembleMNA`, `validator` adjacency, `wiring`, `placement` all do. Reaching for `nodeA`/`nodeB` directly is the classic op-amp bug (3rd terminal dropped).

`Probe`: `{ id, kind: 'nodeV'|'compI'|'compV', ref: nodeId|compId, label, color, visible, unit: 'V'|'A', samples (ring buffer), writeIdx, count }`.

## Solver — device-stamp MNA

Each device contributes to the MNA matrix via a **stamp** `(comp, ctx: StampContext, env: SolveEnv) => void`. `ctx` exposes `row(node)→matrix row|null(ground)`, `vsRow()` (allocate branch row), `addG(r,c,v)`, `addZ(r,v)`, `branchRows`. `env` carries `mode`, `dt`, `time`, `state` (companion), `prev` (NR guess), `nrState`/`nrFlags` (NR limiting). `assembleMNA()` loops components dispatching `DC_STAMPS` or `TRANSIENT_STAMPS`.

**Branch rows:** V always; **L only at DC** (0V source); **OP always** (nullor output current). C/L use the trapezoidal companion in transient (conductance + current source, no branch row).

**Four solve paths:**
- **DC op-point** — `solveDC` → `solveCircuit(makeDCEnv())`.
- **Transient** — `transientStep` → `solveCircuit(...)`, then companion `vPrev/iPrev` update post-solve.
- **Nonlinear (diode)** — `solveCircuit` auto-detects any `'D'` and runs Newton-Raphson (else one LU). Re-stamps each iteration around `env.prev`; converges when max node-voltage delta < `NR_TOL` (1e-7) **AND no junction was voltage-limited this iteration** (`nrFlags.limited`); ≤ `MAX_NR_ITERS` (100).
- **AC** — `acSweep()` assembles a complex MNA per log-spaced frequency (R→G, C→jωC, L→1/jωL, V/I→stimulus), solves with `cluSolve`, returns Bode magnitude(dB)/phase(deg) per probe.

### Device behavior

| Type | Term. | DC | Transient | AC |
|------|-------|----|-----------|----|
| R | 2 | conductance 1/R | same | G = 1/R |
| C | 2 | open (no stamp) | companion `gEq=2C/dt`, `iEq=gEq·vPrev+iPrev` | jωC |
| L | 2 | 0V source (branch row) | companion `gEq=dt/2L`, `iEq=iPrev+gEq·vPrev` | 1/(jωL) |
| V | 2 | branch row, value = `sourceValue` (waveform bias or `value`) | value = `evalSource(t)` | unit stimulus / 0 |
| I | 2 | current injection | `evalSource(t)` | current stimulus / 0 |
| D | 2 | `Is(e^(Vd/nVt)−1)+Gmin·Vd`, NR-linearized | same | small-signal `Geq` at DC op-point |
| SW | 2 | conductance `SW_ON=1e3` (closed) / `SW_OFF=1e-9` (open) | same | same |
| OP | 3 | ideal nullor (linear): `v(in+)−v(in−)=0`, free output current → nodeC | same | same |
| GND | 1 | reference (node 0) | — | — |

Diode constants: `Is=1e-14, n=1, Vt=0.025852, Gmin=1e-12`. AC stimulus = first source with `acMag`, else first V, else first I; all other independent sources AC-grounded.

## Validation (`validateCircuit`)

Ten diagnostic codes (`severity: error|warning|info`): `EMPTY`, `NO_GROUND` (err), `INVALID_VALUE` (err), `ZERO_VOLTAGE` (warn), `FLOATING_NODE` (err), `OPEN_LOOP` (err), `PARALLEL_VS` (warn), `SINGULAR` (err), `DEAD_END` (info), `READY` (info). Same function powers the UI sidebar and vitest assertions.

Logic that bites if you forget it:
- **`INVALID_VALUE` is passive-only** (R/L/C `value ≤ 0`). Sources (V/I) may legitimately be 0; diode/switch/op-amp/GND have no meaningful `value`.
- **`ZERO_VOLTAGE`** only fires for a DC V source (`value===0 && !waveform`).
- Adjacency (`buildAdjacency`) cliques **all** of a component's `componentNodes` (so the op-amp output is "driven", not floating) and includes capacitors for connectivity.
- `verifier.ts` exempts **reactive- or AC-waveform-driven** circuits from the "resistors have DC current" / "distinct voltages" checks (a pure sine biases to 0V at DC).

Programmatic test API: `assertDC(circuit,{node:V},tol)`, `assertTransient(...)`, `circuit().v(5,1,0).r(1000,1,2).gnd().build()`.

## Probing, scope & Bode

- Probe kinds: **`nodeV`** (click any wire), **`compI`** (current through), **`compV`** (V across). `results.ts` computes values per kind; `measure.ts` derives Vpp/RMS/freq.
- `scope-canvas`: shared time base, trigger (edge + level + source), auto-fit or volts/div, freeze (snapshots probes so the sim runs on), per-channel legend with live measurements.
- `bode-canvas` + `analysis-panel`: AC mode auto-recomputes the sweep on circuit/probe/option change.

## Persistence & samples

- `yaml.ts` flattens optional fields: `wkind/wamp/woff/wfreq/wphase/wduty`, `acmag`, `closed`, `nodeC`.
- `storage.ts`: `encodeCircuit`→`?c=` base64url share links (UTF-8 safe), `decodeShareYaml` hydrates on mount; `localStorage` library via pure `upsertSaved`/`removeSaved` helpers.
- `samples.ts`: `groupedSamples()` → 6 categories (Basics/RC/RLC/Filters/Bridges/Active); metadata (`category`, `lookFor`) keyed by name in `SAMPLE_META`. Don't hardcode a sample count anywhere (the old skill said "7" and rotted).

## Field-tested gotchas

1. **Companion current sign** — inject `+iEq` INTO node a, `−iEq` from b (`stampCurrent`). Reversed → oscillating voltages.
2. **Diode NR convergence** — seed `pnjlim`'s `vold` at **0** (not the raw vd), and **only declare convergence when no junction is still limited** (`nrFlags.limited`). Otherwise geq stays tiny while pnjlim ramps, node deltas look small, and it "converges" with the diode off (output ≈ 0).
3. **Diode companion** — `Geq=Is/nVt·e^(Vd/nVt)+Gmin`, `Ieq=Id−Geq·Vd`, stamp as conductance + `stampCurrent(ai,bi,−Ieq)`.
4. **Op-amp is LINEAR** (nullor) — no Newton needed. It needs a branch row (output current), the input constraint row `v(in+)−v(in−)=0`, current into nodeC, and **`componentNodes` updated everywhere** for the 3rd terminal.
5. **`completeWire`** must set `fromCompId`/`toCompId`; both endpoints become the merged node `keep`. The renderer resolves the actual terminal via `terminalForNode`, not endpoint indices.
6. **GND emits ONE terminal** via `getAllTerminals` (the old 2-duplicate form is gone). Tests that assumed "2 terminals/component" must sum `componentNodes(c).length`.
7. **Stale dev server** — after engine edits, hard-reload; HMR can serve stale stamps. Symptom: a source value stays constant instead of following its waveform.
8. **Pinch-zoom** — lock the two pointer ids in `pinchRef` and re-seed when dropping to 2 pointers, or lifting a 3rd finger swaps the tracked pair and the zoom jumps.
9. **Inspector NumberField** — skip the value→buffer resync while the field is focused, else live-commit reformats in-progress text ("0.5"→"500m").

## Testing

vitest `node` env; the suite covers solver/transient/devices/mna/ac/complex-solver/results/measure/diode-switch/opamp/validator/placement/wiring/yaml/storage/laws/verifier. `placement.test.ts` validates every sample (zero error-severity issues — no diagonal wires; grid-aligned terminals). Run: `npx vitest run lib/lab/circuit-sim/`.

## References

Litovski "Modified Nodal Analysis" · Najm "Circuit Simulation" (companion/Newton stamps, pnjlim) · Vladimirescu "The SPICE Book" · Nagel "SPICE2" · IEC 60617 / IEEE 315 (graphical symbols).
