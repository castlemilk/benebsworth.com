# Artistic vector factory

The library now includes authored illustrations alongside mathematical and topology studies. A subject is one artwork; palettes, export sizes and curated arrangements are variants, not extra artwork counts. The first bespoke batch adds six subjects in three distinct families:

- Engraved nature: Wind-cut branch and Night-wing specimen. Fixed compositions, with seven individually drawn leaves and an imagined moth respectively.
- Cut paper: Offset portal and Folded horizon. Three separately arranged pictorial constructions each.
- Expressive ink: Interrupted flourish and Rising ember. Three authored contour arrangements each.

These six bring the requested 36-piece expansion to 24 implemented subjects: 18 mathematical patterns and six bespoke illustrations. Twelve remain. Together with the original 25 and three earlier engravings, the candidate library has 52 SVG studies. This count is a source checkpoint, not a deployment claim.

## Author → register → export → review

1. Use the reusable [Artistic transparent vectors skill](https://chatgpt.com/skills?skill_id=6af7bc9bb9d48191b95c04f535456fdd) for the brief, silhouette, medium grammar, negative-space design and independent review. Its examples are not public gallery entries.
2. Add a pure Study in a focused module. Use Illustration / illustrative and curated title, aliases and tags. Describe authorship and exclusions honestly. Preserve the original scientific figures, canonical logos and separate PNG masters.
3. Build paths with the typed M/L/C/Z commands in definition.ts. No arbitrary path strings, transforms, filters or external resources enter the renderer. Bound cubic controls as well as endpoints. Explicitly close every fill contour. Even-odd subpaths outside a silhouette create positive islands: test actual alpha at intended holes rather than assuming closure makes a cutout.
4. Register through model.ts. Existing discovery, deep links, tuning, resets and SVG downloads derive from the registry. Every export uses the same serializer as the workbench. Pen weight affects strokes, not solid contour geometry. Custom inks remain chosen by the user; changing the preview surface does not silently recolour them.
5. Run model/alpha/discovery/recipe tests and the full project checks. Render all arrangements in light/dark/minimum/maximum/monochrome states and inspect at 160 and 320 pixels. Mathematical correctness, specimen critique, real browser checks, CI and release are separate gates.

## Reproducible local packets

The repo-specific adapter converts registered illustrative study recipes into the generic skill's review manifest. A recipe contains version 1, a kebab-case batch_id, a positive revision, and artworks with study, optional parameters and optional appearance:

```json
{"version":1,"batch_id":"bespoke-six","revision":1,"artworks":[{"study":"offset-portal","parameters":{"arrangement":2}},{"study":"wind-cut-branch"}]}
```

Run from the repository, with an existing local output directory:

```sh
node --import tsx scripts/export-art-packet.mts recipes.json /path/to/packets
node --import tsx scripts/export-art-packet.mts --check recipes.json /path/to/packets/bespoke-six-v1
python3 /path/to/artistic-transparent-vectors/scripts/batch_review.py /path/to/packets/bespoke-six-v1/batch.json --check
python3 /path/to/artistic-transparent-vectors/scripts/batch_review.py /path/to/packets/bespoke-six-v1/batch.json /path/to/review/bespoke-six-v1 /path/to/blog
```

No dependency installation is needed when the blog's locked dependencies are present. The adapter validates all recipes before creating a new packet, emits four resolved SVG surface variants per subject and hashes them. It rejects duplicate artwork IDs and refuses to overwrite an existing packet. batch.json is written last as the completion marker; if an I/O failure leaves an incomplete directory, inspect it and use a new revision rather than assuming completion.

The skill audits the static SVG subset, renders transparent PNGs and light/dark/checker review boards, and writes an additive asset index with visual review still pending. It does not approve artwork, register a study, upload to Space, publish, merge or deploy. Store the reviewed receipt and actual source commit with the packet before an authorized release. Do not label a raster fallback as SVG or replace real alpha with a painted background.

Before review and before delivery, run the repo adapter’s --check against the same source commit and recipes. It recomputes the expected packet from the registry and compares the full inventory, SVG bytes, embedded recipes, manifest and hashes. The generic factory alone checks SVG safety and rendering, not this repo-specific source binding. A later source change requires a new packet revision and review.
