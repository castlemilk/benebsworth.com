# Build milestones and acceptance

These are implementation briefs, not published issues. Ben can take them in order, splitting work across owners after checking the repository's current state. The foundation is deliberately isolated from existing blog, hiking, knowledge and vector systems.

## A. Import real assets and expose a validated catalogue

**Priority: first.** Add a typed Art adapter and a bounded importer/delivery manifest using the existing tooling. Input is the supplied eight-work JSON plus actual original PNGs. The user-facing goal is reliable images with preserved prompts and version history.

Acceptance:

- All eight stable work IDs, nine render identities, exact prompt strings and the v1 → v2 ocean relationship survive the import. The selected ocean remains v2.
- Recover each source by matching its recorded SHA-256, dimensions and byte count. Missing or changed source bytes fail clearly; the importer does not regenerate a replacement under the same identity.
- Decode actual originals, preserve them byte-for-byte, and record preview transforms separately. A second unchanged run has no source mutations. Run `node scripts/validate-art-catalogue.mjs --assets` after import.
- The registry rejects invalid data. It exposes a compact published-card projection and a separate detail record. Test that drafts, prompts, private fields and unimported images cannot leak through the public projection.
- Publication selection alone cannot turn files in a public directory into private drafts. The emitted export contains only the deliberately included assets; inspect the export manifest.
- No existing original assets, recovered source packets, SVG hashes or route identities are changed.

Dependency: actual image bytes. The current branch has measured receipts and exact prompts, but intentionally no PNG imports. The nine filenames from a transient generation workspace are not a durable asset service. If the bytes are unavailable in the next build environment, request the source collection or a fresh export and match by hash.

## B. Build the gallery and artwork detail pages

**Priority: first, after A.** Implement `/art/` and `/art/[slug]/` using the page composition and controls in [IMPLEMENTATION.md](IMPLEMENTATION.md). Use real images, including portrait Horizon, wide Seas, planetary Summer and the populated Assembly scene. Keep the artwork visually dominant.

Acceptance:

- At desktop and phone widths, the whole composition remains visible and every card has its correct selected image, title and alt text. The eight works remain eight entries despite nine renders.
- Subject, style, aesthetic, collection and creative-route filters intersect correctly. Search handles case/punctuation and retains the submitted query. URL and browser history restore the chosen state. Empty/invalid filter combinations have a clear reset.
- The exported site supports query handling through client enhancement, with no request-time server dependency. Without JavaScript, the published catalogue, detail links, selected image, text notes and prompt history remain available, and interactive filtering/comparison is honestly described as unavailable.
- Exact prompts and copy actions preserve the canonical string, including newlines. Verify the original prompt and edit instruction separately. Simulate clipboard denial and confirm the selectable fallback remains available.
- Version switching changes image, alt, review, annotations and download together without mutating the selected version. Opening v1 directly works; an unknown version has an explicit recovery state. Notes are never silently borrowed from another render.
- Image failures leave useful text and links. Full-image viewing, close/return focus and navigation work with keyboard alone. No horizontal page overflow at 360 px or 200% zoom.
- Metadata and prompt downloads are generated from the same public record, use safe filenames and contain no private storage references. Original download bytes match their recorded digest.
- Navigation, sitemap and site search contain only real published routes. Default search indexes curated discovery metadata, not exact prompts or negative caveats as if they described capabilities.
- Capture the actual gallery and detail at desktop and phone widths. Record one concrete design improvement made after viewing them. A proposed wireframe or source-only test is not rendered evidence.

Dependency: A. Reuse the normal editorial shell; root `AGENTS.md` keeps Hardware confined to the knowledge console. Future UI work should follow the installed `review-ui-with-real-data` skill and the site's current design guidance.

## C. Make annotations and revision comparisons useful

**Priority: next.** Add a readable annotation list, optional verified region markers and a two-version comparison. The list can ship with B; regional editing can wait.

Acceptance:

- All 24 initial notes are useful unpositioned text. No markers appear for `region: null`.
- Every positioned annotation is tied to an exact render/version, lies inside the complete image and maps correctly through contained resizing and letterboxing. Test a non-square image and a changed viewport.
- An observed note and an interpretation have visibly and accessibly distinct labels. The fictional world premise is not presented as a measurement or simulation result.
- Selecting a marker and selecting its list entry show the same note. Keyboard users can access all information without hover; focus is never lost behind a disclosure or image overlay.
- Comparing Seas shows the actual v1 and v2, clear labels and the selection reason. It preserves whole images on mobile and announces changes without an animated reveal being required.
- New revisions do not inherit coordinates blindly. The old notes remain attached to the old bytes.

Dependency: B. Region authoring needs pixel inspection; the current study did not record coordinates.

## D. Add an authoring interface when needed

**Priority: later.** Start from a demonstrated need to edit records outside Git. Reuse the canonical contract, but choose a persistence and authentication design explicitly rather than silently extending the hiking store.

Acceptance:

- A work editor exposes title, summary, fictional premise, separate style/aesthetic tags, other facets, selected version, exact immutable prompt history and review notes.
- **Save draft** reports actual persistence success or a recoverable error. A revision conflict offers compare/reload/export without destroying unsaved work. A local preview is labelled as such.
- Adding a render requires actual output bytes and an exact used prompt; a prompt draft stays a concept until generation succeeds. Edits identify their real input version.
- Publication requires complete public records and validated assets. Public export never includes private notes or unpublished image URLs. Rights/credit are explicit fields; unknown values are not silently filled.
- Image generation is an optional separate future integration with its own actual tool support, cost/latency feedback, cancel/failure handling and authorization. There is no invented API, automatic spend or deterministic seed promise in this handoff.

Dependency: B and a reviewed write-service decision. No new storage, IAM, credential or deployment configuration is included here.

## Current foundation checks

The supplied validator and standalone tests cover structural fields, IDs, edit-parent order, selected versions, annotation references and bounds, draft/imported distinctions, safe local paths, null unknown metadata and original byte/hash/header receipts. They do not authenticate historical generation claims, perform a full PNG decode, review artwork quality, render a page, establish rights or authorize deployment.

Run from the repository root:

```bash
node --check scripts/validate-art-catalogue.mjs
node scripts/validate-art-catalogue.mjs
node scripts/validate-art-catalogue.mjs --assets
node --test scripts/tests/validate-art-catalogue.test.mjs
git diff --check
```

At this foundation stage the expected asset output is **0 imported, 9 not imported**. That is a truthful availability result, not an asset-import pass. The test fixtures use a tiny synthetic/example PNG to test receipt failures; they are not substitute gallery artwork.

The validator deliberately supports the keywords used by the checked-in JSON Schema, not arbitrary JSON Schema extensions. Changing the schema requires updating and testing that implementation or adopting an explicitly reviewed full validator. Source prompts were independently compared to the actual generation ledger during preparation; future prompt edits require review because merely labelling a string `exact-used` cannot prove its history.

## Evidence and release receipt for the next builder

Record the exact source commit, commands and results, imported/delivered asset counts, source and derivative hashes, actual browser states checked, screenshots, remaining gaps and the final branch/PR. A local check, remote CI, browser review and live deployment are separate evidence categories. Run the relevant existing site gates when runtime code is added; do not replace them with this small content suite.

Before a future push or release, recheck the existing preview/publishing conditions. The foundation work observed the legacy preview opt-in disabled on 19 November 2026 without changing it. A successful feature-branch push does not claim `/art/` is live. Preserve the existing release owner's merge/deploy authority and the separate reference-source custody boundaries.
