# Registry audit and reuse boundary

This audit supports the isolated BLOG DESIGN 03 component workbench. Its source baseline is [`1121edc4ae6ac8de415b5395d8fadc11450fc55f`](https://github.com/castlemilk/benebsworth.com/tree/1121edc4ae6ac8de415b5395d8fadc11450fc55f), read on 17 November 2026. It does not describe the concurrent unpublished Mac checkout or establish browser acceptance or deployment.

The audit read `DESIGN.md`, `docs/design/VISUAL-REVIEW.md`, `CLAUDE.md`, `.agents/skills/blog-development/SKILL.md`, the existing MDX family inventory and the actual registries below. No root `AGENTS.md` exists at this source revision. The current user brief governs the isolated branch and publication scope.

## Actual inventory

| Source | Count at the pinned revision | Meaning and limits |
| --- | --- | --- |
| `components/mdx/mdx-components.tsx` | **100 custom names**, plus **8 native HTML mappings** | The historical coverage document's 96 is no longer the current count. |
| `components/gamma/` | **3 maintained React controls** | `GammaButton`, `RangeSlider`, `ActionMenu`; portable CSS and recorded provenance accompany them. |
| `components/ui/` | **7 source TSX files** | Button, Card, Badge, Separator, Callout, CalloutInkIcon and InsightFocusRail; the last two support the callout system. This is a file inventory, not seven independent registry packages. |
| `components.json` | **0 configured external registries** | `registries` is `{}`; shadcn style is `base-nova`, with `rsc: true`, `tsx: true` and `lucide` icons. This does not establish a SPEC-01 installation. |
| `lib/topics.ts` | **20 topic keys** | Six keys use the selected `public/topics/custom-v6/` symbols. They are an artwork subset. |
| `lib/lab/registry.ts` and `lib/lab/spatial/catalog.ts` | **9 category keys**, **85 unique Lab entries** | 65 direct entries plus 20 spatial entries. Five entries are explicitly classified as concept guides, leaving 80 demo entries. This is registry metadata, not a count of every manually authored Lab route. |
| `lib/generative-svg/model.ts` and its imported study arrays | **52 unique SVG studies**, **6 category labels** | These are the tunable studies, separate from the fixed Grounded artwork collection. |

The four additions beyond the older 96-name MDX inventory are `SpatialLab`, `UsbIdentityChain`, `DriverLayerStack` and `BringupTimeline`. The current native mappings are `pre`, `table`, `h2`, `h3`, `p`, `a`, `ul` and `code`. `Video` and `GithubLink` are custom registered names. `TechnicalPre` and `TechnicalTable` supply the native `pre` and `table` mappings; a generated board is not evidence for a separate named citation API.

The existing seven-family inventory remains useful: reading/evidence, technical prose, interactive studies, reading/discovery, figures/media, adaptation/recovery and the separate trail family. BLOG DESIGN 03 extends discovery controls and presentation contracts; it does not migrate the scientific renderers or TrailKit.

### Preserve the category vocabularies

Blog topic keys in `lib/topics.ts`:

`kubernetes`, `istio`, `tekton`, `kustomize`, `minikube`, `gcp`, `react`, `algorithms`, `general`, `technology`, `ai`, `maths`, `physics`, `software`, `ee`, `cosmology`, `chemistry`, `biology`, `earth`, `hiking`.

Lab category keys in `lib/lab/registry.ts`:

`art`, `maths`, `physics`, `chemistry`, `biology`, `earth`, `engineering`, `ai`, `cosmology`.

SVG study category labels in `lib/generative-svg/registry.ts`:

`Mathematics`, `Algorithms`, `Physics`, `Electronics`, `Distributed systems`, `Illustration`.

These are three authored vocabularies, not one normalized taxonomy. A control must accept the owner's category records rather than hard-code six choices. Keep `ee`, `engineering` and `Electronics` distinguishable in the adapter. A shared icon or overlapping label does not establish scientific equivalence. Existing `components/lab/category-icon.tsx` maps four Lab categories to custom marks and uses its caller's fallback glyph for the others; `components/blog/topic-marker.tsx` preserves original technology raster colours and uses theme ink for custom masks. Both require a visible text label beside the decorative glyph.

## Reuse decisions

| Existing source | Useful reuse | Boundary for this workbench |
| --- | --- | --- |
| `components/gamma/GammaButton.tsx` | Native action button, quiet/secondary/primary variants, loading and disabled semantics | Pass `type="button"` for local actions. `loading` sets `aria-busy` and disables activation; it does not implement an asynchronous operation. Keep source and shared CSS unchanged. |
| `components/gamma/RangeSlider.tsx` | Native range, visible label/output, bounds, formatted value and controlled callback | Suitable only where a real numeric setting changes. Use explicit units. Do not draw a decorative knob that cannot alter the sample. |
| `components/gamma/ActionMenu.tsx` | Controlled or local open state; menu-button arrow/Home/End/Escape/Tab path and focus return | Shortcut text is display-only. Async feedback belongs outside the closing menu. A graph inspector or route chooser is not automatically an action menu. |
| `components/blog/reading-entry.tsx` | Real published-article metadata and destination row, caller-selected `h2`/`h3` depth | `ReadingEntry` wraps the entire entry in `Link`; do not nest an Inspect button or source link inside it. For a multi-action entity, compose sibling controls around a separate heading/link. |
| `components/blog/folio-entry.tsx` | Open ruled `article` surface | It owns appearance, not navigation. Its caller supplies the accent and actual content. Avoid treating every inspector section as a new boxed card. |
| `components/blog/blog-filter.tsx`, `components/lab/category-nav.tsx` | Controlled search/filter pattern, `aria-pressed`, Clear returning focus to search | Their IDs are route-specific (`archive-search`, `archive-index`, `lab-search`). Do not mount repeated copies as generic specimens. A new workbench filter adapter needs instance-unique IDs and must leave URL/history ownership with the graph views lane. |
| `components/mdx/research-folio.tsx`, `post-patterns.tsx` | Selectable `FieldNote`, `Assumptions`, `FigureFocus`; declared evidence basis and limitations | `EvidenceNote` describes evidence basis, not source availability or review status. Do not infer `measured`, `reviewed` or `verified` from the presence of a link. |
| `components/mdx/annotated-block.tsx`, `annotation-layout.tsx`, `hand-underline.tsx` | Matched target/note, measured connector and wrapped-text underline | `AnnotatedBlock` requires one matching target and note; its authored target ID must match `/^[A-Za-z][\w-]*$/`. Opaque graph IDs containing `:` need a separate valid DOM ID. Decorative SVG is hidden from assistive technology; text and target links remain usable. |
| `components/blog/table-of-contents.tsx`, `mobile-toc.tsx` and article navigation context | Existing native links/disclosure and actual-heading tracking | Preserve their consuming-article ownership. The workbench navigation is its own named landmark; it must not claim to replace site navigation or article history. |

`app/globals.css` already imports Gamma controls and `app/editorial.css`. The latter defines the local font faces `Folio Serif` (Source Serif 4), `Folio Condensed` (Barlow Condensed) and `Folio Hand` (Caveat), together with the reading annotation rules. The new workbench should consume these fonts and scoped adapters without adding imports to the global stylesheet or rewriting its tokens.

The pinned `package.json` contains no `@ui-sdk` dependency. This says nothing about the explicitly owned unpublished UI SDK work. Do not install a competing UI SDK, replace `components/ui/`, or take ownership of that integration because it is absent from this clean baseline.

### Gamma provenance

`components/gamma/PROVENANCE.md` records authenticated MCP retrieval on 27–28 October 2026 and snapshot hashes for the three controls and their styles. No upstream commit identifier was supplied. Those records support reuse of the checked-in snapshots, not a claim that the current MCP catalogue was retrieved or that this workbench has passed Gamma validation. The live MCP guidance outcome belongs in the workbench's separate verification receipt.

## Source-backed fixture packet

These records are suitable for local component specimens. URLs are existing source-defined destinations; this audit did not issue live HTTP requests. Preserve the distinct type namespace in each fixture ID.

### Article

- Suggested specimen ID: `blog:every-wire-is-an-rlc-circuit`.
- Title: **Every Wire Is an RLC Circuit: Why Your Digital Signal Rings**.
- Destination: `/blog/every-wire-is-an-rlc-circuit/`.
- Source: `content/blog/every-wire-is-an-rlc-circuit/index.mdx`.
- Date: `2026-06-17T00:00:00.000Z`; author: `Ben Ebsworth`; `release: true`; no explicit draft flag.
- Authored labels: `electrical engineering`, `signal integrity`, `circuits`, `rf`.
- Existing topic resolver: `topicFor` selects `TOPIC.ee` through the explicit per-slug override in `lib/topics.ts`.
- Hero: `/blog/every-wire-is-an-rlc-circuit/hero.webp`.
- The article explicitly embeds `<LabSide effect="rlc-resonance" ...>` and links to `/lab/rlc-resonance/`. This is a source fact about composition/linking, not permission for the component lane to add a new graph predicate.

Publication eligibility comes from `getPublishedPosts()` / `isPublished()` in `lib/content.ts`: `release !== false && !draft`. A server-side fixture adapter can obtain the real summary through this loader; do not import its filesystem implementation into a client component or invent reading-time values.

### Lab

- Suggested specimen ID: `lab:rlc-resonance`.
- Title: **RLC Resonance**.
- Destination: `/lab/rlc-resonance/`.
- Metadata source: `lib/lab/registry.ts`; explanation: `content/lab/rlc-resonance.mdx`.
- Exact registry blurb: “Transient step response of a series RLC circuit — underdamped ringing vs critical damping.”
- Category key: `engineering`; its category label is `Electrical Engineering`.
- Tags: `circuits`, `transient`; `homeEmbedSafe: true`.
- This experiment concerns the transient capacitor-voltage step response. Its source does not supply a publication date, source-review timestamp or instrument measurement status.

### SVG study

- Suggested specimen ID: `study:rlc-resonance`.
- Title: **RLC band-pass response**.
- Destination, from `studyUrl` in `lib/generative-svg/registry.ts`: `/vectors/?study=rlc-resonance`.
- Source: `lib/generative-svg/additional-studies.ts`.
- Category label: `Electronics`; declared provenance: `math-derived`.
- Tags: `circuits`, `resonance`, `filters`.
- Aliases: `RLC`, `band pass`, `resistor voltage response`.
- Exact description: “A series RLC circuit measured across its resistor. Tune Q to change bandwidth while preserving the unit resonant peak.” Here “measured across” names the model's output variable; the declared provenance remains mathematical, not experimental.
- Basis: `|V_R/V_in| = (r/Q)/sqrt((1−r²)²+(r/Q)²)`, with `r = ω/ω₀`, `ω₀ = 1/sqrt(LC)` and `Q = ω₀L/R`. The source specifies `r ∈ [0,3]`, 384 intervals, separate display-axis scales and an ideal linear series RLC with no parasitics.
- Parameter: key `q`, label `Quality factor Q`, minimum `0.5`, maximum `4`, step `0.5`, initial `2`.

The Lab and SVG study share a raw slug but model different outputs and domains. A display adapter must not deduplicate them by slug, substitute either destination, call the study a time-domain simulation, or label them scientifically equivalent.

### Exact shared metadata

All three records contain the authored tag `circuits`. This supports a specimen explaining **shared tag metadata**. It does not prove an alias between broader concepts, identical models, or a causal relationship. If the model lane later supplies normalized hubs, carry its explicit provenance and predicate through the view; do not infer those hubs in these presentation components.

## Presentation contract to hand off

This is a rendering boundary, not a replacement graph schema:

- Receive opaque entity IDs and separate display labels, kinds and destinations. Missing destinations are representable; no fabricated `href="#"`.
- Receive category identity with its source vocabulary as well as its key and label. Preserve unknown future keys rather than collapsing them into six symbols or a presumed scientific superclass.
- Receive root and selection separately. Selecting a card does not silently change the exploration root. The graph views lane owns routing, history and deep links.
- Receive relationship label/predicate, both endpoint IDs and evidence/source records from the model adapter. Show shared metadata as shared metadata; retain direction only when supplied.
- Receive source title, original URL, locator and any owner-supplied status. A document date, retrieval date, revision and review date are different fields; absent values remain absent.
- Receive available/loading/empty/unavailable state explicitly. Empty sources are not a successful failed request. Keep source links available when only enrichment is unavailable.
- Expose controlled search/filter/selection callbacks. Source cards, inspector surfaces and filter groups do not fetch, normalize aliases, mutate graph data or decide scientific truth.
- Separate local working actions from specimen-only states in labels and documentation. A visual Retry example is not a provider call; a selected reading-size sample is not a saved site preference.

## Verification scope

Inventory counts were checked by reading the current declarations and extracting unique names/IDs from their actual source arrays. The 52-study count includes the nine core definitions, sixteen additional studies, three ornamental studies, eighteen Pattern Atlas studies, two nature studies and four paper/ink studies. Lab entries were counted after accounting for the twenty spread-in spatial records, with 85 distinct slugs.

No component tests, browser runs, full-site build, remote publication, merge or deployment were executed by this audit. Functional and visual evidence for implemented work belongs in the workbench verification receipt. About and Hiking identities, the shared graph model and the active UI SDK integration remain outside this lane.
