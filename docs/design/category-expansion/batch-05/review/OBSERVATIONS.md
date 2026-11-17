# Batch 05 final visual inspection

## Scope and outcome

Ten of ten final candidate PNGs were inspected. All ten are separate original raster studies with proposed labels; none establishes approved taxonomy or scientific coverage. Three earlier attempts—thermodynamics v1 and v2, plus fluid dynamics v1—are preserved separately and are not selected candidates. The delivery therefore has ten selected artworks and three retained attempts.

The complete light and dark contact sheets and actual 16, 24, 48, 96 and 192 px size sheets were inspected. The revised piston and flow, dark acoustics and light optics were additionally inspected in 768 px individual composites. Review backgrounds are warm ivory `#f5f1e8` and dark graphite `#171717`. Composites retain the complete source canvas without crop. They are file-derived specimens, not browser screenshots.

**Art direction is aligned for a concept handoff.** Each requested subject is visually distinct, with coherent graphite engraving, warm ivory surfaces and restrained red detail. No fake text, watermark, vendor mark, material crop or severe subject failure was observed. Substantial foreground has generous margins in all ten final candidates. **No perceptible halo was observed in the final reviewed composites.** A targeted imagegen correction removed the faint neutral haze previously observed around the piston. **Strict clear-alpha acceptance remains outstanding:** low-opacity residue remains in the source PNGs. Perceptual edge review does not establish a completely zero-alpha exterior. This is a bounded artwork review, not production adoption or browser acceptance.

## Alpha and native margins

All ten files are 1254 × 1254 RGBA PNGs with real fully transparent pixels. PNG structure and chunk CRC checks passed. Thresholds below are diagnostic measurements only; no thresholding, cleanup or other change was applied to source images.

| Study | Minimum margin at any nonzero alpha | Minimum margin at alpha ≥16 | Observation |
| --- | ---: | ---: | --- |
| Thermodynamics | 0.00% | 21.77% | 27 perimeter pixels have alpha 1. No perceptible haze or halo was observed in the final 768 px light/dark composites. |
| Fluid dynamics | 0.00% | 19.78% | 38 perimeter pixels have alpha 1. Ribbon tips fade naturally; no broad prominent glow was observed. |
| Materials science | 1.67% | 25.20% | Substantial stepped sample and open lattice sit well inside the canvas. |
| Optics | 1.44% | 21.85% | Whole lens, prism and ray motif remain inside generous subject margins. |
| Robotics | 1.44% | 25.20% | Open gripper and jointed fingers remain uncropped and distinct. |
| Acoustics | 2.63% | 25.20% | Fork and resonance contours have room; contours are quiet on dark. |
| Astronomy | 1.99% | 24.48% | Telescope, tripod and stellar cluster remain separate and uncropped. |
| Geophysics | 0.00% | 22.97% | Two perimeter pixels have alpha 1; specimen and instrument remain clear. |
| Renewable energy | 0.00% | 22.65% | One perimeter pixel has alpha 1; rotor and panel remain inside the frame. |
| Biotechnology | 0.00% | 24.96% | Two perimeter pixels have alpha 1; vessel and integrated leaf remain clear. |

All ten exceed the requested 18% minimum at alpha ≥16. None meets 18% when every nonzero alpha value is counted. Do not describe their exterior as completely clear or their subject surfaces as fully opaque. The source distributions are retained in `manifest-alpha.json`.

The final piston has 6.45% of its nonzero pixels at alpha 1–15, down from 67.34% in retained v2. Fully transparent pixels increased from 980,278 to 1,367,550, and median nonzero alpha is now 253. Flow has 46.52% of nonzero pixels at alpha 1–15. These figures are file observations, not perceptual opacity ratings. The final piston reviewed here has SHA-256 `84eb49d72f574f91aa52a4929e3eb166b68677f300463e7e4a2151c0c817772f`.

## Subject and theme findings

| Study | Visible result | Usage limitation |
| --- | --- | --- |
| Thermodynamics | Cutaway piston, rod and flywheel read as one mechanism; the red band gives a clear focal detail. Final light/dark edges appear clean at 768 px. | Low-alpha source residue remains despite the cleared perceptual haze finding; do not claim a mathematically clear exterior. |
| Fluid dynamics | Teardrop body, separated ribbons and open vortex form a strong horizontal silhouette. | Finer pale ribbons and fading tips lose definition on ivory and at small scales. |
| Materials science | Three distinct layers, porous middle and open top lattice communicate a tactile specimen. | Dense lattice detail needs a substantial display size; it is not a specific crystal structure. |
| Optics | Mounted lens and prism create an immediate optical-apparatus silhouette. | Ivory incoming beams are low contrast on ivory. Beam geometry remains a stylised motif, not a ray-tracing result. |
| Robotics | Opposed articulated fingers and hinge discs remain legible in both themes. | Fine mechanisms compress at small sizes; no functioning design is implied. |
| Acoustics | U-shaped fork provides a clear primary silhouette. | Graphite resonance contours are very faint on dark; never rely on those lines to convey information. |
| Astronomy | Telescope/tripod and a small star cluster are distinct from the preserved black-hole concept. | Tiny stars and tripod detail weaken at small sizes; the cluster is not a sky map. |
| Geophysics | Suspended instrument and layered specimen make an identifiable composite subject. | The red seismic motif can resemble a trace; accompanying text must retain its invented-artwork status. |
| Renewable energy | Three-blade rotor and angled solar panel remain easy to distinguish. | Cell-grid detail is decorative and is not an efficiency or performance claim. |
| Biotechnology | Leaf in a reactor vessel reads as the requested synthesis metaphor. | Vessel and leaf arrangement is invented; no biological process, result or real apparatus is certified. |

## Scale and integration guidance

At 16–24 px canvas widths, all ten lose useful subject detail. At 48 px, the stronger silhouettes remain distinguishable but cannot carry technical meaning; fine optics, stars, wave contours and lattice detail collapse. At 96 px, broad objects are readable, but several secondary details remain weak. The 192 px samples and 280 px contact-sheet canvases support labelled spot artwork; 280 px or larger is preferable when internal detail matters.

Keep a visible proposed-study label, use containment, preserve the complete source canvas and avoid cover crops. These detailed raster studies are not accepted replacements for the current 16–24 px symbols. The offline gallery's additional layout padding is separate from source transparency. Dark acoustics and light optics require their text labels even at larger sizes; image details must never be the only carrier of meaning.

## Validation and remaining gates

The reusable inspection script parses successfully. All ten current SHA-256 values match the manifest. The offline gallery contains 20 image instances (ten subjects in two contexts), 45 valid local references and no scripts. These checks establish byte identity and reference integrity, not browser layout or accessibility behavior.

Real-browser rendering, live consumers, narrow placement, forced colours, keyboard/screen-reader behavior and deployment remain unverified. No browser session or additional permission was used. No registry, production symbol or original scientific content was changed.

For a source handoff, retain the ten selected originals, three prior attempts, exact prompts, manifest and alpha qualification together. The earlier perceptible piston-haze concern is cleared by the final imagegen correction; no severe subject defect or perceptible halo blocks the bounded artwork handoff. A strict completely-clear-exterior specification is still not met because low-alpha residue persists. Do not convert the successful composite review into a claim of zero-alpha margins or production/browser acceptance.
