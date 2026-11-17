# Editorial illustration language

Three article-scale visual studies and a reusable art-direction brief for the blog's research folio. This is a review packet; it does not add a category, register a gallery entry, change an application layout or publish a release.

## Read and review

- [Art direction](ART-DIRECTION.md): composition, material, line, palette, scale and narrative semantics.
- [Reusable brief](BRIEF-TEMPLATE.md): commission a new illustration from an article's actual argument.
- [Provenance](PROVENANCE.md): original inputs, revisions, rights status and fidelity.
- [Coordination](COORDINATION.md): owned paths and interfaces with the other art strands.
- [Review report](review/REPORT.md): measured bounds, alpha, actual inspected sizes and limitations.
- [Verification and publication status](VERIFICATION.md): successful artifact/build checks, incomplete unit run and the exact normal pre-push blocker.
- [Machine-readable manifest](manifest.json): assets, exact prompts, dimensions and SHA-256 hashes.
- [Generation receipts](generation-receipts.json): six returned output identities and unchanged-copy verification.
- [Independent art review](review/INDEPENDENT-ART-REVIEW.md): separate visual, semantic and file-identity assessment.
- [Vector source](vector-source/): independently authored editable counterparts and their validation.
- [Review PDF](editorial-illustration-language.pdf): concise visual reading copy.

## Specimens

| Stable ID | Title | Visible relationship | Intended role |
| --- | --- | --- | --- |
| EL01 | Expose the interface | Unequal stepped pieces separated at a visible contact boundary | Article opener or section transition about interfaces, dependencies and assumptions |
| EL02 | Look inside the boundary | An invented shell with an exposed interior and displaced side section | An essay introducing hidden structure or explanatory layers |
| EL03 | From trace to structure | A continuous ribbon rises through folds into an open arch | An essay about developing an argument or turning a loose process into structure |

These are illustrative constructions. None supplies measured geometry, empirical evidence, a named biological structure, a functional mechanism, a topology proof or physically validated origami.

Three raster concepts were generated once, then each received one framing correction. The first three PNGs remain unchanged in `process/r1/`; the three selected delivery candidates are r2, unchanged from the image-generation return. “Selected delivery candidate” is an assistant review decision; Ben has not rated or approved these images.

Three separately authored SVG counterparts demonstrate the same narrative grammar. Their light, dark and monochrome palettes are variants, not additional concepts. They are not traces or exact reconstructions of the raster artwork.

## Source and ownership

Repository: [castlemilk/benebsworth.com](https://github.com/castlemilk/benebsworth.com). Initial artwork audit baseline: `e1c0f0a4c9ac4d7d189542e7c71abf274cc0977e` on the actual default branch `master`. Before validation, the isolated branch was advanced to current master `06438f05c829a0df0d05e625e7adebec09eb895c`, preserving the newly merged graph source bridge without changing it. Review branch: `art/blog-editorial-illustration-language-20261117`.

Only these new roots belong to the packet:

- `docs/design/editorial-illustration-language/`
- `public/artwork/editorial-illustration-v1/`

[Dedicated review page](https://chatgpt.com/space/page_dc643c9f8cb48191a407bc090e1c4472) · [Canonical design Space](https://chatgpt.com/space/page_6adc74403d50819193fb9b2d0681ea64) · [Workstream index](https://chatgpt.com/space/page_ba64e3a87b908191b185bdfc76e46171)

Runtime adoption, native-browser acceptance, preview enablement, merge and deployment remain separate owner actions. Existing holds stay in force.

## Verify the packet

From the repository root, `sha256sum -c docs/design/editorial-illustration-language/SHA256SUMS` checks every packet file except the checksum file itself. The original PNG hashes and vector source records are also recorded separately in their manifests. The external delivery receipt records the exact commit/tree, binary patch and archive identities after they exist.
