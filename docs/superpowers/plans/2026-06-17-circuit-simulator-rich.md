# Circuit Simulator — Rich Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Extend `/lab/circuit-sim` into an instrument-grade simulator: waveform + AC + active-device simulation, dynamic wire probing, a real scope + Bode view, touch support, instrument styling, and full sample/save/share management.

**Architecture:** Refactor the headless engine around a per-device *stamp* abstraction feeding one MNA assembler with four entry points (DC / transient / nonlinear-Newton / complex-AC). The React layer becomes a dark "console": Pointer-Events canvas, inspector, tabbed Scope/Bode, and shadcn dialogs for the gallery/save/share.

**Tech Stack:** TypeScript, Next.js App Router, Canvas 2D, vitest (node env), Playwright, shadcn/base-ui, lucide.

**Spec:** `docs/superpowers/specs/2026-06-17-circuit-simulator-rich-design.md`

**Conventions:** All engine code stays headless (no React/DOM/canvas). TDD: failing test → minimal impl → green → commit. Keep the 169 existing tests green at every step. Run `npx vitest run lib/lab/circuit-sim/` after engine changes; `npm run typecheck` before each phase commit.

---

## File map

**Engine (new):** `devices.ts` (stamp registry), `mna.ts` (real assembler + Newton driver), `complex-solver.ts` (complex LU), `ac.ts` (sweep→Bode), `sources.ts` (waveform eval), `measure.ts` (trace stats).
**Engine (modified):** `types.ts`, `solver.ts`, `transient.ts`, `validator.ts`, `yaml.ts`, `samples.ts`, `draw.ts`, `wiring.ts`, `placement.ts`.
**UI (new):** `inspector.tsx`, `bode-canvas.tsx`, `analysis-panel.tsx`, `gallery-dialog.tsx`, `share.tsx`, `instrument.ts` (palette).
**UI (modified):** `circuit-canvas.tsx`, `component-palette.tsx`, `scope-canvas.tsx`, `scope-panel.tsx`, `toolbar.tsx`, `circuit-sim-page.tsx`, `use-circuit-editor.ts`.
**Tests:** co-located `*.test.ts` per engine module; extend `e2e/circuit-sim*.spec.ts`.

---

## Phase 0 — Engine device-stamp refactor + instrument palette

Goal: introduce the stamp abstraction and route the existing DC + transient solvers through it, with **zero behavior change** (all 169 tests stay green). Add the instrument palette without wiring it yet.

### Task 0.1: `StampContext` + device stamp registry

**Files:** Create `lib/lab/circuit-sim/devices.ts`; Test `lib/lab/circuit-sim/devices.test.ts`.

Interfaces:

```ts
export interface StampContext {
  size: number
  /** matrix row for a node, or null for ground (node 0) */
  row(node: number): number | null
  /** allocate the next voltage-source / branch row */
  vsRow(): number
  addG(r: number, c: number, v: number): void   // into A (row-major)
  addZ(r: number, v: number): void              // into z
}
export interface SolveEnv {
  mode: 'dc' | 'transient'
  dt: number
  time: number                  // for waveform sources
  state: SimulationState        // companion state (transient)
  prev?: Float64Array           // current Newton guess (node V + branch I), for nonlinear
}
export type StampFn = (comp: CircuitComponent, ctx: StampContext, env: SolveEnv) => void
```

- [ ] **Step 1:** Write `devices.test.ts` — a single resistor between node 1 and ground stamps `G=1/R` into `A[row1,row1]`. Build a tiny fake `StampContext` capturing `addG` calls; assert.
- [ ] **Step 2:** Run `npx vitest run lib/lab/circuit-sim/devices.test.ts` → FAIL (no module).
- [ ] **Step 3:** Implement `stampResistor`, `stampCapacitor`, `stampInductor`, `stampVSource` in `devices.ts` by porting the exact stamping logic already in `transient.ts:44-134` and `solver.ts:139-168` (resistor conductance; cap/ind trapezoidal companion using `env.state`; VS branch rows; DC inductor = 0V VS when `env.mode==='dc'`). Export `DC_STAMPS` / `TRANSIENT_STAMPS` maps keyed by `ComponentType`.
- [ ] **Step 4:** Run test → PASS. Then `npx vitest run lib/lab/circuit-sim/`.
- [ ] **Step 5:** Commit `feat(circuit-sim): device stamp registry`.

### Task 0.2: `assembleMNA` + route solver.ts and transient.ts through it

**Files:** Create `lib/lab/circuit-sim/mna.ts`; Modify `solver.ts`, `transient.ts`; Test `mna.test.ts`.

- [ ] **Step 1:** Write `mna.test.ts`: assembling a voltage divider (V=5, R1=1k node1→2, R2=2k node2→gnd) in DC mode then `luSolve` yields node2 ≈ 3.333V (mirror `solver.test.ts`).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement `assembleMNA(circuit, env): {A,z,size,n,m,vsIndex,nodeOrder}` — collect non-ground nodes (sorted), count branch rows (V always; L only in DC mode), build `StampContext`, loop components calling the right stamp. Refactor `buildDCMatrix`/`solveDC` and `transientStep` to delegate to `assembleMNA` (keep their exported signatures and the companion-state update in `transient.ts:155-179` intact).
- [ ] **Step 4:** Run `mna.test.ts` then full suite → all green (169 + new).
- [ ] **Step 5:** Commit `refactor(circuit-sim): route DC + transient through assembleMNA`.

### Task 0.3: Instrument palette

**Files:** Create `components/lab/circuit-sim/instrument.ts`.

- [ ] **Step 1:** Define `INSTRUMENT` (a `DrawColors` superset) — deep CRT background `#070b10`, phosphor wire `#5fd0e8`, warm/cool voltage ramp endpoints, scope phosphor green, bezel tones. Re-export `DARK_COLORS = INSTRUMENT` from `draw.ts` so existing imports keep working.
- [ ] **Step 2:** `npm run typecheck`. Commit `feat(circuit-sim): instrument color palette`.

---

## Phase 1 — Waveform + current sources

Goal: time-varying `V` sources + new `I` current source; transient reads instantaneous source value; inspector edits waveforms; categorized samples gain waveform examples.

### Task 1.1: Waveform model + `sources.ts`

**Files:** Modify `types.ts`; Create `sources.ts`, `sources.test.ts`.

```ts
export type WaveformKind = 'dc' | 'sine' | 'pulse' | 'square'
export interface Waveform {
  kind: WaveformKind
  amplitude: number; offset: number
  freq: number; phase: number; duty: number   // duty 0..1; freq Hz; phase rad
}
export const DEFAULT_WAVEFORM: Waveform = { kind: 'dc', amplitude: 5, offset: 0, freq: 1000, phase: 0, duty: 0.5 }
```
Add `waveform?: Waveform` and `acMag?: number` to `CircuitComponent`; add `'I'` to `ComponentType`; add defaults/labels/`formatValue` for `I` (amps).

- [ ] **Step 1:** `sources.test.ts` — `evalSource({kind:'sine',amplitude:5,offset:0,freq:1000,phase:0,duty:0.5}, 0.00025)` ≈ 5 (quarter period); `dc` → offset; `pulse` high for `t mod T < duty*T`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement `evalSource(w, t)` and `sourceDCValue(comp)` (waveform value at t=0, or `offset` for sine/pulse/square so DC op-point is the bias point).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(circuit-sim): waveform model + source evaluation`.

### Task 1.2: Current source stamp + time-varying V in transient

**Files:** Modify `devices.ts`, `mna.ts`, `transient.ts`; Test `devices.test.ts`, `transient.test.ts`.

- [ ] **Step 1:** Tests — `I=1mA` into node1 with R=1k to ground → DC node1 = 1V. Sine V source across R: node voltage tracks `evalSource` at sampled steps.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** `stampCurrentSource`: `addZ(row(nodeA), -I); addZ(row(nodeB), +I)` (current leaves +, enters −, matching the companion sign convention in the skill notes). In `stampVSource`/`stampCurrentSource` read `env.mode==='transient' ? evalSource(comp.waveform, env.time) : sourceDCValue(comp)`; fall back to `comp.value` when `waveform` absent (back-compat).
- [ ] **Step 4:** Run device + transient + full suite → green.
- [ ] **Step 5:** Commit `feat(circuit-sim): current source + time-varying sources`.

### Task 1.3: YAML waveform fields + validator + samples

**Files:** Modify `yaml.ts`, `validator.ts`, `samples.ts`; Test `yaml.test.ts`, `samples`/`placement.test.ts`.

- [ ] **Step 1:** Tests — round-trip a sine V source (flattened keys `wkind, wamp, woff, wfreq, wphase, wduty, acmag`) preserves the waveform; validator flags `I` with no path. Add a "Sine → RC" sample; assert `validatePlacement` zero errors + DC/transient assertions.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Extend `serializeCircuit`/`deserializeCircuit` with the flattened waveform keys (omit when `dc`/absent). Add `I` handling in validator (current source needs a path; open current source = warning). Add ≥3 waveform samples to `samples.ts` with a `category` field (see Phase 7 type).
- [ ] **Step 4:** Run → green.
- [ ] **Step 5:** Commit `feat(circuit-sim): persist waveforms + waveform samples`.

### Task 1.4: Inspector with waveform editor (UI)

**Files:** Create `components/lab/circuit-sim/inspector.tsx`; Modify `use-circuit-editor.ts` (add `updateComponentWaveform`, `updateComponentField`), `circuit-sim-page.tsx`.

- [ ] **Step 1:** Inspector renders for the selected component: type badge, value input (shadcn `Input`), and — for `V`/`I` — a waveform `kind` selector + amplitude/offset/freq/phase/duty fields shown conditionally per kind. Emits updates via editor callbacks. Replaces the inline value editor in `circuit-sim-page.tsx:145-162`.
- [ ] **Step 2:** Add `updateComponentWaveform(id, partial)` to the editor (merge into `comp.waveform ?? DEFAULT_WAVEFORM`).
- [ ] **Step 3:** Verify in browser (Playwright MCP): select a V source, switch to sine, set freq, run — scope shows a sine. Screenshot.
- [ ] **Step 4:** `npm run typecheck`. Commit `feat(circuit-sim): inspector + waveform editor`.

---

## Phase 2 — Pointer/touch input + drawing polish

Goal: replace mouse-only handlers with Pointer Events (touch/pen), add pinch-zoom, fix the `completeWire` bug, and apply instrument drawing (refined symbols, node heat, glow).

### Task 2.1: Pointer Events + pinch-zoom

**Files:** Modify `circuit-canvas.tsx`.

- [ ] **Step 1:** Replace `onMouseDown/Move/Up` + `dragRef/panRef` with `onPointerDown/Move/Up/Cancel` using `pointerId` capture. Maintain an active-pointers map; with 2 pointers compute pinch → zoom about the midpoint (reuse the wheel zoom math at `circuit-canvas.tsx:475-485`). Single pointer: place/select/drag/wire/pan as today. Add `touch-action: none` to the canvas.
- [ ] **Step 2:** Verify on a touch viewport (Playwright `browser_resize` + touch emulation / `hasTouch` script): tap-place a resistor, drag it, pinch-zoom. Screenshot.
- [ ] **Step 3:** Commit `feat(circuit-sim): pointer events + pinch zoom`.

### Task 2.2: Fix `completeWire` node bug

**Files:** Modify `use-circuit-editor.ts:205-213`; Test `use-circuit-editor` logic via a new `wiring`/editor test or `yaml`+merge test.

- [ ] **Step 1:** Test — wiring comp A node 3 to comp B node 5 merges to the lower id and the created `CircuitWire` carries `fromCompId`/`toCompId` and `nodeA===nodeB===keep` is replaced with correct endpoints recorded for rendering.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Set `newWire.fromCompId = fromComp.id`, `newWire.toCompId = toComp.id`, both `nodeA`/`nodeB = keep` (electrically one node) — the renderer already uses `fromCompId`/`toCompId` to find endpoints; populating them fixes the diagonal/ambiguous routing.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `fix(circuit-sim): record wire endpoints on manual connect`.

### Task 2.3: Instrument drawing — symbols, node heat, glow

**Files:** Modify `draw.ts`, `circuit-canvas.tsx`.

- [ ] **Step 1:** Switch canvas to `INSTRUMENT`. Add `voltageColor(v, vmax)` ramp (cool→neutral→warm). During sim, color terminal dots / probe labels by node voltage. Add subtle wire glow (shadowBlur) and refine symbol stroke weights. Refined symbols for new types come in their phases; here polish R/L/C/V/GND/I.
- [ ] **Step 2:** Browser verify light + dark site themes both show the dark instrument; run a circuit and confirm heat coloring. Screenshots before/after.
- [ ] **Step 3:** Commit `feat(circuit-sim): instrument drawing + node-voltage heat`.

---

## Phase 3 — Rich probing + scope rewrite

Goal: click-wire / current / differential probes with live measurements; real scope (trigger, volts/div, freeze).

### Task 3.1: Probe model + measurements

**Files:** Modify `types.ts` (Probe type per spec), `use-circuit-editor.ts`; Create `measure.ts`, `measure.test.ts`.

- [ ] **Step 1:** `measure.test.ts` — Vpp/mean/RMS of a known sine ring buffer; freq via zero-crossings.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement `measureTrace(samples, count, writeIdx, sampleDt)`. Refactor `ScopeTrace`→`Probe` with `kind/ref`; editor `addProbe(kind, ref)`, `removeProbe(id)`. Sampling loop in `use-circuit-editor.ts:340-349` computes value by kind: `nodeV`→`voltages[ref]`; `compI`→component current (R: ΔV/R; V/L: branch current; C/I: companion/source current); `compV`→ΔV across.
- [ ] **Step 4:** Run measure + full suite → green.
- [ ] **Step 5:** Commit `feat(circuit-sim): probe model + trace measurements`.

### Task 3.2: Click-wire + current/diff probing (UI)

**Files:** Modify `circuit-canvas.tsx`, `component-palette.tsx`/`toolbar.tsx`.

- [ ] **Step 1:** Add a probe-mode toggle (Voltage/Current). Pointer-down with no modifier on empty wire → `hitTestWire` → `addProbe('nodeV', node)`. In current mode, click a component → `addProbe('compI', compId)`. Shift+click component → `addProbe('compV', compId)`. Show probe markers on canvas with live readouts colored per channel.
- [ ] **Step 2:** Browser verify: click a wire to probe, switch to current mode, probe a resistor; both appear as scope channels. Screenshot.
- [ ] **Step 3:** Commit `feat(circuit-sim): dynamic wire/current/differential probing`.

### Task 3.3: Scope rewrite

**Files:** Modify `scope-canvas.tsx`, `scope-panel.tsx`; Create/extend types for `ScopeConfig` usage.

- [ ] **Step 1:** Implement shared time base + per-channel volts/div (with auto-fit toggle), trigger (rising/falling at level — find the trigger index in the ring buffer and align the draw window), freeze/run, and a measurements strip (per channel: Vpp/mean/RMS/freq from `measure.ts`). Replace independent per-trace auto-scaling.
- [ ] **Step 2:** Browser verify with a sine source: trigger stabilizes the waveform; measurements read sane values. Screenshot.
- [ ] **Step 3:** Commit `feat(circuit-sim): real oscilloscope (trigger, volts/div, measurements)`.

---

## Phase 4 — AC analysis + Bode

Goal: complex MNA sweep and a Bode view.

### Task 4.1: Complex LU solver

**Files:** Create `complex-solver.ts`, `complex-solver.test.ts`.

- [ ] **Step 1:** Test — solve a 2×2 complex system with a known answer; solve a series R-C divider at one ω and check magnitude/phase vs hand calc.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement complex matrices as interleaved `Float64Array` (re,im pairs) with `cluDecompose`/`cluSolve` (Doolittle + partial pivoting on complex magnitude). Mirror `solver.ts` structure.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(circuit-sim): complex LU solver`.

### Task 4.2: AC sweep

**Files:** Create `ac.ts`, `ac.test.ts`; add `stampAC` to `devices.ts`.

- [ ] **Step 1:** Test — RC low-pass (R=1k, C=1µF) magnitude at f=1/(2π·RC) ≈ −3dB (0.707); phase ≈ −45°.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** `stampAC` per device (R→G; C→jωC; L→1/(jωL); V→unit stimulus row; I→current; diode/op-amp linearized — diode small-signal Geq from DC, op-amp nullor). `acSweep(circuit, {fStart,fStop,points}, probes)` → `{freqs, mag[][], phase[][]}` in dB/deg relative to the stimulus.
- [ ] **Step 4:** Run + full suite → green.
- [ ] **Step 5:** Commit `feat(circuit-sim): AC frequency sweep`.

### Task 4.3: Bode view + analysis mode switch (UI)

**Files:** Create `bode-canvas.tsx`, `analysis-panel.tsx`; Modify `toolbar.tsx`, `circuit-sim-page.tsx`, `use-circuit-editor.ts`.

- [ ] **Step 1:** `analysis-panel.tsx` tabs Scope | Bode. Mode switch in toolbar (Transient/AC). AC run calls `acSweep` and renders `bode-canvas.tsx` (log-x magnitude dB + phase deg, cursor readout).
- [ ] **Step 2:** Browser verify: switch to AC on the RC sample → Bode shows the −20dB/dec rolloff. Screenshot.
- [ ] **Step 3:** Commit `feat(circuit-sim): Bode plot + analysis mode`.

---

## Phase 5 — Diode + switch

### Task 5.1: Newton-Raphson driver

**Files:** Modify `mna.ts`; Test `mna.test.ts`.

- [ ] **Step 1:** Test — placeholder linear circuit converges in 1 iteration; driver returns same result as single solve.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Add `solveNonlinear(circuit, env)`: loop assemble→solve→Δ check (tol 1e-6, ≤50 iters), with Gmin and per-iteration carry of the guess in `env.prev`. DC `solveDC` and each `transientStep` use it when the circuit contains nonlinear devices (else fast linear path).
- [ ] **Step 4:** Run + suite → green.
- [ ] **Step 5:** Commit `feat(circuit-sim): Newton-Raphson driver`.

### Task 5.2: Diode device

**Files:** Modify `types.ts`, `devices.ts`, `draw.ts`, `validator.ts`, `samples.ts`; Test `devices.test.ts`.

- [ ] **Step 1:** Test — half-wave rectifier (sine V → diode → R load) clips negative half; series diode forward drop ≈ 0.6–0.7V at mA currents.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** `stampDiode` nonlinear: `I=Is(e^(Vd/(nVt))−1)`, `Geq=Is/(nVt)·e^(Vd/nVt)`, `Ieq=I−Geq·Vd`, with `Vd` from `env.prev`, voltage limiting and Gmin. Defaults `Is=1e-14, n=1, Vt=0.02585`. Add diode symbol (triangle+bar) to `draw.ts` + hit-test dims. Add a rectifier sample.
- [ ] **Step 4:** Run + suite + placement → green.
- [ ] **Step 5:** Commit `feat(circuit-sim): diode device + rectifier sample`.

### Task 5.3: Switch device

**Files:** Modify `types.ts`, `devices.ts`, `draw.ts`, `inspector.tsx`; Test `devices.test.ts`.

- [ ] **Step 1:** Test — closed switch ≈ short (Vdrop≈0), open ≈ no current.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** `stampSwitch` as resistor with `g = comp.state?.closed ? 1e3 : 1e-9`. Symbol + inspector toggle for open/closed.
- [ ] **Step 4:** Run + suite → green.
- [ ] **Step 5:** Commit `feat(circuit-sim): switch device`.

---

## Phase 6 — Op-amp (3-terminal nullor) — riskiest, isolated

### Task 6.1: `componentNodes` helper + 3-terminal model

**Files:** Modify `types.ts`, `solver.ts`/`mna.ts` node collection, `validator.ts`; Test new `nodes.test.ts`.

- [ ] **Step 1:** Test — `componentNodes(opamp)` returns `[nodeA(in+), nodeB(in−), nodeC(out)]`; 2-terminal types return 2; GND returns 1.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Add `nodeC?: number`; implement `componentNodes(comp)`. Replace ad-hoc `nodeA/nodeB` node collection in `mna.ts`/`solver.ts`/`transient.ts`/`validator.ts` with `componentNodes` so node sets include `nodeC`.
- [ ] **Step 4:** Run + full suite → green (no regressions for 2-terminal).
- [ ] **Step 5:** Commit `feat(circuit-sim): N-terminal node enumeration`.

### Task 6.2: Op-amp stamp

**Files:** Modify `devices.ts`, `mna.ts` (branch row for output); Test `devices.test.ts`.

- [ ] **Step 1:** Tests — non-inverting amp gain `1+Rf/Rg`; inverting amp gain `−Rf/Rg`; unity buffer Vout=Vin (within tol).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** `stampOpAmp` ideal nullor: allocate branch row `b` (output current Io). Input constraint row: `V(in+) − V(in−) = 0` → in the branch row put `+1` at `row(nodeA)` col and `−1` at `row(nodeB)` col; output: `addG(row(nodeC), b, 1)` (Io into output node). No input current. Works for DC/transient/AC identically (linear).
- [ ] **Step 4:** Run + suite → green.
- [ ] **Step 5:** Commit `feat(circuit-sim): ideal op-amp (nullor)`.

### Task 6.3: Op-amp drawing + wiring (3 terminals)

**Files:** Modify `draw.ts`, `wiring.ts`, `placement.ts`, `circuit-canvas.tsx`, `samples.ts`; Test `placement.test.ts`.

- [ ] **Step 1:** Test — op-amp terminals are grid-aligned; an inverting-amp sample passes `validatePlacement` with zero errors.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Triangle op-amp symbol with two input leads (left, ±20px) + output lead (right). `getTerminalPositions` returns 3 points for `OP` (extend return type or add `getAllTerminals(comp): {node,x,y}[]`). Update wiring/hit-test/junction detection to iterate `getAllTerminals`. Add inverting + non-inverting + buffer samples.
- [ ] **Step 4:** Run + placement + suite → green; browser verify an op-amp amplifier runs. Screenshot.
- [ ] **Step 5:** Commit `feat(circuit-sim): op-amp symbol + 3-terminal wiring`.

---

## Phase 7 — Gallery + persistence + share + hardened YAML

### Task 7.1: Sample categories + hardened YAML

**Files:** Modify `samples.ts` (add `category`, `lookFor`), `yaml.ts`; Test `yaml.test.ts`, `samples.test.ts` (new).

- [ ] **Step 1:** Tests — every sample parses, validates with no errors, and DC-solves; YAML import of a malformed doc throws a typed `YamlError` with line info.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Add `category: 'Basics'|'RC'|'RLC'|'Filters'|'Bridges'|'Active'` + `lookFor: string` to samples; group helper `samplesByCategory()`. Add `parseCircuitStrict` raising `YamlError` (unknown type, missing required field) used by import; keep lenient internal parse for samples.
- [ ] **Step 4:** Run → green.
- [ ] **Step 5:** Commit `feat(circuit-sim): sample categories + strict YAML import`.

### Task 7.2: localStorage saves + share URL

**Files:** Create `components/lab/circuit-sim/share.tsx`; Modify `use-circuit-editor.ts` (saved-circuit CRUD via `lib/lab/circuit-sim/storage.ts`), `circuit-sim-page.tsx` (read `?c=`); Create `storage.ts`, `storage.test.ts`.

- [ ] **Step 1:** Tests — `encodeCircuit`/`decodeCircuit` (base64url of YAML) round-trips; saved-circuit list add/rename/delete pure functions over a passed-in store object.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement `encodeCircuit(circuit): string` / `decodeCircuit(s): Circuit` and a thin `savedCircuits` API over `localStorage` (guarded for SSR). `circuit-sim-page.tsx` hydrates from `?c=` on mount. Share button copies `${location.origin}/lab/circuit-sim/?c=…`.
- [ ] **Step 4:** Run → green.
- [ ] **Step 5:** Commit `feat(circuit-sim): localStorage saves + share URL`.

### Task 7.3: Gallery dialog (UI)

**Files:** Create `components/lab/circuit-sim/gallery-dialog.tsx`; add shadcn `dialog`,`input` (`npx shadcn@latest add dialog input`); Modify `toolbar.tsx`.

- [ ] **Step 1:** Dialog with two tabs: **Examples** (grouped by category, each card shows name + `lookFor`) and **My circuits** (localStorage list with load/rename/delete). Load applies YAML via the editor.
- [ ] **Step 2:** Browser verify: open gallery, load an Active sample, save it under a name, reload page, reopen gallery → it persists; copy share URL and open it in a new tab → circuit restores. Screenshots.
- [ ] **Step 3:** Commit `feat(circuit-sim): sample gallery + saved-circuits dialog`.

### Task 7.4: Console layout pass + e2e

**Files:** Modify `circuit-sim-page.tsx`; extend `e2e/circuit-sim*.spec.ts`.

- [ ] **Step 1:** Final console layout (left rail / canvas / bottom analysis tabs / right inspector; stacked + touch on mobile). 
- [ ] **Step 2:** Extend e2e: touch place/wire, click-wire probe, transient + AC run, gallery load, save+reload, share-URL load. Run `npm run e2e -- circuit-sim`.
- [ ] **Step 3:** `npm run typecheck && npx vitest run lib/lab/circuit-sim/`. Commit `feat(circuit-sim): console layout + e2e coverage`.

---

## Self-review notes

- **Spec coverage:** styling→P0/P2; dynamic probing→P3; improved sims (waveforms/AC/active)→P1/P4/P5/P6; samples/yaml/share→P7; responsiveness/scope→P2/P3/P4; drawing→P2/P6. All covered.
- **Type consistency:** `StampContext`/`SolveEnv`/`StampFn` (P0) reused P1/P4/P5/P6; `Probe.kind` `'nodeV'|'compI'|'compV'` consistent P3; `Waveform` keys consistent P1/P7; `componentNodes`/`getAllTerminals` introduced P6 and used by wiring/draw there.
- **Risk:** op-amp 3-terminal isolated to P6 behind `componentNodes`; nonlinear isolated to P5 behind `solveNonlinear` (linear circuits keep the fast path).
