# Source and provenance

This packet contains ten distinct computing-category studies, generated specifically for Ben Ebsworth's blog on 17 November 2026. All ten labels are proposed expansions. There are eleven preserved generation outputs because the compiler study has a framing revision and an archived first version.

## Generation record

The built-in `image_gen.imagegen` tool generated each subject in a separate call. The first ten calls used the exact prompts in `prompts.json`, with `transparent_background: true`. `generation-log.json` preserves the actual submitted parameters, returned source path and response hint. The compiler revision's exact edit request and input path are in `compiler-framing-request.json`; its output receipt is in `iterations/06-compilers-framing-v2-log.json`. Model, seed, quality and size controls were not exposed by this tool and are not invented here. Output dimensions were measured from PNG bytes.

The recovered ART04 family and existing editorial artwork were visually inspected as context. They were not supplied as image inputs for these ten new generations. Only the Batch03 compiler's own first output was supplied to the one framing-edit call. No ART04 prompts or companion vectors have been reconstructed or claimed recovered.

## Byte preservation and derivatives

All eleven returned image files are preserved byte-for-byte. The ten handoff PNGs are under `public/artwork/category-expansion-v1/batch-03/originals/`. The first compiler is retained at `docs/design/category-expansion/batch-03/superseded/06-compilers-v1.png`. Selection is documented in `selection.json`; it is a working handoff choice, not user approval or production adoption.

The review sheets are separately labelled Pillow composites and resized copies. They are not originals, new concepts, browser screenshots or evidence of deployed rendering. No original was alpha-cleaned, cropped, colour-adjusted, padded, optimized or re-encoded after generation. The compiler revision is a generated edit, not a lossless resize. These raster images have no editable SVG masters.

## Sources and rights record

No stock imagery, downloaded vendor marks or third-party artwork files were used as generation inputs. No vendor endorsement is implied. No additional licence has been assigned to these generated assets, and the repository's existing licence has not been changed.

Context sources:

- [Blog repository at the inspected base](https://github.com/castlemilk/benebsworth.com/tree/92cd2eeae1a289f727b6d7bcb2beb9ddbe44ab76).
- [ART04 source record](https://chatgpt.com/space/page_551b58188e48819187a946c825b1e711).
- [ART04 recovery PR157](https://github.com/castlemilk/benebsworth.com/pull/157).
- [Batch03 originals and receipts](https://chatgpt.com/space/page_eee3325ef21481919120904082c7c55e).

`manifest.json` records all selected byte hashes, measured dimensions, PNG integrity, alpha statistics, bounding boxes and Page upload hashes. `remote-preflight.json` records the inspected revision, active owners and publication blocker. `REVIEW.md` states the visual limitations and usage guidance.
