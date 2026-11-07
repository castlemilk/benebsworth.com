# Hiking photo return-focus review

## Scope and ownership

One bounded continuation of the 6 November blog cycle: restore focus to the photograph that opened the viewer after responsive rows regroup. Owner: the current blog implementation session. Dropshippr and poster work remain separate; no second blog implementation or browser owner was started.

- Baseline: `d453c8c65bf2b0c01527d04e1b14553d354a4c63`.
- Local branch: `fix/hiking-opener-identity-20261106`.
- Existing PR: https://github.com/castlemilk/benebsworth.com/pull/95, base `codex/gamma-blog-editorial-20261027`.
- Baseline tree: `201b3107e85051745a83f746f6e8ef73d2519640`. A complete public Git fetch recovered this tree; the older checkout was not reset.
- PR95 remains draft, unmerged and undeployed. This new fix is local only. The public gallery configuration/data decision remains unresolved; no policy, credentials, data exposure, release path or sharing change is included.
- Canonical backlog: https://chatgpt.com/space/page_8d9cfc951e9081918a9b9e720f19cb92. Existing access hold was respected, not retried. This repository checkpoint preserves the current cycle.

## Backlog reconciliation

- **Done locally:** preserve opener identity after row remount. Impact high for keyboard continuity; effort small. Dependency: existing gallery and viewer. Acceptance: ordinary Close, Escape and backdrop return to the opening photo after responsive regroup; navigating elsewhere in the viewer does not change the return target; filters and removed photos retain the heading fallback; map handoff is not overridden. Evidence below.
- **Blocked:** PR95 gallery rollout. The existing empty public environment leaves the requested photo workflow unavailable. A separately approved, safely scoped gallery-data/configuration decision and verified release checks are still required. No new decision was inferred from general encouragement.
- No speculative new backlog items were added. This resumes a previously recorded eligible item rather than adding another parallel feature. Blog received this bounded turn following the explicit continuation request; Dropshippr/poster priority is unchanged.

## Reproduction and correction

1. On baseline source, open photo 3 at a desktop width, resize to regroup justified rows, then close. Its original button is detached; the old viewer falls back to the Gallery heading. Browser reproduction: 1180 → 556 CSS pixels. Six of the first eight regression cases failed before the fix.
2. Capture the opening URL on activation and resolve it only inside the original gallery result container. This works even when a pointer click did not focus its tile. Do not substitute the currently viewed index or search another filter session.
3. A second real browser case exposed a later remount: at a 514px window, scroll lock gives the gallery 466px and three photos per row; unlocking restores a scrollbar, reduces it to 456px and two per row. Immediate focus restoration was lost to BODY. The corrected path measures the unlocked width and restores focus after React commits the new rows.
4. Independent read-only review found StrictMode effect replay and fractional ResizeObserver precision edges. The restoration now skips a still-rendered viewer and both measurement paths use clientWidth. Dedicated tests cover both.
5. Existing map handoff still suppresses opener restoration. Filter replacement or removal of the opening photo returns to the Gallery heading. No timers, global URL query, new overlay, styling or layout redesign was added.

## Functional verification

- Focused Hiking suite: **120 passed**, including **14 new opener regression cases**. No focused skips.
- TypeScript and scoped ESLint passed. Independent final source review found no remaining blocker.
- Final single-worker aggregate: **2,024 passed, 5 skipped**, across 167 passing and 2 skipped test files; 96.65 seconds. Skipped tests are not counted as passes.
- Browser uses the real HikeGallery component and repository styles in a clearly labelled, synthetic 18-item fixture. All items reuse one existing repository cover with distinct fixture URLs. No public manifest, precise location or capture-time data is loaded.
- Confirmed desktop/narrow regroup return, navigation away from the opener, repeated reopening, Close and Escape, settled scrollbar-edge focus, and Tab proceeding from photo 3 to photo 4. Final-source 514px light/dark and 343px compact dark checks return to the opening photo after navigating to photo 18.
- The 343px state is desktop Chromium at browser zoom, not a physical touch-device run. Earlier development checks also covered 1180px and 400px; their screenshots are not used as final-source captures.

### Build status, separate from behavior

- Lockfile install succeeded with lifecycle scripts disabled and an isolated cache. No dependency or lockfile changes.
- Bounded clean-environment validation used one temporary Next worker and a 1 GiB Node heap. The temporary config was restored byte-for-byte.
- Prebuild equivalents succeeded: 76 Markdown siblings, 269 benchmark JSON outputs / 183 HTML artifacts, and harness generation retaining the existing 12-model history. The benchmark generator ran directly under Node's native TypeScript support, as documented in the repository recovery guide, rather than retrying the unavailable IPC launcher.
- **Next production build failed before export** because it could not connect to Google Fonts for Hanken Grotesk, JetBrains Mono and Space Grotesk. No font replacement, alternate network path or permission change was attempted. OG rewrite and Pagefind did not run on this candidate. A full rebuild is not claimed.
- The local component fixture did compile successfully. That is not a production build or deployed gallery acceptance.

## Actual captures

These are interaction-fixture screenshots, not mockups or live production pages. The repeated photograph is deliberate fixture content, not a gallery catalogue claim.

- [Before: focus falls back to heading](photo-opener-evidence/before-focus.png), 556 × 757, light, baseline source.
- [After: opening photo receives focus](photo-opener-evidence/after-light-focus.png), 514 × 757, light, final source.
- [After: dark return after navigation](photo-opener-evidence/after-dark-focus.png), 514 × 757, dark, final source.
- [After: compact return](photo-opener-evidence/after-compact-focus.png), 343 × 505 CSS viewport, dark, final source.

The before/after viewport widths differ to capture both verified failure mechanisms; these are not pixel-difference comparisons. The observed DOM focus result, not image appearance alone, establishes keyboard behavior.

Reproduce the fixture with `node prototypes/photo-opener-identity/build-preview.mjs <separate-output-directory>` after installing the committed lockfile. Serve the generated `out` directory through the supported managed preview. Open photo 3, change width or use 514px with classic scrollbars, navigate to photo 18, then Escape. Inspect the focused opening tile and continue with Tab.

## Five distinct manual critique lenses

These are manual reviews, not executed Hallmark/design-taste/gpt-taste binaries. Available frontend-design and Impeccable guidance was read; the Impeccable context launcher was unavailable and did not run. No installer or unknown hook was used.

1. **design-taste-frontend:** the viewer's large photograph and persistent Close remain the primary hierarchy. The defect was loss of context on return, not an invitation to add UI. Correction: retain the photograph as the return point. The gallery-to-viewer-to-gallery journey was reviewed; whole live product-page composition remains outside this fixture's acceptance.
2. **gpt-taste:** no new card, badge, explanatory box or redundant control is needed. The existing image-led Hiking identity is retained. Correction: behavior only, with no decorative replacement. Screenshot review confirms unchanged controls and artwork treatment.
3. **frontend-design:** responsive justified rows genuinely change parents, and scrollbar width can cross another row boundary. Correction: make focus resilient to the rendered layout rather than assuming desktop DOM identity. Final 514px light/dark and compact 343px states retain readable thumbnails and visible keyboard focus.
4. **Impeccable:** high-severity keyboard continuity failure was reproduced and corrected. Close, Escape, backdrop, StrictMode, pointer activation, filter replacement, removed assets and fractional width are covered. Browser verification includes settled focus and the next Tab destination; unit tests separately protect map handoff and nested search behavior. No physical-device or screen-reader run is claimed.
5. **Hallmark:** preserve the established forest/stone Hiking treatment and its existing focus-ring accent. The fix changes no typography, crop rules, icon geometry, About design or handwritten Blog/Lab direction. Visual acceptance is limited to the real-component fixture; the held production gallery is not visually accepted by proxy.

## Evidence identity and next step

- Final application file SHA-256: `9ac97ef75339f62291c344874db9d336e5772e35062a1a3a1d3adf0cb6df4706`.
- Final regression file SHA-256: `f2af9430912528df6ed4530f2024731366e96463975d623b6e8d878f8b8b23ed`.
- No image original was generated or replaced. Existing photo data and private runtime inventory are not included in the change.
- Next: preserve the local checkpoint, obtain a successful exact-source production build in the authorized environment, and resolve the existing gallery-data decision before any release. No push, merge, deployment or live-source verification occurred in this cycle.
