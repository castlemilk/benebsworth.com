# Circuit Simulator — Rich Build Design

**Date:** 2026-06-17
**Status:** Approved
**Scope:** Extend the existing `/lab/circuit-sim` tool from a crude DC/transient sandbox into a rich, instrument-grade circuit simulator.

## Goal

Turn the working-but-crude circuit simulator into a polished, intuitive, fast instrument:

- Cool, intuitive instrument styling (dark "bench device" in both site themes)
- Dynamic probing directly on wires (+ current and differential probes)
- Improved simulations: waveform sources, AC frequency sweep, and active devices (diode, op-amp, switch)
- Better sample selection + YAML management (gallery, localStorage saves, share URL)
- Better responsiveness + trace/graph view (touch support, real scope, Bode plot)
- Better circuit drawing (refined symbols, node-voltage heat, animated current)

## Current State (baseline)

The engine (`lib/lab/circuit-sim/`) is solid and well-tested (169 passing tests):

- `solver.ts` — DC MNA + LU decomposition (Doolittle, partial pivoting)
- `transient.ts` — trapezoidal companion models for L/C
- `validator.ts` — structured diagnostics + builder + assert helpers
- `laws.ts` / `verifier.ts` — KCL/KVL/power conservation checks, fuzzing
- `yaml.ts` — hand-rolled line-based YAML round-trip
- `wiring.ts` / `draw.ts` / `placement.ts` — Manhattan routing, IEC symbols, headless placement validation
- `samples.ts` — 10 hardcoded sample circuits

The UI (`components/lab/circuit-sim/`, `app/lab/circuit-sim/`) is the "crude" part:

1. `draw.ts` hardcodes `DARK_COLORS` (`bg: #080a10`) — ignores site tokens, broken in light mode.
2. Canvas uses **mouse-only** handlers — unusable on touch devices.
3. Probing is node-only; `hitTestWire` exists but is not wired to click-to-probe. No current/differential probes.
4. `ScopeConfig` (volts/div, time/div, trigger) is defined but **unused** — each trace auto-scales independently.
5. Sources are **DC-only** — filters can only show step response, never frequency response.
6. `completeWire` has a bug: `nodeA`/`nodeB` both set to `keep`.

**Decision:** keep the engine's design language (TS data model + YAML serialization), not protobuf — it is the established convention for this tool and the entire "yaml management" requirement is built on it. The hand-rolled parser will be hardened.

## Architecture

The circuit simulator keeps its three independent layers; this build deepens each.

```
lib/lab/circuit-sim/        ← Headless engine (no React/canvas/DOM)
  types.ts                  → extended data model (new component types, waveforms, probe kinds)
  devices.ts            NEW → per-device stamp registry (DC/transient/nonlinear/AC)
  mna.ts                NEW → shared real MNA assembly + Newton-Raphson driver
  complex-solver.ts     NEW → complex LU solver for AC analysis
  ac.ts                 NEW → AC frequency sweep → Bode data
  solver.ts                 → DC operating point (delegates to mna.ts)
  transient.ts              → transient stepping (delegates to mna.ts; NR per step)
  sources.ts            NEW → waveform evaluation (dc/sine/pulse/square) at time t
  measure.ts            NEW → trace measurements (Vpp, mean, RMS, freq)
  validator.ts              → extended diagnostics for new devices
  yaml.ts                   → hardened parser + new fields; encode/decode for share URL
  samples.ts                → categorized gallery with metadata
  draw.ts                   → instrument palette + refined symbols + N-terminal awareness
  wiring.ts / placement.ts  → op-amp 3-terminal support
  laws.ts / verifier.ts     → unchanged (still validate linear circuits)

components/lab/circuit-sim/ ← React/Canvas rendering layer
  circuit-canvas.tsx        → Pointer Events, pinch-zoom, click-wire probing, drawing polish
  component-palette.tsx      → expanded device list (grouped)
  inspector.tsx         NEW → selected-component editor incl. waveform editor + probe list
  scope-canvas.tsx          → real scope (trigger, volts/div, measurements, freeze)
  bode-canvas.tsx       NEW → magnitude/phase vs log-frequency
  analysis-panel.tsx    NEW → tabbed Scope | Bode + run controls
  toolbar.tsx               → run/analysis-mode/timestep + gallery/save/share entry points
  gallery-dialog.tsx    NEW → categorized samples + my-circuits (shadcn dialog)
  share.tsx             NEW → copy share URL (shadcn)

app/lab/circuit-sim/
  page.tsx                  → metadata (unchanged-ish)
  circuit-sim-page.tsx      → console layout; reads ?c= share param
```

### Solver evolution — device-stamp abstraction

Today each solver hand-loops components. Introduce one assembly routine that loops devices and calls per-device stamp functions, with four entry points:

- `stampDC(ctx)` — conductances + voltage-source rows
- `stampTransient(ctx, dt, state)` — trapezoidal companion for L/C
- `stampNonlinear(ctx, x)` — linearized companion at the current Newton guess
- `stampAC(ctx, omega)` — complex admittance

`ctx` exposes: matrix size, node→row map, voltage-source row allocator, and helpers `addG(r,c,v)`, `addZ(r,v)`. For AC, a complex variant accumulates into a complex matrix.

**Newton-Raphson driver** wraps DC and each transient step:
- Build MNA where nonlinear devices stamp their linearized Norton equivalent at the current guess; linear devices stamp normally.
- Solve, measure max delta; iterate to convergence (≤ ~50 iters, tol ~1e-6) with Gmin stepping + diode voltage limiting for robustness.
- Linear-only circuits converge in 1 iteration (no overhead path).

### Device models

| Device | Type | Terminals | DC / Transient | AC | Notes |
|--------|------|-----------|----------------|----|-------|
| Resistor | `R` | 2 | conductance | G | existing |
| Inductor | `L` | 2 | DC short (0V VS row) / trapezoidal companion | 1/(jωL) | existing |
| Capacitor | `C` | 2 | DC open / trapezoidal companion | jωC | existing |
| Voltage src | `V` | 2 | VS row; value from waveform(t) | acMag stimulus | + waveform |
| Current src | `I` | 2 | current injection; value from waveform(t) | acMag stimulus | NEW |
| Diode | `D` | 2 | Is·(e^(V/nVt)−1), NR-linearized + Gmin + Vlimit | small-signal Geq at DC op-point | NEW (nonlinear) |
| Switch | `SW` | 2 | variable R (on≈1mΩ / off≈1GΩ) | same | NEW (linear, boolean state) |
| Op-amp | `OP` | 3 | ideal nullor (virtual short in, norator out) | same nullor | NEW (linear; 3-terminal) |
| Ground | `GND` | 1 | reference | reference | existing |

**Op-amp = ideal nullor:** input enforces `V(in+) − V(in−) = 0` (extra constraint row); output adds a branch current variable injected into the output node. Linear — no NR. Optional rail-clamp (saturation) is a later nice-to-have via NR.

### Data model (`types.ts`)

- `ComponentType` adds `'I' | 'D' | 'SW' | 'OP'`.
- `CircuitComponent` adds:
  - `waveform?: Waveform` for `V`/`I` — `{ kind: 'dc'|'sine'|'pulse'|'square'; amplitude; offset; freq; phase; duty }`
  - `acMag?: number` — AC stimulus magnitude (default 1 for the designated input source)
  - `nodeC?: number` — op-amp output node (third terminal)
  - `state?: { closed?: boolean }` — switch state
- Op-amp is special-cased like GND already is (1-terminal). A `componentNodes(comp): number[]` helper centralizes terminal/node enumeration so solver/validator/wiring don't sprinkle type checks. This contains the 3-terminal change instead of a full N-terminal rewrite.
- `Probe` replaces the node-only trace concept:
  - `{ id; kind: 'nodeV' | 'compI' | 'compV'; ref: number | string; color; visible; samples; writeIdx; count }`
  - `nodeV` → node voltage; `compI` → current through a component; `compV` → voltage across a component.
- `AnalysisMode = 'transient' | 'ac'`.

### Sources (`sources.ts`)

`evalSource(waveform, t): number` returns instantaneous value:
- `dc` → offset (or amplitude if offset unset)
- `sine` → offset + amplitude·sin(2π·freq·t + phase)
- `pulse`/`square` → offset/amplitude with duty cycle
Transient stamps read `evalSource` per step. AC uses `acMag`. DC uses the waveform value at t=0 (or offset).

### AC analysis (`ac.ts`, `complex-solver.ts`)

1. Compute DC operating point (for nonlinear small-signal linearization).
2. For each log-spaced frequency in `[fStart, fStop]` (N points):
   - Assemble complex MNA (`stampAC`), one source as the unit stimulus.
   - Solve via complex LU.
   - Record magnitude (dB) + phase (deg) at each probed node relative to input.
3. Return Bode dataset: `{ freqs: number[]; mag: number[][]; phase: number[][] }` per probe.

### Probing & measurements

- **Click any wire** (no modifier, not placing/wiring, not on a component body) → `hitTestWire` → add `nodeV` probe at that node.
- **Current mode** (toolbar toggle or modifier) → click a component → `compI` probe.
- **Differential** (shift+click a component) → `compV` probe.
- Each probe is a scope channel with an auto-assigned color.
- `measure.ts` computes Vpp, mean, RMS, and dominant frequency (zero-crossing or peak interval) from a probe's ring buffer; shown in the channel legend and as hover tooltips.

### Scope rewrite (`scope-canvas.tsx`)

- Shared time base (time/div derived from the sim window); per-channel volts/div + vertical position; **auto-fit** toggle.
- **Trigger**: rising/falling edge at a level to stabilize periodic waveforms; free-run fallback.
- **Freeze/Run**; measurements strip; channel legend with live values.
- Tabbed with **Bode** view (`bode-canvas.tsx`) for AC mode: magnitude (dB) + phase (deg) vs log-frequency, with cursor readout.

### Styling — instrument-dark always

- A single `INSTRUMENT` palette (dark, CRT-ish) used regardless of site theme. Canvas + scope + inline controls read as one cohesive dark "console."
- Refined IEC symbols; phosphor-glow wires; **node-voltage heat coloring** (warm = high V, cool = low/negative); refined animated current particles.
- Page header/breadcrumb stay theme-aware; the instrument console is self-contained dark. New dialogs (gallery/save/share) use shadcn primitives styled to sit beside the console.

### Layout & responsiveness

- **Desktop console:** left rail (palette + tools) · center canvas · bottom analysis tabs (Scope/Bode + run controls) · right inspector (value + waveform editor + probe list).
- **Mobile/tablet:** stacked, touch-first.
- **Pointer Events** replace all mouse handlers (unifies mouse/touch/pen); add pinch-to-zoom and one-finger pan. This is the core responsiveness fix.

### Samples, persistence, sharing

- `samples.ts` gains categories + "what to look for" notes; gallery groups by category (R · RC · RLC · Filters · Bridges · Active).
- **localStorage**: save/rename/delete named circuits (`circuit-sim:saved` key).
- **Share URL**: `?c=<base64url(yaml)>`; `circuit-sim-page.tsx` hydrates from it on load. Copy-to-clipboard button.
- Hardened YAML import surfaces clear errors (bad type, missing fields) instead of silently failing.

## Testing strategy

Engine is test-first (vitest, node env). Per phase:

- **Unit (engine):** new device stamps verified against analytical results — diode I-V curve, op-amp configs (inverting/non-inverting gain, buffer), current source nodal injection, sine-source transient, RC/RLC AC magnitude at known frequencies (−3dB point), complex solver vs hand-computed phasors. Keep all 169 existing tests green.
- **Placement (headless):** new symbols pass `validatePlacement`; op-amp 3-terminal routing validated.
- **E2E (Playwright):** extend the existing `e2e/circuit-sim*.spec.ts` — place/wire via touch (pointer), click-wire probe, run transient + AC, load sample, save + reload from localStorage, open share URL. Screenshots before/after for the instrument styling.

## Phasing

Each phase: engine tests → UI → browser verification. Phases are independently shippable.

0. **Engine refactor** — device-stamp assembly (`devices.ts`, `mna.ts`) + `INSTRUMENT` palette plumbing. No behavior change; all tests green.
1. **Waveform + current sources** — `sources.ts`, `I` device, transient uses time-varying sources; inspector waveform editor; new samples.
2. **Pointer/touch + drawing polish** — Pointer Events, pinch-zoom, instrument styling, node heat, refined symbols, fix `completeWire` bug.
3. **Rich probing + scope rewrite** — click-wire/current/diff probes, `measure.ts`, trigger/volts-div/freeze/measurements.
4. **AC analysis + Bode** — `complex-solver.ts`, `ac.ts`, `bode-canvas.tsx`, analysis-mode switch.
5. **Diode + switch** — Newton-Raphson driver, diode stamp, switch device.
6. **Op-amp** — 3-terminal nullor, `componentNodes` helper, wiring/draw/hit-test support. *Riskiest — isolated last.*
7. **Gallery + persistence + share** — categorized gallery dialog, localStorage saves, share URL, hardened YAML.

## Non-goals

- Full N-terminal generic component model (op-amp handled as a contained special case).
- Transistors (BJT/MOSFET), transformers, transmission lines.
- Multi-source AC superposition (single stimulus source per sweep).
- Op-amp rail saturation in the first cut (ideal infinite-gain only).
- SPICE netlist import/export (YAML remains the interchange format).
