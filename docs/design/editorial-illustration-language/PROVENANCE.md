# Provenance and rights record

Prepared 17 November 2026, Australia/Melbourne.

## Authorship and inputs

EL01, EL02 and EL03 are newly generated raster illustrations made for this task with the built-in OpenAI image-generation tool. Each initial r1 call used only its saved text prompt, with `transparent_background: true`. No existing blog artwork, stock image, third-party logo or historical brand image was supplied as an image input.

Each r2 call used only that concept's own r1 PNG as the edit target. The correction asked for smaller framing and cleaner transparent margins while retaining the concept. An image edit is a new generated result, not a guaranteed affine transformation: minor contours or hatch placement can differ. Both revisions remain unchanged from the returned files.

The API exposed the prompt, transparent-background setting, input path, output image and a saved-file hint. It did not expose a specific model version, seed, quality parameter or a caller-controlled size. Those values are recorded as unknown. Actual PNG dimensions are measured after generation.

The three vector counterparts are independently authored, deterministic path drawings. They are neither auto-traces nor raster embeddings. Their geometry is simpler than the raster studies and they should not be presented as exact vector copies of the original illustrations.

## Context actually inspected

The following materials informed the direction but were not image inputs:

- The canonical blog design Space, vision page, asset collection, active-work page and workstream index.
- Current master `e1c0f0a4c9ac4d7d189542e7c71abf274cc0977e`, root AGENTS.md, DESIGN.md, editorial reuse guidance and existing provenance.
- Actual pixels of the existing memory-layer-stack and precision-caliper originals, read from the asset page. A parallel audit viewed event-pipeline, optical-lens and research-folio originals against current source blobs.
- The installed beneb design direction, aesthetic system, relevant taste/decision history and indexed Reciprocal Span historical image. Its substantial forms and open interval were inspected as contextual visual evidence, not imported geometry or a selected parent for this family.
- The artistic-transparent-vectors brief, art-direction, semantic-integrity and relevant export/integration rules.

The fifty category originals were protected by path and repository preservation checks. This lane did not claim to independently visually inspect all fifty; the subject-motif owner has its separate audit.

## Fidelity and rights

All three raster images are illustrative, invented sculptural relationships. They are not sourced depictions of a real scientific specimen, measured device or commercial product. The cutaway is not anatomy; the ribbon is not a mathematical surface claim or physically validated folding plan.

No external stock, vendor logo, font or photograph is embedded in the artwork. The packet does not assign a new Creative Commons or open-source licence to the art or change repository licensing. The repository has no blanket licence identified for this new family. Generated authorship and file hashes establish provenance, not exclusive rights or trademark clearance.

The review PDF uses repository-supplied Barlow Condensed and Source Serif 4 fonts under their existing OFL notices. Copies in `font-notices/` preserve the complete licence text with trailing line whitespace normalized; the existing repository notices remain untouched. Its text is a review document, not part of the transparent artwork. The scripts use installed libraries without copying their source into the packet.

## Original and derivative distinction

- `process/r1/*-r1.png`: exact initial generated originals, retained as process evidence.
- `public/artwork/editorial-illustration-v1/originals/*-r2.png`: exact corrected generated candidates.
- `companions/*.svg`: authored editable vector counterparts, palette-resolved.
- `review/*`: secondary matte, size and grayscale inspection composites; these are not transparent masters or browser screenshots.
- `editorial-illustration-language.pdf`: a visual review document.
- `manifest.json` and `SHA256SUMS`: measured identities and payload verification.

Raster inspection composites may be resampled or composited onto a labelled matte. No transparent original has been cropped, thresholded, recoloured, sharpened, traced or resaved by the review script.

## Recorded limitation

The r2 candidates retain faint alpha residue outside their substantial-content bounds; EL02 includes border alpha 1/255. All three have genuinely transparent regions and retain open gaps on the inspected mattes, but they do not satisfy a strict every-background-pixel-equals-zero cutout standard. Reported 13-19% minimum margin uses alpha greater than 16/255 and must not be described as fully zero-alpha clearance.

Ben has not yet selected or approved these specimens. Artifact inspection, repository gates and any later browser/release checks are separate evidence classes.
