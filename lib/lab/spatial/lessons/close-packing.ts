import { linspace, TAU } from '../geometry'
import type { SpatialFrame, SpatialLesson, SpatialParams, SpatialPoint, SpatialSurface, Vec3 } from '../types'

const PINK = '#f472b6'
const CYAN = '#55e6d0'
const VIOLET = '#b59aff'
const AMBER = '#ffc46b'
const FAINT = '#53617d'
const WHITE = '#eff8ff'

/** Contact diameter of one sphere in world units; the contact radius is half of it. */
export const SPHERE_DIAMETER = 0.6
export const CONTACT_RADIUS = SPHERE_DIAMETER / 2
/** Vertical spacing between touching hexagonal layers, d·√(2/3). */
export const LAYER_SPACING = SPHERE_DIAMETER * Math.sqrt(2 / 3)
/** Hexagonal patch radius in lattice steps: |i|, |j|, |i+j| ≤ 3 gives 37 sites per layer. */
export const PATCH_RADIUS = 3
export const SITES_PER_LAYER = 37

/** Kepler's bound: equal spheres never fill more than π/(3√2) of space. */
export const closePackedFraction = () => Math.PI / (3 * Math.SQRT2)
export const bodyCentredFraction = () => Math.PI * Math.sqrt(3) / 8
export const simpleCubicFraction = () => Math.PI / 6
/** Ideal hcp axial ratio c/a = 2√(2/3) for touching spheres. */
export const idealAxialRatio = () => 2 * Math.sqrt(2 / 3)
/** Largest sphere that fits an octahedral hole, in units of the host radius. */
export const octahedralHoleRatio = () => Math.SQRT2 - 1
/** Largest sphere that fits a tetrahedral hole, in units of the host radius. */
export const tetrahedralHoleRatio = () => Math.sqrt(3 / 2) - 1
/** Cubic cell edge of an fcc crystal with nearest-neighbour distance d. */
export const fccLatticeConstant = (nearest: number) => Math.SQRT2 * nearest

/**
 * Packing fraction of an infinite slab of n touching hexagonal layers, measured between the
 * bottom and top sphere surfaces: n·π / (3√3·(1 + (n−1)√(2/3))). Independent of stacking order.
 */
export function slabFraction(layers: number) {
  return layers * Math.PI / (3 * Math.sqrt(3) * (1 + (layers - 1) * Math.sqrt(2 / 3)))
}

/** Layers pull apart to 1.9× their spacing at phase π and touch again at 0 and 2π. */
export const explodeFactor = (phase: number) => 1 + 0.45 * (1 - Math.cos(phase))

/** 0 = ABAB… (hcp), 1 = ABCABC… (fcc). Returns the class 0 (A), 1 (B) or 2 (C) of layer k. */
export const layerClass = (layer: number, stacking: number) => stacking >= 0.5 ? layer % 3 : layer % 2

/** Hollow offset b = d·(1/2, 1/(2√3)); B sits at +b, C at −b (≡ 2b modulo the lattice). */
const HOLLOW: [number, number] = [SPHERE_DIAMETER / 2, SPHERE_DIAMETER / (2 * Math.sqrt(3))]

/** In-plane (x, z) position of lattice site (i, j) in a layer of the given class. */
export function sitePosition(i: number, j: number, cls: number): [number, number] {
  const shift = cls === 0 ? 0 : cls === 1 ? 1 : -1
  return [SPHERE_DIAMETER * (i + j / 2) + shift * HOLLOW[0], SPHERE_DIAMETER * j * Math.sqrt(3) / 2 + shift * HOLLOW[1]]
}

export function patchSites(radius = PATCH_RADIUS): [number, number][] {
  const sites: [number, number][] = []
  for (let i = -radius; i <= radius; i++) for (let j = -radius; j <= radius; j++) if (Math.abs(i + j) <= radius) sites.push([i, j])
  return sites
}

export type Sphere = { position: Vec3; layer: number; cls: number; i: number; j: number }

export const layerHeight = (layer: number, layers: number, phase: number) => (layer - (layers - 1) / 2) * LAYER_SPACING * explodeFactor(phase)

/** Every sphere centre of the drawn stack, layer by layer, bottom first. */
export function sphereCentres(layers: number, stacking: number, phase: number): Sphere[] {
  const spheres: Sphere[] = []
  for (let layer = 0; layer < layers; layer++) {
    const cls = layerClass(layer, stacking), y = layerHeight(layer, layers, phase)
    for (const [i, j] of patchSites()) { const [x, z] = sitePosition(i, j, cls); spheres.push({ position: [x, y, z], layer, cls, i, j }) }
  }
  return spheres
}

export const middleLayer = (layers: number) => Math.floor((layers - 1) / 2)

const distance = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

/** Spheres touching the central sphere of the middle layer: 6 for one layer, 9 for two, 12 for three or more. */
export function contactNeighbours(layers: number, stacking: number, phase: number): Sphere[] {
  const spheres = sphereCentres(layers, stacking, phase)
  const centre = spheres.find(s => s.layer === middleLayer(layers) && s.i === 0 && s.j === 0)!
  return spheres.filter(s => s !== centre && Math.abs(distance(s.position, centre.position) - SPHERE_DIAMETER) < 1e-6)
}
export const contactCount = (layers: number, stacking: number) => contactNeighbours(layers, stacking, 0).length

export type FccCell = { corners: Vec3[]; faces: Vec3[]; edges: [Vec3, Vec3][]; edge: Vec3[] }

/**
 * Conventional cubic cell of the ABC stack, standing on its body diagonal: corner v0 at the
 * layer-0 central A site, the three adjacent corners at second-ring B sites of layer 1, the
 * opposite corner three layers up. Returns null unless four layers are stacked ABC.
 */
export function fccCell(layers: number, stacking: number, phase: number): FccCell | null {
  if (stacking < 0.5 || layers < 4) return null
  const spheres = sphereCentres(layers, stacking, phase)
  const at = (layer: number, i: number, j: number) => spheres.find(s => s.layer === layer && s.i === i && s.j === j)!.position
  const v0 = at(0, 0, 0)
  const edge = ([[-1, -1], [1, -1], [-1, 1]] as const).map(([i, j]) => at(1, i, j).map((v, k) => v - v0[k]) as Vec3)
  const corners: Vec3[] = []
  for (let s = 0; s < 8; s++) corners.push(v0.map((v, k) => v + (s & 1 ? edge[0][k] : 0) + (s & 2 ? edge[1][k] : 0) + (s & 4 ? edge[2][k] : 0)) as Vec3)
  const faces: Vec3[] = []
  for (const [a, b, c] of [[0, 1, 2], [1, 2, 0], [2, 0, 1]] as const) {
    faces.push(v0.map((v, k) => v + (edge[a][k] + edge[b][k]) / 2) as Vec3)
    faces.push(v0.map((v, k) => v + edge[c][k] + (edge[a][k] + edge[b][k]) / 2) as Vec3)
  }
  const edges: [Vec3, Vec3][] = []
  for (let s = 0; s < 8; s++) for (const bit of [1, 2, 4]) if (!(s & bit)) edges.push([corners[s], corners[s | bit]])
  return { corners, faces, edges, edge }
}

const FIRST_RING: [number, number][] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]

/** Hexagonal prism of the ABA stack: a = d, c = 2h, corners on the six A neighbours of the layer-0 centre. */
export function hcpPrism(layers: number, stacking: number, phase: number): { bottom: Vec3[]; top: Vec3[] } | null {
  if (stacking >= 0.5 || layers < 3) return null
  const ring = (layer: number) => FIRST_RING.map(([i, j]) => { const [x, z] = sitePosition(i, j, 0); return [x, layerHeight(layer, layers, phase), z] as Vec3 })
  return { bottom: ring(0), top: ring(2) }
}

/** Marker spheres for the octahedral hole (over the C hollow) and one tetrahedral hole (under the B sphere) between layers 0 and 1. */
export function holeMarkers(layers: number, phase: number): { octahedral: Vec3; tetrahedral: Vec3 } | null {
  if (layers < 2) return null
  const y0 = layerHeight(0, layers, phase), gap = LAYER_SPACING * explodeFactor(phase)
  const [cx, cz] = sitePosition(0, 0, 2), [bx, bz] = sitePosition(0, 0, 1)
  return { octahedral: [cx, y0 + gap / 2, cz], tetrahedral: [bx, y0 + gap / 4, bz] }
}

const VIEW: Vec3 = [0.57, 0.39, 0.72]
const depthKey = (p: Vec3) => p[0] * VIEW[0] + p[1] * VIEW[1] + p[2] * VIEW[2]
const CLASS_COLOUR = [PINK, CYAN, VIOLET]

export const lesson: SpatialLesson = {
  slug: 'close-packing', title: 'Close packing: fcc and hcp', category: 'chemistry',
  blogSlug: 'two-crystals-hide-in-one-stack-of-oranges', accent: PINK,
  cameraDistance: 7.5,
  description: 'Stack hexagonal layers of touching spheres two ways and find a cube hiding in one stack and a hexagonal prism in the other.',
  defaults: { layers: 3, stacking: 0, drawRadius: 0.7 },
  controls: [
    { key: 'layers', label: 'Layers stacked', min: 1, max: 5, step: 1 },
    { key: 'stacking', label: 'Stacking: 0 = ABAB (hcp), 1 = ABC (fcc)', min: 0, max: 1, step: 1 },
    { key: 'drawRadius', label: 'Drawn radius, fraction of contact radius', min: 0.5, max: 1, step: 0.05 },
  ],
  presets: [
    { label: 'Copper fcc', params: { layers: 4, stacking: 1, drawRadius: 0.7 } },
    { label: 'Magnesium hcp', params: { layers: 3, stacking: 0, drawRadius: 0.7 } },
    { label: 'See-through lattice', params: { layers: 5, stacking: 1, drawRadius: 0.5 } },
  ],
  legend: [
    { label: 'Layer class A', color: PINK },
    { label: 'Layer class B', color: CYAN },
    { label: 'Layer class C (fcc only)', color: VIOLET },
    { label: 'Central sphere whose contacts are counted', color: WHITE },
    { label: 'Contacts, unit cell and hole markers', color: AMBER },
    { label: 'Guide ring and hcp hollows never filled', color: FAINT },
  ],
  explanation: 'Pink, cyan and violet spheres are the A, B and C positions of one hexagonal layer shifted into its two kinds of hollow; amber sticks join the white central sphere to every neighbour it touches when the layers are closed, and stretch with them as the stack opens; amber outlines draw the cubic cell (fcc, four layers) or the hexagonal prism (hcp, three layers) through sphere centres. The two small amber spheres between the bottom two layers are the largest balls that fit the octahedral hole and one of the two tetrahedral holes. Translucent triangles on the bottom layer mark its hollows: cyan where layer B lands, violet where C lands in fcc, grey where nothing ever lands in hcp. The timeline pulls the layers apart to 1.9 times their spacing and back so you can look between them.',
  limitation: 'Spheres are drawn at 0.5 to 1.0 of the contact radius so the stack can be seen through; the packing-fraction readout belongs to touching full-radius spheres in an infinite slab of n layers, not to the 37-site patch drawn. While the layers are pulled apart the cubic cell stretches into a rhombohedron and the hole markers no longer fit their holes. Only the two simplest periodic stackings are modelled; any repeat-free sequence of A, B and C (ABAC in lanthanum, the silicon carbide polytypes) packs equally well. Real metals have slightly non-ideal c/a ratios and atoms are not hard spheres.',
  readouts: p => {
    const n = Math.round(p.layers), contacts = contactCount(n, p.stacking)
    const contactText = contacts >= 12 ? `${contacts}: coordination number 12 for both fcc and hcp` : contacts >= 9 ? `${contacts}: 6 in the plane and 3 above` : `${contacts}: 6 in the plane only`
    const cell = p.stacking >= 0.5
      ? `fcc: a = √2·d = ${fccLatticeConstant(SPHERE_DIAMETER).toFixed(3)} units (Cu d = 2.556 Å → a = ${fccLatticeConstant(2.556).toFixed(3)} Å)`
      : `hcp: c/a = ${idealAxialRatio().toFixed(3)} ideal (Mg 1.624, Ti 1.588, Zn 1.856)`
    return [
      { label: 'Spheres drawn, n-layer slab fraction (→ ∞ limit)', value: `${SITES_PER_LAYER * n} spheres, ${(100 * slabFraction(n)).toFixed(2)}% → ${(100 * closePackedFraction()).toFixed(2)}%` },
      { label: 'Contacts on the central sphere', value: contactText },
      { label: 'Unit cell and holes', value: `${cell}; octahedral hole ${octahedralHoleRatio().toFixed(3)} r, tetrahedral ${tetrahedralHoleRatio().toFixed(3)} r` },
    ]
  },
  build: (p: SpatialParams, phase: number): SpatialFrame => {
    const n = Math.round(p.layers), spheres = sphereCentres(n, p.stacking, phase)
    const middle = middleLayer(n), drawn = CONTACT_RADIUS * p.drawRadius
    const lines: SpatialFrame['lines'] = []
    const surfaces: SpatialSurface[] = []
    const points: SpatialPoint[] = spheres.map(s => ({ position: s.position, color: s.layer === middle && s.i === 0 && s.j === 0 ? WHITE : CLASS_COLOUR[s.cls], size: drawn }))

    const centre = spheres.find(s => s.layer === middle && s.i === 0 && s.j === 0)!
    // Contacts are decided with the layers closed (phase 0) and drawn to the spheres' current, exploded positions.
    const contactKeys = new Set(contactNeighbours(n, p.stacking, 0).map(s => `${s.layer},${s.i},${s.j}`))
    for (const s of spheres) if (contactKeys.has(`${s.layer},${s.i},${s.j}`)) lines.push({ points: [centre.position, s.position], color: AMBER, opacity: 0.85 })
    const ringAt = (radius: number, start: number) => linspace(7, u => {
      const a = start + u * TAU
      return [centre.position[0] + radius * Math.cos(a), centre.position[1], centre.position[2] + radius * Math.sin(a)] as Vec3
    })
    lines.push({ points: ringAt(SPHERE_DIAMETER, 0), color: FAINT, opacity: 0.6 })
    if (n === 1) {
      lines.push({ points: ringAt(2 * SPHERE_DIAMETER, 0), color: FAINT, opacity: 0.45 })
      lines.push({ points: ringAt(Math.sqrt(3) * SPHERE_DIAMETER, Math.PI / 6), color: FAINT, opacity: 0.45 })
    }

    if (n >= 2) {
      const hollowB: SpatialSurface = { vertices: [], indices: [], color: CYAN, opacity: 0.16 }
      const hollowC: SpatialSurface = { vertices: [], indices: [], color: p.stacking >= 0.5 ? VIOLET : FAINT, opacity: 0.16 }
      const y0 = layerHeight(0, n, phase), inPatch = new Set(patchSites().map(([i, j]) => `${i},${j}`))
      const vertex = (i: number, j: number): Vec3 => { const [x, z] = sitePosition(i, j, 0); return [x, y0, z] }
      for (const [i, j] of patchSites()) {
        if (inPatch.has(`${i + 1},${j}`) && inPatch.has(`${i},${j + 1}`)) {
          const base = hollowB.vertices.length
          hollowB.vertices.push(vertex(i, j), vertex(i + 1, j), vertex(i, j + 1)); hollowB.indices.push(base, base + 1, base + 2)
        }
        if (inPatch.has(`${i - 1},${j}`) && inPatch.has(`${i},${j - 1}`)) {
          const base = hollowC.vertices.length
          hollowC.vertices.push(vertex(i, j), vertex(i - 1, j), vertex(i, j - 1)); hollowC.indices.push(base, base + 1, base + 2)
        }
      }
      surfaces.push(hollowB, hollowC)
      const holes = holeMarkers(n, phase)!
      points.push({ position: holes.octahedral, color: AMBER, size: CONTACT_RADIUS * octahedralHoleRatio() })
      points.push({ position: holes.tetrahedral, color: AMBER, size: CONTACT_RADIUS * tetrahedralHoleRatio() })
    }

    const cube = fccCell(n, p.stacking, phase)
    if (cube) {
      for (const [a, b] of cube.edges) lines.push({ points: [a, b], color: AMBER })
      lines.push({ points: [cube.corners[0], cube.corners[7]], color: AMBER, opacity: 0.35 })
    }
    const prism = hcpPrism(n, p.stacking, phase)
    if (prism) {
      lines.push({ points: [...prism.bottom, prism.bottom[0]], color: AMBER }, { points: [...prism.top, prism.top[0]], color: AMBER })
      prism.bottom.forEach((v, k) => lines.push({ points: [v, prism.top[k]], color: AMBER, opacity: 0.6 }))
    }

    points.sort((a, b) => depthKey(a.position) - depthKey(b.position))
    return { lines, surfaces, points }
  },
}

export default lesson
