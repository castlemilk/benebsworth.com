# Gamma guidance for the editorial component workbench

Observed **17 November 2026, Australia/Melbourne**. This note records maintained
Gamma component guidance and the proposed adaptation boundary for BLOG DESIGN
03. It does not introduce a second design system or certify a local
implementation. The blog keeps Source Serif 4 reading, Barlow Condensed utility
labels, selectable Caveat notes and restrained red annotations in light and dark.
The current authority is [DESIGN.md](../../../DESIGN.md) and the separate
functional/artistic gates in [VISUAL-REVIEW.md](../VISUAL-REVIEW.md).

Repository provenance was read at
[`1121edc4ae6ac8de415b5395d8fadc11450fc55f`](https://github.com/castlemilk/benebsworth.com/commit/1121edc4ae6ac8de415b5395d8fadc11450fc55f).
Gamma did not return an upstream commit for these brief/checklist reads. No new
Gamma implementation source, stylesheet, font or artwork was copied in this
research pass. The contracts below are guidance for independently implemented,
scoped blog components, not assertions about which workbench behaviors have
already shipped.

## Retrieval record

The authenticated `gamma-new` MCP supplied the following successful operations:

- `gamma_get_checklist({})`.
- `gamma_list_components({ category })` for `Navigation`, `Inputs`, `Feedback`,
  `Displays` and `Loading`.
- `gamma_get_component_brief({ slug })` for `breadcrumb-trail`, `filter-bar`,
  `search-field`, `segmented-control`, `side-sheet`, `empty-state`, `skeleton`,
  `range-slider`, `badge`, `disclosure-stack` and `tabs`.

The first checklist request and the initial `gamma_list_component_briefs`
requests for those five categories returned MCP `-32603 Internal error`.
Subsequent catalogue reads, exact-slug brief reads and the checklist retry
succeeded. The successful data, rather than the earlier failures, informs this
note. No review or validation commands from the Gamma repository were executed.

## Catalogue evidence and reuse boundary

| Exact slug | Useful contract from the retrieved brief | Reported validation snapshot |
| --- | --- | --- |
| `breadcrumb-trail` | Named navigation landmark, ordered ancestry, native links, explicit current page, wrapping at narrow widths. | `reviewed`; loop `catalogued`; design review `pass`; evidence gate `false`. |
| `filter-bar` | Controlled selected-value map, grouped native checkboxes, removable chips, clear all, polite count and deliberate focus return. | `validated`; loop `pass`; score 92.5; evidence gate `true`. |
| `search-field` | Visible native search label, associated help/error, clear-to-empty callback and focus return, optional explicit submit. | `validated`; loop `pass`; score 96.3; evidence gate `true`. |
| `segmented-control` | A short exclusive choice using radio semantics; counts and icons supplement the label; controlled value belongs to the consumer. | `catalogued`; loop `unvalidated`; design review `missing`; evidence gate not supplied. |
| `side-sheet` | In-scope native modal dialog, named heading, explicit close, focus return, independently scrolling body and consumer-owned form data. | `reviewed`; loop `catalogued`; design review `pass`; evidence gate `false`. |
| `empty-state` | Concrete context, useful recovery and consumer-owned native actions; empty collection, filtered empty, errors and loading need different treatment. | `validated`; loop `pass`; score 92.5; evidence gate `true`. |
| `skeleton` | Decorative shape placeholder with loading status on its containing region; static with reduced motion. | `catalogued`; loop `catalogued`; design review `missing`; evidence gate `false`. |
| `range-slider` | Visible label, formatted numeric output, bounds/step and controlled callback on a native range input. | `reviewed`; loop `catalogued`; design review `pass`; evidence gate `false`. |
| `badge` | Noninteractive metadata/status text; decorative dot/icon; buttons or filter controls own actions. | `validated`; loop `pass`; score 92.5; evidence gate `true`. |
| `disclosure-stack` | Native buttons expose expanded state; unique panel IDs; controlled open IDs; immediate reduced-motion changes. | `reviewed`; loop `catalogued`; design review `pass`; evidence gate `false`. |
| `tabs` | Arrow navigation between tabs; each controls a labelled panel. | `validated`; loop `pass`; score 90; evidence gate `true`. |

All listed briefs reported zero open feedback at retrieval. These are **Gamma's
catalogue records**, not a local accessibility audit, browser capture, artistic
acceptance, integration test or deployed-state claim. A reviewed/catalogued
record must not be relabelled as validated. Even a validated upstream component
needs local testing when its markup, styling, state ownership or context changes.

## Contracts for graph-lane reuse

### Navigation and filters

- **Navigation destinations are links.** Preserve browser history and modified
  activation. A graph exploration root and an inspected selection are separate
  named concepts. Do not present a traversal path as hierarchical ancestry unless
  the model actually guarantees that hierarchy.
- **Search is controlled.** The primitive receives the visible query and emits
  edits/optional submissions. Clearing emits an empty string and restores focus
  to the input. The host owns filtering, fetching, URL state and history. Do not
  silently replace the focused input when results change.
- **Facets accept registry data.** Receive stable group/option IDs, labels,
  optional counts and a complete selected-value map. Return the complete next
  map. Missing counts remain missing. Never infer zero, flatten the taxonomy to
  six categories or equate normalized glossary/tag text with scientific identity.
- **Filter removal has a declared focus destination.** Gamma's filter pattern
  returns focus to its trigger after chip removal/clear and after Escape. If the
  blog uses an always-visible filter group instead, document and test its own
  deliberate focus destination rather than referencing a nonexistent trigger.
- **Settings, routes and panels use different semantics.** Native radios suit a
  mutually exclusive local setting; links suit route changes; tabs suit related
  panels only when the complete tab/panel keyboard contract is implemented.

The `segmented-control` brief describes Home/End navigation alongside native
radios. Treat that as a documented Gamma feature, not a guarantee of browser
native radio behavior. Additional keyboard handling needs explicit implementation
and testing; otherwise retain and document native behavior.

### Entity and relationship cards

- An entity card exposes a heading and a native destination link. A separate
  inspect button avoids nested interactive elements and makes selection different
  from navigation. The consumer supplies stable identity, kind, label, summary,
  destinations and provenance; the card does not infer them from presentation.
- A relationship card receives explicit subject, predicate and object text.
  Evidence sits beside the relationship. Tag/category membership uses the actual
  relation language, such as "tagged with" or "listed under". Shared labels alone
  do not establish equivalence, causality or scientific support.
- Metadata labels remain passive text. A status badge is not a hidden button.
  Selection uses visible control chrome with the appropriate checked/pressed
  semantics; status must remain understandable without colour or illustration.
- Long labels wrap within available width. Essential entity names, predicates
  and provenance cannot become hover-only information.

### Sources and inspectors

- A source citation keeps its native source link visible at rest. Title, locator
  and provenance remain selectable. Optional disclosure may contain extraction
  notes and further metadata, but not the sole usable source action.
- Preserve differences between unavailable, unchecked, absent locator and
  reviewed. Review status requires supplied review evidence; an absent source is
  not a successful empty result. A generated illustration never serves as factual
  support for an entity or relationship.
- An inline desktop inspector can be a named complementary region. It does not
  acquire modal semantics merely because it occupies a narrow side column.
- A mobile modal inspector, if implemented, needs a named native dialog, explicit
  close control, deliberate initial focus, Escape handling and opener focus
  restoration. Preserve selected entity/context across dismissal. Test missing
  opener and changed-data cases rather than asserting focus return from source.
- Gamma's `side-sheet` uses `showModal()`, focuses the heading, preserves
  in-scope tokens and describes reference-counted body scroll locks with cleanup.
  Those are reference behaviors; do not claim the blog has them until implemented
  and tested. Swipe dismissal and nested sheet staging are outside that brief's
  declared API.

### Reading controls and status surfaces

- Reading size or measure controls expose a visible label, current value and
  useful bounds. Parent-owned values allow the host to choose persistence and
  reset scope. A reset must not erase unrelated host preferences.
- Annotation visibility uses a labelled control. Caveat notes remain selectable
  text; red strokes are decorative and separate from scientific geometry.
- The workbench theme affects its own token scope. It does not write document
  root tokens, replace UI SDK state or restyle About/Hiking.
- Distinguish loading, failed retrieval, an empty collection and zero matches
  after filtering. Every state names its context and an available next action.
  The consumer supplies actual retry/clear handlers; a specimen must not imply
  that a network request or persisted change succeeded.
- Skeletons are decorative. The containing region supplies the meaningful status
  and busy state. Retain readable content when possible; reduced motion shows a
  static placeholder rather than hiding progress information.

## Local acceptance implications

The useful parts of the retrieved Gamma checklist are native semantics,
component-owned focus styling, controls discoverable at rest, controlled state
ownership, native-attribute passthrough, reduced-motion behavior and a clear
rejection/recovery path for anything asynchronous. Keyboard exits restore focus
deliberately; a blur exit must not steal focus from the user's chosen destination.
Scope tokens to the workbench and render controls in meaningful content context.

Record implemented behavior separately from specimen-only states. Local review
should exercise light/dark, narrow and short viewports, long labels, keyboard
entry/exit, actual focus return, loading/error recovery and reduced motion as
applicable. Report source checks, executed tests and actual browser observations
separately, following [VISUAL-REVIEW.md](../VISUAL-REVIEW.md). Gamma's internal
five-design-system review matrix and reproduction scores are not acceptance
evidence for this repository.

## Existing repository provenance

[components/gamma/PROVENANCE.md](../../../components/gamma/PROVENANCE.md) already
records maintained Gamma source in the blog. Preserve that boundary rather than
recopying components or replacing their shared adapter in this lane.

| Existing artifact | Historical retrieval record | Recorded snapshot SHA-256 |
| --- | --- | --- |
| `components/gamma/GammaButton.tsx` | 27 October 2026; authenticated Gamma Nocturne MCP; `gamma_get_component(button, includeSource=true)`. | `a8ffa0370e5c559c106b5bb6f95d29f62a7bd2536e21a67c87bb87bbaeb9c773` |
| `components/gamma/RangeSlider.tsx` | 27 October 2026; `gamma_get_component(range-slider, includeSource=true)` and range-slider brief. | `59093142525d4b505193ed68179d4894b57d7254fa532ccfcc2ed47273842470` |
| `components/gamma/controls.css` | Contiguous Button/spinner and Range slider production rules, spin keyframes and reduced-motion treatment; preview CSS, full theme and external fonts excluded. | `d6b146e477226b5a44de2d8eada40277608d14f06fc8e43e9f78f34e46664a44` |
| `components/gamma/ActionMenu.tsx` | 28 October 2026, FOLIO-005; maintained source copied unchanged; Equation provides existing copy actions. | `fa7fab17f819f6ae42645b6087fbc6fee3c145dc13acacf402e1a31cd584a4e2` |
| `components/gamma/action-menu.css` | 28 October 2026; portable action-menu CSS copied unchanged. | `f72c9e53d40d0733255da356913ca19bccec95598ef2d62c0b79af0113d4472a` |

These hashes are transcribed from the repository's historical provenance record;
they are not newly computed hashes or a new acceptance result. That record names
[`skunkworq/gamma`](https://github.com/skunkworq/gamma) as the canonical source
repository, `app/editorial.css` as the site-token adapter and `app/globals.css` as
the stylesheet import boundary. No upstream commit was supplied for those source
snapshots. This lane does not alter those files or their provenance.

## References returned by the briefs

- `breadcrumb-trail`: [WAI breadcrumb pattern](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/).
- `segmented-control`: [WAI radio group pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/).
- `search-field`: [MDN search input](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/search).
- `range-slider`: [MDN range input](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/range).
- `side-sheet`: [PanelUI Sheet](https://panelui.dev/docs/web/components/sheet) and
  [the specific PanelUI source referenced by Gamma](https://github.com/panel-ui/PanelUI/blob/3812a4509eb8b935b14a4f8f173a82d603030491/packages/web/src/components/sheet/index.tsx).

Gamma describes its side sheet as an original React DOM implementation informed
by MIT-licensed PanelUI source. This pass inspected Gamma's brief, not that
upstream source; it does not make an independent licence audit or import any of
that code. The links above are provenance supplied by the retrieved briefs,
separate from executed local evidence.
