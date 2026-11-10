# Model and review checks

Choose checks that would fail for a plausible wrong implementation. Existing tests in `lib/generative-svg` demonstrate these patterns.

## Mathematical curves and numerical models

- Test domain endpoints, symmetry, roots, amplitude, units and special cases against independent formulas. Distinguish model coordinates from screen coordinates; SVG y increases downward.
- Use equal display scales for geometric claims such as circles, vector direction or phase-space energy. Declare separate scales for charts where appropriate.
- Bound interpolation error when making a quantitative accuracy claim. For numerical integration, compare step refinement and a conserved quantity or independent solution. Record the step and valid domain.
- Distinguish a wavefunction from its probability density, amplitude from power, and a transfer response from an unspecified resonance curve. State which output is plotted.
- Avoid NaN/Infinity, bridges through discontinuities and clipping. Test supported parameter extremes and combinations, not only defaults.

## Graphs and protocols

- Test stable unique IDs, expected nodes/edges, edge direction, path/ancestor closure and wraparound. Verify topology is unchanged by selection.
- State any simplified protocol assumptions. Quorum counts, reliable synchronous gossip and round-robin routing do not prove a complete production implementation.
- Keep labels clear without opaque background masks. Trim edges around nodes, leave legible arrowheads at maximum weight, and distinguish wire crossings from junctions.

## Framework and discovery contracts

- Same definition + parameters + appearance must yield identical SVG bytes, without random values or time-dependent IDs.
- Theme, color, line ends and stroke tuning may change presentation only. Compare path coordinates, node centers and numerical results across styles.
- Export must be self-contained, transparent, escaped and free of external resources/scripts. The embedded recipe must reproduce the export through the shared serializer.
- Metadata must be valid and curated. Confirm exact names/acronyms, multi-term matching, tags and direct study links. A disclaimer containing “no noise” must not make a study advertise noise simulation.
- Test extension by registering the executable example beside the current catalogue. The example is not automatically published; adding it requires an actual product request.

## Evidence and acceptance

Keep mathematical tests, DOM journeys, SVG specimen critique, real-browser results, remote CI and live deployment as separate evidence. A passing static build cannot certify native downloads or whole-page layout. Report the precise remaining gate instead of labelling an entire study unverified when only browser acceptance is missing.
