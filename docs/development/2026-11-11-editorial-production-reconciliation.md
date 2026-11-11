# Editorial production reconciliation — 11 November 2026

## Scope and authorization

The user reported that the blog had returned to the old UI and explicitly asked
to reconcile the work, merge it and deploy it. This release combines the existing
editorial uplift with the newer content and release controls on `master`.
The current authorization supersedes the earlier draft/no-production boundary
on [PR #78](https://github.com/castlemilk/benebsworth.com/pull/78) for this
reconciliation. It does not approve the separately held work listed below.

Owner: the current release-integration session. This is the pre-push source and
validation checkpoint; exact-revision remote CI, merge, deployment and live
acceptance are still pending.

## Source and integration boundary

- Repository: `castlemilk/benebsworth.com`.
- Integration branch: `reconcile/folio-release-20261111`; target: `master`.
- Editorial parent: `codex/gamma-blog-editorial-20261027` at
  `35563ae4bb6f453c312fc42a7c680a1f2204ca32`.
- Latest reviewed `master` parent: `fef0be322e860a10ad9ba5e0466206d8f2beb566`.
- Source review accounts for **97 published posts and 85 labs**, including
  **20 spatial science labs**. Asset preflight also examines unpublished source
  records, accounting for its larger total of 102 posts.

The uplift exists in the tracked editorial history. The reconciliation preserves
that presentation together with subsequent master work; it does not claim to
recover any historically unpublished predecessor patch.

Remote `master` advanced during validation. Its additional changes were reviewed:
the two-file artifact-tarball fix is retained from upstream byte-for-byte, with
no separate implementation variant.

The following PRs remain outside this release:

| Held PR | Scope and outstanding decision |
| --- | --- |
| [#95](https://github.com/castlemilk/benebsworth.com/pull/95) | About/Hiking photo journeys, including held manifest configuration. |
| [#99](https://github.com/castlemilk/benebsworth.com/pull/99) | Duplicate-photo guard based on #95; held on the public GPS/timestamps decision. |
| [#98](https://github.com/castlemilk/benebsworth.com/pull/98) | B-tree/LSM article refinement awaiting browser review. |
| [#134](https://github.com/castlemilk/benebsworth.com/pull/134) | New generative SVG study gallery awaiting browser review. |

## Semantic resolutions

- `app/lab/page.tsx` retains the field-notebook opening and experiment index,
  with master's expanded science metadata and category support.
- `app/lab/[slug]/page.tsx` keeps the shared notebook detail header and editorial
  controls. Spatial slugs render through `SpatialLab`; existing effects continue
  through `EffectPlayground`. Sending spatial slugs through the ordinary effect
  loader would leave them without their renderer.
- `lib/topics.ts` retains the approved custom topic symbols while adding the
  chemistry, biology and earth categories, the 20 spatial-article mappings and
  the USB-WiFi mapping. Existing category/filter identities are preserved.
- `components/mdx/mdx-components.tsx` combines the folio primitives and technical
  code/table renderers with `SpatialLab` and the USB-WiFi diagrams.
- Master's newer content, scientific implementations and release controls remain
  in the candidate alongside the editorial presentation. The master-derived
  `graphify-out/` artifacts were retained; they were **not freshly regenerated**
  for the reconciled source and are not evidence of current graph completeness.
- The upstream site-checks artifact-tarball fix is retained unchanged. It packages
  the review artifact as a tar archive to preserve filenames containing colons,
  without changing routes or site settings.

### Vector registry correction

Six gallery definitions pointed to absent files. The distributed-systems item
used the reversed stem `gossip-mesh`; the shipped manifest and assets use
`mesh-gossip`. The five RF definitions described different concepts from the
actual generated collection. The registry now uses the shipped identities and
matching metadata:

| Asset stem | Display name |
| --- | --- |
| `mesh-gossip` | Gossip Mesh Network |
| `qam-constellation` | QAM Constellation |
| `antenna-radiation` | Antenna Radiation Pattern |
| `logic-lattice` | Logic Gate Array |
| `rlc-resonance` | RLC Resonance Tank |
| `clock-eye-diagram` | Clock Jitter Eye Diagram |

The manifests and inspected RF contact sheet support these identities. No asset
was renamed, replaced or generated. The existing gallery remains **25 vectors in
five categories**, with five entries per category. This correction does not
include the held generative gallery in #134.

## Validation recorded so far

| Check | Recorded result |
| --- | --- |
| ESLint | Passed. |
| TypeScript | Passed. |
| Full Vitest run before the two new vector tests | **2,061 passed, 5 skipped**; **174 test files passed, 2 skipped**. |
| Later targeted `lib/vectors/registry.test.ts` run | **6 passed**. Includes two added regressions checking all 50 SVG/PNG files and all 25 manifest identities/order. |
| Node CI/control tests | **23 passed**. |
| Python publisher-control tests | **50 passed**. |
| Node release tests | **29 passed**. |
| Full `task build:clean` | Passed, including prebuild, static export and postbuild. Postprocessing scanned **592 HTML files**; Pagefind indexed **97 pages and 18,001 words**. The existing Open Graph NFT trace warning was the only build warning. |
| Generated Markdown siblings | Check passed for **97 published posts**. |
| Blog asset preflight | **102 posts, 127 assets, 0 errors, 21 legacy warnings**. |
| Export draft scrub | **3 draft directories removed from the export**; source content retained. |
| Changed-prose CI check | Passed after correcting one hard finding in the folio fixture: `demonstrates` changed to `shows`. |
| Playwright discovery | **108 E2E tests discovered; not executed locally**. |
| Scoped whitespace check for vector changes | Passed. |

The targeted vector result is separate from the earlier aggregate; these counts
must not be combined into an unexecuted full-suite total. The successful local
clean build preceded the one-word folio-fixture correction. The final source
therefore still requires an exact-revision build and E2E run in GitHub Actions.

Local Chromium installation failed on an invalid downloaded ZIP. Launching the
available system browser then failed with a socket `EPERM` error. Test discovery
is not an E2E pass, and source/build checks do not establish rendered acceptance.
Actual browser review, new visual-direction approval and physical-device coverage
are not claimed here.

## Production route and security

Actual production is **Cloudflare Pages project `benebsworth`**, serving
[benebsworth.com](https://benebsworth.com/). The release path is the manual
**Publish checked site** workflow in `.github/workflows/publish-site.yml`, using
the reviewed master revision and `task remote:check` / `task remote:publish`.
The Vercel workflows are not the production publisher.

The release security boundary is unchanged: manual dispatch, exact reviewed SHA,
reviewed ancestor baseline, explicit production confirmation and the existing
`Production` environment remain required. Production secrets remain confined to
the publisher. No credential, audience, public photo-data, DNS, infrastructure or
security-header change is part of this reconciliation.

## Remaining evidence

The next gate is GitHub Actions on the pushed integration revision: build the
final source through all three phases, run built-site E2E, and inspect the review
artifact. Keep final CI, merge and release receipts on
[PR #78](https://github.com/castlemilk/benebsworth.com/pull/78), including the exact
tested revision, workflow results, manual Cloudflare publication run, deployed
revision and live route/asset verification. No remote check, merge, publication
or live-verification outcome is established by this pre-push checkpoint.

References: [durable checkpoint convention](../../.agents/skills/blog-development/references/checkpoint.md),
[Cloudflare deployment runbook](../../.claude/skills/deploying-the-site/SKILL.md),
[earlier blog checkpoint](blog-loop-checkpoint.md), and
[Labs notebook review](lab-notebook-review.md).
