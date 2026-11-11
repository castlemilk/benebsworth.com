# Science essay cover art

Generated with the built-in image-generation tool. These are editorial
illustrations; the interactive models, equations and labels are the scientific
diagrams. Sources remain in the Codex generated-images archive. Each selected
image is resized to at most 1536 pixels wide, encoded as WebP at quality 82,
and saved identically to `content/blog/<slug>/hero.webp` and
`public/blog/<slug>/hero.webp`.

Shared prompt: landscape editorial hero for a serious science and engineering
blog; premium scientific magazine art; near-black background; restrained teal,
violet and amber palette; convincing spatial depth, delicate materials, strong
central composition, no UI. Absolutely no text, letters, numbers, labels, logos
or watermarks.

| Article slug | Subject prompt |
| --- | --- |
| singular-values-are-stretches | A delicate luminous cyan wireframe sphere stretches into a tilted translucent blue ellipsoid, linked by three precise perpendicular axes and one transformation arc. |
| a-loop-on-a-sphere-turns-an-arrow | A dark translucent globe with a luminous blue spherical triangle, tangent arrows following its edges and a changed final orientation. |
| complex-roots-need-another-floor | A double-sheeted translucent spiral mathematical surface around a branch point, a cyan path making two turns, violet lower sheet and blue upper sheet. |
| light-draws-an-ellipse | A fine electric-blue helix travelling horizontally through dark space, its endpoint drawing a violet ellipse on a transparent plane, with perpendicular field ribs. |
| a-wave-packet-has-two-speeds | Dense purple oscillations under a wide translucent cyan Gaussian envelope, a spatial ribbon with luminous crests passing through its centre. |
| a-gyroscope-falls-sideways | A dark titanium gyroscope balanced on a point, brass spinning disk tilted at 35 degrees, its axle tracing a violet circular path. |
| steering-a-beam-without-moving-an-antenna | Eight copper antenna elements on a dark instrument, concentric wavefronts merging into an amber radiation lobe aimed diagonally upward. |
| three-phases-make-a-rotating-field | Three pairs of copper stator windings around a motor bore, teal, violet and amber field arcs combining into a rotating amber arrow, isometric cutaway. |
| a-waveguide-is-a-high-pass-filter | A rectangular copper waveguide cutaway, a luminous amber sinusoidal electromagnetic mode down its interior, swelling across its width. |
| power-flows-around-the-wire | A coaxial cable cutaway, central copper wire and outer tube, cyan radial electric spokes, amber circular magnetic loops and violet forward energy flow in the dielectric. |
| a-p-electron-is-never-between-its-lobes | A translucent rose-pink dumbbell orbital standing vertically above a dark reflective floor, its two lobes pinched to nothing at a thin violet ring around the waist, with a faint white wireframe cage nested inside the lobes and a single luminous white probability curve drawn across the floor beneath it, one white bead resting on the curve's peak. |
| a-lone-pair-takes-more-room-than-an-atom | A translucent near-black glass sphere holds a small luminous white nucleus at its centre, with two slender cyan rods reaching down to pale ligand beads on the sphere's surface and two swollen translucent pink lobes bulging upward from the same centre, visibly fatter and wider-set than the rods. A thin amber great-circle arc pinches between the two cyan rods, marking the narrowed angle, while faint grey meridians of the direction sphere give the scene depth. |
| two-crystals-hide-in-one-stack-of-oranges | A tall stack of translucent glass spheres in hexagonal layers, pink, teal and violet by layer, pulled slightly apart so the gaps between layers glow; a thin amber wireframe cube stands on its corner inside the stack with its body diagonal vertical, each cube vertex resting exactly on a sphere centre, and two tiny amber beads sit in the hollows between the bottom two layers. |
| every-virus-shell-has-twelve-pentagons | A translucent icosahedral virus shell floating in near-black space, its surface a lime-green honeycomb of hexagonal cells with twelve amber pentagonal cells glowing at the five-fold corners, one chiral violet path of short steps hopping from one amber pentagon to its neighbour on the face turned toward the viewer; a few capsomer spheres drift slightly off the shell along radial lines as if mid-assembly. |
| the-nautilus-is-not-a-golden-spiral | A nautilus shell sawn in half, its pearly chambered spiral lit from within in restrained teal and amber, lying on dark slate beside a thin translucent lime-green wireframe of the same coiled tube drawn as a swept growing circle with a violet line threading the circle centres. Behind them, out of focus, a taller turret-shell wireframe built from the same rule rises in the dark. |
| dna-strands-are-not-opposite | A single upright double helix of two slender translucent ribbons, one luminous lime and one violet, twisting right-handed on a near-black stage; thin amber rods bridge the ribbons at each level and visibly miss the central axis, so a wide groove and a narrow groove spiral up the surface, the wide one faintly lit cyan from within. |
| earth-is-closest-to-the-sun-in-winter | A dark translucent globe with a luminous sky-blue spin axis tilted from a faint vertical line, its equator, tropics and polar circles traced in fine blue wire, half the sphere sunk under a violet night shadow with a crisp terminator; a small amber sun at the end of a slightly off-centre amber orbital ring sends parallel amber rays onto the lit side, where one latitude circle glows amber on the day side and fades to violet on the night side. |
| the-sun-pulls-harder-but-the-moon-makes-the-tides | A dark translucent globe wrapped in a luminous sky-blue ocean skin stretched into two gentle opposite bulges along a single tilted axis, a small pale Moon on that axis in the near distance and a warm amber Sun glow far off at a right angle, with faint equatorial and meridian rings showing through the water. Fine glass and water materials on a near-black stage, teal, violet and amber restraint, strong central composition. |
| a-ring-of-silence-proves-the-core-is-liquid | A dark translucent globe cut away to reveal a glowing sky-blue liquid core wrapped around a smaller amber inner sphere, with thin cyan rays fanning down from a single point on top of the globe, bending sharply as they enter the core and emerging on the far side, leaving a crisp unlit belt of darker surface where no ray lands. |
| stable-lagrange-points-sit-on-hilltops | A translucent sky-blue potential sheet seen from a low oblique angle in dark space: two deep wells of unequal size, a large pale sphere resting in the broad one and a small one in a narrow needle-like dip, with two gentle luminous hilltops off to either side of the line between them. A thin cyan filament loops in a slow tadpole curve around one hilltop instead of rolling off it, and a faint amber contour pinches to a point at the saddle between the wells. |

The second collection (10 November 2026: chemistry, life sciences, earth and
space) was generated with `scripts/gen-hero.mjs`, which prepends the shared
prompt above to each subject prompt, calls gpt-image-2 at 1536 × 1024 and
writes the same WebP (quality 80) to both `content/` and `public/`.
