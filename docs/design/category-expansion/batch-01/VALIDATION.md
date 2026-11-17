# Batch 01 validation evidence

Source baseline: `92cd2eeae1a289f727b6d7bcb2beb9ddbe44ab76`. Validation date: 17 November 2026, Australia/Melbourne. This is an asset/documentation-only handoff; it does not establish application, browser or deployed acceptance.

## Executed checks

| Check | Result |
| --- | --- |
| `python3 docs/design/category-expansion/batch-01/verify-assets.py` | Passed: 10 distinct concepts, 10 selected PNGs, 11 preserved original PNGs, all 11 generated-source and confirmed-upload SHA-256 matches, valid decoded PNGs, exact dimensions and real alpha. Four existing topic mappings and six proposed studies remain explicit. |
| `python3 docs/design/category-expansion/batch-01/review-assets.py` | Passed: all original bytes unchanged during review; 11 original files measured, 10 selected concepts; 17 secondary review PNGs produced. |
| Standalone gallery source/link check with Python `html.parser` | Passed: 38 local links resolve, 10 unique concept sections, 20 light/dark image previews with dimensions and alternatives, no script or network dependencies. Browser layout was not executed. |
| Protected-source comparison against baseline | No differences in `lib/topics.ts`, `lib/lab/registry.ts`, `public/topics/custom-v6` or `docs/design/art04-recovered-originals`. Final Git scope check covers every changed path. |
| SHA-256 file list | Covers every delivered file in the two owned directories except `SHA256SUMS` itself. Checked after the final source freeze. |

## Executed image review

The independent image reviewer inspected all selected subjects on warm ivory `#f4efe6` and dark `#181a19`, full-canvas display at 256, 128 and 64 px, sampled upper/left edges at 1:1 and the neuron revision comparison. The primary agent also inspected both final full-family contact sheets. Exact findings and per-image size recommendations are in `review/visual-review.md`.

No broad visible glow/halo, clipped substantial tips, readable generated labels/numbers, watermark or vendor marks were observed at the reviewed scales. All originals contain real transparency. Nine retained originals have faint alpha 1/255 border residue; they are not claimed to be pristine cutouts. Eight selected images fall below the requested 16% margin target, with measured substantial margins of 7.50–12.76%. Earth measures 16.27%; Neuroscience r2 measures 26.00%. Future consumers need contain-style placement and external spacing.

Neuroscience r1's crowded 3.99% upper margin triggered one imagegen correction. R2 preserves the single-neuron subject with substantially wider margins and is selected. Both original outputs remain intact.

## Checks not performed

- Real-browser rendering of the standalone gallery or any application route.
- Keyboard, focus, touch, forced-colour and responsive consumer acceptance.
- Full application tests, production build, remote CI, merge, preview or production deployment.

The application runtime and taxonomy are unchanged. Passing image checks does not close those separate application gates.

## Publication read blocker

The pinned source's legacy Vercel preview workflow can run after any non-master push when `VERCEL_PREVIEW_CI_ENABLED` is true. The current variable value could not be verified: the connected GitHub fetch tool rejected the exact variable endpoint with HTTP 400 `INVALID_ARGUMENT`, and the available `gh api` read exited 4 because the CLI has no authenticated session. No login, credential, permission or setting change was made. The branch stays local with a complete binary patch and source packet for coordinated review.
