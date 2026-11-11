import type { LabEntry } from '../registry'

/** Metadata stays small; numerical models and Three.js load only near a lab. */
export const SPATIAL_CATALOG = [
  { slug: 'singular-values', title: 'Singular values', category: 'maths', blogSlug: 'singular-values-are-stretches', blurb: 'Turn a sphere into an ellipsoid and inspect the stretches hidden inside a matrix.' },
  { slug: 'parallel-transport', title: 'Parallel transport', category: 'maths', blogSlug: 'a-loop-on-a-sphere-turns-an-arrow', blurb: 'Carry a tangent arrow around a spherical triangle and measure the rotation left by curvature.' },
  { slug: 'complex-roots', title: 'Complex roots', category: 'maths', blogSlug: 'complex-roots-need-another-floor', blurb: 'Follow a complex square root through two sheets and two turns around its branch point.' },
  { slug: 'polarisation', title: 'Polarisation', category: 'physics', blogSlug: 'light-draws-an-ellipse', blurb: 'Combine perpendicular electric fields to draw linear, elliptical and circular polarisation.' },
  { slug: 'group-velocity', title: 'Group velocity', category: 'physics', blogSlug: 'a-wave-packet-has-two-speeds', blurb: 'Watch a carrier move through its envelope while dispersion spreads a wave packet.' },
  { slug: 'gyroscope', title: 'Gyroscopic precession', category: 'physics', blogSlug: 'a-gyroscope-falls-sideways', blurb: 'Inspect how gravitational torque changes the direction of a spinning top’s angular momentum.' },
  { slug: 'phased-array', title: 'Phased array', category: 'engineering', blogSlug: 'steering-a-beam-without-moving-an-antenna', blurb: 'Steer a three-dimensional radiation pattern with phase and discover grating lobes.' },
  { slug: 'rotating-field', title: 'Three-phase rotating field', category: 'engineering', blogSlug: 'three-phases-make-a-rotating-field', blurb: 'Add three alternating winding fields and reveal their constant-magnitude rotating sum.' },
  { slug: 'waveguide', title: 'Waveguide cutoff', category: 'engineering', blogSlug: 'a-waveguide-is-a-high-pass-filter', blurb: 'Cross the TE10 cutoff and see a propagating field become an evanescent one.' },
  { slug: 'poynting-flow', title: 'Coaxial power flow', category: 'engineering', blogSlug: 'power-flows-around-the-wire', blurb: 'Trace electric and magnetic fields in a coaxial cable and integrate their energy flow.' },
  { slug: 'hydrogen-orbitals', title: 'Hydrogen orbitals', category: 'chemistry', blogSlug: 'a-p-electron-is-never-between-its-lobes', blurb: 'Watch a hydrogen orbital\'s real part swap sign while its density holds still, and read nodes and radii against the Bohr radius.' },
  { slug: 'vsepr', title: 'Electron domains on a sphere', category: 'chemistry', blogSlug: 'a-lone-pair-takes-more-room-than-an-atom', blurb: 'Relax repelling electron domains on a sphere and watch heavier lone pairs squeeze water\'s bond angle below the tetrahedral 109.47°.' },
  { slug: 'close-packing', title: 'Close packing: fcc and hcp', category: 'chemistry', blogSlug: 'two-crystals-hide-in-one-stack-of-oranges', blurb: 'Stack hexagonal layers of touching spheres two ways and find a cube hiding in one stack and a hexagonal prism in the other.' },
  { slug: 'virus-capsid', title: 'Caspar–Klug capsids', category: 'biology', blogSlug: 'every-virus-shell-has-twelve-pentagons', blurb: 'Tile one protein across an icosahedron with two lattice integers and count the twelve pentagons every closed shell must carry.' },
  { slug: 'shell-coiling', title: 'Raup\'s shell coiling space', category: 'biology', blogSlug: 'the-nautilus-is-not-a-golden-spiral', blurb: 'Sweep a growing circle around an axis with three numbers and watch nautilus, ammonite and turret shell appear from one rule.' },
  { slug: 'dna-grooves', title: 'Double-helix grooves', category: 'biology', blogSlug: 'dna-strands-are-not-opposite', blurb: 'Set the angle between DNA\'s two backbones and watch a wide and a narrow groove appear from a single pitch.' },
  { slug: 'seasons', title: 'Seasons from a tilted axis', category: 'earth', blogSlug: 'earth-is-closest-to-the-sun-in-winter', blurb: 'Keep Earth\'s axis pointed at one star for a year and watch a fixed tilt, not a changing distance, lengthen and shorten the day.' },
  { slug: 'tides', title: 'Equilibrium tides', category: 'earth', blogSlug: 'the-sun-pulls-harder-but-the-moon-makes-the-tides', blurb: 'Raise Newton\'s equilibrium ocean from real lunar and solar constants, then spin an observer under its two bulges for one lunar day.' },
  { slug: 'seismic-shadow', title: 'Seismic shadow zones', category: 'earth', blogSlug: 'a-ring-of-silence-proves-the-core-is-liquid', blurb: 'Fire earthquake rays through a PREM Earth and watch the liquid core cast a ring of silence on the far side of the globe.' },
  { slug: 'lagrange-points', title: 'Lagrange points on the effective potential', category: 'earth', blogSlug: 'stable-lagrange-points-sit-on-hilltops', blurb: 'Draw the rotating-frame potential of two orbiting bodies, find its five equilibria, and release a particle from the L4 hilltop.' },
] as const

export const SPATIAL_ENTRIES: LabEntry[] = SPATIAL_CATALOG.map(entry => ({
  slug: entry.slug, title: entry.title, blurb: entry.blurb, category: entry.category,
  tags: ['3d', entry.category, 'interactive'], homeEmbedSafe: false,
}))
export const isSpatialLab = (slug: string) => SPATIAL_CATALOG.some(entry => entry.slug === slug)
