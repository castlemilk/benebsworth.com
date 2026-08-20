import fs from 'node:fs'
import path from 'node:path'

const VECTOR_DIR = path.join(process.cwd(), 'public', 'vectors')

const BATCH_SVGS = {
  'physics-quantum': {
    'black-hole-geodesic': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <radialGradient id="bh-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ff7a59" stop-opacity="0.8"/>
      <stop offset="60%" stop-color="#7c5cff" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bh-arc" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00e0b8"/>
      <stop offset="50%" stop-color="#ff7a59"/>
      <stop offset="100%" stop-color="#7c5cff"/>
    </linearGradient>
  </defs>
  <!-- Accretion Aura -->
  <circle cx="256" cy="256" r="210" fill="url(#bh-glow)"/>
  <!-- Lensing Geodesics -->
  <ellipse cx="256" cy="256" rx="200" ry="70" stroke="url(#bh-arc)" stroke-width="4" stroke-linecap="round" stroke-dasharray="12 8" transform="rotate(-25 256 256)"/>
  <ellipse cx="256" cy="256" rx="160" ry="110" stroke="#00e0b8" stroke-width="3.5" stroke-linecap="round" stroke-opacity="0.85" transform="rotate(15 256 256)"/>
  <path d="M 60 210 Q 256 120 452 210" stroke="#ff7a59" stroke-width="4" stroke-linecap="round" fill="none"/>
  <path d="M 60 302 Q 256 392 452 302" stroke="#7c5cff" stroke-width="4" stroke-linecap="round" fill="none"/>
  <!-- Photon Sphere -->
  <circle cx="256" cy="256" r="92" stroke="#ff7a59" stroke-width="3" stroke-dasharray="6 6" fill="none"/>
  <!-- Event Horizon Silhouette -->
  <circle cx="256" cy="256" r="76" fill="#08090c" stroke="#00e0b8" stroke-width="3.5"/>
</svg>`,
    'phase-space-orbit': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="pso-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00e0b8"/>
      <stop offset="50%" stop-color="#7c5cff"/>
      <stop offset="100%" stop-color="#ff7a59"/>
    </linearGradient>
  </defs>
  <!-- Coordinate Axes -->
  <line x1="64" y1="256" x2="448" y2="256" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="256" y1="64" x2="256" y2="448" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2.5" stroke-linecap="round"/>
  <polygon points="448,256 436,250 436,262" fill="#ffffff" fill-opacity="0.4"/>
  <polygon points="256,64 250,76 262,76" fill="#ffffff" fill-opacity="0.4"/>
  <!-- Spiral Phase Trajectory -->
  <path d="M 256 256
           C 290 256, 320 280, 320 310
           C 320 350, 270 380, 220 380
           C 150 380, 110 310, 110 240
           C 110 140, 200 90, 300 90
           C 410 90, 440 200, 440 290
           C 440 390, 330 430, 230 430"
        stroke="url(#pso-grad)" stroke-width="4.5" stroke-linecap="round" fill="none"/>
  <!-- Direction Attractor & Nodes -->
  <circle cx="256" cy="256" r="6" fill="#00e0b8"/>
  <circle cx="300" cy="90" r="5" fill="#ff7a59"/>
  <circle cx="230" cy="430" r="5" fill="#7c5cff"/>
</svg>`,
    'wavepacket-quantum': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="wp-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7c5cff" stop-opacity="0.2"/>
      <stop offset="50%" stop-color="#00e0b8"/>
      <stop offset="100%" stop-color="#ff7a59" stop-opacity="0.2"/>
    </linearGradient>
  </defs>
  <!-- Baseline -->
  <line x1="48" y1="256" x2="464" y2="256" stroke="#ffffff" stroke-opacity="0.2" stroke-width="2" stroke-linecap="round"/>
  <!-- Gaussian Upper Envelope -->
  <path d="M 64 254 Q 180 250 210 200 Q 256 80 302 200 Q 332 250 448 254" stroke="#ff7a59" stroke-width="2.5" stroke-dasharray="8 6" stroke-opacity="0.8" fill="none"/>
  <!-- Gaussian Lower Envelope -->
  <path d="M 64 258 Q 180 262 210 312 Q 256 432 302 312 Q 332 262 448 258" stroke="#ff7a59" stroke-width="2.5" stroke-dasharray="8 6" stroke-opacity="0.8" fill="none"/>
  <!-- High Frequency Modulated Wave -->
  <path d="M 64 256
           Q 120 256 150 250
           Q 175 240 190 270
           Q 205 310 220 180
           Q 238 50 256 450
           Q 274 50 292 180
           Q 307 310 322 270
           Q 337 240 362 250
           Q 392 256 448 256"
        stroke="url(#wp-grad)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`,
    'magnetic-dipole': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="mag-loop" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00e0b8"/>
      <stop offset="50%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#ff7a59"/>
    </linearGradient>
  </defs>
  <!-- Symmetric Dipole Field Loops -->
  <ellipse cx="256" cy="180" rx="90" ry="110" stroke="url(#mag-loop)" stroke-width="3.5" fill="none"/>
  <ellipse cx="256" cy="332" rx="90" ry="110" stroke="url(#mag-loop)" stroke-width="3.5" fill="none"/>
  <ellipse cx="256" cy="140" rx="160" ry="150" stroke="#7c5cff" stroke-width="3" stroke-dasharray="10 8" fill="none"/>
  <ellipse cx="256" cy="372" rx="160" ry="150" stroke="#7c5cff" stroke-width="3" stroke-dasharray="10 8" fill="none"/>
  <!-- Central Dipole Core Axis -->
  <line x1="256" y1="80" x2="256" y2="432" stroke="#00e0b8" stroke-width="4.5" stroke-linecap="round"/>
  <!-- North & South Pole Nodes -->
  <circle cx="256" cy="160" r="14" fill="#00e0b8" stroke="#ffffff" stroke-width="2"/>
  <circle cx="256" cy="352" r="14" fill="#ff7a59" stroke="#ffffff" stroke-width="2"/>
</svg>`,
    'prism-dispersion': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <!-- Incident White Beam -->
  <line x1="48" y1="310" x2="200" y2="256" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round"/>
  <!-- Glass Prism Triangle -->
  <polygon points="256,96 160,384 352,384" stroke="#00e0b8" stroke-width="4" fill="#00e0b8" fill-opacity="0.08" stroke-linejoin="round"/>
  <!-- Internal Refraction -->
  <line x1="200" y1="256" x2="280" y2="250" stroke="#ffffff" stroke-width="3.5" stroke-opacity="0.9"/>
  <!-- Dispersed Spectral Rays -->
  <line x1="280" y1="250" x2="464" y2="180" stroke="#ff7a59" stroke-width="4" stroke-linecap="round"/>
  <line x1="280" y1="250" x2="464" y2="215" stroke="#eab308" stroke-width="4" stroke-linecap="round"/>
  <line x1="280" y1="250" x2="464" y2="250" stroke="#00e0b8" stroke-width="4" stroke-linecap="round"/>
  <line x1="280" y1="250" x2="464" y2="285" stroke="#3b82f6" stroke-width="4" stroke-linecap="round"/>
  <line x1="280" y1="250" x2="464" y2="320" stroke="#7c5cff" stroke-width="4" stroke-linecap="round"/>
</svg>`,
  },
  'cs-algorithms': {
    'binary-search-tree': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <!-- Edges -->
  <line x1="256" y1="96" x2="160" y2="200" stroke="#7c5cff" stroke-width="4" stroke-linecap="round"/>
  <line x1="256" y1="96" x2="352" y2="200" stroke="#00e0b8" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="160" y1="200" x2="100" y2="320" stroke="#7c5cff" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="160" y1="200" x2="210" y2="320" stroke="#7c5cff" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="352" y1="200" x2="300" y2="320" stroke="#7c5cff" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="352" y1="200" x2="412" y2="320" stroke="#00e0b8" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="412" y1="320" x2="380" y2="420" stroke="#7c5cff" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="412" y1="320" x2="450" y2="420" stroke="#00e0b8" stroke-width="4.5" stroke-linecap="round"/>
  <!-- Nodes -->
  <circle cx="256" cy="96" r="22" fill="#0c0e14" stroke="#00e0b8" stroke-width="4"/>
  <circle cx="160" cy="200" r="20" fill="#0c0e14" stroke="#7c5cff" stroke-width="3.5"/>
  <circle cx="352" cy="200" r="20" fill="#0c0e14" stroke="#00e0b8" stroke-width="4"/>
  <circle cx="100" cy="320" r="18" fill="#0c0e14" stroke="#7c5cff" stroke-width="3"/>
  <circle cx="210" cy="320" r="18" fill="#0c0e14" stroke="#7c5cff" stroke-width="3"/>
  <circle cx="300" cy="320" r="18" fill="#0c0e14" stroke="#7c5cff" stroke-width="3"/>
  <circle cx="412" cy="320" r="20" fill="#0c0e14" stroke="#00e0b8" stroke-width="4"/>
  <circle cx="380" cy="420" r="16" fill="#0c0e14" stroke="#7c5cff" stroke-width="3"/>
  <circle cx="450" cy="420" r="18" fill="#00e0b8" stroke="#ffffff" stroke-width="2"/>
</svg>`,
    'consistent-hash-ring': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <!-- Ring -->
  <circle cx="256" cy="256" r="160" stroke="#7c5cff" stroke-width="4" stroke-dasharray="14 10" fill="none"/>
  <!-- Inner Partition Chords -->
  <line x1="256" y1="96" x2="394" y2="336" stroke="#00e0b8" stroke-width="2.5" stroke-opacity="0.6"/>
  <line x1="394" y1="336" x2="118" y2="336" stroke="#00e0b8" stroke-width="2.5" stroke-opacity="0.6"/>
  <line x1="118" y1="336" x2="256" y2="96" stroke="#00e0b8" stroke-width="2.5" stroke-opacity="0.6"/>
  <!-- Server Node Markers -->
  <circle cx="256" cy="96" r="16" fill="#00e0b8" stroke="#ffffff" stroke-width="3"/>
  <circle cx="394" cy="336" r="16" fill="#00e0b8" stroke="#ffffff" stroke-width="3"/>
  <circle cx="118" cy="336" r="16" fill="#00e0b8" stroke="#ffffff" stroke-width="3"/>
  <!-- Virtual Keys -->
  <circle cx="369" cy="143" r="8" fill="#ff7a59"/>
  <circle cx="416" cy="256" r="8" fill="#ff7a59"/>
  <circle cx="256" cy="416" r="8" fill="#ff7a59"/>
  <circle cx="143" cy="180" r="8" fill="#ff7a59"/>
</svg>`,
    'directed-acyclic-graph': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <!-- Directed Edges -->
  <path d="M 100 256 L 220 160" stroke="#00e0b8" stroke-width="4" stroke-linecap="round"/>
  <path d="M 100 256 L 220 352" stroke="#7c5cff" stroke-width="4" stroke-linecap="round"/>
  <path d="M 220 160 L 340 160" stroke="#00e0b8" stroke-width="4" stroke-linecap="round"/>
  <path d="M 220 160 L 340 280" stroke="#7c5cff" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M 220 352 L 340 352" stroke="#7c5cff" stroke-width="4" stroke-linecap="round"/>
  <path d="M 340 160 L 430 256" stroke="#00e0b8" stroke-width="4" stroke-linecap="round"/>
  <path d="M 340 280 L 430 256" stroke="#00e0b8" stroke-width="4" stroke-linecap="round"/>
  <path d="M 340 352 L 430 256" stroke="#7c5cff" stroke-width="4" stroke-linecap="round"/>
  <!-- Nodes -->
  <circle cx="100" cy="256" r="20" fill="#0c0e14" stroke="#00e0b8" stroke-width="4"/>
  <circle cx="220" cy="160" r="18" fill="#0c0e14" stroke="#00e0b8" stroke-width="3.5"/>
  <circle cx="220" cy="352" r="18" fill="#0c0e14" stroke="#7c5cff" stroke-width="3.5"/>
  <circle cx="340" cy="160" r="18" fill="#0c0e14" stroke="#00e0b8" stroke-width="3.5"/>
  <circle cx="340" cy="280" r="16" fill="#0c0e14" stroke="#7c5cff" stroke-width="3"/>
  <circle cx="340" cy="352" r="18" fill="#0c0e14" stroke="#7c5cff" stroke-width="3.5"/>
  <circle cx="430" cy="256" r="22" fill="#00e0b8" stroke="#ffffff" stroke-width="3"/>
</svg>`,
    'transformer-attention': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <!-- Link Rays -->
  <line x1="120" y1="120" x2="392" y2="120" stroke="#00e0b8" stroke-width="4.5" stroke-opacity="0.9"/>
  <line x1="120" y1="120" x2="392" y2="210" stroke="#7c5cff" stroke-width="2.5" stroke-opacity="0.5"/>
  <line x1="120" y1="120" x2="392" y2="300" stroke="#7c5cff" stroke-width="1.5" stroke-opacity="0.3"/>
  <line x1="120" y1="210" x2="392" y2="120" stroke="#7c5cff" stroke-width="2" stroke-opacity="0.4"/>
  <line x1="120" y1="210" x2="392" y2="210" stroke="#00e0b8" stroke-width="5" stroke-opacity="1"/>
  <line x1="120" y1="210" x2="392" y2="390" stroke="#7c5cff" stroke-width="2.5" stroke-opacity="0.6"/>
  <line x1="120" y1="300" x2="392" y2="300" stroke="#00e0b8" stroke-width="4" stroke-opacity="0.8"/>
  <line x1="120" y1="390" x2="392" y2="120" stroke="#ff7a59" stroke-width="3" stroke-opacity="0.7"/>
  <line x1="120" y1="390" x2="392" y2="390" stroke="#00e0b8" stroke-width="4.5" stroke-opacity="0.9"/>
  <!-- Query Nodes -->
  <circle cx="120" cy="120" r="16" fill="#00e0b8" stroke="#ffffff" stroke-width="2"/>
  <circle cx="120" cy="210" r="16" fill="#00e0b8" stroke="#ffffff" stroke-width="2"/>
  <circle cx="120" cy="300" r="16" fill="#00e0b8" stroke="#ffffff" stroke-width="2"/>
  <circle cx="120" cy="390" r="16" fill="#00e0b8" stroke="#ffffff" stroke-width="2"/>
  <!-- Key Nodes -->
  <circle cx="392" cy="120" r="16" fill="#7c5cff" stroke="#ffffff" stroke-width="2"/>
  <circle cx="392" cy="210" r="16" fill="#7c5cff" stroke="#ffffff" stroke-width="2"/>
  <circle cx="392" cy="300" r="16" fill="#7c5cff" stroke="#ffffff" stroke-width="2"/>
  <circle cx="392" cy="390" r="16" fill="#7c5cff" stroke="#ffffff" stroke-width="2"/>
</svg>`,
    'state-machine': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <!-- Start Arrow -->
  <line x1="48" y1="256" x2="130" y2="256" stroke="#00e0b8" stroke-width="4" stroke-linecap="round"/>
  <polygon points="130,256 116,248 116,264" fill="#00e0b8"/>
  <!-- Forward Transition Arc -->
  <path d="M 160 220 Q 256 120 352 220" stroke="#00e0b8" stroke-width="4" stroke-linecap="round" fill="none"/>
  <polygon points="352,220 342,204 334,218" fill="#00e0b8"/>
  <!-- Backward Transition Arc -->
  <path d="M 352 292 Q 256 392 160 292" stroke="#7c5cff" stroke-width="4" stroke-linecap="round" fill="none"/>
  <polygon points="160,292 170,308 178,294" fill="#7c5cff"/>
  <!-- Self Loop -->
  <path d="M 136 220 C 110 140 190 140 170 216" stroke="#ff7a59" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  <!-- States -->
  <circle cx="160" cy="256" r="32" fill="#0c0e14" stroke="#00e0b8" stroke-width="4"/>
  <!-- Accept State (Double Ring) -->
  <circle cx="352" cy="256" r="36" fill="#0c0e14" stroke="#00e0b8" stroke-width="4"/>
  <circle cx="352" cy="256" r="26" fill="none" stroke="#00e0b8" stroke-width="2.5"/>
</svg>`,
  },
  'distributed-systems': {
    'raft-consensus': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <!-- Replication Sync Rays -->
  <line x1="256" y1="120" x2="130" y2="270" stroke="#00b4d8" stroke-width="4" stroke-dasharray="10 6"/>
  <line x1="256" y1="120" x2="382" y2="270" stroke="#00b4d8" stroke-width="4" stroke-dasharray="10 6"/>
  <line x1="256" y1="120" x2="180" y2="410" stroke="#00b4d8" stroke-width="4" stroke-dasharray="10 6"/>
  <line x1="256" y1="120" x2="332" y2="410" stroke="#00b4d8" stroke-width="4" stroke-dasharray="10 6"/>
  <!-- Quorum Interconnect -->
  <polygon points="130,270 382,270 332,410 180,410" stroke="#7c5cff" stroke-width="2.5" stroke-opacity="0.4" fill="#7c5cff" fill-opacity="0.05"/>
  <!-- Leader Node -->
  <circle cx="256" cy="120" r="28" fill="#00b4d8" stroke="#ffffff" stroke-width="3.5"/>
  <polygon points="256,104 262,118 276,118 265,127 269,141 256,132 243,141 247,127 236,118 250,118" fill="#ffffff"/>
  <!-- Follower Nodes -->
  <circle cx="130" cy="270" r="22" fill="#0c0e14" stroke="#00b4d8" stroke-width="4"/>
  <circle cx="382" cy="270" r="22" fill="#0c0e14" stroke="#00b4d8" stroke-width="4"/>
  <circle cx="180" cy="410" r="22" fill="#0c0e14" stroke="#00b4d8" stroke-width="4"/>
  <circle cx="332" cy="410" r="22" fill="#0c0e14" stroke="#00b4d8" stroke-width="4"/>
</svg>`,
    'event-stream': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <!-- Pipeline Channels -->
  <path d="M 64 256 L 220 256 Q 280 256 310 160 L 448 160" stroke="#00b4d8" stroke-width="4" stroke-linecap="round"/>
  <path d="M 64 256 L 220 256 L 448 256" stroke="#00e0b8" stroke-width="4" stroke-linecap="round"/>
  <path d="M 64 256 L 220 256 Q 280 256 310 352 L 448 352" stroke="#7c5cff" stroke-width="4" stroke-linecap="round"/>
  <!-- Event Tokens -->
  <circle cx="110" cy="256" r="10" fill="#00e0b8"/>
  <circle cx="170" cy="256" r="10" fill="#00b4d8"/>
  <circle cx="360" cy="160" r="10" fill="#00b4d8"/>
  <circle cx="360" cy="256" r="10" fill="#00e0b8"/>
  <circle cx="360" cy="352" r="10" fill="#7c5cff"/>
  <circle cx="430" cy="160" r="14" fill="#0c0e14" stroke="#00b4d8" stroke-width="3"/>
  <circle cx="430" cy="256" r="14" fill="#0c0e14" stroke="#00e0b8" stroke-width="3"/>
  <circle cx="430" cy="352" r="14" fill="#0c0e14" stroke="#7c5cff" stroke-width="3"/>
</svg>`,
    'gossip-mesh': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <!-- Gossip Links -->
  <line x1="256" y1="100" x2="120" y2="200" stroke="#00b4d8" stroke-width="3.5"/>
  <line x1="256" y1="100" x2="392" y2="200" stroke="#00b4d8" stroke-width="3.5"/>
  <line x1="120" y1="200" x2="160" y2="380" stroke="#7c5cff" stroke-width="3.5"/>
  <line x1="392" y1="200" x2="352" y2="380" stroke="#7c5cff" stroke-width="3.5"/>
  <line x1="160" y1="380" x2="352" y2="380" stroke="#00e0b8" stroke-width="3.5"/>
  <line x1="120" y1="200" x2="352" y2="380" stroke="#00e0b8" stroke-width="2.5" stroke-dasharray="8 6"/>
  <line x1="392" y1="200" x2="160" y2="380" stroke="#00e0b8" stroke-width="2.5" stroke-dasharray="8 6"/>
  <!-- Ripple Pulse -->
  <circle cx="256" cy="100" r="32" stroke="#00b4d8" stroke-width="2" stroke-opacity="0.4" fill="none"/>
  <!-- Nodes -->
  <circle cx="256" cy="100" r="18" fill="#00b4d8" stroke="#ffffff" stroke-width="2.5"/>
  <circle cx="120" cy="200" r="18" fill="#7c5cff" stroke="#ffffff" stroke-width="2.5"/>
  <circle cx="392" cy="200" r="18" fill="#7c5cff" stroke="#ffffff" stroke-width="2.5"/>
  <circle cx="160" cy="380" r="18" fill="#00e0b8" stroke="#ffffff" stroke-width="2.5"/>
  <circle cx="352" cy="380" r="18" fill="#00e0b8" stroke="#ffffff" stroke-width="2.5"/>
</svg>`,
    'circuit-breaker': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <!-- Ingress / Egress Baseline -->
  <line x1="64" y1="256" x2="180" y2="256" stroke="#00b4d8" stroke-width="5" stroke-linecap="round"/>
  <line x1="332" y1="256" x2="448" y2="256" stroke="#7c5cff" stroke-width="5" stroke-linecap="round"/>
  <!-- Contact Terminals -->
  <circle cx="180" cy="256" r="14" fill="#00b4d8" stroke="#ffffff" stroke-width="3"/>
  <circle cx="332" cy="256" r="14" fill="#7c5cff" stroke="#ffffff" stroke-width="3"/>
  <!-- Tripped Switch Blade -->
  <line x1="180" y1="256" x2="280" y2="150" stroke="#ff7a59" stroke-width="5.5" stroke-linecap="round"/>
  <!-- Arc / Trip Indicator -->
  <path d="M 270 170 Q 295 190 320 240" stroke="#eab308" stroke-width="3" stroke-dasharray="6 4" fill="none"/>
  <!-- Housing Shield -->
  <rect x="130" y="100" width="252" height="312" rx="20" stroke="#00b4d8" stroke-width="3" stroke-dasharray="12 8" fill="none"/>
</svg>`,
    'load-balancer': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <!-- Ingress Gateway -->
  <rect x="70" y="216" width="80" height="80" rx="16" fill="#00b4d8" stroke="#ffffff" stroke-width="3"/>
  <path d="M 94 256 L 126 256 M 116 244 L 128 256 L 116 268" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Fanout Streams -->
  <path d="M 150 256 Q 260 256 290 120 L 390 120" stroke="#00e0b8" stroke-width="4" stroke-linecap="round"/>
  <path d="M 150 256 Q 260 256 290 188 L 390 188" stroke="#00e0b8" stroke-width="4" stroke-linecap="round"/>
  <path d="M 150 256 L 390 256" stroke="#00e0b8" stroke-width="4" stroke-linecap="round"/>
  <path d="M 150 256 Q 260 256 290 324 L 390 324" stroke="#00e0b8" stroke-width="4" stroke-linecap="round"/>
  <path d="M 150 256 Q 260 256 290 392 L 390 392" stroke="#00e0b8" stroke-width="4" stroke-linecap="round"/>
  <!-- Backend Service Nodes -->
  <rect x="390" y="102" width="60" height="36" rx="8" fill="#0c0e14" stroke="#00e0b8" stroke-width="3"/>
  <rect x="390" y="170" width="60" height="36" rx="8" fill="#0c0e14" stroke="#00e0b8" stroke-width="3"/>
  <rect x="390" y="238" width="60" height="36" rx="8" fill="#0c0e14" stroke="#00e0b8" stroke-width="3"/>
  <rect x="390" y="306" width="60" height="36" rx="8" fill="#0c0e14" stroke="#00e0b8" stroke-width="3"/>
  <rect x="390" y="374" width="60" height="36" rx="8" fill="#0c0e14" stroke="#00e0b8" stroke-width="3"/>
</svg>`,
  },
  'rf-electronics': {
    'smith-chart': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <!-- Outer Unity Circle -->
  <circle cx="256" cy="256" r="180" stroke="#eab308" stroke-width="4" fill="none"/>
  <line x1="76" y1="256" x2="436" y2="256" stroke="#ffffff" stroke-width="2.5" stroke-opacity="0.4"/>
  <!-- Constant Resistance Circles -->
  <circle cx="346" cy="256" r="90" stroke="#eab308" stroke-width="2.5" stroke-opacity="0.8" fill="none"/>
  <circle cx="391" cy="256" r="45" stroke="#eab308" stroke-width="2" stroke-opacity="0.7" fill="none"/>
  <circle cx="298" cy="256" r="138" stroke="#eab308" stroke-width="2" stroke-opacity="0.5" fill="none"/>
  <!-- Constant Reactance Arcs -->
  <path d="M 436 256 A 180 180 0 0 0 256 76" stroke="#00e0b8" stroke-width="2.5" stroke-opacity="0.8" fill="none"/>
  <path d="M 436 256 A 180 180 0 0 1 256 436" stroke="#00e0b8" stroke-width="2.5" stroke-opacity="0.8" fill="none"/>
  <path d="M 436 256 A 90 90 0 0 0 346 166" stroke="#00e0b8" stroke-width="2" stroke-opacity="0.6" fill="none"/>
  <path d="M 436 256 A 90 90 0 0 1 346 346" stroke="#00e0b8" stroke-width="2" stroke-opacity="0.6" fill="none"/>
  <!-- Impedance Match Point -->
  <circle cx="256" cy="256" r="8" fill="#ff7a59" stroke="#ffffff" stroke-width="2"/>
</svg>`,
    'lc-tank-circuit': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <!-- Top and Bottom Wire Rails -->
  <line x1="100" y1="120" x2="412" y2="120" stroke="#eab308" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="100" y1="392" x2="412" y2="392" stroke="#eab308" stroke-width="4.5" stroke-linecap="round"/>
  <!-- Left Leg: Inductor Coil -->
  <line x1="160" y1="120" x2="160" y2="180" stroke="#eab308" stroke-width="4"/>
  <path d="M 160 180 C 120 180 120 220 160 220
           C 120 220 120 260 160 260
           C 120 260 120 300 160 300
           C 120 300 120 340 160 340" stroke="#00e0b8" stroke-width="5" stroke-linecap="round" fill="none"/>
  <line x1="160" y1="340" x2="160" y2="392" stroke="#eab308" stroke-width="4"/>
  <!-- Right Leg: Capacitor Plates -->
  <line x1="352" y1="120" x2="352" y2="236" stroke="#eab308" stroke-width="4"/>
  <line x1="312" y1="236" x2="392" y2="236" stroke="#ff7a59" stroke-width="5.5" stroke-linecap="round"/>
  <line x1="312" y1="276" x2="392" y2="276" stroke="#ff7a59" stroke-width="5.5" stroke-linecap="round"/>
  <line x1="352" y1="276" x2="352" y2="392" stroke="#eab308" stroke-width="4"/>
  <!-- Resonant EM Waves -->
  <path d="M 230 220 Q 256 256 230 292" stroke="#7c5cff" stroke-width="3" stroke-linecap="round" fill="none"/>
  <path d="M 270 200 Q 306 256 270 312" stroke="#7c5cff" stroke-width="3" stroke-linecap="round" fill="none"/>
</svg>`,
    'op-amp-differential': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <!-- Triangular Op-Amp Body -->
  <polygon points="160,120 160,392 380,256" stroke="#eab308" stroke-width="4.5" fill="#eab308" fill-opacity="0.08" stroke-linejoin="round"/>
  <!-- Inverting Input (-) -->
  <line x1="64" y1="190" x2="160" y2="190" stroke="#00e0b8" stroke-width="4" stroke-linecap="round"/>
  <!-- Non-Inverting Input (+) -->
  <line x1="64" y1="322" x2="160" y2="322" stroke="#00e0b8" stroke-width="4" stroke-linecap="round"/>
  <!-- Output Driven Line -->
  <line x1="380" y1="256" x2="464" y2="256" stroke="#ff7a59" stroke-width="4.5" stroke-linecap="round"/>
  <!-- Port Terminals -->
  <circle cx="64" cy="190" r="10" fill="#00e0b8"/>
  <circle cx="64" cy="322" r="10" fill="#00e0b8"/>
  <circle cx="464" cy="256" r="12" fill="#ff7a59"/>
</svg>`,
    'rf-dipole-antenna': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <!-- Center Feedline -->
  <line x1="256" y1="440" x2="256" y2="266" stroke="#ffffff" stroke-width="3" stroke-dasharray="6 6"/>
  <!-- Dipole Rods -->
  <line x1="120" y1="256" x2="246" y2="256" stroke="#eab308" stroke-width="6" stroke-linecap="round"/>
  <line x1="266" y1="256" x2="392" y2="256" stroke="#eab308" stroke-width="6" stroke-linecap="round"/>
  <!-- Center Feed Gap -->
  <circle cx="256" cy="256" r="8" fill="#ff7a59"/>
  <!-- Radiated Wavefronts -->
  <path d="M 256 160 C 180 160 140 200 140 256 C 140 312 180 352 256 352" stroke="#00e0b8" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  <path d="M 256 160 C 332 160 372 200 372 256 C 372 312 332 352 256 352" stroke="#00e0b8" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  <path d="M 256 90 C 140 90 80 160 80 256 C 80 352 140 422 256 422" stroke="#7c5cff" stroke-width="3" stroke-linecap="round" fill="none"/>
  <path d="M 256 90 C 372 90 432 160 432 256 C 432 352 372 422 256 422" stroke="#7c5cff" stroke-width="3" stroke-linecap="round" fill="none"/>
</svg>`,
    'crystal-oscillator': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <!-- Connecting Terminals -->
  <line x1="64" y1="256" x2="190" y2="256" stroke="#eab308" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="322" y1="256" x2="448" y2="256" stroke="#eab308" stroke-width="4.5" stroke-linecap="round"/>
  <!-- Left & Right Metallic Electrodes -->
  <line x1="190" y1="160" x2="190" y2="352" stroke="#00e0b8" stroke-width="6" stroke-linecap="round"/>
  <line x1="322" y1="160" x2="322" y2="352" stroke="#00e0b8" stroke-width="6" stroke-linecap="round"/>
  <!-- Central Quartz Crystal Plate -->
  <rect x="220" y="130" width="72" height="252" rx="10" fill="#7c5cff" fill-opacity="0.15" stroke="#7c5cff" stroke-width="4"/>
  <!-- Clock Frequency Oscillation Waveform -->
  <path d="M 120 420 L 160 420 L 160 380 L 200 380 L 200 420 L 240 420 L 240 380 L 280 380 L 280 420 L 320 420 L 320 380 L 360 380 L 360 420 L 400 420" stroke="#00e0b8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`,
  },
}

for (const [batchId, svgs] of Object.entries(BATCH_SVGS)) {
  const batchDir = path.join(VECTOR_DIR, batchId)
  fs.mkdirSync(batchDir, { recursive: true })

  for (const [filenameStem, svgContent] of Object.entries(svgs)) {
    const svgPath = path.join(batchDir, `${filenameStem}.svg`)
    if (!fs.existsSync(svgPath)) {
      fs.writeFileSync(svgPath, svgContent.trim() + '\n')
      console.log(`✓ Seeded SVG: ${batchId}/${filenameStem}.svg`)
    }
  }
}

console.log('Done seeding vector assets!')
