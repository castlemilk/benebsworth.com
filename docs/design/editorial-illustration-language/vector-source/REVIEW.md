# Vector specimen review

Status: **retain as reviewable illustrative companions**, an assistant art-direction judgment. No user selection, scientific validation, runtime adoption, browser acceptance or release is implied.

## Observed images

The actual 640px light and dark renders were opened and inspected for all three specimens. Neutral monochrome images were inspected on warm paper. Actual-size review sheets contain unscaled 320px, 160px and 64px renders for all nine palette/subject combinations; these were opened and inspected. Unscaled crops from 1600px renders were checked for line collisions and joins in every palette. Final corrected ribbon renders were reopened at large size and in the refreshed small-size sheets.

| Specimen | Observation at 320px | Observation below minimum | Decision |
| --- | --- | --- | --- |
| Interface | Unequal masses, exposed step and raised shim remain distinct. The shared interval is readable without relying on color. | At 160px the shim is small; at 64px the hatching and shim topology lose definition. | Retain at 320px or larger. |
| Cutaway | Main curved wall, two ribs and separated section remain legible. Interior and separation are transparent. | At 64px the wall reads primarily as a broken ring; rib and cut-face detail is reduced. | Retain as an invented cutaway, with the metaphor caption. |
| Ribbon | Flat tail, angular crest and open curved end give a continuous directional reading. | At 64px the hatch group is lost and the object becomes a thin silhouette. | Retain at 320px or larger; do not present as folding instructions. |

The initial ribbon had a visible hatch/edge collision near the descent-to-arch join. The narrow-face hatching and redundant arch underside strip were removed. The final render has a clean shared join; larger previews and all three small-size palettes were rechecked. This was a correction during authoring, before the r1 delivery was frozen.

The cutaway counterpart is more schematic and flatter than a volumetric shell illustration. Its role is to show an exposed interior relationship, not to reconstruct the primary raster object. Monochrome preserves geometry and solid/void distinctions, but the dark filled shim loses the red version's internal tonal face separation. No meaning depends on that tonal distinction.

## Technical evidence

- Nine SVGs pass the installed artistic-vector static profile: real paths, no raster payloads, external resources, scripts or fonts.
- All 45 actual SVG rasterizations at widths 64, 160, 320, 640 and 1600px are nonempty, contain genuine transparent pixels, and paint zero pixels on their outer edge.
- Two identical authoring reruns preserve all nine SVG hashes.
- Each subject's three palettes have identical geometry and identical alpha masks at 1600px.
- Eight declared gap/cavity/under-form sample points have zero alpha. This supplements full-image alpha and visual inspection; it is not an exhaustive geometrical proof.
- Painted-margin minima at 1600px: interface **14.75%**, cutaway **19.31%**, ribbon **13.94%**. These include antialiasing and stroke extent.
- Actual renderer: **Sharp 0.34.5**, **librsvg 2.61.2**. Full versions and per-file metrics are retained in the JSON reports.
- Existing skill audit/export test suite: **25 tests passed** with the existing Sharp renderer enabled. The earlier source-only invocation passed 19 and skipped six renderer tests; the later renderer-enabled invocation ran all 25. These are the skill tool's tests, not application or browser tests.

No browser, responsive host, accessibility tree, print separation, native download, build, repository CI or deployment checks were performed for this supporting vector set. All captions and projected usage remain subject to the parent design packet and its review/release holds.
