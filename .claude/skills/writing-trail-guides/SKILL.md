---
name: writing-trail-guides
description: Use when publishing hiking content on this site (benebsworth.com) — adding or editing a hike, writing a long-form trail guide with the bespoke Trailkit MDX components (TrailSummary, TrailMap, Stages/StageProfile/Checkpoint, Stop, Landmark, Quest, Flora, Fauna, GearList, TrailFigure), placing photos via the /admin GCS console, or cross-linking the two. Covers the full "contribute a new hike" flow end-to-end. For general (non-hiking) posts, use writing-blog-posts instead.
---

# Publishing hiking content

The hiking framework has **two surfaces that link to each other**:

1. **The hike overview** — `/hiking/<slug>/`, data-driven from `content/hiking.ts`.
   A hero banner, the interactive **journey map** (a stylized topographic plate,
   not a geographic map), the stats, and a **photo gallery** read live from GCS.
   Every hike has one; no writing required.
2. **The trail guide** — a long-form blog post at `/blog/<slug>/` with
   `labels: hiking`, built from the **Trailkit** MDX components. Optional, and
   only for hikes worth a full write-up (the flagship is
   `content/blog/haute-route-guide/index.mdx`).

They are wired together by `HIKE_GUIDE` in `content/hiking.ts` (the single source
of truth). Once a hike is in that map, the framework auto-generates the links
**both ways**:
- overview → guide: a bottom-of-page link **and** a per-waypoint drilldown —
  clicking a waypoint's tooltip jumps to `/blog/<guide>/#day-N`;
- guide → overview: a "route overview" callout at the top of the post + linked
  structured data.

## What you get for free (don't rebuild these)
- **Interactive journey map** (`components/hiking/journey-map.tsx`): every
  waypoint is a real keyboard-focusable button with a ≥44px touch target; a
  pinned tooltip (works on touch, no cursor tracking) shows day/altitude/note and
  the guide drilldown link; an honest elevation strip (authored elevations only —
  no invented terrain) with dots that mirror the selection. Labels are legible
  HTML at fixed px, not shrinking SVG text.
- **Waypoint ↔ stage drilldown**: a waypoint's `day` (`"Day 3"`) and a
  `<Stage day={3}>` both normalize to the anchor `#day-3` (see `stageAnchor` in
  `components/hiking/journey-core.ts`). **Keep them consistent** and the drilldown
  works automatically — no wiring per hike.
- **Justified photo gallery + lightbox** (`components/hiking/hike-gallery.tsx`):
  aspect-respecting rows (portrait/landscape keep their shape), keyboard + swipe
  nav, neighbour preloading, a thumbnail filmstrip, and a rich caption
  (date · place · waypoint). Selecting a waypoint filters the gallery to photos
  whose `slot` matches.
- **Click-to-zoom guide photos** (`<TrailFigure>`): every guide photo opens a
  full-size lightbox.
- **Index route trace** (`components/hiking/hike-card.tsx`): each index card
  draws a faint route line of the hike's own waypoints.
- **SEO/OG**: `generateMetadata`, `hikeLd` structured data (stats + spatial
  coverage + guide linkage), a per-hike OG image from the painterly art, sitemap
  coverage — all automatic from the `content/hiking.ts` entry.

---

# Contributing a new hike (end-to-end)

Do these in order. Steps 1–2 give a complete overview page; 3 adds photos; 4–5
add the long-form guide; 6–7 verify and ship.

### 1. Add the hike to `content/hiking.ts`
Append a `Hike` object. Fields: `slug`, `name`, `region`, `country`, `status`
(`'completed' | 'planned'`), `year`, `dates`, `accent` (hex — the whole surface
themes to it), `summary`, `distanceKm`, `days`, `elevationGainM`, `maxAltitudeM`,
`highlights[]`, `order`, `hero`, and `waypoints[]`.

**Waypoints** drive the map. Each is `{ name, x, y, elev, day, note }`:
- `x`/`y` are **normalized 0..1** and **stylized, not geographic** — place them to
  evoke the route's shape on the plate (left→right, top=0). Tweak to taste.
- `elev` (metres) drives the marker glyph and the elevation strip.
- `day` (`"Day 1"`, or `""`) — **must match the guide's `<Stage day>`** for the
  drilldown to land (both normalize to `#day-N`). Two waypoints can share a day.
- `note` shows in the tooltip.
> ⚠️ The stats are DRAFTS — verify real figures. `HikeWaypoint`/`Hike` live in
> `lib/gen/content.ts`, which carries **manual additions**; if you ever add a
> waypoint field, follow the `proto:gen` footgun runbook (regen → `tsc --noEmit`
> → re-apply the marked manual block), don't hand-edit the generated type.

### 2. Generate the art
- **Hero banner + card + OG** come from painterly per-hike art. Place:
  - `public/hiking/art/<slug>.webp` — the banner/card art (`hero` field points here).
  - `og-art/hike/<slug>.jpg` — the 1200×630-ish OG background (repo root, read at
    build by `app/hiking/[slug]/opengraph-image.tsx`; falls back to a stat card
    if absent).
- Generate via the brandbrain flow MCP (the existing hikes were made this way).
  Match the established painterly, muted, topographic look.

### 3. Add photos (optional but high-impact)
Photos are backend-free: a per-hike `manifest/hike/<slug>.json` in the GCS bucket,
edited in the **`/admin`** console (unlisted, Google-gated; write security is
bucket IAM, see `docs/hiking-admin-setup.md`).
- Upload to the shared pool, then assign **hero**, **og**, and an ordered
  **gallery**. Set a gallery photo's **`slot`** to a waypoint `name` to link it to
  that point on the map (selecting the waypoint filters the gallery to it).
- Captions, `takenAt`, and EXIF `lat`/`lng` all surface in the lightbox — fill
  them in.
- **Accelerator**: `tools/hike-annotate` (the `agy`/Antigravity CLI + MCP) can
  classify, geo-match, caption and place a folder of photos into the manifest
  automatically (see the `hike-photo-annotator` auto-memory; run `agy` at
  concurrency 1 and close its stdin).

### 4. Write the guide (only for a featured hike)
New post at `content/blog/<slug>/index.mdx`. **Read
`.claude/skills/writing-blog-posts/SKILL.md` first** — all the shared mechanics
apply (frontmatter, images in BOTH `content/` and `public/`, voice, the deploy
gate). Then read `trailkit-reference.md` (next to this file) for every component
and prop.

- **Frontmatter**: `title`, `date`, `description`, `labels: hiking, trail-guide`,
  `heroImage`, `takeaways`, `release`/`draft` to intent.
- **Structure** (recommended order):
  `TrailSummary` (hero, `map`) → `## The route` `TrailMap` →
  `## Day by day` `Stages` → `Stage` (+ a `StageProfile` per day) →
  `## Side trips` `Quest`s → `## Where you sleep` `TrailGrid`/`Stop` →
  `## Landmarks` → `## Flora / Fauna` `TrailGrid cols={3}` →
  `## Gear` `GearList`. Drop `TrailFigure`s inline for the real photos.
- **`hike="slug"`** on `TrailSummary`/`TrailMap` auto-binds stats/accent/waypoints
  — never re-type the numbers.
- **Accent cascade**: `TrailSummary`/`TrailMap` already wear the hike's accent.
  To theme the structural components too, set `accent="#hex"` (the hike's colour)
  on each section **wrapper** (`<Stages accent>`, `<TrailGrid accent>`,
  `<GearList accent>`, standalone `<Quest accent>`, each `<StageProfile accent>`);
  children inherit it via the `--accent` custom property.
- **Stage days**: use the same day numbers as the hike's waypoints so the map's
  drilldown lands on the right stage.

### 5. Cross-link
Add the hike to **`HIKE_GUIDE`** in `content/hiking.ts`:
`{ '<hike-slug>': '<guide-post-slug>' }`. That one line wires the overview↔guide
links and drilldown in both directions. (Leave a hike out to keep its guide
unpublished — e.g. the Overland guide exists but isn't in the map.)

### 6. Verify (see the checklist below)

### 7. Deploy to staging
Per the auto-deploy convention, ship deployable site work to **staging**
(`next.benebsworth.com`) for review — see the `deploying-the-site` skill. Never
auto-deploy prod.

---

## Verify checklist
- [ ] `npm run typecheck` clean.
- [ ] `npm run build` succeeds (runs `md:siblings` — any NEW MDX component must be
      registered in `components/mdx/mdx-components.tsx`; add a `COMPONENT_DESCRIPTIONS`
      entry in `scripts/gen-md-siblings.mjs` for a good LLM-sibling description).
- [ ] `npx vitest run components/hiking/` green (journey-core + drilldown anchors).
- [ ] `/hiking/<slug>/`: map waypoints are **tabbable**, tooltips open on hover
      **and** tap, the elevation dots track selection, the gallery lightbox opens
      (esc / arrows / swipe / filmstrip). Check light + dark, at 360px width, with
      prefers-reduced-motion on.
- [ ] Waypoint → guide drilldown lands on the right `#day-N` stage (if a guide
      exists), and the guide shows the "route overview" callout back to the hike.
- [ ] Hero art in `public/hiking/art/<slug>.webp`; OG art in
      `og-art/hike/<slug>.jpg`; OG renders (`/hiking/<slug>/opengraph-image.png`).
- [ ] Guide (if any): every Trailkit component in light AND dark at mobile width;
      no nested-`<p>` hydration warnings; `TrailFigure` photos zoom.
