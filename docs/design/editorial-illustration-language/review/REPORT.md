# Raster specimen review

## Measured result

Six original PNGs decoded and matched their recorded SHA-256 hashes. Three r2 candidates pass the 12% margin floor around substantial pixels (alpha > 16/255); three explicit gap/under-form probes have alpha zero. The three r1 originals remain preserved. Original files were never resaved by this review.

| ID | Original dimensions | Smallest substantial margin | Maximum border alpha | SHA-256 |
| --- | --- | --- | --- | --- |
| EL01 | 1536 x 1024 | 13.0% | 0/255 | a78451f3ffe5c6d3e3eeeaa0bfc4a9af37e8889fde3680f1b0202221483ca938 |
| EL02 | 1536 x 1024 | 18.9% | 1/255 | 00e7828545a9d849d3407ab8fb359b9232300cc1788420e4a5384c3e3c4f48c1 |
| EL03 | 1536 x 1024 | 13.2% | 0/255 | 3a04e2f1b20307987ff374042b2f89d58f5ed832592ed6928c477c0deee898d4 |

All three r2 images have alpha values from 0 to 254. Faint low-alpha residue extends outside the substantial painted bounds; EL02 reaches the bottom border at alpha 1/255. This is genuine transparency with a recorded fringe limitation, not a perfect zero-background cutout. The 16% correction target is not achieved on every side of EL01/EL03. Their measured minima exceed the 12% working floor.

## Visual review

Review mattes are paper #f4f1e8 and charcoal #181c20. Actual-size sheets place each full original canvas at 160, 320 and 640 pixels wide. Detail composites retain 1536-pixel width. Grayscale is a labelled inspection composite, not an alternate original.

- EL01: retain. The unequal pieces and open step read first; the raised shim gives the focal cue. At 320 px the seam and red insert remain visible. At 160 px the hatch texture collapses and no tolerance or fit should be inferred.
- EL02: retain as an invented cutaway. The shell and displaced wall remain distinguishable on both mattes. Two curved ribs give interior rhythm. Some interior areas are real depicted rear surfaces, so they remain ivory. The cutaway must not be captioned as anatomy or a material specimen.
- EL03: retain as a continuous illustrative form. The flat tail, rise, valley and final arch remain legible. The visible shape has more than a literal two crease edges, so do not describe it as an exact two-fold construction or a fold sequence that can be manufactured.
- Grayscale: form and position retain the relationship. Red adds emphasis rather than carrying the only meaningful distinction.

The actual images were inspected by the author; independent packet review is recorded separately. No DOM, native-browser, live-site, print-device or assistive-technology acceptance is claimed.

## Vector counterpart evidence

See [the vector review](../vector-source/REVIEW.md) and [vector technical evidence](../vector-source/technical-review.json). The separate SVGs are original authored counterparts, not traced or exact raster geometry. Their palette variants have identical geometry and alpha masks; their strict empty-edge checks are separate from the raster fringe limitation.

## Reproduce

Run from the repository root:

```bash
python3 docs/design/editorial-illustration-language/review_raster.py
```

Pillow and the repository Barlow Condensed font are required. The command verifies the immutable expected PNG hashes before generating secondary composites and machine-readable reports. It does not regenerate raster originals.
