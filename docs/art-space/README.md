# Art space for benebsworth.com

An implementation handoff for an image-led `/art/` collection: original worlds, readable annotations, style and aesthetic metadata, exact prompts, and an honest account of how each image developed.

**Status: workflow and content foundation, 19 November 2026.** The gallery and editor described here are proposed. This package adds no route, navigation item, storage service, generation endpoint or deployment workflow. Ben can build the site experience against the supplied records.

## Start here

1. Read [the authoring workflow](WORKFLOW.md) for the creative loop and the artwork lifecycle.
2. Use [the implementation contract](IMPLEMENTATION.md) for page composition, controls, data boundaries and build order.
3. Load [the starter collection](../../content/art/monumental-worlds-range-study.json) against [the schema](artwork.schema.json).
4. Use [the acceptance plan](ACCEPTANCE.md) as the build checklist and source of the next implementation tasks.

Run the content checks from the repository root:

```bash
node scripts/validate-art-catalogue.mjs
node --test scripts/tests/validate-art-catalogue.test.mjs
```

After original PNGs have been imported to the documented local public paths, run the byte checks too:

```bash
node scripts/validate-art-catalogue.mjs --assets
```

The default records are drafts with `availability: "not-imported"` and `src: null`. A successful metadata check does not mean images are in this repository or that a gallery is ready to publish. The asset check verifies imported files; it does not import or generate anything.

Preparation checks passed: **22 standalone validation tests**, the full Draft 2020-12 schema check, exact comparison of all nine prompts with the generation ledger, and measurement of all nine original PNG receipts. Local documentation links resolve. The original-byte comparisons were performed against the source collection; the repository asset check correctly reports zero imported files. No gallery/browser acceptance or full-site build is claimed for this source-only foundation.

## What the starter contains

There are **eight artworks and nine render versions**. Every used prompt is preserved verbatim, including the focused edit to *The Joining of Two Seas*. Dimensions, byte lengths and SHA-256 values were measured from the actual PNGs. Each selected version has an alt description and three text annotations tied to that version. No annotation positions have been invented.

| Work | Creative route | Selected version | Actual dimensions |
| --- | --- | --- | --- |
| The Right to a Horizon | Story first | v1 | 1024 × 1536 |
| The Joining of Two Seas | Story first, then a focused edit | v2 | 1672 × 941 |
| The Walking Interval | Departure first | v1 | 1024 × 1536 |
| The Way Around | Departure first | v1 | 1672 × 941 |
| The Descending Summer | Story → departure → coherence | v1 | 1024 × 1536 |
| The Passing Mass | Departure → story → coherence | v1 | 1536 × 1024 |
| A Graft for Two Suns | Departure → story → coherence | v1 | 1122 × 1402 |
| The Assembly Weather | Story → departure → coherence | v1 | 1672 × 941 |

These records make the first implementation concrete without inventing public asset URLs. The image bytes remain in the source collection and must be explicitly imported, checked and reviewed before gallery publication. The source lookup key is the recorded hash; transient local paths and private storage references are intentionally absent.

The date is the **study date**, not a recovered generation timestamp. The exact image model, seed and per-call timestamp were not exposed or recorded, so those fields remain `null`. Descriptive styles and aesthetic tags are editorial annotations. They are not measured image-engine settings, nor evidence of a physical painting medium. No public reuse license or display credit has been chosen for these records.

## Intended experience

The first page should make someone want to look at the art. Large images lead; titles and a few useful descriptors follow. A detail page reveals the world premise, specific visual construction, annotations and process. Exact prompts are readable and copyable without being printed over the image.

For this collection, **style** describes how the image is represented: painterly finish, selective sharp edges, atmospheric depth. **Aesthetic** describes its broader visual character: monumental, biomechanical, lucid, elemental. Subject, mood, material, palette and intended scale remain separately searchable. A person should be able to discover “organic technology” across very different silhouettes and creative methods.

Start with a static gallery and detail pages, followed by version comparison and optional spatial notes. A browser authoring interface can come later; the initial authoring workflow is a reviewed content change in Git.

## Existing site fit

This audit used repository revision [`ef7a805a6646baaf9018c05019c2dea9d0dc3086`](https://github.com/castlemilk/benebsworth.com/commit/ef7a805a6646baaf9018c05019c2dea9d0dc3086).

| Existing source | Integration decision |
| --- | --- |
| [`next.config.mjs`](../../next.config.mjs): static export, trailing slashes, unoptimized images | Generate `/art/` and `/art/[slug]/` statically; create delivery sizes before the site build. |
| [`docs/editorial-artwork.md`](../editorial-artwork.md): immutable originals and exact provenance | Reuse byte integrity, alt text and prompt conventions. Give full-frame sci-fi art its own record and presentation. |
| [`lib/grounded-artwork/types.ts`](../../lib/grounded-artwork/types.ts): fixed scientific SVG variants | Keep these distinct from generated raster versions. A new render is not a light/dark theme variant. |
| [`components/site/site-nav.tsx`](../../components/site/site-nav.tsx) and root [`AGENTS.md`](../../AGENTS.md) | Add an Art link during implementation; use the editorial site shell and scoped gallery styles. |
| [`lib/admin/storage.ts`](../../lib/admin/storage.ts): blog/hike content and public image storage | It is not an Art CMS or private draft store. A future write integration needs an explicit separate design. |
| [`scripts/build-search.mts`](../../scripts/build-search.mts), [`app/sitemap.ts`](../../app/sitemap.ts) | Add curated published Art discovery records when the actual routes and images exist. |

The separately open knowledge/model/views/design/motion candidates [#158](https://github.com/castlemilk/benebsworth.com/pull/158), [#159](https://github.com/castlemilk/benebsworth.com/pull/159), [#160](https://github.com/castlemilk/benebsworth.com/pull/160) and [#161](https://github.com/castlemilk/benebsworth.com/pull/161) were read for ownership context on 19 November. This package does not adopt or modify their contracts. Recheck their status before future integration.

## Source and publication boundary

The current artwork and exact prompts are original outputs from the monumental-worlds exploration. The collection links to the public [Futuristic Artwork workflow](https://github.com/castlemilk/omega-skills/tree/bf645edc5bbc6335b1cf1730448a17f9c2cbf0e8/skills/generate-futuristic-art) and the pinned [Antialgorithm method](https://github.com/mankidev/antialgorithm/tree/766e30411195a9198afad38f3d76e08701ed4516). These are method references, not image sources or artwork licenses. The four drafting routes are our experimental adaptations; the eight-image comparison is qualitative, not a controlled benchmark.

No private reference video, scene sheet, recovered third-party source packet, account identifier or signed asset URL belongs in this package. A draft on a public GitHub branch is public source, even when `status` excludes it from the eventual gallery. Private prompts and drafts must remain outside this repository and outside `public/`.

The legacy preview opt-in `VERCEL_PREVIEW_CI_ENABLED` was read as **false** in the repository's Actions variables page on 19 November 2026. It was not changed. Production publishing is a separate reviewed workflow; future publishers must recheck current release wiring. This handoff does not authorize merge, deployment, new credentials or infrastructure changes.

## Suggested first build instruction

> Implement the first two milestones in `docs/art-space/ACCEPTANCE.md` using the Art workflow and schema. Preserve the existing site shell and artwork systems. Import the selected source originals only when the actual bytes are available and match their recorded hashes; keep missing records out of the public collection. Build image-led `/art/` and `/art/[slug]/` routes with real annotations, style/aesthetic filters and exact prompt history. Verify the actual gallery on desktop and mobile, including keyboard use. Report source checks, browser evidence and release state separately. Keep the work on a review branch for Ben to continue.
