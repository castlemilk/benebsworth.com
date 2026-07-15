import type { LabEffect, LabCategory } from '@/lib/gen/content'
import type { EffectModule } from './types'

// ── Category metadata ──────────────────────────────────────────────────
export const CATEGORIES: { key: LabCategory; label: string; glyph: string; blurb: string }[] = [
  { key: 'art', label: 'Generative Art', glyph: '◆', blurb: 'Canvas animations exploring noise, flow, and organic form.' },
  { key: 'maths', label: 'Mathematics', glyph: '∫', blurb: 'Visualising differential equations, geometry, and statistics.' },
  { key: 'physics', label: 'Physics', glyph: 'ψ', blurb: 'Waves, quantum states, and condensed-matter phenomena.' },
  { key: 'engineering', label: 'Electrical Engineering', glyph: 'Ω', blurb: 'Circuits, signal processing, control systems, and software radio.' },
  { key: 'ai', label: 'AI & Machine Learning', glyph: '✦', blurb: 'Attention, transformers, and the mechanics of deep models.' },
  { key: 'cosmology', label: 'Cosmology', glyph: '✷', blurb: 'Spacetime, black holes, and the structure of the universe — from the Planck length to the cosmic web.' },
]

// Lightweight metadata only — NO controls, defaults, or canvas code.
// Those live in the effect modules and are loaded on demand via
// EFFECT_LOADERS below, so each effect's renderer is code-split into
// its own chunk.
export type LabEntry = LabEffect

export const LAB_EFFECTS: LabEntry[] = [
  // ── Art ─────────────────────────────────────────────────────────────
  { slug: 'orbits', title: 'Orbits', blurb: 'Bodies tracing a shared circle, leaving light trails.', tags: ['trails', 'trig'], category: 'art', homeEmbedSafe: true },
  { slug: 'flow-field', title: 'Flow Field', blurb: 'Particles advected by a value-noise vector field.', tags: ['noise', 'particles'], category: 'art', homeEmbedSafe: false },
  { slug: 'starfield', title: 'Starfield', blurb: 'Parallax warp toward a vanishing point.', tags: ['3d', 'parallax'], category: 'art', homeEmbedSafe: true },
  { slug: 'cyclic-automaton', title: 'Cyclic Automaton', blurb: 'Cells advancing in a colour cycle when enough neighbours lead.', tags: ['automata', 'grid'], category: 'art', homeEmbedSafe: false },
  { slug: 'ripple-grid', title: 'Ripple Grid', blurb: 'A dot grid pulsing with summed sine-wave interference.', tags: ['waves', 'grid'], category: 'art', homeEmbedSafe: true },
  { slug: 'mesh-wave', title: 'Mesh Wave', blurb: 'Isometric wireframe terrain with layered sine waves.', tags: ['3d', 'wireframe'], category: 'art', homeEmbedSafe: true },
  { slug: 'voronoi-bloom', title: 'Voronoi Bloom', blurb: 'Drifting gradient blobs blending into organic stained-glass cells.', tags: ['voronoi', 'gradient'], category: 'art', homeEmbedSafe: true },
  { slug: 'flow-streams', title: 'Flow Streams', blurb: 'Ink-like streamlines curling through a noise field.', tags: ['noise', 'ink'], category: 'art', homeEmbedSafe: true },
  { slug: 'metaball-bloom', title: 'Metaball Bloom', blurb: 'Organic gradient blobs merging and splitting in lava-lamp motion.', tags: ['gradient', 'organic'], category: 'art', homeEmbedSafe: true },
  { slug: 'spirograph-rose', title: 'Spirograph Rose', blurb: 'Layered parametric curves drawing vintage generative spirographs.', tags: ['parametric', 'curves'], category: 'art', homeEmbedSafe: true },
  { slug: 'dot-lattice', title: 'Dot Lattice', blurb: 'A breathing dot grid modulated by layered noise waves.', tags: ['grid', 'noise'], category: 'art', homeEmbedSafe: true },
  { slug: 'boids-flocking', title: 'Boids Flocking', blurb: 'Separation, alignment, and cohesion steering leaderless agents into murmuration-like flocks.', tags: ['boids', 'flocking', 'emergence', 'swarm'], category: 'art', homeEmbedSafe: true },
  { slug: 'truchet-tiles', title: 'Truchet Tiles', blurb: 'A grid of coin-flip tiles whose arcs join into one continuous, slowly reseeding labyrinth.', tags: ['tiling', 'generative', 'grid', 'labyrinth'], category: 'art', homeEmbedSafe: true },
  // ── Maths ───────────────────────────────────────────────────────────
  { slug: 'double-pendulum', title: 'Double Pendulum', blurb: 'Chaotic pendulums diverging from near-identical starting conditions.', tags: ['chaos', 'ode'], category: 'maths', homeEmbedSafe: true },
  { slug: 'logistic-bifurcation', title: 'Logistic Bifurcation', blurb: 'The period-doubling cascade of x → r·x·(1−x): fixed point, 2-cycle, 4-cycle, then chaos, with a live cobweb inset.', tags: ['chaos', 'bifurcation', 'dynamical systems'], category: 'maths', homeEmbedSafe: true },
  { slug: 'phase-portrait', title: 'Phase Portrait', blurb: 'ODE trajectories flowing through vector fields — Lotka-Volterra, Van der Pol, Duffing.', tags: ['ode', 'dynamical systems'], category: 'maths', homeEmbedSafe: true },
  { slug: 'conformal-grid', title: 'Conformal Grid', blurb: 'Complex mappings deforming a Cartesian grid — Joukowski, power maps, inversion.', tags: ['complex analysis', 'differential geometry'], category: 'maths', homeEmbedSafe: true },
  { slug: 'complex-maps-and-airfoils', title: 'Complex Maps and Airfoils', blurb: 'The Joukowski transform turning circles into airfoils, with conformal geometry as the translator.', tags: ['complex analysis', 'conformal mapping', 'aerodynamics'], category: 'maths', homeEmbedSafe: false },
  { slug: 'random-walk', title: 'Random Walk', blurb: 'Stochastic walks converging to the Gaussian via the central limit theorem.', tags: ['statistics', 'probability'], category: 'maths', homeEmbedSafe: true },
  { slug: 'fourier-series', title: 'Fourier Series', blurb: 'Epicycles tracing waveforms — Gibbs phenomenon, harmonic decomposition.', tags: ['analysis', 'fourier'], category: 'maths', homeEmbedSafe: true },
  { slug: 'lorenz-attractor', title: 'Lorenz Attractor', blurb: 'The classic chaotic 3D butterfly — two trajectories diverge from near-identical starts.', tags: ['chaos', 'ode', 'butterfly effect'], category: 'maths', homeEmbedSafe: true },
  { slug: 'chaos-sensitivity', title: 'Sensitive Dependence', blurb: 'Why deterministic systems can still become practically unpredictable when nearby states peel apart.', tags: ['chaos', 'prediction', 'lyapunov'], category: 'maths', homeEmbedSafe: false },
  { slug: 'reaction-diffusion', title: 'Reaction-Diffusion', blurb: 'Gray-Scott Turing patterns — spots, stripes, mazes, and mitosis from two PDEs.', tags: ['pde', 'turing', 'pattern formation'], category: 'maths', homeEmbedSafe: true },
  { slug: 'turing-patterns', title: 'Turing Patterns', blurb: 'Local reaction plus uneven diffusion can draw stripes, spots, and labyrinths without a central planner.', tags: ['reaction diffusion', 'turing', 'pattern formation'], category: 'maths', homeEmbedSafe: false },
  { slug: 'mandelbrot-julia', title: 'Mandelbrot & Julia', blurb: 'Escape-time fractals of z² + c — a morphing Julia set and the Mandelbrot atlas, smooth-coloured through a brand palette.', tags: ['fractals', 'complex dynamics', 'escape-time'], category: 'maths', homeEmbedSafe: true },
  // ── Physics ─────────────────────────────────────────────────────────
  { slug: 'wave-superposition', title: 'Wave Superposition', blurb: 'Interference of two plane waves — beats, standing waves, and nodes.', tags: ['waves', 'interference'], category: 'physics', homeEmbedSafe: true },
  { slug: 'bloch-sphere', title: 'Bloch Sphere', blurb: 'Qubit state precessing on the Bloch sphere under a magnetic Hamiltonian.', tags: ['quantum', 'qm'], category: 'physics', homeEmbedSafe: true },
  { slug: 'band-structure', title: 'Band Structure', blurb: 'Nearly-free electron E-k diagram with Brillouin zone gaps.', tags: ['condensed matter', 'solid state'], category: 'physics', homeEmbedSafe: true },
  { slug: 'quantum-tunneling', title: 'Quantum Tunneling', blurb: 'Gaussian wave packet tunnelling through a rectangular barrier.', tags: ['quantum', 'tunneling'], category: 'physics', homeEmbedSafe: true },
  { slug: 'coupled-oscillators', title: 'Coupled Oscillators', blurb: 'Two mass-spring systems exchanging energy via normal-mode beating.', tags: ['mechanics', 'normal modes', 'beats'], category: 'physics', homeEmbedSafe: true },
  { slug: 'ising-model', title: 'Ising Model', blurb: 'Magnetic spins ordering into domains below the critical temperature and melting into noise above it.', tags: ['statistical mechanics', 'monte carlo', 'phase transition', 'magnetism'], category: 'physics', homeEmbedSafe: true },
  { slug: 'kinetic-gas', title: 'Kinetic Theory of Gases', blurb: 'Hard discs colliding in a box relax into the 2D Maxwell-Boltzmann speed distribution.', tags: ['thermodynamics', 'statistical mechanics', 'collisions', 'maxwell-boltzmann'], category: 'physics', homeEmbedSafe: true },
  // ── Engineering ──────────────────────────────────────────────────────
  { slug: 'rlc-resonance', title: 'RLC Resonance', blurb: 'Transient step response of a series RLC circuit — underdamped ringing vs critical damping.', tags: ['circuits', 'transient'], category: 'engineering', homeEmbedSafe: true },
  { slug: 'fft-spectrum', title: 'FFT Spectrum', blurb: 'Real-time frequency analyzer with log-scale bins — sine, square, sawtooth, chirp waveforms.', tags: ['dsp', 'spectrum'], category: 'engineering', homeEmbedSafe: true },
  { slug: 'aliasing-and-nyquist', title: 'Aliasing and Nyquist', blurb: 'What happens when a sampled signal masquerades as a slower wave because the clock was too lazy.', tags: ['dsp', 'sampling', 'nyquist'], category: 'engineering', homeEmbedSafe: false },
  { slug: 'pid-tuner', title: 'PID Tuner', blurb: 'Step response of a PID-controlled 2nd-order plant — tune Kp, Ki, Kd and watch overshoot and settle.', tags: ['control', 'feedback'], category: 'engineering', homeEmbedSafe: true },
  { slug: 'constellation-plot', title: 'Constellation Plot', blurb: 'QPSK / 16-QAM / 64-QAM scatter through an AWGN channel — adjustable SNR and EVM.', tags: ['communications', 'modulation'], category: 'engineering', homeEmbedSafe: true },
  { slug: 'smith-chart', title: 'Smith Chart', blurb: 'Transmission line impedance matcher — animated reflection coefficient path as frequency sweeps.', tags: ['rf', 'impedance'], category: 'engineering', homeEmbedSafe: true },
  { slug: 'inverse-kinematics', title: 'Inverse Kinematics', blurb: '2R planar robot arm solving for joint angles via analytic IK — drag the end-effector.', tags: ['robotics', 'kinematics'], category: 'engineering', homeEmbedSafe: true },
  { slug: 'pll-lock-in', title: 'PLL Lock-In', blurb: 'Phase-locked loop tracking a chirped reference — P/PI loop filter, VCO frequency, lock-in visualisation.', tags: ['control', 'pll'], category: 'engineering', homeEmbedSafe: true },
  { slug: 'bode-plotter', title: 'Bode Plotter', blurb: 'Frequency response of 1st–4th order filters — LP/HP/BP/Notch with animated pole movement.', tags: ['dsp', 'filters'], category: 'engineering', homeEmbedSafe: true },
  { slug: 'feedback-stability-margins', title: 'Feedback Stability Margins', blurb: 'A Bode-plot view of how much phase and gain slack a feedback loop has before it rings or runs away.', tags: ['control', 'bode', 'stability'], category: 'engineering', homeEmbedSafe: false },
  { slug: 'transmission-line', title: 'Transmission Line Pulse', blurb: 'TDR — a voltage pulse travels, reflects, and inverts on a mismatched line.', tags: ['rf', 'tdr', 'impedance'], category: 'engineering', homeEmbedSafe: true },
  { slug: 'am-modulation', title: 'AM Modulation', blurb: 'Carrier, message, modulated signal, and spectrum — envelope, sidebands, overmodulation.', tags: ['communications', 'modulation', 'rf'], category: 'engineering', homeEmbedSafe: true },
  { slug: 'pole-zero', title: 'Pole-Zero Explorer', blurb: 'A conjugate pole pair on the s-plane, live-mapped to step response and Bode magnitude.', tags: ['control', 's-plane', 'poles', 'bode'], category: 'engineering', homeEmbedSafe: false },
  { slug: 'eye-diagram', title: 'Eye Diagram', blurb: 'Overlaid symbol traces forming a digital-comms eye — SNR, bandwidth, and roll-off open or close the decision margin.', tags: ['communications', 'dsp', 'signal integrity'], category: 'engineering', homeEmbedSafe: true },
  // ── AI & Machine Learning ───────────────────────────────────────────
  { slug: 'self-attention', title: 'Self-Attention', blurb: 'Multi-head self-attention as a live particle network — query tokens cycle, heads drift, weights flow.', tags: ['attention', 'transformer', 'deep-learning', 'neural networks'], category: 'ai', homeEmbedSafe: true },
  { slug: 'gradient-descent', title: 'Gradient Descent', blurb: 'SGD, Momentum, RMSProp, and Adam racing down a loss landscape — ravines, saddles, and local minima.', tags: ['optimization', 'deep-learning', 'training'], category: 'ai', homeEmbedSafe: true },
  { slug: 'pathfinding', title: 'A* Pathfinder', blurb: 'A*, Dijkstra, and greedy best-first search — the heuristic pulling the frontier toward the goal.', tags: ['search', 'graphs', 'a-star'], category: 'ai', homeEmbedSafe: true },
  { slug: 'k-means', title: 'k-Means Clustering', blurb: "Lloyd's algorithm on Gaussian blobs — points snap to their nearest centroid, then centroids glide to each mean.", tags: ['clustering', 'unsupervised', 'lloyd', 'voronoi'], category: 'ai', homeEmbedSafe: true },
  { slug: 'neural-boundary', title: 'Neural Decision Boundary', blurb: 'A tiny MLP trained live, its decision boundary bending to separate spirals, moons, circles, and XOR.', tags: ['neural networks', 'backpropagation', 'classification', 'decision boundary'], category: 'ai', homeEmbedSafe: true },
  { slug: 'circuit-sim', title: 'Circuit Simulator', blurb: 'Drag-and-drop circuit builder with SPICE-style transient simulation and a built-in oscilloscope.', tags: ['circuits', 'spice', 'mna', 'oscilloscope'], category: 'engineering', homeEmbedSafe: false },
  // ── Cosmology ───────────────────────────────────────────────────────
  { slug: 'universe-scale', title: 'Universe Scale', blurb: 'A logarithmic zoom from the Planck length to the observable universe — ant, whale, Everest, Earth, Sun, galaxy.', tags: ['scale', 'cosmology', 'powers of ten', 'log'], category: 'cosmology', homeEmbedSafe: false },
  { slug: 'spacetime-curvature', title: 'Spacetime Curvature', blurb: 'A mass curving an embedding sheet, with geodesics and bending light rays.', tags: ['general relativity', 'geodesics', 'gravity'], category: 'cosmology', homeEmbedSafe: true },
  { slug: 'black-hole', title: 'Black Hole', blurb: 'Schwarzschild geometry: event horizon, photon sphere, ISCO, lensing shadow, and an infalling probe.', tags: ['black hole', 'schwarzschild', 'event horizon'], category: 'cosmology', homeEmbedSafe: true },
  { slug: 'black-hole-sim', title: 'Black Hole Ray Tracer', blurb: 'A general-relativistic ray tracer: per-pixel null geodesics around a Schwarzschild black hole, with a physically-shaded accretion disk, Doppler beaming, and live EHT-scale readouts.', tags: ['general relativity', 'ray tracing', 'geodesics', 'accretion disk', 'webgl'], category: 'cosmology', homeEmbedSafe: false },
  { slug: 'holographic-bound', title: 'Holographic Bound', blurb: 'Entropy scales with area, not volume — pixels tiling a horizon, and the Bekenstein bound.', tags: ['holographic principle', 'entropy', 'bekenstein bound'], category: 'cosmology', homeEmbedSafe: false },
  { slug: 'cosmic-expansion', title: 'Cosmic Expansion', blurb: 'The FLRW scale factor a(t), Hubble flow, redshift, and the fate of the universe.', tags: ['cosmology', 'flrw', 'hubble', 'dark energy'], category: 'cosmology', homeEmbedSafe: true },
  { slug: 'cmb-sky', title: 'CMB Sky', blurb: 'The last-scattering temperature map and its acoustic-peak power spectrum.', tags: ['cmb', 'cosmology', 'acoustic peaks'], category: 'cosmology', homeEmbedSafe: true },
  { slug: 'rotation-curve', title: 'Galaxy Rotation Curve', blurb: 'Keplerian decline vs the observed flat curve, and the dark-matter halo that flattens it.', tags: ['dark matter', 'galaxy', 'rotation curve'], category: 'cosmology', homeEmbedSafe: true },
  { slug: 'hr-diagram', title: 'HR Diagram', blurb: "A star's evolutionary track across the Hertzsprung-Russell diagram, by initial mass.", tags: ['stars', 'stellar evolution', 'hr diagram'], category: 'cosmology', homeEmbedSafe: false },
  { slug: 'gw-chirp', title: 'Gravitational-Wave Chirp', blurb: 'A compact-binary inspiral strain h(t): chirp, merger, and ringdown, with a spectrogram.', tags: ['gravitational waves', 'ligo', 'inspiral'], category: 'cosmology', homeEmbedSafe: true },
  { slug: 'fine-tuning', title: 'Fine-Tuning Dials', blurb: 'Nudge the constants of nature and watch a habitability readout collapse off-tune.', tags: ['anthropic', 'fine-tuning', 'multiverse'], category: 'cosmology', homeEmbedSafe: false },
  { slug: 'gravitational-lensing', title: 'Gravitational Lensing', blurb: 'A foreground mass bends background light into twin arcs and a full Einstein ring.', tags: ['general relativity', 'lensing', 'einstein ring'], category: 'cosmology', homeEmbedSafe: true },
  { slug: 'exoplanet-transit', title: 'Exoplanet Transit', blurb: 'A planet crossing a limb-darkened star, drawing its dip in the measured light curve.', tags: ['exoplanets', 'photometry', 'transit'], category: 'cosmology', homeEmbedSafe: true },
]

export function getEffect(slug: string): LabEntry | undefined {
  return LAB_EFFECTS.find((e) => e.slug === slug)
}

const LAB_CONCEPT_GUIDE_SLUG_LIST = [
  'aliasing-and-nyquist',
  'feedback-stability-margins',
  'complex-maps-and-airfoils',
  'chaos-sensitivity',
  'turing-patterns',
] as const

export const LAB_CONCEPT_GUIDE_SLUGS: ReadonlySet<string> = new Set(LAB_CONCEPT_GUIDE_SLUG_LIST)

export function isLabConceptGuide(slug: string): boolean {
  return LAB_CONCEPT_GUIDE_SLUGS.has(slug)
}

export const LAB_CONCEPT_GUIDES = LAB_EFFECTS.filter((e) => isLabConceptGuide(e.slug))
export const LAB_DEMO_EFFECTS = LAB_EFFECTS.filter((e) => !isLabConceptGuide(e.slug))
export const HOME_EMBED_EFFECTS = LAB_DEMO_EFFECTS.filter((e) => e.homeEmbedSafe)
export function effectsByCategory(cat: LabCategory): LabEntry[] {
  return LAB_DEMO_EFFECTS.filter((e) => e.category === cat)
}
export function conceptGuidesByCategory(cat: LabCategory): LabEntry[] {
  return LAB_CONCEPT_GUIDES.filter((e) => e.category === cat)
}

// ── Dynamic effect module loaders (code-split per effect) ──────────────
// Each value is a dynamic import that creates its own chunk containing
// ONLY that effect's renderer code. The registry has NO static imports
// from any effect file, so unrelated effects are never bundled together.
export const EFFECT_LOADERS: Record<string, () => Promise<EffectModule>> = {
  'orbits': () => import('@/components/lab/effects/orbits').then(m => m.orbits),
  'flow-field': () => import('@/components/lab/effects/flow-field').then(m => m.flowField),
  'starfield': () => import('@/components/lab/effects/starfield').then(m => m.starfield),
  'cyclic-automaton': () => import('@/components/lab/effects/cyclic-automaton').then(m => m.cyclicAutomaton),
  'ripple-grid': () => import('@/components/lab/effects/ripple-grid').then(m => m.rippleGrid),
  'mesh-wave': () => import('@/components/lab/effects/mesh-wave').then(m => m.meshWave),
  'voronoi-bloom': () => import('@/components/lab/effects/voronoi-bloom').then(m => m.voronoiBloom),
  'double-pendulum': () => import('@/components/lab/effects/double-pendulum').then(m => m.doublePendulum),
  'logistic-bifurcation': () => import('@/components/lab/effects/logistic-bifurcation').then(m => m.LogisticBifurcation),
  'mandelbrot-julia': () => import('@/components/lab/effects/mandelbrot-julia').then(m => m.MandelbrotJulia),
  'flow-streams': () => import('@/components/lab/effects/flow-streams').then(m => m.flowStreams),
  'metaball-bloom': () => import('@/components/lab/effects/metaball-bloom').then(m => m.metaballBloom),
  'spirograph-rose': () => import('@/components/lab/effects/spirograph-rose').then(m => m.spirographRose),
  'dot-lattice': () => import('@/components/lab/effects/dot-lattice').then(m => m.dotLattice),
  'boids-flocking': () => import('@/components/lab/effects/boids-flocking').then(m => m.BoidsFlocking),
  'truchet-tiles': () => import('@/components/lab/effects/truchet-tiles').then(m => m.TruchetTiles),
  'phase-portrait': () => import('@/components/lab/effects/phase-portrait').then(m => m.phasePortrait),
  'conformal-grid': () => import('@/components/lab/effects/conformal-grid').then(m => m.conformalGrid),
  'complex-maps-and-airfoils': () => import('@/components/lab/effects/conformal-grid').then(m => m.conformalGrid),
  'random-walk': () => import('@/components/lab/effects/random-walk').then(m => m.randomWalk),
  'fourier-series': () => import('@/components/lab/effects/fourier-series').then(m => m.fourierSeries),
  'wave-superposition': () => import('@/components/lab/effects/wave-superposition').then(m => m.waveSuperposition),
  'bloch-sphere': () => import('@/components/lab/effects/bloch-sphere').then(m => m.blochSphere),
  'band-structure': () => import('@/components/lab/effects/band-structure').then(m => m.bandStructure),
  'quantum-tunneling': () => import('@/components/lab/effects/quantum-tunneling').then(m => m.quantumTunneling),
  'ising-model': () => import('@/components/lab/effects/ising-model').then(m => m.IsingModel),
  'kinetic-gas': () => import('@/components/lab/effects/kinetic-gas').then(m => m.KineticGas),
  'rlc-resonance': () => import('@/components/lab/effects/rlc-resonance').then(m => m.rlcResonance),
  'fft-spectrum': () => import('@/components/lab/effects/fft-spectrum').then(m => m.fftSpectrum),
  'pid-tuner': () => import('@/components/lab/effects/pid-tuner').then(m => m.pidTuner),
  'aliasing-and-nyquist': () => import('@/components/lab/effects/fft-spectrum').then(m => m.fftSpectrum),
  'constellation-plot': () => import('@/components/lab/effects/constellation-plot').then(m => m.constellationPlot),
  'smith-chart': () => import('@/components/lab/effects/smith-chart').then(m => m.smithChart),
  'inverse-kinematics': () => import('@/components/lab/effects/inverse-kinematics').then(m => m.inverseKinematics),
  'pll-lock-in': () => import('@/components/lab/effects/pll-lock-in').then(m => m.pllLockIn),
  'bode-plotter': () => import('@/components/lab/effects/bode-plotter').then(m => m.bodePlotter),
  'feedback-stability-margins': () => import('@/components/lab/effects/bode-plotter').then(m => m.bodePlotter),
  'lorenz-attractor': () => import('@/components/lab/effects/lorenz-attractor').then(m => m.lorenzAttractor),
  'chaos-sensitivity': () => import('@/components/lab/effects/lorenz-attractor').then(m => m.lorenzAttractor),
  'transmission-line': () => import('@/components/lab/effects/transmission-line').then(m => m.transmissionLine),
  'coupled-oscillators': () => import('@/components/lab/effects/coupled-oscillators').then(m => m.coupledOscillators),
  'am-modulation': () => import('@/components/lab/effects/am-modulation').then(m => m.amModulation),
  'pole-zero': () => import('@/components/lab/effects/pole-zero').then(m => m.PoleZero),
  'eye-diagram': () => import('@/components/lab/effects/eye-diagram').then(m => m.EyeDiagram),
  'self-attention': () => import('@/components/lab/effects/self-attention').then(m => m.selfAttention),
  'reaction-diffusion': () => import('@/components/lab/effects/reaction-diffusion').then(m => m.reactionDiffusion),
  'turing-patterns': () => import('@/components/lab/effects/reaction-diffusion').then(m => m.reactionDiffusion),
  'gradient-descent': () => import('@/components/lab/effects/gradient-descent').then(m => m.gradientDescent),
  'pathfinding': () => import('@/components/lab/effects/pathfinding').then(m => m.pathfinding),
  'k-means': () => import('@/components/lab/effects/k-means').then(m => m.KMeans),
  'neural-boundary': () => import('@/components/lab/effects/neural-boundary').then(m => m.NeuralBoundary),
  // ── Cosmology ───────────────────────────────────────────────────────
  'spacetime-curvature': () => import('@/components/lab/effects/spacetime-curvature').then(m => m.spacetimeCurvature),
  'black-hole': () => import('@/components/lab/effects/black-hole').then(m => m.blackHole),
  'holographic-bound': () => import('@/components/lab/effects/holographic-bound').then(m => m.holographicBound),
  'cosmic-expansion': () => import('@/components/lab/effects/cosmic-expansion').then(m => m.cosmicExpansion),
  'cmb-sky': () => import('@/components/lab/effects/cmb-sky').then(m => m.cmbSky),
  'rotation-curve': () => import('@/components/lab/effects/rotation-curve').then(m => m.rotationCurve),
  'hr-diagram': () => import('@/components/lab/effects/hr-diagram').then(m => m.hrDiagram),
  'gw-chirp': () => import('@/components/lab/effects/gw-chirp').then(m => m.gwChirp),
  'fine-tuning': () => import('@/components/lab/effects/fine-tuning').then(m => m.fineTuning),
  'gravitational-lensing': () => import('@/components/lab/effects/gravitational-lensing').then(m => m.GravitationalLensing),
  'exoplanet-transit': () => import('@/components/lab/effects/exoplanet-transit').then(m => m.ExoplanetTransit),
}
