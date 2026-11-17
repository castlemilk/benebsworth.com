# Batch 03 artwork review

**Ten of ten selected subject originals inspected. Eleven unique outputs generated, including one preserved superseded compiler.** Review date: 17 November 2026. Source baseline is `92cd2eeae1a289f727b6d7bcb2beb9ddbe44ab76`; the images are isolated Batch 03 additions. This is visual inspection of raster files and offline composites, not a browser or deployed-layout review.

## Method and evidence

Read the blog's `DESIGN.md`, `docs/design/VISUAL-REVIEW.md`, current topic registry and recovered ART 04 provenance. Compare the new subjects with the selected graphite/ivory research-folio language while preserving category-specific silhouettes. Inspect full-canvas 256, 96, 48 and 24 px composites on light `#f4f0e8` and dark `#191a1c`. Sample four source-edge locations per subject at 3× nearest-neighbour magnification. These samples are explicitly cropped review views, never replacement originals.

Selected evidence is in `review/final/`, with numeric checks in [manifest.json](manifest.json). The pair-01 through pair-05 folders and `pixel-audit-10-first-pass.json` preserve first-pass history; pair-03 therefore depicts compiler revision 1. [selection.json](selection.json) records the compiler revision mapping and preserved hashes. The audit distinguishes alpha >0 from >16 and >128 so faint exterior pixels cannot be silently discarded from margin claims. Bounding-box coordinates use exclusive right/bottom edges.

## Per-subject observations

| Proposed study | 256 px | 96 px | 48 px | 24 px |
| --- | --- | --- | --- | --- |
| Databases | Drawer, tabbed pages and small red tab form a clear indexed-storage metaphor. Graphite cabinet gives a stronger dark mass than neighbouring ivory subjects. | Cabinet and open drawer remain readable on both surfaces. Individual tabs simplify. | Storage silhouette persists; indexing detail and red accent are fragile. | Tiny cabinet outline only; require a label and retain existing symbols for actual icon use. |
| Distributed systems | Three separate vented housings and connecting cables establish collaboration across gaps. Ivory bodies remain clear on dark. | Three machines and links remain distinct; component textures simplify. | Independent nodes remain visible, but thin links weaken on light. | Dots and boxes are ambiguous; a label is essential. |
| Networking | Four textile cables and the exposed junction produce a distinctive routed silhouette without text or a vendor mark. | Junction and four routes remain clear on both surfaces. | Centre loses routing detail but the branching cable form remains. | Star-like shape loses the networking meaning; unsuitable as an unlabelled small symbol. |
| Cybersecurity | Closed shackle, stepped wards and alternating plates make the layered-lock metaphor clear. One red separator is restrained. | Lock and layered front remain readable on both surfaces. | Lock silhouette is strong; ward geometry and red seam simplify. | Shackle remains recognisable, but layered security is no longer readable; retain a visible label. |
| Operating systems | Three plates, shared spindle, bearing rings and a small cutaway establish coordinated mechanical layers. Warm surfaces and the red wedge fit the family. | Vertical layer stack and central shaft remain clear on both surfaces. | Three layers persist; bearings and cutaway detail reduce. | Small stacked rings remain visible but do not communicate an operating system without a label. |
| Compilers, revision 2 | Complete press and varied incoming versus uniform outgoing tiles retain the transformation metaphor. The much larger margins make this subject visibly smaller than its neighbours at equal canvas size. | Press remains readable, but the small tile relief barely communicates transformation. Prefer a larger placement. | Tiny press survives; input/output distinction is lost. | A few pixels of apparatus only; not a useful standalone category symbol. |
| Programming languages | Nested physical blocks and one open graphite support convey structured grouping without pseudo-code. The central ivory geometry is the focal point. | Nested levels remain readable; the outer graphite support recedes somewhat on dark. | Grouping still reads, but joints simplify and the red inset is less salient. | Compact framed motif remains; the programming-language metaphor needs its label. |
| Testing | Opposed probes, specimen and unnumbered indicator form a coherent test-jig metaphor. Tick marks imply an instrument, not a supplied result. | Fixture, two uprights and gauge remain distinct. | Gauge dominates; the central specimen and probes become difficult to separate. | Tiny machine with dial is recognisable only generically; not a functional status icon. |
| Observability | Pivoted instrument ring and three curved bands create a clear telemetry-lens metaphor. Open areas stay transparent rather than showing a fabricated graph. | Ring, band separation and base remain readable on both surfaces. | Ring and bands persist, but the small red detail weakens. | Tiny instrument silhouette remains; category meaning needs its label. |
| Data engineering | Raised branching sluice, central gate and red lever convey a material pipeline without arrows, figures or a claimed data flow. | Main channel, gate and branches remain distinguishable on both surfaces. | Branching apparatus persists; gates, tiles and supports begin merging. | Generic tiny apparatus; unsuitable as an unlabelled category symbol. |

The ten inspected originals contain no observed readable labels, invented numbers, logo or watermark. The compiler tiles have geometric relief, not pseudo-code; the test dial has plain ticks and a pointer without numerals or a reported reading. This observation applies to these files at the inspected scales; it is not an OCR certification.

## Alpha and margins

All ten selected originals are actual 1254 × 1254 PNG RGBA files, with both fully transparent and nontransparent pixels. Most material pixels are alpha253, not fully opaque alpha255. Partial-alpha counts alone therefore exaggerate the apparent extent of translucent material, although the requested fully opaque material target is not met. The exact per-value counts are preserved in the manifest.

| Original | Fully transparent pixels | Minimum margin at alpha >16 | Nonzero border-alpha pixels | Border pixels at alpha >16 |
| --- | ---: | ---: | ---: | ---: |
| 01 Databases | 60.7467% | 15.79% | 77 | 0 |
| 02 Distributed systems | 75.9953% | 9.25% | 11 | 0 |
| 03 Networking | 79.5330% | 9.01% | 23 | 0 |
| 04 Cybersecurity | 69.9973% | 13.16% | 405 | 0 |
| 05 Operating systems | 65.0653% | 9.41% | 134 | 0 |
| 06 Compilers, revision 2 | 94.2063% | 26.24% | 1 | 0 |
| 07 Programming languages | 75.4420% | 20.65% | 28 | 0 |
| 08 Testing | 82.5927% | 16.83% | 4 | 0 |
| 09 Observability | 85.1690% | 18.58% | 6 | 0 |
| 10 Data engineering | 80.0487% | 14.35% | 29 | 0 |

**The requested fully clear margins are not met.** Images 01–05 requested at least 18% margins and first-pass images 06–10 requested 23%. Every selected original has some very-low-alpha exterior pixels at a canvas edge. Thresholding them out of a measurement does not make the original bytes clean. The visibly substantial subjects are contained without observed clipping, but distributed systems and networking have tighter horizontal margins than requested. The operating-system spindle and observability stand approach the lower edge more closely than intended; the data-engineering sluice spreads wider than requested. Keep full canvas contain sizing; do not adopt cover cropping or silently clean these masters.

The single bounded compiler correction requested the complete subject inside the central half of the canvas width. Its alpha >16 bounding box changes from `[73, 262, 1181, 1011]` to `[329, 439, 916, 833]`, increasing the minimum margin from 5.82% to 26.24%. This substantially improves visible framing, but does not remove every faint exterior pixel. The first version remains unchanged as `superseded/06-compilers-v1.png`; the selected output is `06-compilers-v2.png`. The press, tile-row structure, graphite/ivory material and small red collar remain recognisable. The tradeoff is lower optical size and weaker small-scale meaning. Revision 2 is the assistant's handoff selection, not user approval.

At 256 px, no broad diffuse haze was observed on the sampled dark composites. Magnified cable, cabinet, instrument and sluice edges show a narrow soft antialias fringe. The lock's pale rim is mostly part of its drawn surface, but faint exterior pixels remain numerically present. **No universal no-halo acceptance is claimed.** Inspect the chosen crop and actual consumer background before adoption.

## Art-direction assessment

| Dimension | Assessment | Evidence and consequence |
| --- | --- | --- |
| Material and colour | Aligned at concept level | Matte graphite engraving, warm ivory and small red material accents form a coherent family. The cabinet is darker than most other subjects. |
| Distinctive silhouettes | Aligned at 96–256 px | Drawer, separate machines, cable junction, lock, stacked layers, press, nested blocks, test jig, lens and branching sluice are distinguishable. Labels supply the more abstract category meanings. |
| Margin discipline | Drift, improved compiler framing | Nine subjects have substantial extents tighter than requested. Compiler revision 2 meets central-half framing at alpha >16, but all ten retain faint exterior pixels. Preserve bytes and document this limitation. |
| Optical scale | Uneven | Compiler revision 2 is noticeably smaller at equal canvas sizes. Prefer a 256 px or larger placement; do not claim a production-balanced category row. |
| Edge discipline | Partial evidence | Sampled light/dark views show restrained edge softness; faint exterior alpha remains. Whole-consumer halo acceptance is unverified. |
| Small-symbol use | Not accepted | 24 px loses semantic detail; 48 px varies by subject. Keep labels and approved runtime marks. |
| Typography and interaction | Not applicable to originals | Art contains no text or behaviour. Review labels are separate authored text. |
| Real layouts and accessibility | Unverified | No browser, theme-switch, focus, forced-colours, print, screen-reader or physical-device acceptance was performed. |

## Usage contract and remaining work

Use the images as proposed editorial spot illustrations at 96–256 px or larger, with full canvas contained and external labels. Prefer 256 px or larger for compiler revision 2 because its greater internal margins reduce the apparent subject size. Treat images as decorative when a nearby heading supplies the category: use an empty alt value in that case. When the artwork itself carries meaning, provide a concise description of the depicted object without implying a real system or verified security state. Do not encode category meaning solely in the red accent.

All ten selected subject originals, their measured manifest and final light/dark review sheets are present. The compiler's unmodified first-pass original is separately preserved, giving eleven unique generated outputs across ten subjects. No subject is missing. Production selection, any derivative cleanup, optical-scale balancing, exact consuming crop, browser appearance and taxonomy decisions remain separate review work. This batch changes no shared component, token, registry, source article or existing asset. No real-browser acceptance, push, PR, merge or deployment is claimed; the exact publication blocker is recorded in [README.md](README.md).
