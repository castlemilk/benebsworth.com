# Batch 05 Physical worlds and invention

Ten selected original raster artworks for Ben Ebsworth's open-margin research folio. All ten are **proposed artwork-study labels**, not approved topic keys, article coverage or scientific evidence. Thirteen generator outputs are preserved: ten selected files and three superseded attempts.

## Review the collection

Open `gallery.html` from the complete source packet. It uses local files only and shows each subject on ivory and graphite. The labelled contact sheets and actual-size strips are under `review/`. These are file-derived review specimens, not browser screenshots.

The ten selected PNGs are in `public/artwork/category-expansion-v1/batch-05/` relative to the repository root. Every selected file is 1254 × 1254, 8-bit RGBA. Their combined size is 5,309,801 bytes. Each saved PNG is byte-identical to its corresponding image-generation output; no manual crop, re-encoding, recolour or alpha cleanup was applied to the delivered originals.

| Proposed study | Selected filename | Motif |
| --- | --- | --- |
| Thermodynamics | `thermodynamics-original.png` | Cutaway heat-engine piston and flywheel |
| Fluid dynamics | `fluid-dynamics-original.png` | Streamlined body and open vortex ribbons |
| Materials science | `materials-science-original.png` | Layered lattice specimen |
| Optics | `optics-original.png` | Mounted lens and prismatic beam |
| Robotics | `robotics-original.png` | Articulated gripper |
| Acoustics | `acoustics-original.png` | Resonant tuning fork |
| Astronomy | `astronomy-original.png` | Telescope and stellar cluster |
| Geophysics | `geophysics-original.png` | Seismic instrument and layered Earth |
| Renewable energy | `renewable-energy-original.png` | Wind and solar mechanism |
| Biotechnology | `biotechnology-original.png` | Bioreactor and integrated leaf |

## Alpha and edge qualification

All ten contain real zero-alpha pixels. Their substantial foreground has 19.78–25.20% minimum margin at alpha ≥16/255, and no perceptible halo was observed in the final reviewed light/dark composites. A targeted image-generation edit removed the earlier piston haze.

**The sources do not have completely zero-alpha outer margins.** Faint low-alpha residue remains in all ten; five have a few alpha-1 pixels on the outermost border. Do not claim mathematically clean cutouts or fully opaque subject surfaces. `manifest-alpha.json` preserves full alpha histograms, bboxes at thresholds 1/16/128, border observations and PNG chunk/CRC records. No threshold was applied to the source files. See `review/OBSERVATIONS.md` for the exact distinctions and the subject-specific theme limitations.

## Usage

Use labelled spot/header placements at 192–280 px canvas width or larger; prefer 280 px when internal detail matters. Preserve the complete source canvas with contain sizing and no cover crop. Do not use these as replacements for current 16–24 px production glyphs. Acoustics' secondary contours are quiet on dark graphite; optics' pale beams are quiet on ivory. Visible labels must carry meaning. Keep labels and annotations as selectable surrounding text, not baked into the image.

These are invented visual metaphors. The optics rays are not a ray-tracing result, the seismic motif is not recorded data, the stellar cluster is not a sky map, and the apparatus forms are not certified engineering or biological designs. The PNGs are raster artwork, not editable SVG.

## Provenance and reproducibility

- `generation-requests.json`: exact selected tool arguments and exposed/unavailable settings.
- `prompts/`: one exact JSON request per selected subject. The piston cleanup request is also retained under its explicit filename.
- `generation-receipts.json`: all thirteen output source paths, intended destinations, attempts and selection reasons.
- `attempts/`: unmodified thermodynamics v1/v2 and fluid-dynamics v1, their exact requests and the first-pass alpha snapshot. Earlier review composites are labelled as first attempts.
- `page-image-references.json`: the ten selected uploaded-file references and upload SHA-256 receipts.
- `attempt-page-references.json` and `checkpoint-references.json`: earlier uploads and incremental pair checkpoints.
- `manifest.json` and `SHA256SUMS`: selected assets, provenance linkage and complete file identities.

The final piston is an image-generation background-extraction edit of retained thermodynamics v2; its final output bytes are unmodified. Model identifier, seed and explicit output-size control were not exposed. A 1024-square canvas was requested in prose; the actual outputs are 1254-square. Exact requests are preserved, but pixel-identical regeneration is not promised.

## Source and publication boundary

Baseline: `92cd2eeae1a289f727b6d7bcb2beb9ddbe44ab76` on `master` in `castlemilk/benebsworth.com`. Isolated branch: `art/blog-category-expansion-batch-05`. Only the two assigned Batch 05 asset/docs paths change. The dirty Mac checkout, ART04 recovery, custom-v6 symbols, official technology marks, registries, shared styling, source content and other owners remain untouched.

The Space child page is [Blog category art batch 05 Physical worlds and invention](https://chatgpt.com/space/page_4a95f7010100819192097f3954e10d28).

Remote push and draft PR are withheld because the non-master push workflow can deploy a Vercel preview, while the current `VERCEL_PREVIEW_CI_ENABLED` value cannot be read with the available connection. Recent skipped runs are historical evidence, not a current setting guarantee. No workflow or security setting was changed. The download contains the complete binary patch and exact local revision for coordinated review. No merge or deployment occurred. `SOURCE-CONTEXT.md` records the exact access result, owners and source evidence.

Real-browser, narrow-consumer, forced-colour and screen-reader checks are unavailable and remain pending. The full application build and CI were not run for this isolated asset/docs handoff; the evidence is file integrity, source scope, local reference checks and reviewed file composites.

## Verify the packet

From the extracted repository-root layout:

```bash
sha256sum -c docs/design/category-expansion/batch-05/SHA256SUMS
python3 docs/design/category-expansion/batch-05/inspect_assets.py
python3 docs/design/category-expansion/batch-05/build_manifest.py --check
```

The inspection command regenerates review-only composites and measurements using Pillow; it never modifies original PNGs. The checksum list excludes itself. The separate handoff receipt records the binary patch SHA-256 and exact local commit without creating a self-referential repository manifest.
