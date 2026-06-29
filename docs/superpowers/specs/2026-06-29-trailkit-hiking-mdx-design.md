# Trailkit — a branded MDX system for trail guides

**Status:** approved design, ready for implementation plan
**Date:** 2026-06-29
**Author:** Ben Ebsworth (with Claude)
**Scope:** one implementation pass (full component set + brand kit + authoring skill + one exemplar guide)

---

## 1. Problem & goal

The hiking section (`/hiking`) is a data-driven overview: an index plus per-hike pages
(`app/hiking/[slug]/page.tsx`) that render a hero, a bespoke SVG `JourneyMap`, and a
GCS-backed photo gallery from `content/hiking.ts` (`Hike` proto). There is **no
long-form narrative layer** — no step-by-step route guide, no stops, landmarks,
side-quests, flora/fauna, or gear breakdown.

We want a family of **iconic, brand-building MDX components** — collectively
**"Trailkit"** — that turn an ordinary MDX post into a rich, navigable trail guide,
and that are reusable across *any* blog post. They must look unmistakably part of
this site's design language and share one iconographic vocabulary. A new authoring
skill (`writing-trail-guides`) teaches how to write a guide with them. A brand kit
(emblem, contour texture, icon moodboard) is generated via the **brandbrain flow
MCP** (remote) to anchor the visual identity.

### Success criteria
- A trail-guide blog post can be authored entirely in MDX using Trailkit components,
  with stats/route auto-bound from `content/hiking.ts` via a `hike="slug"` prop.
- Every component is SSR-rendered (crawler- and AI-citable), light/dark correct,
  reduced-motion safe, mobile correct, and registered in all three sync locations.
- One exemplar guide (a completed hike) exercises every component end to end.
- `npm run build` + `npm run typecheck` pass; deployed to staging for review.
- The `writing-trail-guides` skill exists and is accurate.

### Non-goals
- No changes to the `Hike` protobuf schema (avoids the `proto:gen` footgun).
- No new content collection or route family — guides are blog posts.
- No backend/data entry for per-stage narrative — that lives inline in MDX.
- Not migrating the existing `/hiking/[slug]` data pages to MDX (they stay as the
  visual overview and link out to the guide).

---

## 2. Architecture overview

```
content/blog/<slug>/index.mdx        ← a trail guide IS a blog post (labels: hiking)
   │  uses <TrailSummary hike="overland-track"> …  <Stages> … <Quest> …
   ▼
components/mdx/mdx-components.tsx     ← registers every Trailkit component (PascalCase)
   │
   ├─ components/mdx/trailkit/        ← NEW. the component family + brand primitives
   │     primitives.tsx               ← icon set, ContourMotif, accent context, Card chrome
   │     trail-summary.tsx            ← <TrailSummary>
   │     trail-map.tsx                ← <TrailMap> (journey-map generalised for MDX)
   │     stages.tsx                   ← <Stages> / <Stage> / <Checkpoint>
   │     stops.tsx                    ← <Stop>
   │     landmark.tsx                 ← <Landmark>
   │     quest.tsx                    ← <Quest>
   │     species.tsx                  ← <Flora> / <Fauna>
   │     gear.tsx                     ← <GearList> / <Gear>
   │     hike-binding.ts              ← `hike="slug"` → defaults from content/hiking.ts
   │     index.ts                     ← barrel
   │
   ├─ content/hiking.ts               ← UNCHANGED source of stats/accent/waypoints
   └─ public/trailkit/                ← NEW. brandbrain-generated brand assets
         emblem.svg / wordmark, contour-texture.*, icon moodboard reference

scripts/gen-md-siblings.mjs          ← add COMPONENT_DESCRIPTIONS for each component
app/hiking/[slug]/page.tsx           ← add "Read the trail guide →" link when a guide exists
.claude/skills/writing-trail-guides/ ← NEW skill (SKILL.md + trailkit-reference.md)
```

### Key decisions (resolved)
1. **A trail guide is a blog post.** `content/blog/<slug>/` with `labels: hiking`.
   Reuses the whole MDX pipeline (TOC, gallery, OG, related labs, md-siblings).
   The `/hiking/[slug]` overview links to it; the guide can deep-link back.
2. **Zero proto changes.** Difficulty is derived; season & gear-class are props.
3. **SSR-first.** Components render as server-friendly `'use client'` islands whose
   visuals are SVG/CSS that hydrate — *not* `ssr:false`. Reserve `ssr:false` lazy
   loading only for a component that genuinely cannot SSR (none expected).
4. **Auto-binding via `hike="slug"`** is optional sugar; every component also works
   from explicit props so Trailkit is usable in non-hike posts too.
5. **Brand kit via brandbrain (verify-first), non-blocking.** If the MCP/remote is
   unreachable, the hand-authored SVG icon set + contour motif stand alone.

---

## 3. Brand layer ("Trailmarks")

The connective identity shared by every component. Lives in `trailkit/primitives.tsx`.

### 3.1 Icon set
A single-stroke line-icon family, one consistent grammar (24×24 viewBox, 1.5px
stroke, round caps/joins, `currentColor`), exported as small React components:

`SummitIcon, HutIcon, TentIcon, WaterIcon, PassIcon, ViewpointIcon, JunctionIcon,
DistanceIcon, AscentIcon, DescentIcon, DurationIcon, CompassIcon, BootIcon (difficulty),
PackIcon (gear), LeafIcon (flora), TrackIcon (fauna), StarIcon (quest),
ExposureIcon (warning), SunriseIcon`.

One icon maps to each component/stat type. Hand-authored to match the brandbrain
moodboard. Follow the existing `color-legend.tsx` SVG idiom (inline, `useId()` with
`/` stripped for any gradient/mask ids).

### 3.2 Contour motif
A reusable `<ContourMotif>` SVG (concentric topographic rings, à la
`journey-map`'s contour rings) used at low opacity as:
- a faint letterhead behind `TrailSummary` and section cards,
- the vertical spine of the `<Stages>` timeline,
- an optional framed border.

Driven by the per-hike accent; respects reduced-motion (no animated draw unless
motion is allowed).

### 3.3 Palette & tokens
- Mono base from `globals.css` (`--color-bg/fg/border/muted`).
- **Per-hike accent**: read from `Hike.accent`; injected as an inline `--accent`
  (and `--ink` for the existing `.accent-ink` light-mode darkening). Components in
  non-hike posts accept an `accent` prop (default to `--color-blog` teal).
- **Difficulty band ramp** (fixed semantic hues, trail-grade convention):
  `easy #4f9d8f → moderate #5aa0b5 → hard #c2693a → severe #b4453a → extreme #16161a`
  (names/hex finalised in primitives; AA-checked in light mode via `color-mix`).
- **Elevation gradient**: low→high ramp for the elevation strip and altitude chips.
- Card chrome: 1px `--color-border`, radius `0.625rem`, soft radial glow on hover
  (`color-mix(... accent 16%→60% ...)`), `cubic-bezier(0.16,1,0.3,1)` transitions.

### 3.4 brandbrain brand kit (verify-first, non-blocking)
1. **Register** the `brandbrain-flow-orchestrator` MCP for this repo (`.mcp.json`),
   pointed at the **remote**: `BRANDBRAIN_API_URL=https://api.brandbrain.dev`,
   `BRANDBRAIN_APP_URL=https://brandbrain.dev`, bearer token from the MCP's existing
   `.env` (`~/projects/brandbrain/mcp/flow-orchestrator/.env`). Command:
   `node ~/projects/brandbrain/mcp/flow-orchestrator/dist/index.js`. Reconnect.
2. **Smoke-test** with `whoamiBrandbrain` / `listAssetFlowTemplates` before relying on it.
3. **Generate** (live mode) three asset groups and pull artifacts into `public/trailkit/`:
   - a hiking **sub-brand emblem / wordmark** (the "field notes" mark),
   - a **contour / topographic texture pack** (subtle, tileable, light+dark),
   - an **icon moodboard** that guides the hand-cut SVG icon set.
4. If unreachable/unauthed: log it, fall back to the hand-authored kit, continue.
   The component system must not depend on brandbrain output to function.

---

## 4. Component contracts

All in `components/mdx/trailkit/`, PascalCase, `not-prose` wrappers, SSR-first,
reduced-motion safe. Shared behaviours: optional `hike?: string` (hydrates defaults
from `content/hiking.ts`), optional `accent?: string` (overrides the hike/teal default).

> Prop types below are the contract for implementation; refine names during build but
> keep them stable once `writing-trail-guides` documents them.

### 4.1 `<TrailSummary>` — the hero card
```ts
interface TrailSummaryProps {
  hike?: string;            // auto-binds region/country/stats/accent
  // explicit overrides / non-hike usage:
  title?: string; region?: string; country?: string;
  distanceKm?: number; days?: number; elevationGainM?: number; maxAltitudeM?: number;
  difficulty?: 'easy'|'moderate'|'hard'|'severe'|'extreme'; // else derived
  season?: string;          // e.g. "Jun–Sep"
  gearClass?: string;       // e.g. "Hut-to-hut · 3-season"
  accent?: string;
}
```
- Layout: a framed card with the contour motif behind; primary stat row
  (distance · days · ascent · max alt) with icons; a **difficulty band** chip; a
  season + gear-class line; a **mini route+elevation glyph** (compact `TrailMap`).
- Interactions: count-up + draw-in on `Reveal`; "expand" toggle reveals secondary
  stats (avg/day, total descent, highest sleep, etc., where derivable). Spotlight on hover.
- Difficulty derivation (when not given): score from `distanceKm`, `elevationGainM`,
  `maxAltitudeM`, `days` → band. Document the formula in code.

### 4.2 `<TrailMap>` — bespoke route map
- Generalise `components/hiking/journey-map.tsx` into an MDX-embeddable component.
  Keep the existing `JourneyMap` working for `/hiking/[slug]` (either `TrailMap`
  wraps/extends it, or `journey-map` is refactored and both consume a shared core —
  decide in the plan; prefer a shared core to avoid divergence).
```ts
interface TrailMapProps {
  hike?: string;                 // pulls waypoints/accent
  waypoints?: Waypoint[];        // explicit override
  showElevation?: boolean;       // default true
  compact?: boolean;             // glyph mode for TrailSummary
  accent?: string;
}
```
- SSR'd SVG: contour rings, Catmull-Rom route, day markers, hoverable waypoint
  notes, elevation strip. CSS draw-in (`jm-draw`-style), reduced-motion → instant.

### 4.3 `<Stages>` / `<Stage>` / `<Checkpoint>` — the day-by-day guide
```ts
// <Stages> wraps an ordered list of <Stage>; renders the contour-spine timeline.
interface StageProps {
  day?: string | number;        // "Day 3" / 3
  from?: string; to?: string;
  distanceKm?: number; ascentM?: number; descentM?: number;
  timeHours?: number;           // or string e.g. "6–7 h"
  terrain?: string;             // "moorland, boardwalk, one scramble"
  children?: ReactNode;         // narrative + <Checkpoint> markers
}
interface CheckpointProps {
  name: string; elevM?: number; kind?: 'pass'|'summit'|'water'|'junction'|'viewpoint'|'camp'|'hut'|'milestone';
  note?: ReactNode;
}
```
- `<Stage>` = a card/row on a vertical timeline (contour-motif spine); header has the
  stat chips (distance/ascent/descent/time) with icons; body is narrative prose that
  may contain `<Checkpoint>` inline markers (the milestones/checkpoints).
- This single cluster covers the user's "step-by-step guides, milestones,
  checkpoints, route details."

### 4.4 `<Stop>` — accommodation
```ts
interface StopProps {
  name: string;
  type: 'hut'|'rifugio'|'camp'|'hotel'|'bivvy'|'refuge';
  elevM?: number; capacity?: number;
  booking?: ReactNode;          // "book months ahead" / link
  water?: boolean; meals?: boolean;
  note?: ReactNode;
}
```
Iconographic, gridable (a `<Stops>` wrapper optional, or compose in a grid). Type → icon.

### 4.5 `<Landmark>`
```ts
interface LandmarkProps {
  name: string; kind?: 'summit'|'gorge'|'lake'|'pass'|'monument'|'glacier'|'viewpoint';
  elevM?: number; bearing?: string; image?: string; alt?: string;
  children?: ReactNode;         // "why it matters"
}
```

### 4.6 `<Quest>` — side-quest (signature piece)
```ts
interface QuestProps {
  title: string;
  extraKm?: number; extraAscentM?: number; extraTimeHours?: number; // the "effort"
  payoff?: ReactNode;           // what you get
  difficultyDelta?: 'same'|'harder'|'much-harder';
  optional?: boolean;           // default true
  children?: ReactNode;
}
```
- Playful "side-quest" framing (star icon, distinct chrome) but genuinely useful:
  effort chips + payoff. The brand's most memorable component.

### 4.7 `<Flora>` / `<Fauna>` — species cards
```ts
interface SpeciesProps {
  name: string; latin?: string;
  when?: string;                // "high summer, above tree line"
  where?: string;
  image?: string; alt?: string;
  likelihood?: 'common'|'occasional'|'rare'; // esp. fauna
  children?: ReactNode;
}
```
Leaf icon (flora) / track icon (fauna). Gridable.

### 4.8 `<GearList>` / `<Gear>`
```ts
interface GearProps {
  name: string;
  group?: 'worn'|'pack'|'safety'|'optional';
  essential?: boolean;
  note?: ReactNode;
}
```
`<GearList>` groups children by `group`, each item with an icon + essential flag.

---

## 5. Data binding (`hike-binding.ts`)
- `useHikeDefaults(slug)` / a server-safe `getHikeDefaults(slug)` reads
  `content/hiking.ts` (`getHike`) and returns `{ region, country, accent, distanceKm,
  days, elevationGainM, maxAltitudeM, waypoints }`.
- Components merge: explicit prop ?? hike default ?? sensible fallback.
- Because `content/hiking.ts` is a static import, binding is build-time/SSR-safe (no fetch).

---

## 6. Rendering, registration, sync
- **Register** every component in `components/mdx/mdx-components.tsx` (the single
  source of availability). Light components import directly; only add to
  `lazy-mdx-components.tsx` if a component must be `ssr:false` (avoid if possible).
- **3-place sync rule** (build-enforced via `prebuild → md:siblings`): each component
  must exist in (1) implementation, (2) `mdx-components.tsx` registration,
  (3) `COMPONENT_DESCRIPTIONS` in `scripts/gen-md-siblings.mjs`.
- **`blockJS: false`** is already set (needed for JSX expression props like
  `distanceKm={223}` and array/object props). Verify props with `{}` survive.
- **No nested `<p>`**: block components that wrap MDX children must not emit `<p>`
  around content MDX already wrapped in `<p>` — use `<div>`/`<blockquote>` and force
  styling via `[&_p]:…` (see `PullQuote`).
- Styling: Tailwind v4 utilities + `not-prose`; reuse `SpotlightCard` / `Reveal`
  where they fit; per-hike accent via inline `--accent`/`--ink`.

---

## 7. Exemplar guide
Author one full trail-guide post for a **completed** hike (recommend **Overland
Track** or **Larapinta** — rich waypoints already exist) at
`content/blog/<slug>/index.mdx` with `labels: hiking`, exercising every Trailkit
component with real, well-researched content. Hero image generated per the
blog-post image workflow (gpt-image → webp, in both `content/` and `public/`).
Add the "Read the trail guide →" link on the matching `/hiking/[slug]` overview.

> Content accuracy note: this guide's prose should be researched/verified, not
> invented — the existing hiking stats are flagged as DRAFTS in `content/hiking.ts`.

---

## 8. Authoring skill — `writing-trail-guides`
`.claude/skills/writing-trail-guides/SKILL.md` (+ `trailkit-reference.md`), sibling
to `writing-blog-posts`, mirroring its structure:
- Frontmatter (reuse blog frontmatter; `labels: hiking`).
- The **Trailkit catalogue**: every component, prop table, copy-paste example,
  the `hike="slug"` binding, and the icon vocabulary.
- A **phased workflow**: research route → structure stages/checkpoints → place
  stops/landmarks/quests → add flora/fauna/gear → embed `TrailSummary` + `TrailMap`
  → verify.
- House voice + British spelling, em-dash budget ≤1 per 600–800 words.
- Verify checklist: `npm run build`, `npm run typecheck`, light/dark, reduced-motion,
  mobile, 3-place sync, images in both dirs.

---

## 9. Build sequence
1. **brandbrain**: register MCP (remote) → smoke-test → generate emblem + contour
   texture + icon moodboard → `public/trailkit/`. (Non-blocking; fall back if down.)
2. **Brand layer**: `trailkit/primitives.tsx` (icon set, `ContourMotif`, accent
   context, card chrome) + any new tokens/keyframes in `globals.css`.
3. **Components**: build the full set (4.1–4.8), register + sync each.
4. **TrailMap**: extract a shared route-map core from `journey-map`; `<TrailMap>` for
   MDX, keep `/hiking/[slug]` rendering unchanged.
5. **Exemplar guide** + `/hiking/[slug]` "Read the trail guide →" link.
6. **Skill**: `writing-trail-guides` + `trailkit-reference.md`.
7. **Verify**: `npm run typecheck` + `npm run build`; visual pass (light/dark,
   reduced-motion, mobile) via Playwright; confirm md-siblings include all components;
   auto-deploy to **staging** for review (never prod).

---

## 10. Testing & verification
- `npm run typecheck` and `npm run build` green (build runs `md:siblings` in prebuild,
  catching missing `COMPONENT_DESCRIPTIONS`).
- Render the exemplar guide in the dev server; verify each component in **light and
  dark**, at **mobile** width, and with **prefers-reduced-motion** on (no broken
  motion, content still visible).
- Confirm `hike="slug"` binding populates `TrailSummary` + `TrailMap` from data.
- Confirm no nested-`<p>` hydration warnings in console.
- Screenshot before/after for the record; deploy to staging and spot-check live.

---

## 11. Risks & mitigations
| Risk | Mitigation |
|---|---|
| brandbrain MCP/remote unreachable | Verify-first smoke test; hand-authored kit is the fallback; components don't depend on it. |
| `journey-map` divergence when generalised | Extract a shared core; `/hiking/[slug]` keeps using it; one source of truth. |
| Nested `<p>` hydration errors | Use `<div>`/`<blockquote>` + `[&_p]:…` pattern from `PullQuote`. |
| `ssr:false` empty-paint / SEO loss | SSR-first; avoid `ssr:false` unless unavoidable. |
| 3-place sync drift | `prebuild` runs `md:siblings`; build fails loudly. |
| Scope sprawl (9+ components) | Shared primitives + one card chrome; consistent prop grammar; build in the listed order. |
| Draft hiking stats treated as fact | Exemplar guide content is researched; note stats are drafts. |

---

## 12. Open questions for the plan stage
- `journey-map` refactor shape: wrap vs shared-core (recommend shared-core).
- Final exemplar hike choice (Overland Track vs Larapinta).
- Whether `<Stops>`/`<Flora group>` need explicit grid wrappers or compose via a
  generic `<TrailGrid>` (lean: one small `<TrailGrid>` helper).
- Exact difficulty-scoring formula constants.
