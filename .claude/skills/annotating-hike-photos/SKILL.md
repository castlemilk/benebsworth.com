---
name: annotating-hike-photos
description: Use when placing, captioning, or auto-tagging uploaded hike photos on benebsworth.com — running the tools/hike-annotate pipeline (or its hike-annotate MCP) that classifies each photo with the Antigravity CLI (agy, Gemini vision), geo-matches it to the hike's waypoints, and writes slot/caption/alt into the GCS gallery manifest. Also the reference for the child-CLI-orchestration + MCP-for-images pattern. Part of the hiking workflow; for authoring the guide itself use writing-trail-guides.
---

# Annotating hike photos

After photos are uploaded via `/admin` from a specific hike (which extracts EXIF
geo at upload and stores them under `assets/hike/<slug>/`), each still needs
**placing** (assigned to a waypoint) and **captioning**. The
`tools/hike-annotate` pipeline does this automatically: it reads both the hike's
manifest and the namespaced library assets, classifies every photo with **`agy`**
(Antigravity CLI, Gemini vision), geo-matches it to the hike's waypoints, and
writes `slot` + `caption` + `alt` (+ a hero) back to the GCS manifest — turning
~an hour of manual tagging into a review-and-confirm.

## When to use
- A hike has uploaded gallery photos that are unplaced (`slot` empty) — e.g. after a
  batch upload in `/admin`.
- You want to (re-)caption or (re-)place a hike's gallery.
- You need the reusable pattern for orchestrating an agentic child CLI (agy) for
  vision, or the `hike-annotate` MCP — see `child-cli-orchestration.md`.

For authoring the long-form trail guide itself, use **writing-trail-guides**.

## How it works (6 stages)
1. Read `manifest/hike/<slug>.json` from GCS (public-read).
2. Geocode the hike's waypoint names → real lat/lng (Haute Route seeded; Nominatim, cached).
3. Geo-match each photo by its EXIF `lat`/`lng` → nearest waypoint (+ a chronology check).
4. Classify each photo with `agy` → `caption`, `alt`, `sceneType`, `subjectTags`,
   `waypoint` (scene can override noisy GPS — the Matterhorn ⇒ Zermatt), `heroWorthiness`,
   `quality`, `skip`.
5. Merge geo + scene → `slot` (the waypoint NAME), `caption`, `alt`; order
   chronologically; pick a landscape hero.
6. Propose (annotated manifest + an HTML thumbnail report) → **review** → write on approval.

`slot` MUST equal a waypoint `name` exactly — the public gallery filters by
`asset.slot === waypoint.name` when you click a journey-map waypoint (no waypoint id).

## Run it (CLI)
```bash
# dry-run: classify + place all photos, write a review report, cache the proposal
node tools/hike-annotate/bin/annotate.mjs <slug> --hint "<Country>" --concurrency 5

# review the proposal
open tools/hike-annotate/.cache/proposals/<slug>/report.html

# apply the EXACT reviewed proposal to the live manifest (no re-classify)
node tools/hike-annotate/bin/annotate.mjs <slug> --apply
# also: --write (re-classify + write in one go) · --limit N (trial run) · --yes (skip prompt)
```

## Run it (MCP)
The `hike-annotate` MCP (in the local `.mcp.json`, loads on reconnect) exposes:
`list_hikes_with_photos` · `propose_annotations({slug, limit?, hint?})` ·
`get_proposal_report({slug})` · `write_manifest({slug, confirm:true})`. Same
review-then-write discipline — `write_manifest` refuses without `confirm:true` or on a
partial proposal, and writes the exact cached proposal.

## Prerequisites
- **`agy`** logged in (`~/.local/bin/agy`, Antigravity, Google AI Pro). The free
  `gemini` CLI login no longer works (`IneligibleTierError` → migrate to Antigravity).
- **`gcloud`/`gsutil`** authed as the bucket owner (`ben.ebsworth@gmail.com`, bucket
  `benebsworth-hiking`) — the tool pins the account for writes.

## Discipline
- It is a **live production write** to the gallery manifest (the site reads it live).
  Always dry-run → review the report → apply. The write is additive (the fields are
  blank today) and backs up the current manifest locally first.
- Sparse town waypoints mean photos taken on the high *in-between* days land on the
  nearest town; tweak any `slot`/`caption` in `/admin` afterwards.

See `child-cli-orchestration.md` (next to this file) for the reusable agy + MCP image
pattern and its gotchas.
