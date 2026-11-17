# Batch 03 Computing systems

Ten original raster artwork studies for Ben Ebsworth's Blog and Lab research folio. **Completed: 10 selected subject PNGs of target 10, all visually reviewed.** Eleven unique outputs were generated: the ten first-pass subjects and one compiler framing edit. The selected compiler is revision 2; its unmodified first version is preserved separately. This is an additive art study and source handoff; it does not add categories, articles, graph data or runtime integration.

## Source and ownership

- Repository: [castlemilk/benebsworth.com](https://github.com/castlemilk/benebsworth.com), default branch `master`.
- Exact base: [`92cd2eeae1a289f727b6d7bcb2beb9ddbe44ab76`](https://github.com/castlemilk/benebsworth.com/commit/92cd2eeae1a289f727b6d7bcb2beb9ddbe44ab76).
- Local branch: `art/blog-category-expansion-batch-03`.
- [Dedicated Batch 03 Space page](https://chatgpt.com/space/page_eee3325ef21481919120904082c7c55e).
- Owned paths: `docs/design/category-expansion/batch-03/` and `public/artwork/category-expansion-v1/batch-03/` only.

The current source has 20 topic keys. Every label below is a **proposed artwork-study label**, absent from that taxonomy at the verified base. Existing ART 04 originals, custom-v6 symbols, official technology marks, other batches and graph/design/motion work remain separately owned. The dirty Mac checkout is outside this handoff.

## Inventory

All filenames refer to the [originals directory](../../../../public/artwork/category-expansion-v1/batch-03/originals/). Palette and size composites are review derivatives, not additional artworks.

| Number | Proposed study | Original filename | Status |
| --- | --- | --- | --- |
| 01 | Databases | `01-databases.png` | Saved and visually reviewed |
| 02 | Distributed systems | `02-distributed-systems.png` | Saved and visually reviewed |
| 03 | Networking | `03-networking.png` | Saved and visually reviewed |
| 04 | Cybersecurity | `04-cybersecurity.png` | Saved and visually reviewed |
| 05 | Operating systems | `05-operating-systems.png` | Saved and visually reviewed |
| 06 | Compilers | `06-compilers-v2.png` | Framing revision selected and reviewed |
| 07 | Programming languages | `07-programming-languages.png` | Saved and visually reviewed |
| 08 | Testing | `08-testing.png` | Saved and visually reviewed |
| 09 | Observability | `09-observability.png` | Saved and visually reviewed |
| 10 | Data engineering | `10-data-engineering.png` | Saved and visually reviewed |

## Provenance and exact inputs

The new subjects are individually generated with the built-in `image_gen.imagegen` tool. [prompts.json](prompts.json) preserves the ten full first-pass prompts and maps the selected filenames; [generation-log.json](generation-log.json) records those actual calls, their parameters, generation timestamps and returned source-file paths. The compiler framing edit has its own exact [request](compiler-framing-request.json) and [call log](iterations/06-compilers-framing-v2-log.json), including its reference to the first compiler image. It is the call log, not a planned status field, that establishes which requests ran. The exposed background setting is `transparent_background: true`; model, seed, quality and requested output dimensions were not separate exposed tool controls. Actual output dimensions come from decoded pixels.

Original PNG bytes are copied without cropping, cleanup, colour adjustment or re-encoding. The selected compiler is a generated edit, not a postprocessed first-pass file. [selection.json](selection.json) maps it to the unchanged [superseded compiler original](superseded/06-compilers-v1.png) and records both hashes. Its selection is an assistant handoff choice, not user production or taxonomy approval. The revision-2 call receipt in `iterations/` points to the selected output; only one copy of that generated PNG is packaged. No raster is presented as an editable SVG, and no companion SVG is claimed. No stock or official technology artwork was used as generation input. The recovered six ART 04 PNGs informed family context only; their missing original prompts or companion SVGs are not reconstructed here. This packet assigns no new third-party licence.

The graphite/ivory objects, restrained red details and imagined mechanisms are editorial metaphors. They are not working hardware diagrams, scientific evidence, measured telemetry, real knowledge-graph relationships, system guarantees or vendor endorsements. Labels belong outside the artwork.

## Review and usage

[REVIEW.md](REVIEW.md) records observed appearance, alpha limitations and size recommendations. The [final light](review/final/contact-light.png) and [final dark](review/final/contact-dark.png) sheets composite the ten selected originals onto ivory `#f4f0e8` and graphite `#191a1c`; the source canvas is preserved. Use contain sizing, keep a visible category label, and prefer 96–256 px or larger placements. Prefer 256 px or larger for the selected compiler: its generous framing makes it optically smaller than the other subjects at equal canvas size. The 48 px view loses material and structural detail; 24 px is a legibility stress case, not an approved replacement for the existing small symbols.

Actual alpha is present, but transparency is not equivalent to a pristine cutout. All ten selected images are 1254 × 1254 RGBA PNGs with mostly near-opaque alpha253 material, partial edge pixels and very-low-alpha exterior pixels reaching the canvas boundary. They do **not** satisfy fully transparent clear-margin or perfectly opaque-material targets. Initial margins were specified as at least 18% for images 01–05 and 23% for 06–10. The compiler edit increases the minimum margin at alpha >16 from 5.82% to 26.24%, meeting its revised central-half framing visually, while one very-low-alpha border pixel remains. The other nine subjects retain their documented framing drift. No postprocessing has hidden these findings. Sampled dark composites do not establish a blanket no-halo claim. Consumer-specific crop, contrast, forced-colours and browser checks remain unverified.

## Reproduce the checks

Run from the repository root with Python 3 and Pillow available. These commands only read original images and write separate reports or review derivatives.

```bash
python3 docs/design/category-expansion/batch-03/verify.py \
  --allow-incomplete \
  --output docs/design/category-expansion/batch-03/pixel-audit-checkpoint.json

python3 docs/design/category-expansion/batch-03/build_review.py \
  --pair 1 \
  --output-dir docs/design/category-expansion/batch-03/review/pair-01
```

The complete selected inventory is recorded in [manifest.json](manifest.json). Verify against its recorded bytes, then optionally rebuild the selected review sheets:

```bash
python3 docs/design/category-expansion/batch-03/verify.py \
  --manifest docs/design/category-expansion/batch-03/manifest.json \
  --output docs/design/category-expansion/batch-03/verification.json

python3 docs/design/category-expansion/batch-03/build_review.py \
  --output-dir docs/design/category-expansion/batch-03/review/final
```

Both scripts expose `--help`. The verifier checks exact selected inventory, SHA-256, byte size, PNG CRCs/termination, decoded dimensions, RGBA encoding and alpha distributions/bounds. Final manifest comparison rejects missing or unexpected files and changed bytes. The review builder records source hashes before and after compositing. Historical pair-03 sheets show compiler revision 1; final sheets show revision 2. Neither script certifies artistic acceptance or browser behaviour.

## Publication state and blocker

This handoff has not been pushed, opened as a PR, merged or deployed. The legacy Vercel workflow matches non-master branch pushes, including this branch, and its job depends on the current `VERCEL_PREVIEW_CI_ENABLED` repository variable. The current value could not be read using already available access: `gh` was unauthenticated and returned exit 4; connected fetch returned HTTP 400 `INVALID_ARGUMENT` because that endpoint is unsupported. Historical skipped runs do not prove the present variable value.

The complete source and patch packet can therefore be reviewed independently before an authorised publisher verifies that gate. No setting, credential, permission, workflow or release path is changed by this batch. No real-browser acceptance is claimed.
