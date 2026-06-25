# Cosmology & Astrophysics Section — Design Spec

**Date:** 2026-06-25
**Status:** Approved (brainstorm) — building.

A new lab category + blog desk for **Cosmology & Astrophysics**: a flagship "are we
inside a black hole?" essay, 10 cosmology/astrophysics posts, 4 physics-foundation
posts (14 total), a centrepiece **Universe-Scale** interactive (Planck → observable
universe), 10 new lab effects, and ~4 bespoke flagship MDX widgets.

This file is the **contract** for a parallel build. Subagents author only NEW,
self-contained files (a post dir, a lab effect `.ts`, a `content/lab/*.mdx`, a
component `.tsx`). The **main agent owns every shared-registry edit** — `registry.ts`,
`mdx-components.tsx`, `gen-md-siblings.mjs`, `topics.ts`, `[slug]/page.tsx` accents —
to avoid the known "overlapping patches corrupt `mdx-components.tsx`" failure.

---

## 1. Taxonomy

- `lib/gen/content.ts` — extend the hand-maintained union: `LabCategory = … | 'cosmology'`.
  (`category` is NOT in the proto; `proto:gen` is not in the build, so editing the union
  is the established pattern. **Caveat / follow-up:** add `category` to `proto/content.proto`
  so a future `npm run proto:gen` won't clobber this. Not a blocker.)
- `lib/lab/registry.ts` `CATEGORIES` += `{ key:'cosmology', label:'Cosmology', glyph:'✷',
  blurb:'Spacetime, black holes, and the structure of the universe — from the Planck length to the cosmic web.' }`
- `app/lab/[slug]/page.tsx` `CATEGORY_ACCENT.cosmology = '#6366f1'` (cosmic indigo; distinct
  from maths-blue `#4c9be8`, physics-violet `#b16cea`).
- `lib/topics.ts`: `ACCENT.indigo = '#6366f1'`; `TOPIC.cosmology = { icon:'/topics/technology.png',
  label:'Cosmology', accent: ACCENT.indigo }`; a `TAG_RULES` entry
  `{ match:['cosmology','astrophysics','black hole','cosmic','relativity','spacetime'], topic: TOPIC.cosmology }`
  placed before `general`; per-slug `BY_SLUG` overrides for ALL 14 posts.

**Blog desks:** the 10 cosmology/astrophysics posts → `TOPIC.cosmology` (indigo). The 4
physics-foundation posts → `TOPIC.physics` (violet, existing). **All 11 new labs → the
new `cosmology` lab category** (so the new section's lab tab is rich and cohesive).

---

## 2. Universe-Scale simulator (centrepiece, circuit-sim-class)

Continuous logarithmic zoom over `log10(metres)` from **−35 (Planck length) to +27
(observable universe)**. Canvas-2D, static-export safe.

**Files**
- `lib/lab/universe-scale/catalog.ts` — pure data: ~60 `ScaleObject` entries
  `{ id, name, sizeMeters, category, blurb, draw(ctx, cx, cy, px, theme) }`, sorted by size.
  Regimes: `quantum | atomic | human | geographic | planetary | stellar | galactic | cosmic`.
  Must include the requested journey landmarks in order: **ant (~8e-3 m) → human (1.7 m)
  → blue whale (25 m) → skyscraper (450 m) → Mt Everest (8.8e3 m) → Earth (1.27e7 m) →
  Sun (1.4e9 m) → solar system → … → Milky Way (1e21 m) → … → observable universe (8.8e26 m)**,
  plus the descent (cell, virus, DNA, atom, proton, quark, Planck).
- `lib/lab/universe-scale/scale.ts` (+ `scale.test.ts`) — log mapping helpers:
  `logToPx(logM, viewLogM, pxPerDecade)`, `apparentPx(sizeMeters, viewLogM, …)`, the
  fade window, and named anchor lookups. **Pure + unit-tested** (golden cases: ant at its
  own scale fills ~viewport; Sun's Schwarzschild radius marker = 2GM/c² ≈ 2.95 km).
- `components/lab/universe-scale/scale-canvas.tsx` — the renderer (rAF, inertial wheel/drag,
  cross-fade, regime colour-grading, parallax starfield that intensifies cosmically).
- `components/lab/universe-scale/universe-scale-studio.tsx` — HUD: big log-zoom slider,
  **Play tour (ant→galaxy)**, jump chips (Planck · Atom · Ant · Human · Earth · Sun · Galaxy ·
  Universe), live readout (metres + relatable comparison), and **◇ essay markers** at the
  Sun's Schwarzschild radius and the Planck/holographic scale, each deep-linking to the flagship.
- `app/lab/universe-scale/page.tsx` + `universe-scale-page.tsx` — dedicated route (SoftwareApplication
  JSON-LD, breadcrumb), mirroring `app/lab/circuit-sim/`.
- `components/mdx/universe-scale-embed.tsx` — `<UniverseScale focus?, height?, range?>` compact
  embeddable variant for posts. Register + describe.
- `content/lab/universe-scale.mdx` — explainer.

**Registry:** add `{ slug:'universe-scale', title:'Universe Scale', blurb:'…', tags:['scale','cosmology','powers of ten','log'], category:'cosmology', homeEmbedSafe:false }`
to `LAB_EFFECTS`; **exclude from `generateStaticParams`** (like `circuit-sim`); **no** `EFFECT_LOADERS` entry.

Performance: rAF auto-pause on scroll / off-viewport / drag / reduced-motion. Clamp all
pixel mappings. Both themes.

---

## 3. Lab effects (EffectModule) — 9 new, all category `cosmology`

Each is a self-contained `components/lab/effects/<slug>.ts` implementing the `EffectModule`
contract (`controls`, `defaults`, `createRenderer`), + a `content/lab/<slug>.mdx` explainer.
Main agent registers each in `LAB_EFFECTS` + `EFFECT_LOADERS`. Control `key`s are the
contract used by posts' `<LabSide params={{…}}>` — **do not rename after wiring**.

| slug | title | what it shows | key controls (`key`) |
|---|---|---|---|
| `spacetime-curvature` | Spacetime Curvature | mass on an embedding sheet; geodesics + light-bending | `mass`, `geodesics`, `lightRays`, `spin` |
| `black-hole` | Black Hole | Schwarzschild geometry: horizon, photon sphere, ISCO, lensing shadow, infalling probe | `mass`, `showPhotonSphere`, `showISCO`, `lensing`, `infall` |
| `holographic-bound` | Holographic Bound | entropy ∝ area not volume; pixels tiling a horizon; Bekenstein bound | `radius`, `showVolume`, `pixelScale` |
| `cosmic-expansion` | Cosmic Expansion | FLRW scale factor a(t); Hubble flow on a grid; redshift; fate (open/flat/closed/Λ) | `omegaM`, `omegaLambda`, `hubble`, `mode` |
| `cmb-sky` | CMB Sky | last-scattering temperature map + acoustic-peak power spectrum; tune Ω, baryons | `omegaB`, `omegaM`, `tilt`, `view` |
| `rotation-curve` | Galaxy Rotation Curve | Keplerian-decline vs observed-flat curve; add a dark-matter halo | `diskMass`, `haloMass`, `haloScale`, `showHalo` |
| `hr-diagram` | HR Diagram | a star's evolutionary track across the Hertzsprung–Russell diagram by initial mass | `initialMass`, `metallicity`, `animateTrack` |
| `gw-chirp` | Gravitational-Wave Chirp | binary inspiral strain h(t): chirp → merger → ringdown; spectrogram | `m1`, `m2`, `showSpectrogram` |
| `fine-tuning` | Fine-Tuning Dials | nudge constants (α, gravity, Λ, …); a "habitability" readout collapses off-tune | `alpha`, `gravity`, `lambda`, `nDims` |

---

## 4. Flagship bespoke MDX widgets (`components/mdx/`) — register + describe

| Tag | File | Props | Renders |
|---|---|---|---|
| `SchwarzschildCalculator` | `schwarzschild-calculator.tsx` | (none; internal presets) | mass slider → r_s = 2GM/c²; presets you/Earth/Sun/Sgr A*/observable-universe; flags the "universe ≈ its own Schwarzschild radius" coincidence |
| `HolographicReduction` | `holographic-reduction.tsx` | (none) | 3D bulk cube ↔ 2D boundary; entropy ∝ area; a `radius` slider |
| `NestedUniverses` | `nested-universes.tsx` | (none) | 4D bulk → our 3D (brane on a 4D horizon) → 3D black holes encode 2D; click to descend a level |
| `WhiteHoleBounce` | `white-hole-bounce.tsx` | (none) | collapse → (classical singularity ↔ torsion bounce toggle) → expansion = our Big Bang |

All `'use client'`, theme-token styled, `not-prose`, mobile-safe, rAF-paused if animated.

---

## 5. Posts (14)

Voice: the blog skill's "curious engineer's notebook" — British/Australian spelling,
em-dash budget (~1 / 700 words), no banned AI tells, 3–5 `<Callout>` + 3–5 `<Equation>`
per ~2.5k-word post, intuition-first lead, "Reading further" with 3–4 real hyperlinked
sources, a `takeaways:` block. Each post is `content/blog/<slug>/index.mdx` with a hero.

### Physics foundations (4) — desk `physics` (violet)

| # | slug | title | lead lab | key sources |
|---|---|---|---|---|
| F1 | `why-gravity-is-geometry` | Why Gravity Is Geometry | `spacetime-curvature` | Carroll *Spacetime and Geometry*; MTW *Gravitation*; Einstein 1915 |
| F2 | `anatomy-of-a-black-hole` | Anatomy of a Black Hole | `black-hole` | Thorne *Black Holes & Time Warps*; Schwarzschild 1916; Hawking 1975 |
| F3 | `the-universe-on-a-surface` | The Universe on a Surface | `holographic-bound` | 't Hooft 1993; Susskind 1995 *World as a Hologram*; Bekenstein 1973; Maldacena 1997 |
| F4 | `how-space-itself-expands` | How Space Itself Expands | `cosmic-expansion` | Ryden *Introduction to Cosmology*; Friedmann 1922; Hubble 1929 |

### Cosmology / astrophysics (10) — desk `cosmology` (indigo)

| # | slug | title | lab | key sources |
|---|---|---|---|---|
| C1 ★ | `universe-inside-a-black-hole` | The Universe Might Be Inside a Black Hole | 4 widgets + `<UniverseScale>` + F-labs | Afshordi–Mann–Pourhasan 2014 (arXiv:1309.1487); Popławski 2010/2016; Pathria 1972; Stuckey 1994; Smolin *Life of the Cosmos*; Susskind *Black Hole War* |
| C2 | `the-cosmic-distance-ladder` | The Cosmic Distance Ladder | `<UniverseScale>` | Freedman & Madore; Riess et al.; Leavitt 1912 |
| C3 | `the-cosmic-microwave-background` | The Cosmic Microwave Background | `cmb-sky` | Penzias & Wilson 1965; Planck 2018; Ryden ch.9 |
| C4 | `dark-matter-the-unseen-gravity` | Dark Matter: the Unseen Gravity | `rotation-curve` | Rubin & Ford 1970; Zwicky 1933; Clowe (Bullet Cluster) 2006 |
| C5 | `dark-energy-and-the-runaway-universe` | Dark Energy and the Runaway Universe | `cosmic-expansion` | Riess 1998; Perlmutter 1999; Carroll *Cosmological Constant* |
| C6 | `how-stars-live-and-die` | How Stars Live and Die | `hr-diagram` | Phillips *Physics of Stars*; Burbidge B²FH 1957 |
| C7 | `gravitational-waves` | Gravitational Waves: Hearing Spacetime Ring | `gw-chirp` | Abbott et al. (LIGO) 2016; Einstein 1916 |
| C8 | `why-the-night-sky-is-dark` | Why the Night Sky Is Dark | `starfield` (+ small) | Olbers 1823; Harrison *Darkness at Night* |
| C9 | `the-fine-tuned-universe` | The Fine-Tuned Universe | `fine-tuning` | Barrow & Tipler *Anthropic Cosmological Principle*; Smolin CNS; Rees *Just Six Numbers* |
| C10 | `the-first-three-minutes` | The First Three Minutes | `cosmic-expansion` | Weinberg *The First Three Minutes*; Alpher–Herman–Gamow |

★ = flagship. Stance: **survey of real published models + a clearly-labelled speculative
extension** (nest the dimensions: 4D bulk → our 3D on a 4D horizon → 3D black holes encode
2D "universes"; the Big Bang as the parent 4D white-hole/bounce output). Honest caveats
section: holography encodes a bulk on its boundary, it does not literally "spawn" a
lower-D universe; the dimensional-ladder picture is heuristic.

---

## 6. Wire-up & verify (main agent, after artifacts land)

1. Register all labs (`registry.ts`), components (`mdx-components.tsx` + `gen-md-siblings.mjs`
   `COMPONENT_DESCRIPTIONS`), topics/desks (`topics.ts`), accents (`[slug]/page.tsx`).
2. `npm run md:siblings`; `npm run typecheck`; `npm run lint`; `npm run build` — green.
3. Heroes: one per post via gpt-image-2 (needs the user's OK for the cross-project
   `~/projects/brandbrain/.env` OPENAI key + network egress) → webp into `content/` + `public/`.
4. Playwright DOM checks on the flagship + the simulator + 2 sampled labs (component counts,
   `.katex` count, both themes, no canvas overlap, cursor-on-trace).
5. Auto-deploy to **staging** for review (`SKIP_ARCHIVE=1 npm run deploy:next`); do NOT deploy prod.

## 7. Build order

taxonomy → universe-scale sim → foundation labs+posts → flagship (widgets+post) →
cosmology labs+posts → wire-up → heroes → verify → staging.
