# Hiking duplicate-photo review, 7 November 2026

## Findings

The screenshot delivered from `photo-opener-evidence/after-light-focus.png` was an actual browser capture of the focus-regression fixture, not the published catalogue. That fixture deliberately repeats one existing cover 18 times with distinct test URLs. It must not be presented as 18 distinct photographs or a live gallery. The fixture and historical captures are preserved unchanged.

A fresh read-only audit of the three existing public manifests found **180 gallery placements but 129 unique photographs by URL**:

- Walker's Haute Route: 51 entries, 51 unique URLs and IDs.
- Alta Via 1: 51 entries, the exact same URL/ID set as Haute Route, in a different order. The existing reviewed source-assignment warning still applies.
- Overland Track: 78 entries, 78 unique URLs and IDs, with no URLs shared with those galleries.

All 129 unique published full-image URLs were read and SHA-256 checked, totaling 116,509,426 bytes. All succeeded. No different URLs have identical bytes. This is an exact-byte audit, not a perceptual or near-duplicate classification. A gallery thumbnail, nearby-area cover and viewer filmstrip can intentionally show the same photograph in different controls; that is not a repeated gallery entry.

The adjacent `hiking-duplicates-audit.json` records manifest source URLs, retrieval times, hashes, counts and image hashes. It contains no GPS or capture-time fields. No global private media library, original EXIF, geocoder or image-classification service was used. Source image bytes were not saved or changed.

## Bounded correction

The public view now withholds the 51 exact known shared URLs only under Alta Via 1. It keeps a visible explanation and an honest zero-photo state until replacement source photographs are available. It does not guess which other photographs belong to Alta Via, rewrite a manifest, delete an original, change Haute Route or Overland, or deduplicate based on file names, reused IDs, coordinates or capture times. Corrected URLs appear automatically, in their original order.

Filtering happens before count, place and nearby-area calculations. The source notice remains visible even when all entries are withheld. Known-copy replacement is covered through the actual gallery component. The previous responsive opener-focus fix remains intact.

This display guard is **not privacy redaction**. If the full existing manifests are enabled later, their original fields would still reach the browser before filtering. The separate decision about precise GPS/capture-time publication remains unresolved and is not inferred from the general release request. No public-environment, publisher, credential or access setting changed.

## Validation

- The new component regression failed against the previous application behavior (one failure, 22 other passes).
- Final focused Hiking suite: **160 passed** in 16 files.
- Final aggregate: **2,027 passed, five skipped**, 168 passing and two skipped files.
- TypeScript, changed-source ESLint and whitespace checks passed.
- All 51 guarded asset IDs exactly match the freshly read Haute Route and Alta Via sets.
- Production prebuild phases succeeded. The local Next export then failed fetching Google Fonts (Hanken Grotesk, JetBrains Mono and Space Grotesk). OG rewriting and Pagefind were not run for this candidate. The temporary one-worker configuration was restored byte-for-byte (`97f146162e60fc3b479298fe0d88f1bba8e5ce1fb701315798f7ab14b564d3ad`). No fonts or network permissions were substituted.
- New browser acceptance is not claimed: the supported browser cannot reach this executor's static server, as established during PR98 acceptance. No repeated inaccessible-server attempt, temporary sharing grant or protection bypass was used.

## Source and release boundary

This extends the local opener-focus checkpoint `e7627d529753d053c7f2e8b5c1bd8099bd6216a2`, based on PR95 head `d453c8c65bf2b0c01527d04e1b14553d354a4c63`. Source publication and exact-head CI are separate from merge, deployment and rendered acceptance. PR95's gallery-data hold and PR98's pending browser acceptance remain in force. No live manifest or production-domain deployment occurred in this cycle.
