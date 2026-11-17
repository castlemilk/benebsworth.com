# Source and ownership audit

Read on 17 November 2026, Australia/Melbourne. This record describes the source and pixels actually inspected; it does not promote archived concepts to current production behavior.

## Current repository

- Repository: [castlemilk/benebsworth.com](https://github.com/castlemilk/benebsworth.com)
- Default branch: `master`
- Baseline commit: `e1c0f0a4c9ac4d7d189542e7c71abf274cc0977e`
- Tree: `786dcd639c0688d68035ad73698f0d85ba551a0c`
- [PR164](https://github.com/castlemilk/benebsworth.com/pull/164) is merged; it preserves the five category-source batches. The selected-originals manifest contains 50 records, ten per batch. Batch04’s later generation receipts remain explicitly incomplete.
- Existing graph/Hardware work is represented by merged [PR162](https://github.com/castlemilk/benebsworth.com/pull/162) and [PR163](https://github.com/castlemilk/benebsworth.com/pull/163). This packet has no application imports.

The exact baseline root `AGENTS.md` keeps the editorial shell outside the knowledge console’s Hardware wrapper. No nested `AGENTS.md` or CODEOWNERS file was present in the complete inspected tree. The proposed two output directories were absent.

| Source at baseline | Observed contract |
| --- | --- |
| `docs/type-system.md` | Source Serif 4 reading/headings; Barlow Condensed labels; Caveat short annotations, at most two handwritten notes per viewport; JetBrains Mono exact data; Hanken Grotesk dense controls. Space Grotesk is retired. |
| `app/globals.css` | Light paper `#f4f1e9`, ink `#202c34`, muted `#56616b`; dark paper `#111312`, ink `#ecebe6`, muted `#9a9d98`. |
| `app/editorial.css` | Annotation token `--folio-handwriting`: `#b32624` light, `#ffaaa5` dark. Red is editorial annotation, independent of scientific diagram ink. |
| `components/mdx/annotation-marks.tsx` | Existing arrow, underline, bracket and circle; decorative SVG, currentColor, 1.7-unit non-scaling strokes. |
| `components/mdx/annotation-geometry.ts` | Existing deterministic Rough.js paths and measured note/target connectors. |
| `components/ui/callout-ink-icon.tsx` | Seven existing icons: bulb, brain, warning triangle, checked/crossed circles, heart and hammer. |
| `components/ui/insight-focus-rail.tsx` | Protected continuous curved hook/rail with a terminal dot. |
| `components/mdx/post-patterns.tsx` | EvidenceNote requires explicit measured/simulated/illustrative/interpretation basis; visible labels carry the meaning. |

All source links can be resolved against [the exact baseline tree](https://github.com/castlemilk/benebsworth.com/tree/e1c0f0a4c9ac4d7d189542e7c71abf274cc0977e). The source audit found no reason to change these files.

## Active lane boundaries at initial audit

| PR | Observed head | Preserve |
| --- | --- | --- |
| 165 | `76913a33b353c3825aa5f1323564456354b1f4ff` | Source graph bridge, identity/provenance contracts, no runtime activation |
| 161 | `f7dd7e57861891ccb81a7c9fb08467a555999190` | Knowledge views prototype |
| 160 | `903f7503236fc16855ce2dbfb8049592e902a617` | Motion workbench |
| 159 | `ee911f9502497cb61667530467023beb565e5a4f` | Editorial components and presentation contracts |
| 158 | `85eda8e00d4f2408aef841144bbae5a3a01f6713` | Earlier graph-model proposal |

PR159’s inspected contract forbids a second connector system. Its actual source contexts are Source recorded / Not yet checked / Source unavailable / Locator missing. They describe availability or review context, not evidence validity. This art packet preserves both boundaries.

### Concurrent update observed during delivery

Master advanced to `06438f05c829a0df0d05e625e7adebec09eb895c` while this packet was being checked. PR165 merged a separate source graph bridge: all 28 changed paths are within `docs/knowledge/`, `lib/knowledge-source/` or its two export scripts. None overlaps this packet or its inspected palette/component sources. Our review baseline remains pinned and the independent branch does not undo that merge.

Open PR166, `e90f22845f9256148ac86678b3af9d061909000a`, proposes `docs/design/AGENTS.md` and `LEARNINGS.md`. Both were read before delivery. Their preservation, dated-evidence, public-branch and release distinctions are consistent with this packet. They were not copied, rewritten or represented as already merged at that read.

### New art-lane coordination

| Owner | Observed exclusive paths | Receipt |
| --- | --- | --- |
| Editorial illustration | `docs/design/editorial-illustration-language/`, `public/artwork/editorial-illustration-v1/` | [Editorial child](https://chatgpt.com/space/page_dc643c9f8cb48191a407bc090e1c4472); both owners acknowledged separate paths, exact host palette and existing type roles. |
| Additional subject motifs | `docs/design/subject-motifs-20261117/`, `public/artwork/subject-motifs-v1/` | [Motif child](https://chatgpt.com/space/page_f4d21b4bea7c8191859dfbdc4e638812); owner acknowledged separation and exact receiving palette on the index. |
| Applications | `docs/design/blog-applications-v1/` | [Applications child](https://chatgpt.com/space/page_ad56196b849c81918ce72db91e4209d3); owner acknowledged separation; marks owner accepted stable ID/revision, source/hash, optical size, alpha, role/caveat and theme-reference fields. |

The live coordination thread is `7a8c3cd0-4c73-56be-b4a4-bc268a5111a3` on the index; the applications reference thread is `a1481b43-ec3b-5e85-8b05-e469eabfbdd6`; reciprocal editorial acknowledgement is in thread `0ccfd23b-11ed-52f6-9e35-f5e4b3106a00` on the editorial child. All three owners have now acknowledged the bounded scope/reference contract. No shared file is changed and no integration, taste selection or release approval is inferred.

## Canonical design context read

- [Ben Ebsworth blog](https://chatgpt.com/space/page_6adc74403d50819193fb9b2d0681ea64)
- [Workstream index](https://chatgpt.com/space/page_ba64e3a87b908191b185bdfc76e46171)
- [Vision and editorial direction](https://chatgpt.com/space/page_603abeb71d94819183689e7437bb7730)
- [Assets and source collections](https://chatgpt.com/space/page_1fee1499adac81918ded352c7cc5ffc4)
- [Components, typography and handwritten notes](https://chatgpt.com/space/page_47a9ae7ffb108191b4cefebcd1fe56ad)

The selected blog/lab direction is the open-margin research folio with serif reading, graphite, warm surfaces and restrained red annotation. About remains clean and professional; Hiking retains its natural identity; the knowledge console retains its separate Hardware skin.

## Pixels actually inspected

| Reference | SHA-256 | What was observed |
| --- | --- | --- |
| Archived actual RLC insight capture, light, from component Page | `ccb2275b4cf4f8480527367cb95e2d8cf7af24be3ae2838ac4df84ad7c0094eb` | Open reading surface; red brain; curved hook, continuous rail, terminal dot; Caveat heading; serif body. |
| Archived actual callout capture, dark, from component Page | `62ed8ecd5b0840df880cd52ed97c4aef4ffc21bace148a38e364fd8e15bcd4b7` | Pale-red annotation; retained callout labels; transparent reading context. |
| Archived technical-symbol board, from component Page | `250ab790e1b319a1b28edde27fba10e5b600ee5748b03ce345d950d3a1f86fdc` | Twelve proposed 24-unit symbols plus four gestures. Source is a chain link; observation an eye; calibration graduated ticks; figure a framed mountain; annotation a return arrow. All are reserved rather than regenerated. |
| Reciprocal Span historical brand reference, from beneb asset family | `3c6408fd76cd8ebd776ed70b95ec42558aa4e53b634488eba4e2fa3d3adb64d7` | Unequal opposing masses and an open interval. Used only as context for restraint and negative space; no geometry copied and no logo work performed. |

The first two references are historical captured states, not new live-browser checks. The technical-symbol board is an archived proposed kit, not proof of current runtime adoption. Its linked ZIP was identified as 13,509 bytes but could not be materialized through the available Library route; the exact source coordinates and separate tiny-size master renders were unavailable. No opaque identifier was decoded or guessed. The visible board suffices to reserve its silhouettes without claiming source-level equivalence checks.

## Skill use and provenance

The beneb-design-direction skill supplied restraint, clear contour/interval principles and the distinction between user preference and assistant recommendations. The blog’s explicit current folio direction governs the packet; logo-series preferences were not imported as new blog requirements.

The artistic-transparent-vectors skill supplied the editable-geometry, semantic-integrity, actual-alpha, palette-invariant and render-review workflow. Its conservative static SVG audit was run unchanged. The exact tool hash and results are recorded in validation, not inferred from valid XML.

No original reference image, third-party logo, archived component icon, category art or protected source figure was embedded or traced into these masters. This packet records original authored vector geometry; it adds no new scientific claim or rights assertion over references.
