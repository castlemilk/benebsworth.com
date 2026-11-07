# Hiking photo discovery, local candidate

## Scope

This separate branch extends the reviewed PR95 source without changing that PR or its publication status. It uses only each hike's already-published manifest gallery. It does not read the global media registry, fetch original EXIF, infer place names, reverse-geocode, write manifests, or integrate the route research prototype.

The gallery now offers existing place labels with counts and a compact nearby-photo strip. Groups are deterministic in published gallery order: each photograph joins the nearest eligible first-photo anchor within 2 km, otherwise starts a new area. This is not transitive clustering. Two photographs in one group can be more than 2 km apart; these are approximate vicinity groups, not named places, route segments, or a claim of independent geographic accuracy. Invalid/missing coordinates remain in the full gallery. A coordinate-presence selector appears only for mixed metadata coverage.

The place selector and schematic waypoint selection share the existing exact label contract. A stop without photographs now shows an honest zero-match state. The nearby areas remain separate from the map and do not add coordinate output or geographic pins. Existing precise-coordinate links in the lightbox remain available only for valid published coordinate pairs. This work is not a privacy redaction of the existing public data.

## Data-quality finding

A read-only source check on 5 November 2026 found the same 51 image URL/ID sets in the Alta Via and Walker's Haute Route published manifests, in different orders. Matched assets have identical GPS and capture times. The Alta Via assignments have no captions, alternative text or place labels. The observed locations do not correspond to the retained Alta Via source-route corridor.

`lib/hiking/gallery-source-review.ts` identifies only those exact already-public image URLs, without storing GPS or capture times. The notice is limited to Alta Via, says the assignment is unverified, and disappears when no reviewed shared URLs remain. It does not delete, reclassify, rename or alter any photograph. Fallback labels avoid claiming the images document Alta Via. Tests exercise both the ambiguous and replacement-data cases.

No independently identified Alta Via photograph collection or verified asset-to-trip mapping was found in the inspected existing published records or repository. The verified source images currently belong to Haute Route and Overland; Alta Via's existing cover remains explicitly labelled illustration.

## Resilience and accessibility

Loading, absent/empty gallery and request/JSON/schema failure have distinct treatment. A failed request offers retry. Changing hikes remounts the state, aborts the old request and prevents stale completion from replacing the new gallery. Failed preview/full images remain honest and do not substitute invented imagery.

Native labelled selectors, selected-state area buttons and a live result count work with keyboard input. Clear filters restores all photos. The lightbox contains Tab focus, retains arrow/Escape navigation and restores focus to its opener, or the connected gallery heading if filtering removed the opener. Groups and filters use the Hiking stone/forest palette, serif heading and readable sans metadata.

## Reproducible local review

The preview is a standalone harness of the actual `HikeJourney`/gallery components and current Hiking CSS, not a Next production build or a deployed application. It uses local exact snapshots of the three published manifests and verifies their hashes against an external provenance record. Photos continue to use their existing published URLs. Fixtures containing GPS/time remain outside the source tree and must not be committed or republished.

Run `node scripts/hiking/build-photo-preview.mjs /absolute/external/preview /absolute/external/published-fixtures` with the reviewed fixtures. The helper uses existing dependencies, keeps preview output outside the repository, and creates an output receipt. Its shell uses the retained Folio Serif plus a system sans fallback, rather than the production font-loader output. Full application build and page integration remain separate gates.

Focused checks cover published-only parsing, invalid GPS, exact place matches, unlabelled and zero-match states, bounded radius/nearest-anchor/dateline grouping, notice removal, filter interaction, failed images, focus, fetch failures/retry and stale response handling. Source photographs, schematic warnings and all live assignments remain unchanged.

## Candidate checks

The final serial suite passed 1,935 tests with 5 skipped (157 passed and 2 skipped files). Typecheck and changed-source lint passed. The full regression includes the source-notice replacement case and a mobile-specific regression that avoids repeating a selected place over every small photograph. Initial light/dark desktop/narrow review and real filter/keyboard/error interactions passed in the supported local harness; final captures are maintained outside the checkout with its exact build receipt. Full-page production integration and publication remain unperformed.
