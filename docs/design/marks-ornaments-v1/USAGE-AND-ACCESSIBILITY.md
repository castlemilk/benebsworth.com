# Marks, ornaments and annotation vocabulary

## Scope

This packet extends the blog’s existing folio vocabulary with small companion marks. It supplies editable artwork and usage rules; it does not implement runtime components or approve production integration.

Preserve the existing decorative **arrow, underline, bracket and circle**, and the protected **hooked insight rail with its dot**. The new kit must not replace those constructions, redesign the identity, introduce category hero art, or reskin About, Hiking or Hardware. The consuming owner retains control of shared tokens and component behavior.

## Use sparingly

Use a mark to establish a reading pause, locate a marginal note, associate an annotation with its subject, or accompany an existing source label. Give it a specific job before adding it.

- Use **at most two accent gestures per viewport** as this packet’s conservative ceiling. The current type system caps handwritten notes at two per viewport; applying that restraint to ornament is a packet recommendation, not a new shared rule.
- Do not attach a sticker to every heading, source or paragraph. Whitespace and typography remain the primary hierarchy.
- Prefer one gesture at a local point of emphasis. Avoid stacking a divider, marginal ornament and red underline around the same content.
- Keep the transparent margin supplied by the master. Do not crop to the visible strokes or let a callout leader cross unrelated text.
- Use one color per mark. Theme changes alter the color, not the geometry or meaning.
- Keep paragraph and section structure in the document. An ornament does not substitute for a heading, list, citation or meaningful separator.

These are packet recommendations; shared-token adoption remains with the existing owners.

## Optical sizes and palette

Choose the master drawn for the intended CSS size. Do not assume that arbitrary scaling preserves small-size performance.

| Size family | Square canvas | Divider canvas | Stroke |
| --- | --- | --- | --- |
| Small | 16 × 16 | 64 × 16 | 1.5 |
| Medium | 20 × 20 | 80 × 20 | 1.65 |
| Large | 24 × 24 | 96 × 24 | 1.75 |

Canvas and stroke values are SVG user units at their nominal displayed size. The authored stroke values are retained after static optical review; see REVIEW.md for the observed scope. Native-size inspection should check counters, gaps, endpoint separation and apparent weight at 1× and 2× density. No use below the smallest reviewed size is implied.

| Existing role | Light | Dark |
| --- | --- | --- |
| Background | `#f4f1e9` | `#111312` |
| Foreground | `#202c34` | `#ecebe6` |
| Muted foreground | `#56616b` | `#9a9d98` |
| Accent: `--folio-handwriting` | `#b32624` | `#ffaaa5` |

Standalone SVGs use explicit colors so their appearance is reviewable outside the site. A future consuming component can adopt `currentColor` through the existing owner. This packet does not change shared CSS or define a competing token system. Inspect the monochrome, light and dark specimens separately; transparency alone is not a dark-mode treatment.

## Decorative and semantic uses

Classify the **use in context**, not just the asset. A bracket beside a complete text label can be decorative. A bracket that alone identifies a grouping carries information.

| Context | Application contract |
| --- | --- |
| Pure decoration | External `<img>`: supply `alt=""`. Inline SVG: use `aria-hidden="true"` and `focusable="false"`. Do not announce “decorative ornament”. |
| Companion to equivalent visible text | Keep the text and hide the redundant SVG from assistive technology. This is the default for the evidence and source labels below. |
| Independent informative graphic | Provide an equivalent accessible name or description. For inline SVG, a named image pattern can use `role="img"`, a uniquely identified `<title>` and `aria-labelledby`. Do not reuse title IDs across instances. |
| Functional mark | Put the mark inside a real link or button with a name describing its action. Keep the SVG itself unfocusable. “View source 3” describes an action; “open bracket” does not. |
| Diagram annotation | Keep relationship, direction, scale and uncertainty in the diagram’s text or legend. A pointer is not evidence of causality, a measured vector or a calibrated scale. |

The image patterns above follow [WAI’s image guidance](https://www.w3.org/WAI/tutorials/images/) and the [W3C SVG icon guidance](https://design-system.w3.org/styles/svg-icons.html). Decorative images should have an empty alternative rather than an omitted `alt`; see [WAI: Decorative Images](https://www.w3.org/WAI/tutorials/images/decorative/). Functional image names describe their purpose, as explained in [WAI: Functional Images](https://www.w3.org/WAI/tutorials/images/functional/). These are implementation patterns for the consuming owner, not runtime behavior delivered by this packet.

## Preserve evidence and source language

Existing labels carry the meaning. A companion mark must not rename, replace, promote or silently collapse them.

| Existing EvidenceNote basis | Exact visible label |
| --- | --- |
| `measured` | Measured result |
| `simulated` | Simulation |
| `illustrative` | Illustration |
| `interpretation` | Interpretation |

Preserve the PR159 source contexts exactly: **Source recorded**, **Not yet checked**, **Source unavailable**, **Locator missing**. These contexts and the EvidenceNote basis are separate concepts; a measured result can still have an unavailable source locator. Do not invent a combined “quality” score or promote any state to verification.

The kit supplies no “verified” badge. A checkmark, shield, seal or scientific-looking ornament must not imply independent review, correctness, certification, endorsement or publication. Preserve the underlying citation, locator, provenance and caveat. Source presence and evidence type do not establish truth.

## Accessibility requirements and design recommendations

The following are relevant **WCAG requirements** for a consuming implementation:

- **Meaning-bearing graphics:** the parts needed to understand content or identify a control or its state generally require at least **3:1** contrast against adjacent colors. See [SC 1.4.11: Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
- **Small labels and numerals:** ordinary small text requires **4.5:1** contrast, including meaningful text rendered in an image. A source number does not acquire the graphic’s lower threshold because it is inside an SVG. See [SC 1.4.3: Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- **Color independence:** color cannot be the sole visual means of conveying information, action or state. Keep a visible label or another visible distinction; an accessible name alone does not serve sighted readers who cannot distinguish the colors. See [SC 1.4.1: Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).
- **Interactive targets:** pointer targets generally require at least **24 × 24 CSS px**, with specified spacing, equivalent, inline, user-agent and essential exceptions. The visible drawing and clickable area may have different sizes. See [SC 2.5.8: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

The following are **packet recommendations**, not additional WCAG thresholds:

- Retain visible labels for unfamiliar semantic marks. Do not rely on a tooltip or a memorized legend for ordinary source access.
- Prefer comfortable target areas over relying on exceptions. A 16 px mark can sit inside a larger control.
- Use contrast margin and inspect thin strokes at native size. W3C notes that antialiasing can make thin graphics appear substantially fainter despite a nominally passing color pair.
- Compute contrast using the actual composited foreground and surface when opacity is applied. Do not round a failing ratio upward.
- Preserve meaning in a monochrome specimen. Avoid opacity-only distinctions between evidence states.

## Review and adoption

The inventory and review receipt record which assets were actually inspected and which checks ran. Do not infer a pass from the existence of a vector master, specimen or checklist.

Before adoption, the consuming owner should verify naming and reading order; visible keyboard focus and target size where interactive; repeated SVG title IDs; actual browser rendering at intended sizes; zoom and reflow; assistive-technology output; forced-colors behavior; and print output. These consuming-browser, assistive-technology, forced-colors and print checks remain **pending** for this packet.

No runtime integration, shared-token modification, merge, deployment or release approval is included. Preserve the existing preview and release holds.

## Shape-specific restrictions

- **Paired cuts:** can resemble crop or focus corners. Keep beside an explicit note label; never use as a new control, selection state or scanning affordance.
- **Excerpt notch:** can resemble a brace and equals sign. Keep in labelled source or quotation metadata, outside code and equations; never use as mathematical notation.
- **Record gap:** accompanies the specific source context in text. It does not distinguish “Not yet checked”, “Source unavailable” and “Locator missing” by itself, and it does not add an evidence basis.
- **Leader landing / Extent ends:** are optional annotation accessories. They must not enter the scientific figure’s data geometry or replace measured connector behavior. Do not use as dimensions, error bars, ports, force arrows or graph edges.
- **Margin fold:** is a page-turn metaphor only. It is not an external-link, save or bookmark affordance.
