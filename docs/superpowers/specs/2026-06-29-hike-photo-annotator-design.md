# Hike photo annotator — Gemini-driven classify + geo-place + write-back

**Status:** implemented. The tool lives in `tools/hike-annotate/`; run it through
the `annotating-hike-photos` skill. Since this spec, #96 added a GCS generation
guard: a proposal records the manifest generation it was made from, and a write
fails if the live manifest has changed since. Tests: `task test:annotate`.
**Date:** 2026-06-29
**Scope:** a reusable CLI tool (run on Walker's Haute Route now) + an MCP wrapper

---

## 1. Problem & goal

The `/admin` image CRM uploads hike photos to GCS and extracts EXIF geo at upload,
but every photo then has to be **placed and captioned by hand** — assigned to a
waypoint (`slot`), given a `caption` and `alt`. For the Walker's Haute Route there
are **51 photos already uploaded, all geo-tagged, none placed**.

Build a tool that, given a hike, **classifies each photo with Gemini vision, places
it at the right waypoint using its geo + chronology, and writes the annotations back
to the live manifest** — turning ~an hour of manual tagging into a review-and-confirm.

### Success criteria
- Running the tool on `haute-route` produces, for each of the 51 gallery photos:
  a `slot` (correct waypoint name), a `caption`, an `alt`, and a skip/hero flag — as
  a **proposed** annotated manifest plus a visual review report.
- On approval, the annotated `manifest/hike/haute-route.json` is written to GCS and
  the live `/hiking/haute-route/` gallery filters correctly per waypoint.
- The tool is **reusable** for any hike (CLI), and its core is exposed as an **MCP**.
- No change to the site's `Asset`/`ContentManifest` schema or the React app.

### Non-goals
- No EXIF re-extraction (geo already lives in the manifest `Asset.lat/lng/takenAt`).
- No changes to the browser admin's OAuth write path; the tool authenticates with a
  local `gcloud` token instead.
- v1 does not auto-populate Trailkit `Landmark`/`Flora`/`Fauna` image slots in guides,
  nor archive original files (noted as future extensions).
- OG images are auto-generated (`renderOgCard`) — not a target.

---

## 2. Ground truth (from the scan)

- **Manifest** `manifest/hike/<slug>.json` = `ContentManifest { hero?: Asset; og?: Asset; gallery: Asset[] }` (public-read, `cache-control: no-store`).
- **Asset** = `{ id, url, alt, caption, width, height, slot, lat, lng, takenAt, thumb }` (flat; `lib/gen/content.ts:155-172`).
- **Placement = string match**: `components/hiking/hike-gallery.tsx:30-31` filters the gallery to assets whose `slot` equals the clicked waypoint's `name` (no waypoint id). So placing a photo = setting `slot` to the exact waypoint `name`; if no asset matches the active waypoint, the gallery shows all.
- **Hero**: `manifest.hero` (an `Asset`) is supported but unused for hikes today. We can set it.
- **Waypoints** (`content/hiking.ts`, `haute-route`): 8 stops with real names + elevations but **stylized** x/y — Chamonix (1035 m, Day 1), Trient (1300, D2), Champex (1466, D3), Le Châble (821, D4), Arolla (1998, D6), Zinal (1675, D8), Gruben (1822, D10), Zermatt (1620, D12).
- **Write path**: client → GCS JSON API (multipart) with a Google OAuth Bearer token. A local tool reproduces this with `gcloud auth print-access-token` (the owning account `ben.ebsworth@gmail.com` has bucket IAM write on `benebsworth-hiking`).
- **Tools present**: `gemini` CLI v0.46, `gcloud`/`gsutil`, `jq`, Node v22.

---

## 3. Decisions (locked)
1. **Classification = orchestrate the `gemini` CLI** per image, strict-JSON contract + validate/retry (fallback to one re-prompt on parse failure; surface persistent failures for manual handling).
2. **Write-back = propose → review → write on approval.** The tool emits a proposed manifest + a thumbnail HTML report; the live `PUT` only happens after the user OKs. (It's additive — `slot`/`caption`/`alt` are blank today — but it's a production write.)
3. **Packaging = CLI now + MCP wrapper.** A `tools/hike-annotate/` Node-ESM tool with a shared core, a CLI entry, and an MCP server entry exposing the core as tools.

---

## 4. Architecture

```
tools/hike-annotate/
  package.json            ← ESM, type:module; deps: @modelcontextprotocol/sdk (MCP only)
  src/
    config.mjs            ← bucket + publicBase (read from repo .env / env), gemini model
    manifest.mjs          ← readManifest(slug) [public GET], writeManifest(slug, manifest) [gcloud-token PUT]
    waypoints.mjs         ← load a hike's waypoints from ../../content/hiking.ts (parse/import)
    geocode.mjs           ← geocodePlace(name, hintCountry) via Nominatim, cached to .cache/geocode.json
    geo.mjs               ← haversineKm(a,b); nearestWaypoint(asset, geoWaypoints); chronologyCheck(...)
    classify.mjs          ← classifyImage(thumbPath, ctx) → orchestrates `gemini` CLI, parses strict JSON
    place.mjs             ← merge geo + classification → { slot, caption, alt, order, hero, skip, confidence }
    report.mjs            ← render a self-contained HTML thumbnail report of the proposal
    pipeline.mjs          ← annotateHike(slug, {write}) → orchestrates the 6 stages, returns proposal
  bin/
    annotate.mjs          ← CLI: `node bin/annotate.mjs <slug> [--write] [--limit N] [--model ...]`
  mcp/
    server.mjs            ← MCP server exposing: list_hikes_with_photos, propose_annotations,
                            get_proposal_report, write_manifest
  .cache/                 ← geocode cache (gitignored)
```

The site React app and `lib/admin/*` are **unchanged**. The tool is standalone.

### Units (each independently testable)
- **`manifest`** — read (public `fetch` + cache-bust) / write (`PUT` to `https://storage.googleapis.com/upload/storage/v1/b/<bucket>/o?uploadType=media&name=manifest/hike/<slug>.json` with `Authorization: Bearer <gcloud-token>`, `Content-Type: application/json`, and a follow-up metadata patch for `cache-control: no-store`). Depends on: gcloud token, env.
- **`waypoints`** — return `[{ name, elev, day }]` for a slug from `content/hiking.ts`.
- **`geocode`** — name → `{ lat, lng }` via Nominatim (`https://nominatim.openstreetmap.org/search?q=<name>&format=json&limit=1`), 1 req/sec, `User-Agent` set, cached. Seed cache with the 8 Haute Route towns to avoid live calls when possible.
- **`geo`** — `haversineKm`, `nearestWaypoint(asset.lat/lng → geoWaypoints)` returning `{ waypoint, km }`; `chronologyCheck` orders assets by `takenAt` and flags any whose geo-nearest waypoint regresses against day order.
- **`classify`** — download `asset.thumb` to a temp file, build a prompt (hike name, waypoint list, this photo's geo-nearest candidate + distance + takenAt), invoke `gemini -p "<prompt>"` referencing the image, parse a strict JSON object: `{ caption, alt, sceneType, subjectTags[], waypoint (one of the names or "uncertain"), heroWorthiness (0-10), quality (0-10), skip (bool), reason }`. Validate against an allowed-keys/enum check; one retry with a "return ONLY JSON" reminder; on repeated failure mark the asset `needsManual`.
- **`place`** — final `slot` = Gemini `waypoint` if confident else geo-nearest; `caption`/`alt` from Gemini; `order` = chronological index among kept photos; `hero` = highest `heroWorthiness*quality` among landscape-orientation, non-skip; `skip` carried through. Emits per-asset `confidence` + the geo distance for the report.
- **`report`** — a single self-contained HTML file (`/tmp/hike-annotate-<slug>.html`) with a thumbnail grid grouped by waypoint, showing caption/alt/skip/hero/confidence + the geo distance, so the proposal can be eyeballed (I render it via Playwright for review).
- **`pipeline`** — wires the stages, returns the proposed `ContentManifest` (a copy with annotations applied) + a summary; `--write` (or the MCP `write_manifest` tool) performs the GCS write only after approval.

### MCP tools (`mcp/server.mjs`)
- `list_hikes_with_photos` → hikes that have a manifest with gallery images and how many are unplaced.
- `propose_annotations({ slug, limit? })` → runs stages 1–5, returns the proposal JSON + the report path. Does NOT write.
- `get_proposal_report({ slug })` → returns the last proposal's report path / summary.
- `write_manifest({ slug, confirm: true })` → writes the approved proposal to GCS. Refuses without `confirm`.

---

## 5. Data flow
```
readManifest(slug) ─┐
content/hiking.ts ──┤→ geocode waypoints → geo-match each asset (haversine + chronology)
                    │                                   │
   asset.thumb ─────┴→ download → gemini classify ──────┤
                                                        ▼
                                          place() → proposed ContentManifest
                                                        ▼
                                   report.html  +  proposal.json   →  [USER REVIEW]
                                                        ▼ (approved)
                                          writeManifest(slug, proposal)  → GCS (live)
```

---

## 6. Auth
- **Gemini**: the `gemini` CLI's own auth (API key or Google login) — verified with a one-image smoke test before the batch.
- **GCS write**: `gcloud auth print-access-token` pinned to the owning account
  (`CLOUDSDK_CORE_ACCOUNT=ben.ebsworth@gmail.com gcloud auth print-access-token`), per the
  global GCP rule (never rely on the ambient active account). Read is public (no auth).
  If the token lacks `devstorage.read_write`, fall back to `gsutil cp` of the manifest
  (gsutil carries its own ADC).

---

## 7. Error handling
- **No geo on an asset** (`lat==0 && lng==0`): skip geo-match; rely on Gemini `waypoint` + chronology; flag low-confidence in the report.
- **Ambiguous geo** (nearest two waypoints within ~1 km, common in valley towns): defer to Gemini's scene `waypoint`; show both candidates in the report.
- **Gemini parse failure** after one retry: leave `slot`/`caption` empty, mark `needsManual`, continue the batch.
- **Geocode failure / rate-limit**: use the seeded cache; if a name is missing, report it and leave those photos geo-unmatched (Gemini-only).
- **GCS write failure** (401/403): surface the exact status; do not partial-write (single manifest `PUT` is atomic). Never write without explicit approval/`confirm`.
- **Rate/cost**: classify sequentially (or small concurrency) with a short delay; `--limit N` for a trial run on the first N photos.

---

## 8. Testing
- **Unit (vitest or node:test)**: `haversineKm` (known distances), `nearestWaypoint` (synthetic), `chronologyCheck` (ordered/!ordered), `place()` merge logic (geo vs Gemini precedence, hero pick, skip), JSON validation in `classify` (good/bad/extra-prose inputs).
- **Integration (dry-run)**: `node bin/annotate.mjs haute-route --limit 5` (no `--write`) → produces a proposal + report for 5 photos without touching GCS. Eyeball the report.
- **End-to-end**: full `haute-route` dry-run → review report (render via Playwright) → `--write` → verify live `/hiking/haute-route/` filters by waypoint and shows captions.

---

## 9. Risks & mitigations
| Risk | Mitigation |
|---|---|
| Live manifest write breaks the gallery | Review-first; additive only; single atomic `PUT`; keep a pre-write backup copy of the manifest locally. |
| gemini CLI returns prose, not JSON | Strict-JSON prompt + extract first `{...}` block + one retry + `needsManual` fallback. |
| GPS noise places a photo at the wrong town | Gemini scene confirmation overrides geo; chronology cross-check; report shows distance so outliers are obvious. |
| gcloud token lacks GCS scope | Fallback to `gsutil cp`; smoke-test the token before the batch. |
| Nominatim rate-limit / blocked | Seed the 8 Haute Route coords in cache; 1 req/s; cache results. |
| Photos cluster (uneven per-day) | Placement is per-photo (geo+scene), not forced even distribution; `order` is chronological. |

---

## 10. Open questions for the plan stage
- Exact `gemini` CLI invocation for image input (`@file` reference vs stdin) — settle with a one-image smoke test in task 1.
- Whether to also set `manifest.hero` automatically or only suggest it in the report (lean: suggest, set on approval).
- Geocode source: seed the 8 towns statically (fast, offline) vs live Nominatim (reusable for any hike) — do both: static seed + Nominatim fallback.
