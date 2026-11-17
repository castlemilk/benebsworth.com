# Ownership and integration boundary

## Owned scope

This lane owns the visual grammar for article illustrations: composition, material/line treatment, palette, scale, narrative figure semantics, three original raster studies, their separately authored vector counterparts, and the review packet.

Owned roots:

- `docs/design/editorial-illustration-language/`
- `public/artwork/editorial-illustration-v1/`

Initial artwork audit baseline: `e1c0f0a4c9ac4d7d189542e7c71abf274cc0977e`.
Validation/review base after a clean fast-forward: `06438f05c829a0df0d05e625e7adebec09eb895c`.
Branch: `art/blog-editorial-illustration-language-20261117`.

## Interfaces

| Owner | Retained responsibility | This packet supplies |
| --- | --- | --- |
| Subject motifs | Gap map, new topic subjects, category identity and proposed inventory | A drawing grammar; no topic or taxonomy additions |
| Marks and ornaments | Small annotation gestures, symbols and ornaments; existing logos retained | Rules for leaving labels/gestures outside artwork; no mark set |
| Application layouts | Article placement, sizing wrappers, components and runtime adoption | Intrinsic sizes, min-width guidance, alt/caption text and theme examples |
| Graph and Hardware | Source identity, relationships, console behaviour and skin | Nothing to the graph model or interface |
| Editorial components and motion | Workbench contracts, focus, state and animation | Static art only |

The subject-motif lane's published roots `docs/design/subject-motifs-20261117/` and `public/artwork/subject-motifs-v1/` are acknowledged as separate. An acknowledgement was posted to that owner's Space page on 17 November. Our ownership and handoff are posted in the shared workstream index.

All three sibling owners have now acknowledged the separate boundaries in comments on the editorial packet page. Their published pages were read and replies were posted on 17 November 2026:

| Sibling | Observed branch and exclusive roots | Coordination outcome |
| --- | --- | --- |
| Subject motifs | `art/blog-subject-motifs-20261117`; `docs/design/subject-motifs-20261117/`, `public/artwork/subject-motifs-v1/` | Reciprocal scope acknowledgement; their four subject proposals do not establish this lane's visual grammar |
| Marks and ornaments | `art/blog-marks-ornaments-v1`; `docs/design/marks-ornaments-v1/`, `public/artwork/marks-ornaments-v1/` | Reciprocal scope acknowledgement; exact existing host palette and type roles retained, no shared token proposal here |
| Applications | `design/blog-applications-20261117`; `docs/design/blog-applications-v1/` | Reciprocal scope acknowledgement and immutable-reference contract accepted; complete canvas, ID/revision, original hash, dimensions/alpha, role, minimum size, theme and provenance accompany use |

The application owner received the three frozen r2 file hashes, measured dimensions and alpha caveat before publication. Final commit and artifact references follow in the canonical Space receipt. These comments record coordination, not Ben's selection, scientific validation, browser acceptance or permission to merge/release. No shared repository file change is proposed.

## Protected source

Existing fifty category originals and their process records; the eight editorial raster originals; scientific article figures; all original category/technology marks; `lib/editorial-artwork/`; `lib/generative-svg/`; topic and Lab registries; graph/source work; Hardware/global styling; all active workbenches; shared DESIGN.md and agent instructions; deployment workflows and configuration.

Current open PR paths were checked before creation. The seven observed open PRs were #165, #158, #161, #160, #159, #144 and #141. None overlapped the two owned roots. Refresh owner state before a later integration; this record is a dated baseline.

Before validation, master advanced by merged PR #165 to `06438f05c829a0df0d05e625e7adebec09eb895c`, adding the source graph bridge in 28 files outside this lane. Its existing bytes were preserved in the review base. The refreshed open list contains #166, #159, #161, #160, #158, #144 and #141. PR #166 adds only `docs/design/AGENTS.md` and `docs/design/LEARNINGS.md`; those paths remain outside this packet.

## Handoff

Application adoption must be an explicit separate owner change. A future consumer may select the candidate master with contained sizing, visible caption and appropriate accessible text. Do not implicitly register these examples as category identities or expose SVG controls for raster originals.

The public GitHub review branch is publicly readable if pushed. Its `public/` files are source assets until a later authorized release; a draft PR does not make them private. No preview flag, permission, credential, security setting, merge, deployment or paid service is changed by this packet.

Canonical pages:

- [Editorial packet](https://chatgpt.com/space/page_dc643c9f8cb48191a407bc090e1c4472)
- [Workstream index](https://chatgpt.com/space/page_ba64e3a87b908191b185bdfc76e46171)
- [Subject-motif lane](https://chatgpt.com/space/page_f4d21b4bea7c8191859dfbdc4e638812)
- [Marks and ornaments lane](https://chatgpt.com/space/page_df0570dedde4819181f97a420191010d)
- [Application specimens lane](https://chatgpt.com/space/page_ad56196b849c81918ce72db91e4209d3)
