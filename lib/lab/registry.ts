import type { LabEffect, LabCategory } from '@/lib/gen/content'
import type { EffectModule, ControlSpec, Params } from './types'
import { orbits } from '@/components/lab/effects/orbits'
import { flowField } from '@/components/lab/effects/flow-field'
import { starfield } from '@/components/lab/effects/starfield'
import { cyclicAutomaton } from '@/components/lab/effects/cyclic-automaton'
import { rippleGrid } from '@/components/lab/effects/ripple-grid'
import { meshWave } from '@/components/lab/effects/mesh-wave'
import { voronoiBloom } from '@/components/lab/effects/voronoi-bloom'
import { doublePendulum } from '@/components/lab/effects/double-pendulum'
import { flowStreams } from '@/components/lab/effects/flow-streams'
import { metaballBloom } from '@/components/lab/effects/metaball-bloom'
import { spirographRose } from '@/components/lab/effects/spirograph-rose'
import { dotLattice } from '@/components/lab/effects/dot-lattice'
import { phasePortrait } from '@/components/lab/effects/phase-portrait'
import { conformalGrid } from '@/components/lab/effects/conformal-grid'
import { randomWalk } from '@/components/lab/effects/random-walk'
import { fourierSeries } from '@/components/lab/effects/fourier-series'
import { waveSuperposition } from '@/components/lab/effects/wave-superposition'
import { blochSphere } from '@/components/lab/effects/bloch-sphere'
import { bandStructure } from '@/components/lab/effects/band-structure'
import { quantumTunneling } from '@/components/lab/effects/quantum-tunneling'
import { rlcResonance } from '@/components/lab/effects/rlc-resonance'
import { fftSpectrum } from '@/components/lab/effects/fft-spectrum'
import { pidTuner } from '@/components/lab/effects/pid-tuner'
import { constellationPlot } from '@/components/lab/effects/constellation-plot'
import { smithChart } from '@/components/lab/effects/smith-chart'
import { inverseKinematics } from '@/components/lab/effects/inverse-kinematics'
import { pllLockIn } from '@/components/lab/effects/pll-lock-in'
import { bodePlotter } from '@/components/lab/effects/bode-plotter'
import { lorenzAttractor } from '@/components/lab/effects/lorenz-attractor'
import { transmissionLine } from '@/components/lab/effects/transmission-line'
import { coupledOscillators } from '@/components/lab/effects/coupled-oscillators'
import { amModulation } from '@/components/lab/effects/am-modulation'

export type LabEntry = LabEffect & {
  module: EffectModule
  controls: ControlSpec[]
  defaults: Params
}

function entry(meta: LabEffect, module: EffectModule): LabEntry {
  return { ...meta, module, controls: module.controls, defaults: module.defaults }
}

// ── Category metadata ──────────────────────────────────────────────────
export const CATEGORIES: { key: LabCategory; label: string; glyph: string; blurb: string }[] = [
  { key: 'art', label: 'Generative Art', glyph: '◆', blurb: 'Canvas animations exploring noise, flow, and organic form.' },
  { key: 'maths', label: 'Mathematics', glyph: '∫', blurb: 'Visualising differential equations, geometry, and statistics.' },
  { key: 'physics', label: 'Physics', glyph: 'ψ', blurb: 'Waves, quantum states, and condensed-matter phenomena.' },
  { key: 'engineering', label: 'Electrical Engineering', glyph: 'Ω', blurb: 'Circuits, signal processing, control systems, and software radio.' },
]

export const LAB_EFFECTS: LabEntry[] = [
  // ── Art ─────────────────────────────────────────────────────────────
  entry({ slug: 'orbits', title: 'Orbits', blurb: 'Bodies tracing a shared circle, leaving light trails.', tags: ['trails', 'trig'], category: 'art', homeEmbedSafe: true }, orbits),
  entry({ slug: 'flow-field', title: 'Flow Field', blurb: 'Particles advected by a value-noise vector field.', tags: ['noise', 'particles'], category: 'art', homeEmbedSafe: false }, flowField),
  entry({ slug: 'starfield', title: 'Starfield', blurb: 'Parallax warp toward a vanishing point.', tags: ['3d', 'parallax'], category: 'art', homeEmbedSafe: true }, starfield),
  entry({ slug: 'cyclic-automaton', title: 'Cyclic Automaton', blurb: 'Cells advancing in a colour cycle when enough neighbours lead.', tags: ['automata', 'grid'], category: 'art', homeEmbedSafe: false }, cyclicAutomaton),
  entry({ slug: 'ripple-grid', title: 'Ripple Grid', blurb: 'A dot grid pulsing with summed sine-wave interference.', tags: ['waves', 'grid'], category: 'art', homeEmbedSafe: true }, rippleGrid),
  entry({ slug: 'mesh-wave', title: 'Mesh Wave', blurb: 'Isometric wireframe terrain with layered sine waves.', tags: ['3d', 'wireframe'], category: 'art', homeEmbedSafe: true }, meshWave),
  entry({ slug: 'voronoi-bloom', title: 'Voronoi Bloom', blurb: 'Drifting gradient blobs blending into organic stained-glass cells.', tags: ['voronoi', 'gradient'], category: 'art', homeEmbedSafe: true }, voronoiBloom),
  entry({ slug: 'flow-streams', title: 'Flow Streams', blurb: 'Ink-like streamlines curling through a noise field.', tags: ['noise', 'ink'], category: 'art', homeEmbedSafe: true }, flowStreams),
  entry({ slug: 'metaball-bloom', title: 'Metaball Bloom', blurb: 'Organic gradient blobs merging and splitting in lava-lamp motion.', tags: ['gradient', 'organic'], category: 'art', homeEmbedSafe: true }, metaballBloom),
  entry({ slug: 'spirograph-rose', title: 'Spirograph Rose', blurb: 'Layered parametric curves drawing vintage generative spirographs.', tags: ['parametric', 'curves'], category: 'art', homeEmbedSafe: true }, spirographRose),
  entry({ slug: 'dot-lattice', title: 'Dot Lattice', blurb: 'A breathing dot grid modulated by layered noise waves.', tags: ['grid', 'noise'], category: 'art', homeEmbedSafe: true }, dotLattice),
  // ── Maths ───────────────────────────────────────────────────────────
  entry({ slug: 'double-pendulum', title: 'Double Pendulum', blurb: 'Chaotic pendulums diverging from near-identical starting conditions.', tags: ['chaos', 'ode'], category: 'maths', homeEmbedSafe: true }, doublePendulum),
  entry({ slug: 'phase-portrait', title: 'Phase Portrait', blurb: 'ODE trajectories flowing through vector fields — Lotka-Volterra, Van der Pol, Duffing.', tags: ['ode', 'dynamical systems'], category: 'maths', homeEmbedSafe: true }, phasePortrait),
  entry({ slug: 'conformal-grid', title: 'Conformal Grid', blurb: 'Complex mappings deforming a Cartesian grid — Joukowski, power maps, inversion.', tags: ['complex analysis', 'differential geometry'], category: 'maths', homeEmbedSafe: true }, conformalGrid),
  entry({ slug: 'random-walk', title: 'Random Walk', blurb: 'Stochastic walks converging to the Gaussian via the central limit theorem.', tags: ['statistics', 'probability'], category: 'maths', homeEmbedSafe: true }, randomWalk),
  entry({ slug: 'fourier-series', title: 'Fourier Series', blurb: 'Epicycles tracing waveforms — Gibbs phenomenon, harmonic decomposition.', tags: ['analysis', 'fourier'], category: 'maths', homeEmbedSafe: true }, fourierSeries),
  entry({ slug: 'lorenz-attractor', title: 'Lorenz Attractor', blurb: 'The classic chaotic 3D butterfly — two trajectories diverge from near-identical starts.', tags: ['chaos', 'ode', 'butterfly effect'], category: 'maths', homeEmbedSafe: true }, lorenzAttractor),
  // ── Physics ─────────────────────────────────────────────────────────
  entry({ slug: 'wave-superposition', title: 'Wave Superposition', blurb: 'Interference of two plane waves — beats, standing waves, and nodes.', tags: ['waves', 'interference'], category: 'physics', homeEmbedSafe: true }, waveSuperposition),
  entry({ slug: 'bloch-sphere', title: 'Bloch Sphere', blurb: 'Qubit state precessing on the Bloch sphere under a magnetic Hamiltonian.', tags: ['quantum', 'qm'], category: 'physics', homeEmbedSafe: true }, blochSphere),
  entry({ slug: 'band-structure', title: 'Band Structure', blurb: 'Nearly-free electron E-k diagram with Brillouin zone gaps.', tags: ['condensed matter', 'solid state'], category: 'physics', homeEmbedSafe: true }, bandStructure),
  entry({ slug: 'quantum-tunneling', title: 'Quantum Tunneling', blurb: 'Gaussian wave packet tunnelling through a rectangular barrier.', tags: ['quantum', 'tunneling'], category: 'physics', homeEmbedSafe: true }, quantumTunneling),
  entry({ slug: 'coupled-oscillators', title: 'Coupled Oscillators', blurb: 'Two mass-spring systems exchanging energy via normal-mode beating.', tags: ['mechanics', 'normal modes', 'beats'], category: 'physics', homeEmbedSafe: true }, coupledOscillators),
  // ── Engineering ──────────────────────────────────────────────────────
  entry({ slug: 'rlc-resonance', title: 'RLC Resonance', blurb: 'Transient step response of a series RLC circuit — underdamped ringing vs critical damping.', tags: ['circuits', 'transient'], category: 'engineering', homeEmbedSafe: true }, rlcResonance),
  entry({ slug: 'fft-spectrum', title: 'FFT Spectrum', blurb: 'Real-time frequency analyzer with log-scale bins — sine, square, sawtooth, chirp waveforms.', tags: ['dsp', 'spectrum'], category: 'engineering', homeEmbedSafe: true }, fftSpectrum),
  entry({ slug: 'pid-tuner', title: 'PID Tuner', blurb: 'Step response of a PID-controlled 2nd-order plant — tune Kp, Ki, Kd and watch overshoot and settle.', tags: ['control', 'feedback'], category: 'engineering', homeEmbedSafe: true }, pidTuner),
  entry({ slug: 'constellation-plot', title: 'Constellation Plot', blurb: 'QPSK / 16-QAM / 64-QAM scatter through an AWGN channel — adjustable SNR and EVM.', tags: ['communications', 'modulation'], category: 'engineering', homeEmbedSafe: true }, constellationPlot),
  entry({ slug: 'smith-chart', title: 'Smith Chart', blurb: 'Transmission line impedance matcher — animated reflection coefficient path as frequency sweeps.', tags: ['rf', 'impedance'], category: 'engineering', homeEmbedSafe: true }, smithChart),
  entry({ slug: 'inverse-kinematics', title: 'Inverse Kinematics', blurb: '2R planar robot arm solving for joint angles via analytic IK — drag the end-effector.', tags: ['robotics', 'kinematics'], category: 'engineering', homeEmbedSafe: true }, inverseKinematics),
  entry({ slug: 'pll-lock-in', title: 'PLL Lock-In', blurb: 'Phase-locked loop tracking a chirped reference — P/PI loop filter, VCO frequency, lock-in visualisation.', tags: ['control', 'pll'], category: 'engineering', homeEmbedSafe: true }, pllLockIn),
  entry({ slug: 'bode-plotter', title: 'Bode Plotter', blurb: 'Frequency response of 1st–4th order filters — LP/HP/BP/Notch with animated pole movement.', tags: ['dsp', 'filters'], category: 'engineering', homeEmbedSafe: true }, bodePlotter),
  entry({ slug: 'transmission-line', title: 'Transmission Line Pulse', blurb: 'TDR — a voltage pulse travels, reflects, and inverts on a mismatched line.', tags: ['rf', 'tdr', 'impedance'], category: 'engineering', homeEmbedSafe: true }, transmissionLine),
  entry({ slug: 'am-modulation', title: 'AM Modulation', blurb: 'Carrier, message, modulated signal, and spectrum — envelope, sidebands, overmodulation.', tags: ['communications', 'modulation', 'rf'], category: 'engineering', homeEmbedSafe: true }, amModulation),
]

export function getEffect(slug: string): LabEntry | undefined {
  return LAB_EFFECTS.find((e) => e.slug === slug)
}
export const HOME_EMBED_EFFECTS = LAB_EFFECTS.filter((e) => e.homeEmbedSafe)
export function effectsByCategory(cat: LabCategory): LabEntry[] {
  return LAB_EFFECTS.filter((e) => e.category === cat)
}
