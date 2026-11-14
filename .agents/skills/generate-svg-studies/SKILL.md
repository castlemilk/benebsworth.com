---
name: generate-svg-studies
description: Create or extend mathematical SVG studies for this blog's tunable gallery, including scientific model, searchable tags and aliases, deterministic transparent export and regression checks. Use for new gallery motifs or framework extensions, not raster artwork or technology-logo replacement.
---

# Generate SVG studies

Use the existing geometry-first framework. A new study should become searchable and tunable through registration, without another renderer or a one-off gallery component.

## Authored illustrations

For bespoke pictorial artwork rather than equations or measured diagrams, use the [artistic vector factory](../../../docs/artistic-vector-factory.md) and its linked artistic-vector skill. Keep `Illustration` / `illustrative` provenance, typed paths, genuine cutouts, fixed compositions where a model control would be artificial, and subject-specific visual critique. The same registry, appearance lab and self-contained export remain the integration boundary. Preserve every previously reviewed default SVG hash when extending the collection.

## Keep raster artwork separate

For generated PNG editorial illustrations, use the image generation workflow and `docs/editorial-artwork.md`. Register them in the separate artwork manifest, not as a `Study`. Keep real transparency, original master bytes and prompts; never wrap or trace them into a nominal SVG. The library and site search support both formats with distinct labels.

## Choose the model before drawing

Recover the current branch, concurrent edits and relevant existing study. Confirm what the requested image represents, then choose `math-derived`, `simulated`, `topology` or `illustrative`. State the equation or graph, domain, units/normalization, sampling or integration method, and exclusions in the definition's `basis`. If the request has an unresolved consequential scientific interpretation, clarify it rather than inventing accuracy.

Sampled curves are approximations. An illustrative prism does not acquire a refraction model from its appearance; a graph does not become a running distributed protocol. Use original art as direction only. Preserve article figures, original manifest identities and canonical technology logos.

## Implement and register

- Read `lib/generative-svg/definition.ts`, `registry.ts`, and the closest existing model. For a complete small starting point, use `lib/generative-svg/examples/lissajous.ts`; it is executable and tested but intentionally not in the public registry.
- Implement a pure `Study`: stable kebab-case ID, title, subject, provenance, concise description, scientific basis, curated tags/aliases, bounded parameter definitions, and a deterministic `model(parameters)` returning typed marks.
- Put a genuinely new model in a focused module. Import it into the definitions assembled in `lib/generative-svg/model.ts`. `createStudyRegistry` validates unique identity, metadata and control ranges; the gallery, counts, structured links and site-search records derive from that registry.
- Reuse `Point`, `Mark`, `Geometry`, `parametersFor`, `geometryFor` and `renderStudySvg`. Appearance must never enter the model. Keep the common 320×240 space, finite coordinates and safe margins. Split discontinuous domains instead of drawing bridges across poles or missing values.
- Reuse an existing tag where its meaning fits. Tags use lowercase kebab-case. Add real names and acronyms as aliases, such as BST or Schwarzschild. Search indexes only curated title/ID/subject/tags/aliases: do not add unsupported capabilities, negative caveats or the whole basis as keywords. Gallery terms intersect; subject and tag filters also intersect.
- Keep scientific/data marks distinct from optional guides. Selected states need a non-color cue that survives monochrome and minimum emphasis. Do not use accepting-state rings to mean mere selection in an automaton.
- For dense decorative engraving, the optional `stroke: 'fine'` tier scales the chosen line weight by 0.4 without moving geometry. Do not hide decorative detail in construction guides or silently change existing figures. Inspect the maximum-weight specimen: radial contour spacing is not perpendicular stroke clearance. See `ornamental-studies.ts` for original polar ornaments and an equal-area seed construction.

Read [Model and review checks](references/model-checks.md) for numerical or graph-specific test choices.

## Verify the complete journey

Add model-specific invariant tests, then run the existing generative-SVG and gallery tests, typecheck, lint, full suite and build/postbuild from `package.json`. The postbuild `scripts/build-search.mts` indexes exported articles plus every registered SVG study through Pagefind. Do not maintain a second manual discovery list.

Check name, alias and tag search; subject/tag intersections; empty-result recovery; direct `/vectors/?study=ID` entry; selection and Back/Forward; parameter retention; independent appearance/parameter resets; and copy/download equality. Preserve the original 25 manifest IDs as a required subset, not a ceiling. Test a proposed new study without replacing an existing motif merely to keep the count fixed.

Render real SVG specimens on light/dark mattes and in monochrome at the supported stroke extremes. Inspect labels, arrowheads, crossings, zero vectors, clipping and transparent exports. Use rasterized diagrams as specimen evidence, never as browser screenshots. Check the actual gallery in an authorized browser when available; report outstanding responsive, keyboard, clipboard, download, print or forced-color checks separately.

Keep this skill and any new helper executable and tested. A template is a starting point, not a scientific approval. Preserve the current review/release gates: creating a study does not itself authorize publication, installation, credentials, merging or deployment.
