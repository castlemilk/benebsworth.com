# Editable editorial counterparts

Three independently authored vector studies support the primary raster illustration packet. They demonstrate the same narrative relationships with deliberately simplified geometry. They are not tracings, exact reconstructions, new category symbols or replacements for any existing artwork.

| ID | Visible relationship | Drawing decision |
| --- | --- | --- |
| el01-interface | Two unequal stepped solids separated by a clear interval | Asymmetric mass, coherent oblique projection, exposed raised shim |
| el02-cutaway | Open shell, two visible ribs and displaced wall section | Curved silhouette and actual transparent cavity; cut face carries selective hatching |
| el03-sequence | Continuous ribbon from flat tail through angular folds to an arch | Directional gesture, shared panel vertices and air under the form |

## Files and palette

Each specimen has a resolved-color light, dark and neutral monochrome SVG in `public/artwork/editorial-illustration-v1/companions/`. All use a `1200 × 800` viewBox. The same geometry, ordering and line widths are preserved across palettes. The source contains named, editable paths and genuine transparent openings; no raster image, embedded font, external resource or script is present.

The light version uses graphite `#28343b`, ivory `#f4f1e8`, a quiet turned face `#d8d4c9` and vermilion `#b32624`. The dark version uses ivory contours, `#394850` and `#263239` object faces, and pale red `#ffaaa5`. The monochrome variant uses neutral graphite/ivory/gray; it is not a certified single-ink print separation. Preview mattes are separate from the SVGs.

The intended minimum display width is **320 CSS pixels**, with a 640px article figure as the normal study size. The generated 160px and 64px images are diagnostic stress checks, not icon or category-badge recommendations. Captions and any factual labels belong in selectable host text; example alt text and semantic limits are in `vector-manifest.json`.

## Provenance

`make_companions.py` is the complete original authoring source. Coordinates and curves were authored for this packet from its written brief, without tracing or supplying any raster image. Generation is deterministic and uses no seed or random input. The resulting geometry is illustrative: it establishes neither a measured interface fit, anatomical structure, real material cross-section nor physically validated folding. No data-derived or simulation provenance is claimed. No external stock or vendor asset is included and no new public licence is assigned; the project owner retains that decision.

This is a standalone asset packet. It has no import into an application, no registry entry, no shared token change, no host layout and no knowledge-graph semantics.

## Reproduce and review

From the repository root:

```bash
python3 docs/design/editorial-illustration-language/vector-source/make_companions.py

python3 docs/design/editorial-illustration-language/vector-source/review_companions.py \
  --skill-dir "$ART_VECTOR_SKILL_DIR" \
  --renderer-root "$ART_RENDERER_PROJECT" \
  --review-font "$ART_REVIEW_FONT"
```

Set `ART_VECTOR_SKILL_DIR` to the installed artistic-transparent-vectors skill, `ART_RENDERER_PROJECT` to a permitted existing project with Sharp, and `ART_REVIEW_FONT` to an installed TrueType font for review-sheet labels. No new package install is needed in the inspected environment. Those labels are secondary review material and are absent from the SVG masters.

The review command runs the skill's conservative static SVG audit, renders the actual files with Sharp, regenerates SVGs twice and compares bytes, compares palette geometry and alpha, probes intentional empty spaces and checks at least 12% painted-edge clearance. It preserves all 45 transparent PNG exports, matched 640px mattes, checker previews, six compact review sheets and per-file renderer/alpha reports. Visual acceptance remains a separate, explicit record in `REVIEW.md`; scripts cannot certify it.

`vector-manifest.json` supplies SVG hashes, layer IDs, dimensions, palettes and descriptions. `technical-review.json` records the actual technical checks and renderer versions. `SHA256SUMS` covers this source/review subtree and the nine companion masters, excluding the checksum file itself.
