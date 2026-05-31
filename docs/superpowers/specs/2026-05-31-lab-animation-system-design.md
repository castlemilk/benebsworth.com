# Lab Animation System — Design

**Date:** 2026-05-31
**Status:** Approved design → ready for implementation plan

## Overview

Turn `/lab` (currently a single page rendering one `Orbits` component) into a small content
system of generative animation "effects". Each effect is a self-contained, efficient
canvas-2D module with live-tunable knobs (URL-shareable), its own mini-post explaining how it
works, and a low-compute mini-embed surfaced on the home page. A shared animation harness
centralizes all efficiency concerns (offscreen/hidden pausing, reduced-motion, DPR/FPS caps)
so individual effects stay tiny.

## Goals
- A reusable framework that makes adding a new effect trivial (one module + one MDX explainer + one registry entry).
- 5 seed effects: Orbits (ported), Flow Field, Starfield, Cyclic Cellular Automaton, Ripple Grid.
- Per-effect live controls (sliders/toggles/color/select) that retune the animation in real time, sync to the URL (shareable permalink), with reset + copy-config.
- A tiny, **super efficient, low-compute** mini-embed on the landing showing a random `home_embed_safe` effect each load, linking to its lab post.
- Cohesive with the dark / mono / neon "technical dossier" aesthetic; honors `prefers-reduced-motion`; static-export safe.

## Non-Goals
- No WebGL/shaders (keep canvas-2D, CPU-cheap, dependency-light).
- No server/runtime (fully static export).
- No animation library.

## Decisions (locked)
| Topic | Decision |
|-------|----------|
| Seed effects | 5: orbits, flow-field, starfield, cyclic-automaton, ripple-grid |
| Home embed | Random effect from the `home_embed_safe` subset, per page load |
| Knobs | Live controls + URL sync (shareable) + reset + copy-config |
| Data model | `LabEffect` proto message for metadata; component + controls + explainer in the TS registry |
| Explainers | One MDX file per effect (`content/lab/<slug>.mdx`) rendered via existing `MdxContent` |

## Architecture

### Effect contract
Each effect lives in `components/lab/effects/<slug>.ts(x)` and exports:
```ts
export const controls: ControlSpec[]            // the tunable knobs
export const defaults: Record<string, number | boolean | string>
export function createRenderer(
  ctx: CanvasRenderingContext2D,
  dims: { w: number; h: number; dpr: number },
): { step: (timeMs: number, params: Params) => void; destroy?: () => void }
```
`createRenderer` allocates its state once (particle arrays, grids, offscreen buffers) sized to
`dims`; `step` mutates and draws one frame using the current `params`. No per-frame
allocations. Effects never own the rAF loop, sizing, or lifecycle — the harness does.

### Shared harness — `components/lab/effect-canvas.tsx` (`'use client'`)
`<EffectCanvas effect quality params className />`:
- Creates a `<canvas>`; sizes it to its container via `ResizeObserver`; `dpr = quality === 'mini' ? 1 : Math.min(devicePixelRatio, 2)`.
- Runs ONE `requestAnimationFrame` loop calling `renderer.step(t, params)`.
- **Pauses** the loop when the canvas is offscreen (`IntersectionObserver`) and when the tab is hidden (`document.visibilitychange`); resumes on return.
- Optional FPS cap (`quality === 'mini'` → ~30fps via timestamp gating; full → uncapped).
- `prefers-reduced-motion` (matchMedia, reactive): do not start the loop; render exactly one static frame.
- Recreates the renderer only when `effect` or `dims` change; `params` changes are read live by `step` (no recreate).
- Cleans up rAF + observers + `renderer.destroy?.()` on unmount.

### Controls — `components/lab/controls.tsx` + `lib/lab/url-params.ts`
- `ControlSpec = { key; label; type: 'range'|'toggle'|'color'|'select'; min?; max?; step?; options?: {label,value}[] }`.
- `<Controls specs params onChange onReset onCopy />` renders the knobs in the dark/mono style (range sliders with value readout, toggle switches, color swatch input, select). Accessible labels.
- `lib/lab/url-params.ts` — pure functions `encode(params): string` and `decode(search, defaults, specs): Params` (clamps/validates against specs; ignores unknown/out-of-range). Unit-tested.
- `useUrlParams(defaults, specs)` (client hook) — initializes from `location.search`, returns `[params, setParam, reset]`, writes back via debounced `history.replaceState` (no navigation/scroll). Copy-config button copies the full permalink URL.

### Data model (protobuf)
Add to `proto/content.proto`:
```protobuf
message LabEffect {
  string slug = 1;
  string title = 2;
  string blurb = 3;
  repeated string tags = 4;
  bool home_embed_safe = 5;
}
```
Regenerate `lib/gen/content.ts`. The registry entries are typed as `LabEffect & { controls; defaults; Component/effectModule }`.

### Registry — `lib/lab/registry.ts`
Ordered array of effect definitions:
```ts
type LabEntry = LabEffect & {
  controls: ControlSpec[]
  defaults: Params
  load: () => Promise<EffectModule>   // or direct import of the effect module
}
export const LAB_EFFECTS: LabEntry[]
export function getEffect(slug): LabEntry | undefined
export const HOME_EMBED_EFFECTS = LAB_EFFECTS.filter(e => e.homeEmbedSafe)
```
Used by `/lab` index, `/lab/[slug]` (`generateStaticParams`), and the home embed.

### Pages
- **`app/lab/page.tsx`** — index: heading + intro, then a responsive grid of effect cards. Each card = a mini `<EffectCanvas quality="mini">` (paused offscreen; static poster frame under reduced-motion), title, blurb, tags, link to `/lab/<slug>`. Editorial styling consistent with projects/blog.
- **`app/lab/[slug]/page.tsx`** — `generateStaticParams` from the registry. Layout: a large interactive `<EffectCanvas quality="full">` hero with the `<Controls>` panel (knobs + reset + copy/permalink), then the MDX explainer (`content/lab/<slug>.mdx` via `MdxContent`) covering how it works + what each knob does, then a code snippet. `generateMetadata` from the registry. The interactive hero is a small `'use client'` wrapper (`components/lab/effect-playground.tsx`) that wires `useUrlParams` → `<Controls>` + `<EffectCanvas>`.

### Home embed — `components/lab/home-embed.tsx` + grid-nav integration
- The landing's lab artifact tile renders a tiny live effect via SVG `foreignObject` hosting `<EffectCanvas quality="mini">` with a random `HOME_EMBED_EFFECTS` entry chosen per load (seeded the same way the grid already randomizes, so SSR/CSR match — pick the effect in the client `useEffect` that already sets the seed, to avoid hydration mismatch). Capped tiny (container ~the tile size, dpr 1, ~24fps, paused offscreen, reduced-motion static). Clicking the tile deep-links to `/lab/<that-slug>`.
- Fallback: if `foreignObject`/canvas init fails or reduced-motion, show the existing static glyph/poster. Keep the tile keyboard-focusable with an aria-label.

## The 5 seed effects (canvas-2D, bounded, tunable)
1. **orbits** — port the existing `components/lab/orbits.tsx` into the effect contract. `home_embed_safe`.
2. **flow-field** — particles advected by a simplex/Perlin noise field; trail fade via low-alpha clear. Knobs: particle count, noise scale, speed, trail persistence, color. (Bounded particle count; full only or carefully sized for embed.)
3. **starfield** — parallax star warp from a vanishing point. Knobs: star count, warp speed, depth, streak length, color. `home_embed_safe`.
4. **cyclic-automaton** — cyclic cellular automaton on a coarse grid (each cell advances when enough neighbours are the next state). Knobs: cell size, number of states, neighbour threshold, tick rate, palette.
5. **ripple-grid** — dot grid displaced by summed sine waves from moving sources (interference). Knobs: amplitude, frequency, wave speed, source count, color. `home_embed_safe`.

`home_embed_safe` subset (cheapest): orbits, starfield, ripple-grid.

## Performance budget
- Mini-embed: dpr 1, ≤~64px-ish render, ≤~30fps, bounded counts, paused offscreen + tab-hidden + reduced-motion.
- Lab index minis: paused until in-view; low fps.
- Full detail: dpr ≤2, uncapped fps but bounded element counts; pauses offscreen/hidden.
- No per-frame allocations in any `step`.

## Testing
- **Unit:** `lib/lab/url-params.ts` encode/decode round-trip + clamping/validation; registry integrity (unique slugs, every `defaults` key has a matching `ControlSpec` and is within range, `home_embed_safe` subset non-empty).
- **E2E (Playwright):** `/lab` index renders effect cards; a `/lab/<slug>` page renders the canvas + controls; moving a knob updates the URL `?…`; reduced-motion renders a static frame (no error); the home page lab tile renders and links into `/lab/`.
- **Gates:** `proto:gen` clean, `tsc` clean, `npm test`, `npm run build` green; verify built `out/lab/index.html` + `out/lab/<slug>/index.html` exist.

## Milestones (for the plan)
1. Proto `LabEffect` + codegen; `ControlSpec` types; `lib/lab/url-params.ts` (+ tests).
2. `<EffectCanvas>` harness (offscreen/hidden/reduced-motion/DPR/FPS) + `<Controls>` + `useUrlParams`.
3. Effect contract + port **orbits**; registry; `/lab` index + `/lab/[slug]` playground + MDX explainer pipeline.
4. Remaining effects: flow-field, starfield, cyclic-automaton, ripple-grid (+ explainers).
5. Home embed (foreignObject mini-canvas, random per load, fallbacks) in grid-nav.
6. Tests (unit + E2E), build verification.

## Risks / Open items
- **foreignObject + canvas in the landing SVG**: verify hydration + that pausing works; fallback to a static poster if problematic.
- **Lab index with multiple live canvases**: must pause offscreen and cap fps to stay cheap; if still heavy, fall back to static poster frames that animate only on hover/in-view.
- **Hydration**: the random home-embed effect must be chosen client-side (in the existing seed effect) to avoid SSR/CSR mismatch.
