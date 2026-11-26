// BrandBrain batch thumbnail generation — drives the local flow-orchestrator
// MCP over stdio. Sequential per item: generate_image → get_generation →
// download → sharp → site roots. Spend is bounded per call by max_cost_usd and
// globally by MAX_TOTAL_USD; resume-safe (skips items whose file exists).
//   node scripts/gen-thumbs-batch.mjs [--only=hero|lab|study] [--dry]
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const MCP = '/Users/benebsworth/projects/brandbrain/mcp/flow-orchestrator/dist/index.js'
const ENV = {
  BRANDBRAIN_API_URL: 'https://api.brandbrain.dev',
  BRANDBRAIN_APP_URL: 'https://brandbrain.dev',
  BRANDBRAIN_MAX_PROVIDER_SPEND_USD_MICROS: '50000',
}
const MAX_TOTAL_USD = 4.0
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice(7)
const DRY = process.argv.includes('--dry')
const SHARD = process.argv.find((a) => a.startsWith('--shard='))?.slice(8)?.split('/').map(Number) // [i, n]

const NO_TEXT =
  'STRICT: absolutely no text, letters, numerals, equations, logos, labels, captions, axis marks or pseudo-text anywhere — pure illustration only.'
const BLOG_STYLE =
  'Style: precise engraved plate illustration on warm dark paper, fine etched linework, painterly, NOT a photograph, no people. Theme: quiet, measured; palette ink #131318, parchment #e9e2d4, single accent {ACCENT}; matte pigment, soft directional light, no glow. Framing: motif centered, strong silhouette at small size. Avoid: clutter, photorealism, chrome, neon bloom, faces.'
const LAB_STYLE =
  'Style: minimal dark instrument plate — near-black field with faint etched hairline grid and one luminous accent tracing the phenomenon, engraved scientific-instrument feel, NOT a photograph. Theme: charcoal #14161a field, dim hairlines #3a3f46, accent {ACCENT}; matte, precise, restrained. Framing: one clear motif centered, readable at thumbnail size. Avoid: clutter, photorealism, people, chrome, neon bloom.'

const hero = (slug, scene, accent = '#ff7a59') => ({
  kind: 'hero', slug, model: 'openai/gpt-image-2.5-sunburst', maxCost: 0.05, aspect: '16:9',
  prompt: `${NO_TEXT} Scene: ${scene} ${BLOG_STYLE.replace('{ACCENT}', accent)}`,
})
const lab = (slug, scene, accent = '#4cd97a') => ({
  kind: 'lab', slug, model: 'openrouter/qwen/qwen-image-3', maxCost: 0.035, aspect: '1:1',
  prompt: `${NO_TEXT} Scene: ${scene} ${LAB_STYLE.replace('{ACCENT}', accent)}`,
})
const study = (slug, vol, scene) => ({
  kind: 'study', slug, vol, model: 'openai/gpt-image-2.5-sunburst', maxCost: 0.05, aspect: '16:9',
  prompt: `${NO_TEXT} Scene: ${scene} ${BLOG_STYLE.replace('{ACCENT}', '#ff9d6b')}`,
})
const TOPIC_STYLE =
  'Style: vintage scientific instrument engraving on aged parchment paper — fine etched linework, sepia ink with faint oxide-red accents, cream paper background, single centered instrument or diagram-object with generous margins, NOT a photograph. Avoid: clutter, photorealism, people, modern UI, dark background.'
const topic = (slug, scene) => ({
  kind: 'topic', slug, model: 'openrouter/qwen/qwen-image-3', maxCost: 0.035, aspect: '1:1',
  prompt: `${NO_TEXT} Scene: ${scene} ${TOPIC_STYLE}`,
})

const ITEMS = [
  // ── Blog heroes (23 missing) ────────────────────────────────────────
  hero('smith-chart-is-geometry', 'a compass-like disc of nested curved arcs and circles, seen as an engraved geometric plate; one small bright point travelling along a circular arc path'),
  hero('attention-from-the-inside-out', 'self-attention from the inside — a scattered constellation of small token discs, thin luminous beams linking each disc to a few others, beam brightness showing attention weight', '#6ea8ff'),
  hero('benchmarking-agy-frontier', 'a referee lens held over a small tilted game board revealing a hidden wedge under one player side — the tilted field exposed'),
  hero('benchmarking-openrouter-free-tier', 'a regatta of twelve small simple paper boats sailing in a loose fleet, overtaking three huge ornate galleons', '#4cd97a'),
  hero('binary-search-tree', 'a branching binary tree as an engraved botanical plate — a root node splitting into left and right branches halving again at each fork, small disc nodes at each fork, the path to one leaf traced brighter', '#4cd97a'),
  hero('common-hooks', 'a row of small climbing hooks latched onto a wall of interlocking gear-like component tiles, each hook suspending one tile — reusable hooks attaching behavior to components', '#e6c34a'),
  hero('getting-started-with-tekton', 'a wooden water-channel pipeline of plank segments running between workshop pylons, a small reservoir feeding the first channel — a pipeline being assembled piece by piece', '#e6c34a'),
  hero('gke-development-auto-scale-down', 'a cluster of small machines folding themselves away like origami cranes settling to sleep as a work queue empties — capacity shrinking down to almost nothing', '#6ea8ff'),
  hero('hello-world', 'a single small lamp lit on a large dark circuit board — the first greeting of a new program, one warm point of light in an empty grid'),
  hero('install-minikube', 'a tiny ship in a bottle — a miniature shipyard crane-and-wheel assembly sealed inside a glass bottle on a workbench, the smallest possible self-contained cluster', '#6ea8ff'),
  hero('istio-patterns', 'a mesh of service nodes where every node is shadowed by a small envoy proxy companion — pairs of discs linked by luminous threads forming a service mesh', '#6ea8ff'),
  hero('kubernetes-cicd-part-1', 'a clean workbench path from a small laptop to a distant crane-cluster — developer experience as a smooth drawn route between tools', '#e6c34a'),
  hero('kubernetes-cicd-part-2', 'pipeline trusses carried between two cranes — a tekton pipeline as planks of a moving assembly line spanning a gap', '#e6c34a'),
  hero('kubernetes-cicd-part-3', 'a lighthouse casting rotating beams over a pipeline of trusses — observability as light sweeping across the delivery line', '#e6c34a'),
  hero('kustomize-examples', 'transparent overlay sheets stacked over a base map — each acetate sheet adds one change, the stack composes into the final chart', '#e6c34a'),
  hero('memory-chip-ecosystem', 'a cross-section of stacked memory dies — layered silicon terraces drawn as fine etched strata, a grid of tiny cells visible inside each layer, like a geological engraving of a DRAM stack', '#6ea8ff'),
  hero('neural-network-zoo-explained', 'a gallery of different neural lattice creatures — several distinct network topologies drawn as small engraved specimen plates in a row: dense mesh, layered columns, recurrent loop, wide shallow fan', '#e6c34a'),
  hero('nextjs-starter-project', 'a small lit window framed inside fresh scaffolding — a starter project as a bare frame holding one warm illuminated room'),
  hero('pll-from-first-principles', 'two engraved waves spiralling toward phase lock — an oscillator drifting until it clicks into synchrony with a reference wave, the moment of lock marked by aligned crests', '#6ea8ff'),
  hero('s3-blog-hosting', 'paper pages resting on a cloud-shelf — a static site as a neat stack of printed sheets served from a simple bucket shelf in the sky', '#6ea8ff'),
  hero('two-number-sum', 'two small numbered blocks sliding along a ruler toward each other to meet a target mark — a hash map as slots where each seen number leaves a placeholder', '#e6c34a'),
  hero('using-helm', 'a ship helm wheel turning many identical small vessels from one chart — templated releases as sister ships launched from a single drawing', '#e6c34a'),
  hero('using-kapitan', 'a ship captain table covered in templated fleet manifests — one master chart fanning into many stamped copies for different harbours', '#e6c34a'),

  // ── Study covers (vol1, 3 chapters) ─────────────────────────────────
  study('01-introduction', 'vol1', 'a landscape map of machine-learning systems — a pipeline of small distinct machines arranged on a dark board, data flowing through them like light through a circuit'),
  study('02-system-paradigms', 'vol1', 'three archetype blocks arranged as a taxonomy map — a tiny edge device, a fog middle tier, and a large cloud tower, edges drawn between them as tradeoff arcs'),
  study('03-ml-lifecycle', 'vol1', 'a circular loop of stages — data collection, labelling, training, evaluation, deployment, monitoring drawn as engraved stations on a ring, a budget gauge at the centre'),

  // ── Lab posters (57 missing) ────────────────────────────────────────
  lab('orbits', 'small bodies tracing a shared circle, leaving fading light trails behind them', '#6ea8ff'),
  lab('flow-field', 'fine particles advected through a curling vector-noise field — streamlines curving like wind over a map', '#4cd97a'),
  lab('starfield', 'streaks of starlight warping toward a vanishing point — parallax rays of white on black', '#e9e2d4'),
  lab('cyclic-automaton', 'a cell grid where colors advance like a wave — neighboring cells cycling through hues in lockstep', '#e6c34a'),
  lab('ripple-grid', 'a grid of dots pulsing as summed sine ripples pass through — concentric interference rings in dots', '#6ea8ff'),
  lab('mesh-wave', 'isometric wireframe terrain with layered sine waves rolling across — a net of hills oscillating', '#4cd97a'),
  lab('voronoi-bloom', 'organic stained-glass cells blooming — voronoi boundaries glowing between drifting gradient blobs', '#ff9d6b'),
  lab('flow-streams', 'ink streamlines curling through a noise field — dark ribbons of flow bending around vortices', '#9a9a92'),
  lab('metaball-bloom', 'soft gradient blobs merging and splitting in lava-lamp motion — rounded forms coalescing', '#ff9d6b'),
  lab('spirograph-rose', 'layered parametric curves drawing vintage spirograph rosettes — nested hypotrochoid loops', '#e6c34a'),
  lab('dot-lattice', 'a breathing lattice of dots modulated by noise waves — grid points swelling and dimming', '#4cd97a'),
  lab('boids-flocking', 'a murmuration of small agents steering by separation, alignment and cohesion — a wheeling flock cloud', '#4cd97a'),
  lab('truchet-tiles', 'a tiling of quarter-circle arcs joining into one continuous labyrinth — truchet maze of curved tiles, every arc drawn as a clearly visible pale luminous line, high contrast against the dark field', '#e9e2d4'),
  lab('k-means', 'scattered dots grouped into coloured clusters around glowing centroid markers — k-means partitions with faint voronoi boundaries between the groups', '#4cd97a'),
  lab('hr-diagram', 'a Hertzsprung-Russell diagram — stars scattered across a dark field forming the bright diagonal main-sequence band, a few giants above and white dwarfs below', '#6ea8ff'),
  lab('double-pendulum', 'a double pendulum arm with a chaotic luminous trace — two hinged rods and a wild curve behind', '#ff9d6b'),
  lab('logistic-bifurcation', 'the period-doubling cascade — a single line splitting into 2, 4, then a chaotic fan as growth rises', '#e6c34a'),
  lab('phase-portrait', 'trajectories flowing through a vector field — spirals and saddle flow lines of an ODE phase portrait', '#6ea8ff'),
  lab('conformal-grid', 'a square grid bent by a conformal map — straight lines curving into an airfoil outline', '#6ea8ff'),
  lab('random-walk', 'many stochastic walk paths diffusing from one origin — a cloud of jagged trajectories settling into a bell', '#9a9a92'),
  lab('fourier-series', 'epicycles drawing a square wave — nested circles with rotating arms summing into a waveform', '#e6c34a'),
  lab('lorenz-attractor', 'the chaotic butterfly — two wing lobes of the Lorenz attractor traced in luminous thread', '#ff9d6b'),
  lab('reaction-diffusion', 'Turing patterns — spots and maze-like stripes growing from two reacting chemicals', '#4cd97a'),
  lab('mandelbrot-julia', 'escape-time fractal — the Mandelbrot set silhouette with a spiralling Julia seahorse valley', '#6ea8ff'),
  lab('wave-superposition', 'two plane waves interfering — crossing wavefronts forming beats and standing nodes', '#6ea8ff'),
  lab('bloch-sphere', 'a qubit state vector precessing on a sphere — arrow tip tracing a spiral path on the ball', '#b48cff'),
  lab('band-structure', 'energy bands with gaps — parabolic electron bands breaking apart at a zone boundary', '#b48cff'),
  lab('quantum-tunneling', 'a wave packet leaking through a barrier — a bright pulse striking a wall and emerging dimmer beyond', '#b48cff'),
  lab('coupled-oscillators', 'two masses on springs trading energy — beating envelopes passing motion back and forth', '#4cd97a'),
  lab('ising-model', 'a spin lattice ordering into domains — regions of aligned up/down spins below critical temperature', '#ff9d6b'),
  lab('kinetic-gas', 'hard discs colliding in a box — a swarm of balls bouncing, speeds relaxing into a distribution curve', '#9a9a92'),
  lab('rlc-resonance', 'a ringing step response — an underdamped oscillation decaying into a flat line on a scope face', '#e6c34a'),
  lab('fft-spectrum', 'a spectrum analyzer — a waveform decomposing into a row of frequency bars', '#4cd97a'),
  lab('pid-tuner', 'a step response curve overshooting then settling — three tuning dials shaping the trace', '#e6c34a'),
  lab('constellation-plot', 'a QAM constellation — tight clusters of points around grid positions, one cluster smeared by noise', '#6ea8ff'),
  lab('smith-chart', 'impedance arcs inside a circular chart — a reflection path spiralling through nested circles', '#ff9d6b'),
  lab('inverse-kinematics', 'a two-joint robot arm reaching for a target — elbow and wrist angles solving to touch a point', '#4cd97a'),
  lab('pll-lock-in', 'two waveforms converging into phase lock — a chasing wave aligning crests with a reference', '#6ea8ff'),
  lab('bode-plotter', 'frequency response curves — magnitude rolling off and phase sliding on two stacked axes', '#e6c34a'),
  lab('transmission-line', 'a voltage pulse travelling a line and reflecting inverted at a mismatch — square edge bouncing back', '#e6c34a'),
  lab('am-modulation', 'a carrier wave with a slow envelope — the message riding inside an amplitude-shaped carrier', '#e6c34a'),
  lab('pole-zero', 'a pole pair marked on the s-plane — crosses and circles mapping to a ringing step response', '#e6c34a'),
  lab('eye-diagram', 'overlaid symbol traces forming an open eye — many transitions stacking into a decision window', '#6ea8ff'),
  lab('self-attention', 'tokens linked by weighted beams — a small network of discs where query rays converge on keys', '#6ea8ff'),
  lab('gradient-descent', 'optimizers racing down a loss landscape — several trajectories descending a contoured ravine', '#ff9d6b'),
  lab('pathfinding', 'a frontier expanding toward a goal — a* search frontier bending around obstacles to a marked target', '#4cd97a'),
  lab('neural-boundary', 'a bending decision boundary — a curving line separating two color regions of classified points', '#6ea8ff'),
  lab('circuit-sim', 'a breadboard circuit — a battery, resistor and oscilloscope trace on a schematic grid', '#e6c34a'),
  lab('spacetime-curvature', 'a mass dimpling an embedding sheet — a heavy ball sagging a gridded rubber membrane, geodesics bending', '#b48cff'),
  lab('black-hole', 'a black hole with lensing — a dark shadow ringed by bent light and a thin accretion arc', '#b48cff'),
  lab('black-hole-sim', 'a ray-traced accretion disk warping around a dark sphere — doppler-brightened ring bending over the horizon', '#b48cff'),
  lab('holographic-bound', 'entropy tiling a horizon — a sphere surface filled with tiny information pixels', '#b48cff'),
  lab('cosmic-expansion', 'a scale-factor curve stretching a grid of galaxies — space itself expanding, points drifting apart', '#b48cff'),
  lab('cmb-sky', 'the last-scattering sky — a mottled temperature map of hot and cold speckles in an oval projection', '#ff9d6b'),
  lab('rotation-curve', 'a flat rotation curve vs a falling keplerian one — two diverging orbital-speed lines around a galaxy', '#b48cff'),
  lab('gw-chirp', 'a gravitational-wave chirp — an inspiral waveform rising in frequency then ringing down', '#b48cff'),
  lab('fine-tuning', 'dials of physical constants — several instrument dials, one nudged off its habitable mark', '#e6c34a'),
  lab('gravitational-lensing', 'light bending into arcs — a foreground mass splitting a distant source into twin curved images', '#b48cff'),
  lab('exoplanet-transit', 'a small planet crossing a star limb — a dark disc silhouetted on a bright stellar edge with a light-curve dip', '#b48cff'),

  // ── Topic hub artwork (tag hubs missing parchment pieces) ───────────
  topic('physics', 'a brass pendulum beside an inclined plane with a rolling ball — classical mechanics demonstration instruments'),
  topic('3d', 'a wireframe cube drawn in isometric projection with drafting construction lines and a small brass compass'),
  topic('software', 'a mechanical teleprinter with a loop of punched paper tape feeding through it — early computing machinery'),
  topic('machine-learning', 'a layered lattice of small brass nodes joined by fine rods — an early neural-network demonstration model on a stand'),
  topic('interactive', 'a small hand-held control console with knobs, sliders and one toggle — an instrument panel study'),
  topic('technology', 'a still-life of early electronic components — a vacuum valve, a copper coil and a resistor arranged on the page'),
  topic('chaos', 'a butterfly-shaped double-wing orbit trace — the Lorenz attractor drawn as a delicate continuous curve'),
  topic('quantum', 'a small desktop orrery of the atom — concentric elliptical orbit rings around a bright nucleus on a brass stand'),
  topic('general-relativity', 'a heavy sphere resting on a stretched elastic grid sheet — the grid sagging and curving around the mass'),
  topic('algorithms', 'a mechanical sorting device — a row of stepped brass pegs of increasing height being ordered by a small arm'),
]

// ── MCP stdio driver ──────────────────────────────────────────────────
let proc = null
let buf = ''
const pending = new Map()
let nextId = 1
let ready = null

function startMcp() {
  buf = ''
  proc = spawn('node', [MCP], { env: { ...process.env, ...ENV }, stdio: ['pipe', 'pipe', 'inherit'] })
  ready = (async () => {
    proc.stdout.on('data', (d) => {
      buf += d
      let i
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1)
        if (!line) continue
        try {
          const msg = JSON.parse(line)
          if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
        } catch { /* ignore non-json */ }
      }
    })
    proc.on('exit', () => { proc = null })
    await call('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'thumbs-batch', version: '1' } })
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n')
  })()
  return ready
}

const call = (method, params) =>
  new Promise((resolve, reject) => {
    const id = nextId++
    const t = setTimeout(() => reject(new Error(`timeout ${method}`)), 120000)
    pending.set(id, (m) => { clearTimeout(t); resolve(m) })
    try { proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n') }
    catch (e) { clearTimeout(t); pending.delete(id); reject(e) }
  })

const toolRaw = async (name, args) => {
  if (!proc) await startMcp()
  const r = await call('tools/call', { name, arguments: args })
  if (r.error) throw new Error(`${name}: ${r.error.message ?? JSON.stringify(r.error)}`)
  return (r.result?.content ?? []).map((c) => c.text ?? '').join('\n')
}
const tool = async (name, args) => {
  try {
    return await toolRaw(name, args)
  } catch {
    // Child died or wedged — respawn once and retry the call.
    try { proc?.kill() } catch { proc = null }
    proc = null
    await startMcp()
    return toolRaw(name, args)
  }
}

await startMcp()

const dest = (it) =>
  it.kind === 'hero'
    ? `content/blog/${it.slug}/hero.webp`
    : it.kind === 'lab'
      ? `public/lab/previews/${it.slug}.webp`
      : it.kind === 'topic'
        ? `public/topics/artwork/${it.slug}.png`
        : `public/study/${it.vol}/${it.slug}/cover.webp`

let spent = 0
let done = 0, skipped = 0, failed = 0
let idx = -1
for (const it of ITEMS) {
  idx++
  if (ONLY && it.kind !== ONLY) continue
  if (SHARD && idx % SHARD[1] !== SHARD[0]) continue
  if (existsSync(dest(it))) { skipped++; continue }
  if (DRY) { console.log(`[dry] ${it.kind}/${it.slug}`); continue }
  try {
    const g = await tool('generate_image', {
      prompt: it.prompt, model: it.model, max_cost_usd: it.maxCost,
      aspect_ratio: it.aspect, count: 1, quality: 'high',
    })
    const proj = g.match(/project_id "([^"]+)"/)?.[1]
    if (!proj) throw new Error(`no project_id: ${g.slice(0, 120)}`)
    let out = ''
    let url = ''
    for (let poll = 0; poll < 6 && !url; poll++) {
      if (poll) await new Promise((r) => setTimeout(r, 15000))
      out = await tool('get_generation', { project_id: proj })
      url = out.match(/Download 1: (https:\/\/\S+)/)?.[1] ?? ''
      if (/failed|cancelled/i.test(out)) throw new Error(`run failed: ${out.slice(0, 160)}`)
    }
    const cost = Number(out.match(/\$([0-9.]+) \(estimated\)/)?.[1] ?? it.maxCost)
    if (!url) throw new Error(`still running after 6 polls: ${out.slice(0, 160)}`)
    const img = Buffer.from(await (await fetch(url)).arrayBuffer())
    const big = it.kind === 'topic' ? [256, 256] : it.kind === 'lab' ? [768, 768] : [1536, 1024]
    const webp = it.kind === 'topic'
      ? await sharp(img).resize(big[0], big[1], { fit: 'cover' }).png().toBuffer()
      : await sharp(img).resize(big[0], big[1], { fit: 'cover' }).webp({ quality: 82 }).toBuffer()
    if (it.kind === 'hero') { writeFileSync(`content/blog/${it.slug}/hero.webp`, webp); mkdirSync(`public/blog/${it.slug}`, { recursive: true }); writeFileSync(`public/blog/${it.slug}/hero.webp`, webp) }
    if (it.kind === 'study') { mkdirSync(`study/mlsys/${it.vol}/${it.slug}`, { recursive: true }); writeFileSync(`study/mlsys/${it.vol}/${it.slug}/cover.webp`, webp) }
    mkdirSync(path.dirname(dest(it)), { recursive: true })
    writeFileSync(dest(it), webp)
    spent += cost; done++
    console.log(`[${done}] ${it.kind}/${it.slug} $${cost} (Σ $${spent.toFixed(3)})`)
    if (spent > MAX_TOTAL_USD) { console.error(`SPEND CAP $${MAX_TOTAL_USD} hit — stopping`); break }
  } catch (e) {
    failed++
    console.error(`FAIL ${it.kind}/${it.slug}: ${e.message.slice(0, 160)}`)
  }
}
console.log(`done=${done} skipped=${skipped} failed=${failed} spent≈$${spent.toFixed(3)}`)
try { proc?.kill() } catch { proc = null }
