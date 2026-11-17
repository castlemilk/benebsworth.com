# Blog category art batch 01

Ten science and living-systems artwork concepts for Ben Ebsworth's open-margin research folio. The review selection contains ten separate PNG files. Eleven generated originals are preserved because Neuroscience revision 1 is retained alongside its more spacious revision 2. Revisions and review composites do not increase the concept count.

The family uses graphite engraving, tactile warm ivory and restrained red details. These are illustrative metaphors, not scientific evidence, anatomical models, measured diagrams or knowledge-graph data. Four labels map to existing topics; six remain proposed study labels. No registry, source content, component, shared style, approved symbol or official logo is changed.

## Review the work

- [Standalone gallery](index.html): ten labelled concepts, paired light/dark views and original-file links. It uses local files and no network dependencies. Its browser layout is unverified.
- [Light contact sheet](review/contact-light.png) and [dark contact sheet](review/contact-dark.png): deterministic secondary composites of the selected originals.
- [Independent image review](review/visual-review.md): all ten at 256, 128 and 64 px, sampled 1:1 edges, crop/margin findings and minimum useful sizes.
- [Usage notes](USAGE.md): theme treatment, accessible alternatives and subject-specific metaphor boundaries.
- [Machine-readable manifest](manifest.json) and [SHA-256 file list](SHA256SUMS): exact image identities, provenance and packet integrity.
- [Exact generation requests](prompts/requests.json), [neuron revision request](prompts/revisions.json) and [readable prompt record](PROMPTS.md).

## Selected files

| Key | Label | Status | Selected original |
| --- | --- | --- | --- |
| maths | Mathematics | Existing topic | `01-maths-r1.png` |
| chemistry | Chemistry | Existing topic | `02-chemistry-r1.png` |
| biology | Life Sciences | Existing topic | `03-biology-r1.png` |
| earth | Earth & Space | Existing topic | `04-earth-r1.png` |
| geology | Geology | Proposed study | `05-geology-r1.png` |
| oceanography | Oceanography | Proposed study | `06-oceanography-r1.png` |
| meteorology | Meteorology | Proposed study | `07-meteorology-r1.png` |
| ecology | Ecology | Proposed study | `08-ecology-r1.png` |
| genetics | Genetics | Proposed study | `09-genetics-r1.png` |
| neuroscience | Neuroscience | Proposed study | `10-neuroscience-r2.png` |

All originals are under `public/artwork/category-expansion-v1/batch-01/originals/`. The preserved first neuron is `10-neuroscience-r1.png`. Original PNG bytes were copied without cropping, recolouring, alpha cleanup or re-encoding. Raster files are not editable SVG masters.

## Observed quality and limits

All eleven originals have verified alpha transparency. No broad visible halo, readable fake text, watermark or cropped substantial subject tips were observed in the reviewed composites and sampled edges. Nine retained originals have barely nonzero border residue at alpha 1/255; this is recorded rather than erased. The selected neuron revision has a completely zero-alpha outer border and a 26% minimum substantial margin.

Eight selected images have 7.50–12.76% minimum substantial margins, below the common prompt's 16% request. Earth has 16.27%. Preserve the full canvas with contain-style placement and external folio spacing. Ecology and Neuroscience need about 256 px full-canvas display for useful detail; most others retain useful detail at 128 px. These are image-review judgments, not approved interface breakpoints or tiny-symbol acceptance.

## Source and publication status

Repository: [castlemilk/benebsworth.com](https://github.com/castlemilk/benebsworth.com). Baseline: [master 92cd2eeae1a289f727b6d7bcb2beb9ddbe44ab76](https://github.com/castlemilk/benebsworth.com/commit/92cd2eeae1a289f727b6d7bcb2beb9ddbe44ab76). Local branch: `art/blog-category-expansion-batch-01`.

[Dedicated blog Space page](https://chatgpt.com/space/page_45e85238d2f0819191d039fbf3a6f309) contains the actual uploaded originals, concept labels and incremental recovery checkpoints at 2, 4, 6, 8 and 10 concepts. The final source packet records its exact local revision separately in `HANDOFF.json`.

The branch remains local. A legacy workflow can deploy previews on non-master pushes, and the current `VERCEL_PREVIEW_CI_ENABLED` value could not be verified: the connected GitHub reader rejects that variable endpoint and the available `gh` CLI is unauthenticated. No new login, permission, setting change, push, PR, merge or deployment was attempted. [Source context](SOURCE-CONTEXT.md) records active owners and the exact boundary. [Draft PR text](DRAFT-PR.md) is prepared for later authorised publication.

## Reproduce asset checks

Run from the repository root with Python 3 and Pillow installed:

```bash
python3 docs/design/category-expansion/batch-01/verify-assets.py
python3 docs/design/category-expansion/batch-01/review-assets.py
sha256sum --check docs/design/category-expansion/batch-01/SHA256SUMS
```

The first command verifies selected count, original identities, source/upload hash equality, PNG decoding, dimensions and alpha. The second measures all original revisions and regenerates the secondary review composites without modifying originals. The SHA-256 list covers both owned directories except the list itself. Browser rendering, consuming-route integration, forced-colour behaviour and production acceptance remain unverified.
