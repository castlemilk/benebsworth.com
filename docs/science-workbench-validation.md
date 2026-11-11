# Spatial science collection

Ten essays pair the site's editorial MDX blocks with an embedded 3D workbench
and a standalone lab guide. The links below open the production site.
See [the production release receipt](science-workbench-production.md) for deployment
and live-browser verification results.

| Essay and lab | What to try | Model boundary |
| --- | --- | --- |
| [Singular values are stretches you can see](https://benebsworth.com/blog/singular-values-are-stretches/) · [Lab](https://benebsworth.com/lab/singular-values/) | Stretch a sphere into an ellipsoid. Compare volume, condition number and rank; flatten the third direction and rotate the output. | Constructs a real 3 × 3 matrix from known factors. It does not solve an entered matrix; sliders label axes without sorting them. |
| [A loop on a sphere can turn an arrow](https://benebsworth.com/blog/a-loop-on-a-sphere-turns-an-arrow/) · [Lab](https://benebsworth.com/lab/parallel-transport/) | Scrub an arrow around a geodesic triangle. Change longitude gap and sphere radius; compare the final turn with area times curvature. | Exact tangent-vector transport on a round sphere. Readouts describe the complete loop; the arrow is not a magnetic compass. |
| [Complex roots need another floor](https://benebsworth.com/blog/complex-roots-need-another-floor/) · [Lab](https://benebsworth.com/lab/complex-roots/) | Follow one input circuit to the opposite root, then two circuits back to the starting root. Shrink the loop towards zero. | A 3D projection of a relation in four real dimensions. Apparent sheet crossings do not identify the roots; time represents progress along a path. |
| [Light draws an ellipse](https://benebsworth.com/blog/light-draws-an-ellipse/) · [Lab](https://benebsworth.com/lab/polarisation/) | Compare linear, circular and elliptical fields. Change relative phase and turn the analyser; circular input transmits 50% at every angle. | Ideal monochromatic light and an ideal analyser, with fixed mean incident intensity. The helix is a field snapshot, not a photon trajectory. |
| [A wave packet has two speeds](https://benebsworth.com/blog/a-wave-packet-has-two-speeds/) · [Lab](https://benebsworth.com/lab/group-velocity/) | Let crests overtake the envelope, then add dispersion curvature. Change initial width and compare spreading. | Exact Gaussian solution for a quadratic dispersion law, used as a narrowband model. Depth shows imaginary quadrature. The window crops tails and the timeline restarts. |
| [A gyroscope falls sideways](https://benebsworth.com/blog/a-gyroscope-falls-sideways/) · [Lab](https://benebsworth.com/lab/gyroscope/) | Double rotor spin to halve precession; double the lever to double it. Change tilt and inspect the torque direction. | Steady slow precession of a 0.4 kg, 0.08 m-radius disc. Omits nutation, friction and precession angular momentum. Spokes run ten times slower for readability. |
| [Steering a beam without moving an antenna](https://benebsworth.com/blog/steering-a-beam-without-moving-an-antenna/) · [Lab](https://benebsworth.com/lab/phased-array/) | Steer the array, add elements, then increase spacing to create grating lobes. Inspect the full 3D cone. | Uniform isotropic sources at one frequency, without coupling or element patterns. Radius plots amplitude. Peak-angle readouts cover the forward half-plane. |
| [Three phases make a rotating field](https://benebsworth.com/blog/three-phases-make-a-rotating-field/) · [Lab](https://benebsworth.com/lab/rotating-field/) | Add three fixed-axis oscillations. Reverse phase order and verify that the resultant keeps its magnitude while reversing direction. | Balanced sinusoidal excitation in an ideal two-pole model. The white arrow is a field vector; the model does not calculate rotor torque, slip or saturation. |
| [A waveguide is a high-pass filter](https://benebsworth.com/blog/a-waveguide-is-a-high-pass-filter/) · [Lab](https://benebsworth.com/lab/waveguide/) | Move the frequency through cutoff. Compare travelling and decaying fields, then change physical width at fixed frequency ratio. | Ideal air-filled TE₁₀ mode, height a/2 and length 2a. Only the electric field is drawn. Below cutoff uses one decaying solution, without a finite tunnelling section. |
| [Power flows around the wire](https://benebsworth.com/blog/power-flows-around-the-wire/) · [Lab](https://benebsworth.com/lab/poynting-flow/) | Reverse current to reverse E × H, remove current to keep only stored electric energy, and vary cable radii while holding VI fixed. | Ideal lossless steady-DC coax with inner radius 1 mm. Voltage and current are independent. Arrow scales differ; moving dots indicate direction rather than a physical velocity. |

All workbenches offer parameter sliders, named presets, timeline scrubbing,
play/pause, reset and camera views. Reduced motion starts paused. The SVG
fallback retains controls and quantitative feedback when WebGL is unavailable.
Cover images are editorial illustrations; their generation and storage are
recorded in [the art notes](science-workbench-art.md).

## Validation status

Recorded during the final verification pass on 24 October 2026:

- The production static export completed successfully, including generated
  Markdown siblings, rewritten Open Graph images and the Pagefind index.
- The full unit suite passed: **1,414 tests**. New checks cover numerical
  invariants, known results, finite geometry and collection integration.
- ESLint, TypeScript and the repository prose checks completed successfully.
- The final browser run passed **32 tests** against the current static export,
  including the new collection and existing lab, content, landing and theme
  regressions, using one Chromium worker.

An earlier parallel run hit the existing DRAM article's five-second heading
timeout. All new collection checks passed in that run; the complete suite then
passed with one worker and no further source changes (DRAM loaded in 605 ms).

The targeted Playwright suite covers all ten essays and lab routes, rendered
equations and assets, nonblank canvas pixels, parameter changes in geometry and
readouts, reset, timeline, camera selection and play/pause. It also checks lab
listing posters, a 375 px light-theme viewport with reduced motion and WebGL
disabled, dark mobile WebGL rendering, orbit/reset, offscreen pausing while
controls remain visible, and recovery to SVG after WebGL context loss.
Both article tables of contents are checked for duplicate links; their
discovery now deduplicates anchor IDs during streamed MDX hydration.
Workbench screenshots are written to `test-results/spatial-<slug>.png`;
mobile stage captures use `test-results/spatial-mobile-<slug>.png`.

Scientific review checked the mathematics, physics and engineering models
against their article claims. The phased-array peak readout was clarified to
identify its forward-half-plane scope.
All 31 numbered equations compiled with valid KaTeX, unique equation IDs and
matching display/copy source. Visual inspection covered all ten desktop scenes
and phone framing. Timeline updates do not announce continuously to screen
readers; parameter readouts remain available after deliberate changes.

## Reproduce locally

Run from the repository root. `TMPDIR=/private/tmp` gives the toolchain a short,
stable temporary path. Task owns the build and test pipelines.

```sh
rtk proxy env TMPDIR=/private/tmp task verify
rtk proxy env TMPDIR=/private/tmp task build
rtk proxy lsof -nP -iTCP:4337 -sTCP:LISTEN
rtk proxy env TMPDIR=/private/tmp E2E_PORT=4337 task test:e2e:fast -- e2e/spatial-science.spec.ts e2e/lab.spec.ts e2e/prose-content.spec.ts e2e/content-expansion.spec.ts e2e/landing.spec.ts e2e/theme.spec.ts --workers=1
```

The port check should show no listener before this test command. Setting
`E2E_PORT` makes Playwright start its own server and prevents reuse of another
process. `test:e2e:fast` is appropriate only after the current source has been
built; `task test:e2e` includes the build dependency.

For manual inspection after the test server exits:

```sh
rtk proxy env TMPDIR=/private/tmp task test:serve E2E_PORT=4337
```

Open the corresponding collection route at `http://localhost:4337`. Stop the manual server before running
Playwright on the same port again.
