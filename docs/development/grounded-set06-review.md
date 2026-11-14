# Grounded Forms Set06 review

## Scope and source

Add 25 reviewed original authored works to the 55-work collection, without replacing prior artwork or the separate tunable SVG/PNG libraries. The source base is master `4b0f4fa250a06ea9f5aff2661422f57f98d37e58`, reviewed tree `33cd70184f7cd240e96dfcb9a7749a2652ecfc7b`. Branch: `feat/grounded-forms-set06-20261114`.

The source packet has five groups: cells and microscopic structures, specimen architecture, Earth forms, mechanics, and mathematical constructions. All 75 new masters remain byte-identical 900 × 900 transparent SVGs. Palette and size variants do not increase the distinct-work count. No packet regeneration or SVG geometry edit is part of integration.

Source authorities:

- ZIP: `167a3a582bf5b2333630a01dd7fbad407d27bbc52a6b50c7ca64d0a8b98ad176`.
- `batch.json`: `b36e044757615929468c56608b1fcb4ba1ffb98089751c08ac1abf76e5fa3e90`.
- `sha256.json`: `e8990ba5b5a3673cd8a05b52ab3090efe350c7378c4686ef428037a8c64f552a`.
- Complete scientific notes: `6d16ad6fe8cd49a4ec007bba55c7abee9560f598c6ee7e486f98d88065650df3`.
- Expanded catalogue: `70a46ac2eac813ba4fef83c79ba96babcd0a0b19c6107ce5299805b623aaf96e`.
- The first 55 entries retain catalogue digest `4e47b279dc90ae7037ed9398e3152f58db53d7c5a9aec6f7ff8a6e8fb84ead06`; their source transport retains `1cfde8608e1e9e1d958c18e76180e221634106601f7a9c991b88a466748d2559`.

## Scientific and reference acceptance

Independent source review accepted all 25 at their declared display minima. It checked all 277 ZIP files against the packet, all 276 manifest entries, all 375 rendered-image hashes, all 75 SVGs for static vector structure and palette-equivalent geometry, 75 clear alpha windows, and all 150 comparisons from two independent regenerations of the 75 masters. Re-execution of the supplied serialized-geometry checker passed all 63 checks. This is source integrity and model/illustration review, not experimental validation or general parameter-space certification.

The original captions, bases, limitations and minimum widths remain in the catalogue. Seven new works require 240px and eighteen require 320px. Recognition thumbnails do not establish scientific readability at smaller sizes. Full original scientific notes are served unchanged under their content hash and linked only from the matching batch's details.

All specimen studies remain generic original illustrations. The horseshoe study's public image reference informed broad anatomy only; the current media license was not fully verified. Its displayed provenance retains that qualification, with no CC0 or specimen-reproduction claim. Integration does not copy the reference image.

One source-link correction is explicit: `https://www.si.edu/object/horseshoe-crab%3Anmnheducation_10795203` returned 404 during review. The visible citation instead uses [the Q?rius record](https://qrius.si.edu/browse/object/10795203), identifying Horseshoe Crab, *Limulus polyphemus*, catalogue 400142 -DSP. The original URL remains in the source packet and original scientific notes. A working object record is not evidence of image-rights clearance. The stale packet permission-string pointer `source/REFERENCE-RESEARCH.json` is not exposed as a site link; the actual packaged receipt is `sources/part-b/REFERENCE-RESEARCH.json`.

## Integration and performance contract

- 80 distinct works, 240 original SVG masters, 240 lossless 480px thumbnails and 240 lossless 960px previews: 720 assets, 23,394,826 bytes. New assets total 4,027,474 bytes.
- Original SVG transport: 10,984,086 raw bytes, 925,799 compressed bytes, 96 parts and 1,234,616 base64 bytes. Existing 71 parts and first 55 entries are preserved.
- Discovery JSON is 52,760 bytes, below the existing 70,000-byte bound. Pagination remains 24 cards, now 24/24/24/8. The largest thumbnail remains 47,418 bytes; worst selected-palette 24-card transfer is 768,066 bytes, below the unchanged 1MB cap.
- Detail previews and explicit palette downloads retain full content hashes, true alpha, minimum-size warnings, basis, limitations, provenance and source links.
- Notes routing is batch-specific. Output guards now check displayed provenance as well as scientific basis and limitations. The historical Set05 importer retains its own fixed catalogue receipt instead of silently adopting the latest catalogue pin.
- The full 327,092-byte scientific catalogue has an explicit 512KiB read bound, increased from 256KiB to admit this reviewed batch, with a regression for rejecting larger files before output creation. The separate 70KB discovery budget stays unchanged. Existing source-part safeguards, decompression limits, SVG allowlists, dependencies, release workflows, credentials and permission settings are unchanged.

## Review layers and required gates

These are manual source/presentation review lenses, not claims to have executed optional design skills:

1. Hierarchy: retain the existing collection-to-detail hierarchy, with no extra gallery controls or interleaved scientific essays on the index.
2. Distinctiveness: source inspection found distinct cellular, anatomical, geological, mechanical and mathematical structures, not renamed or recolored baseline works.
3. Layout: retain square previews and declared 240/320px minima; real 390px/1180px host screenshots must confirm fit and readable scientific sections.
4. Accessibility: preserve labelled palette radios, explicit filter labels, clear-focus recovery and URL history. Browser regressions cover the new fourth page and both search paths.
5. Finish: retain authored light/dark/mono appearance and visible qualifications. Browser evidence adds all five new groups, three hydraulic palettes, forced colors and print.

The pinned packet reimport, 14 importer regressions and 16 packaging regressions passed locally. The full serial unit run passed 3,184 tests with 5 inherited skips (229 files passed, 2 skipped). TypeScript passed; lint reported no errors and the same 462 inherited warnings as the baseline. The bounded two-worker production build and postbuild checks passed: 80 details, all 720 assets (23,394,826 bytes), 240 SVG masters and title/alias search. The local build used a separate copy of the existing locked dependencies after Turbopack rejected the initial external-directory symlink; no dependency change was needed. The temporary worker bound was restored before commit. Exact-head CI, actual-browser artifact review, merge, publication and live acceptance are separate stages. Their final results belong to the associated PR and guarded production release; this source record alone does not claim those stages passed.

## Release verification

Use the existing guarded `Publish checked site` workflow after exact-head acceptance. Preserve the 55-work Set05 live-audit baseline and verify the appended 25 routes and 225 new assets, plus full scientific notes and a stable exact-source production receipt. Do not rehash every historical asset merely because the collection grew: unchanged catalogue/source prefixes, full build checks and the existing baseline provide the preservation evidence. No new spending, access, credentials or hosting service is part of this release.
