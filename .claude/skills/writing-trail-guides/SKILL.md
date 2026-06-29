---
name: writing-trail-guides
description: Use when writing or editing a long-form hiking trail guide on this site (benebsworth.com) — authoring an MDX guide with the bespoke Trailkit components (TrailSummary, TrailMap, Stages/Checkpoint, Stop, Landmark, Quest, Flora, Fauna, GearList). A trail guide is a blog post with `labels: hiking`. For general posts, use writing-blog-posts instead.
---

# Writing trail guides

A trail guide is a blog post (`content/blog/<slug>/index.mdx`, `labels: hiking`)
that uses the **Trailkit** components to lay out a route as a navigable guide.
It pairs with the data-driven overview at `/hiking/<hike-slug>/` (from
`content/hiking.ts`); link the two via the `GUIDE_SLUG` map in
`app/hiking/[slug]/page.tsx`.

## Before you start
- Read `.claude/skills/writing-blog-posts/SKILL.md` for the shared mechanics
  (frontmatter, images in BOTH `content/` and `public/`, the math/voice rules,
  the deploy gate). Everything there applies.
- Read `trailkit-reference.md` (next to this file) for the full component +
  prop catalogue.

## The components (quick map)
- `<TrailSummary hike="slug" season=… gearClass=… map />` — the hero stat card.
- `<TrailMap hike="slug" />` — the route map.
- `<Stages>` / `<Stage>` / `<Checkpoint>` — the day-by-day spine.
- `<Stop>` — huts/camps; wrap several in `<TrailGrid>`.
- `<Landmark>` — notable features.
- `<Quest>` — optional side-trips.
- `<Flora>` / `<Fauna>` — species cards.
- `<GearList>` / `<Gear>` — gear checklist.

The `hike="slug"` prop on `TrailSummary`/`TrailMap` auto-binds stats, accent and
waypoints from `content/hiking.ts` — never re-type those numbers.

## Authoring workflow
1. **Research the route** — real stages, huts, side trips, landmarks, flora/fauna,
   gear. The stats in `content/hiking.ts` are DRAFTS; verify and correct in the prose.
2. **Frontmatter** — `title`, `date`, `description`, `labels: hiking, trail-guide`,
   `heroImage`, `takeaways`. Generate + place the hero in BOTH dirs.
3. **Structure** — `TrailSummary` up top → `TrailMap` → `## Day by day` `Stages` →
   `## Side trips` `Quest`s → `## Where you sleep` `Stop`s → `## Landmarks` →
   `## What grows / lives here` `Flora`/`Fauna` → `## Gear` `GearList`.
4. **Voice** — house voice (curious, first-person-plural, British spelling), em-dash
   budget ≤1 per 600–800 words.
5. **Link** — add the hike to `GUIDE_SLUG` in `app/hiking/[slug]/page.tsx`.

## Verify checklist
- [ ] `npm run typecheck` clean.
- [ ] `npm run build` succeeds (runs md:siblings — every component must be in
      `mdx-components.tsx` AND `COMPONENT_DESCRIPTIONS` in `scripts/gen-md-siblings.mjs`).
- [ ] Render at `/blog/<slug>/`: every component in light AND dark, at mobile width,
      with prefers-reduced-motion on (content still visible, no broken motion).
- [ ] Hero image present in BOTH `content/blog/<slug>/` and `public/blog/<slug>/`.
- [ ] No nested-`<p>` hydration warnings in the console.
- [ ] `release`/`draft` frontmatter reflects intent before shipping.
