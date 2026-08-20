export interface VectorItem {
  id: string
  name: string
  filename_stem: string
  semantic_role: string
  description: string
  generation_prompt: string
  grid_index: number
  desired_formats: string[]
  required_formats: string[]
  required: boolean
  svgPath: string
  pngPath: string
  batchId: string
  category: string
  categoryKey: string
  accentColor: string
}

export interface VectorBatchManifest {
  id: string
  category: string
  categoryKey: string
  label: string
  brief: string
  accentColor: string
  glyph: string
  sessionId?: string
  runId?: string
  canvasUrl?: string
  galleryUrl?: string
  completedAt?: string
  items: VectorItem[]
}

export interface VectorCategory {
  key: string
  label: string
  glyph: string
  accent: string
  description: string
}

export const VECTOR_CATEGORIES: VectorCategory[] = [
  {
    key: 'math-functions',
    label: 'Math & Analysis',
    glyph: '∫',
    accent: '#7c5cff',
    description: 'Continuous harmonic waves, calculus trajectories, coordinate geometry, and vector fields.',
  },
  {
    key: 'physics-quantum',
    label: 'Physics & Quantum',
    glyph: 'Ψ',
    accent: '#ff7a59',
    description: 'Black hole event horizons, phase-space dynamical orbits, quantum wavepackets, and dipole fields.',
  },
  {
    key: 'cs-algorithms',
    label: 'Computer Science',
    glyph: 'λ',
    accent: '#00e0b8',
    description: 'Directed acyclic graphs, balanced trees, attention interconnects, hash rings, and state automata.',
  },
  {
    key: 'distributed-systems',
    label: 'Distributed Systems',
    glyph: '⚡',
    accent: '#00b4d8',
    description: 'Consensus quorums, event stream pipelines, mesh gossip networks, circuit breakers, and fanouts.',
  },
  {
    key: 'rf-electronics',
    label: 'RF & Electronics',
    glyph: '∿',
    accent: '#eab308',
    description: 'Smith chart impedance coordinates, LC resonators, dipole antennas, and active operational amplifiers.',
  },
]

export const CATEGORY_MAP = new Map(VECTOR_CATEGORIES.map((c) => [c.key, c]))

export const DEFAULT_BATCH_CONFIGS: Record<string, { label: string; category: string; brief: string; glyph: string; accent: string; items: Omit<VectorItem, 'svgPath' | 'pngPath' | 'batchId' | 'category' | 'categoryKey' | 'accentColor'>[] }> = {
  'math-functions': {
    label: 'Mathematical Functions & Analysis',
    category: 'Mathematics & Analysis',
    brief: 'Continuous harmonic waves, coordinate geometry, calculus trajectories, and vector fields.',
    glyph: '∫',
    accent: '#7c5cff',
    items: [
      {
        id: 'sine-wave',
        name: 'Sine Wave',
        filename_stem: 'sine-wave',
        semantic_role: 'periodic-function',
        description: 'Smooth luminous harmonic sinusoid wave crossing a minimal horizontal baseline.',
        generation_prompt: 'Draw one elegant glowing sine wave with two balanced sinusoidal cycles, a subtle origin point, and a clean horizontal axis line; strictly no text, labels, or numbers.',
        grid_index: 0,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
      {
        id: 'cartesian-parabola',
        name: 'Cartesian Parabola',
        filename_stem: 'cartesian-parabola',
        semantic_role: 'quadratic-function',
        description: 'Symmetric upward parabolic curve with highlighted vertex and orthogonal axes.',
        generation_prompt: 'Draw one clean upward quadratic parabola with orthogonal coordinate axes, a highlighted vertex node, and no surrounding text or numbers.',
        grid_index: 1,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
      {
        id: 'vector-field',
        name: 'Vector Field',
        filename_stem: 'vector-field',
        semantic_role: 'direction-field',
        description: 'Swirling directional arrow field rotating smoothly around a central attractor.',
        generation_prompt: 'Draw a sparse rotational vector field with cleanly weighted directional arrows orbiting a subtle central attractor node; no text.',
        grid_index: 2,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
      {
        id: 'integral-trajectory',
        name: 'Integral Trajectory',
        filename_stem: 'integral-trajectory',
        semantic_role: 'calculus-trajectory',
        description: 'Smooth calculus integral trajectory curve threading through minimal tangent vectors.',
        generation_prompt: 'Draw one luminous continuous integral curve threading through four minimal direction arrows; no integral symbol, letters, or numbers.',
        grid_index: 3,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
      {
        id: 'fourier-harmonics',
        name: 'Fourier Harmonics',
        filename_stem: 'fourier-harmonics',
        semantic_role: 'harmonic-superposition',
        description: 'Multi-frequency harmonic wave superposition showing spectral synthesis.',
        generation_prompt: 'Draw three harmonically superimposed wave frequencies combining into a composite waveform with clean geometric lines and no text.',
        grid_index: 4,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
    ],
  },
  'physics-quantum': {
    label: 'Physics & Quantum Phenomena',
    category: 'Physics & Quantum',
    brief: 'Black hole event horizons, phase-space dynamical orbits, quantum wavepackets, and dipole fields.',
    glyph: 'Ψ',
    accent: '#ff7a59',
    items: [
      {
        id: 'black-hole-geodesic',
        name: 'Black Hole Geodesic',
        filename_stem: 'black-hole-geodesic',
        semantic_role: 'spacetime-curvature',
        description: 'Curved light geodesic bending around an event horizon silhouette.',
        generation_prompt: 'Draw a circular event horizon silhouette with light geodesics gravitationally lensing around it in glowing concentric arcs; strictly no text.',
        grid_index: 0,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
      {
        id: 'phase-space-orbit',
        name: 'Phase Space Orbit',
        filename_stem: 'phase-space-orbit',
        semantic_role: 'dynamical-system',
        description: 'Elliptical state trajectory spiraling in 2D momentum-position phase space.',
        generation_prompt: 'Draw an elegant elliptical spiral phase-space trajectory with subtle directional arrows indicating state flow; no text or numbers.',
        grid_index: 1,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
      {
        id: 'wavepacket-quantum',
        name: 'Quantum Wavepacket',
        filename_stem: 'wavepacket-quantum',
        semantic_role: 'wavefunction',
        description: 'Gaussian wavepacket envelope modulating high-frequency probability oscillations.',
        generation_prompt: 'Draw a localized Gaussian wavepacket envelope modulating sinusoidal oscillations with a central amplitude peak; no text.',
        grid_index: 2,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
      {
        id: 'magnetic-dipole',
        name: 'Magnetic Dipole Field',
        filename_stem: 'magnetic-dipole',
        semantic_role: 'electromagnetism',
        description: 'Toroidal magnetic dipole field lines looping symmetrically between dual poles.',
        generation_prompt: 'Draw symmetric toroidal dipole magnetic field lines looping smoothly around dual magnetic pole nodes; no text or letters.',
        grid_index: 3,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
      {
        id: 'prism-dispersion',
        name: 'Prism Dispersion',
        filename_stem: 'prism-dispersion',
        semantic_role: 'optics-refraction',
        description: 'Geometric triangular prism refracting a light beam into divergent rays.',
        generation_prompt: 'Draw a minimal triangular glass prism with an incident ray refracting and fanning out into distinct divergent spectral rays; no text.',
        grid_index: 4,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
    ],
  },
  'cs-algorithms': {
    label: 'Algorithms & Data Structures',
    category: 'Computer Science & AI',
    brief: 'Directed acyclic graphs, balanced trees, attention interconnects, hash rings, and state automata.',
    glyph: 'λ',
    accent: '#00e0b8',
    items: [
      {
        id: 'binary-search-tree',
        name: 'Binary Search Tree',
        filename_stem: 'binary-search-tree',
        semantic_role: 'hierarchical-tree',
        description: 'Balanced binary tree graph with highlighted traversal path.',
        generation_prompt: 'Draw a balanced binary tree hierarchy with connected circular nodes and one highlighted traversal branch; no text or numbers inside nodes.',
        grid_index: 0,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
      {
        id: 'consistent-hash-ring',
        name: 'Consistent Hash Ring',
        filename_stem: 'consistent-hash-ring',
        semantic_role: 'distributed-hashing',
        description: 'Circular hash ring with partitioned virtual nodes and keys.',
        generation_prompt: 'Draw a circular ring with evenly spaced perimeter node markers and connecting partition chords; no text or numbers.',
        grid_index: 1,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
      {
        id: 'directed-acyclic-graph',
        name: 'Directed Acyclic Graph',
        filename_stem: 'directed-acyclic-graph',
        semantic_role: 'causal-dag',
        description: 'Topological DAG showing dependency workflow with directional edges.',
        generation_prompt: 'Draw a crisp directed acyclic graph (DAG) with interconnected circular nodes and clean arrowed dependency edges; no text.',
        grid_index: 2,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
      {
        id: 'transformer-attention',
        name: 'Self-Attention Graph',
        filename_stem: 'transformer-attention',
        semantic_role: 'neural-attention',
        description: 'Bipartite multi-head attention interconnect showing weighted neural links.',
        generation_prompt: 'Draw a bipartite neural network attention layer with parallel query-key nodes connected by weighted glowing link rays; no text.',
        grid_index: 3,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
      {
        id: 'state-machine',
        name: 'Finite State Machine',
        filename_stem: 'state-machine',
        semantic_role: 'automata-theory',
        description: 'Finite state automaton with transition arcs and accept state rings.',
        generation_prompt: 'Draw a finite state machine graph with circular state nodes, transition loop arcs, and a double-ring accept state; no text inside nodes.',
        grid_index: 4,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
    ],
  },
  'distributed-systems': {
    label: 'Distributed Systems & Cloud Architecture',
    category: 'Distributed Systems & Cloud',
    brief: 'Consensus quorums, event stream pipelines, mesh gossip networks, circuit breakers, and fanouts.',
    glyph: '⚡',
    accent: '#00b4d8',
    items: [
      {
        id: 'raft-consensus',
        name: 'Raft Consensus Quorum',
        filename_stem: 'raft-consensus',
        semantic_role: 'distributed-consensus',
        description: 'Leader node replicating log entries across a consensus cluster quorum.',
        generation_prompt: 'Draw a leader node sending replicated sync rays to a majority quorum of follower nodes in a circular ring; no text.',
        grid_index: 0,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
      {
        id: 'event-stream',
        name: 'Event Stream Pipeline',
        filename_stem: 'event-stream',
        semantic_role: 'event-driven-streaming',
        description: 'Continuous sequenced event stream queue partitioning into consumer workers.',
        generation_prompt: 'Draw a high-throughput partitioned event stream pipeline fanning out into parallel consumer queues with glowing event tokens; no text.',
        grid_index: 1,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
      {
        id: 'gossip-mesh',
        name: 'Mesh Gossip Protocol',
        filename_stem: 'gossip-mesh',
        semantic_role: 'epidemic-dissemination',
        description: 'Peer-to-peer mesh gossip topology spreading state sync across nodes.',
        generation_prompt: 'Draw a decentralized peer-to-peer mesh network showing random pairwise gossip links exchanging pulse ripples; no text.',
        grid_index: 2,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
      {
        id: 'circuit-breaker',
        name: 'Circuit Breaker Switch',
        filename_stem: 'circuit-breaker',
        semantic_role: 'fault-tolerance',
        description: 'Trip mechanism isolating failing services and protecting system resilience.',
        generation_prompt: 'Draw a resilient circuit breaker contact switch isolating upstream load from a downstream faulted node; no text.',
        grid_index: 3,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
      {
        id: 'load-balancer',
        name: 'Load Balancer Fanout',
        filename_stem: 'load-balancer',
        semantic_role: 'traffic-steering',
        description: 'High-availability reverse proxy distributing traffic across balanced backend pools.',
        generation_prompt: 'Draw an ingress gateway distributing smooth balanced traffic streams across five symmetric backend service instances; no text.',
        grid_index: 4,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
    ],
  },
  'rf-electronics': {
    label: 'RF & Electronics Hardware',
    category: 'RF & Electronics',
    brief: 'Smith chart impedance coordinates, LC resonators, dipole antennas, and active operational amplifiers.',
    glyph: '∿',
    accent: '#eab308',
    items: [
      {
        id: 'smith-chart',
        name: 'Smith Chart Polar Grid',
        filename_stem: 'smith-chart',
        semantic_role: 'rf-impedance',
        description: 'Circular impedance chart with orthogonal resistance and reactance circles.',
        generation_prompt: 'Draw a clean circular Smith chart showing conformal orthogonal resistance and reactance circular arcs with an impedance match point; strictly no numbers or text.',
        grid_index: 0,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
      {
        id: 'lc-tank-circuit',
        name: 'LC Resonator Tank',
        filename_stem: 'lc-tank-circuit',
        semantic_role: 'resonant-oscillator',
        description: 'Parallel inductor coil and capacitor plates resonating at high frequency.',
        generation_prompt: 'Draw an LC resonant tank circuit showing a coiled inductor and parallel capacitor plates with radiating electromagnetic oscillations; no text.',
        grid_index: 1,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
      {
        id: 'op-amp-differential',
        name: 'Operational Amplifier',
        filename_stem: 'op-amp-differential',
        semantic_role: 'analog-signal-chain',
        description: 'Triangular differential op-amp symbol with inverting and non-inverting ports.',
        generation_prompt: 'Draw a clean triangular operational amplifier symbol with dual differential inputs and one driven output line; no + or - text inside triangle.',
        grid_index: 2,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
      {
        id: 'rf-dipole-antenna',
        name: 'RF Dipole Antenna',
        filename_stem: 'rf-dipole-antenna',
        semantic_role: 'electromagnetic-radiation',
        description: 'Balanced center-fed half-wave dipole transmitting toroidal RF wave fronts.',
        generation_prompt: 'Draw a center-fed dipole antenna transmitting concentric electromagnetic donut wave fronts into space; strictly no text.',
        grid_index: 3,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
      {
        id: 'crystal-oscillator',
        name: 'Quartz Crystal Oscillator',
        filename_stem: 'crystal-oscillator',
        semantic_role: 'piezoelectric-clock',
        description: 'Piezoelectric quartz crystal plate resonating between capacitive electrodes.',
        generation_prompt: 'Draw a quartz crystal resonator plate suspended between dual metallic electrodes producing a crisp clock frequency waveform; no text.',
        grid_index: 4,
        desired_formats: ['png', 'svg'],
        required_formats: ['png'],
        required: true,
      },
    ],
  },
}

export function getVectorBatches(): VectorBatchManifest[] {
  const batchKeys = ['math-functions', 'physics-quantum', 'cs-algorithms', 'distributed-systems', 'rf-electronics']

  return batchKeys.map((batchId) => {
    const config = DEFAULT_BATCH_CONFIGS[batchId]
    const items: VectorItem[] = (config.items || []).map((item) => {
      const svgRelative = `/vectors/${batchId}/${item.filename_stem}.svg`
      const pngRelative = `/vectors/${batchId}/${item.filename_stem}.png`
      return {
        ...item,
        svgPath: svgRelative,
        pngPath: pngRelative,
        batchId,
        category: config.category,
        categoryKey: batchId,
        accentColor: config.accent,
      }
    })

    return {
      id: batchId,
      category: config.category,
      categoryKey: batchId,
      label: config.label,
      brief: config.brief,
      accentColor: config.accent,
      glyph: config.glyph,
      items,
    }
  })
}

export function getAllVectors(): VectorItem[] {
  const batches = getVectorBatches()
  return batches.flatMap((b) => b.items)
}
