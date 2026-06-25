// WebGL (ogl) renderer for the Universe-Scale simulator. Real 3-D: lit
// procedural-surface spheres for celestial bodies, GPU particle systems for
// galaxies / nebulae / the cosmic web, and composite primitives for the
// creature + structure scales. The same logarithmic viewLog drives a
// cross-fade across scales, so it stays a powers-of-ten zoom, now in 3-D.

import { Renderer, Camera, Program, Mesh, Geometry, Sphere, Box, Cylinder, Torus } from 'ogl'
import { CATALOG } from '@/lib/lab/universe-scale/catalog'
import { apparentPx, alphaFor } from '@/lib/lab/universe-scale/scale'
import { LIT_VERT, LIT_FRAG, POINTS_VERT, POINTS_FRAG } from './shaders'

type RGB = [number, number, number]
type Vec3 = [number, number, number]
type MeshPart = {
  geom: 'sphere' | 'box' | 'cone' | 'torus'
  surface: number
  color: RGB
  color2: RGB
  pos: Vec3
  scale: Vec3
  tilt: Vec3
  cull: boolean
}
type PointPart = { mesh: Mesh; tiltX: number; baseOff: Vec3 }
type ObjSpec = { meshes: MeshPart[]; points: PointPart[]; spin: number; axis: 'y' | 'x' }

const rand = (seed: number) => {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}
const rotY = (p: Vec3, a: number): Vec3 => [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)]
const rotX = (p: Vec3, a: number): Vec3 => [p[0], p[1] * Math.cos(a) - p[2] * Math.sin(a), p[1] * Math.sin(a) + p[2] * Math.cos(a)]

// ── particle-data generators (unit radius ≈ 1) ─────────────────────────────
function galaxyData(n: number, seed: number) {
  const r = rand(seed)
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), siz = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const arm = i % 2
    const f = Math.pow(r(), 0.7)
    const ang = arm * Math.PI + f * 5.5 + (r() - 0.5) * 0.5
    pos[i * 3] = Math.cos(ang) * f + (r() - 0.5) * 0.08
    pos[i * 3 + 1] = (r() - 0.5) * 0.05 * (1 - f)
    pos[i * 3 + 2] = Math.sin(ang) * f + (r() - 0.5) * 0.08
    const core = 1 - f
    col[i * 3] = 0.6 + core * 0.4; col[i * 3 + 1] = 0.5 + core * 0.45; col[i * 3 + 2] = 0.85 + core * 0.15
    siz[i] = (5 + r() * 9) * (0.4 + core)
  }
  return { pos, col, siz }
}
function blobData(n: number, seed: number, color: RGB, spread = 1) {
  const r = rand(seed)
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), siz = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const rad = Math.pow(r(), 0.5) * spread
    const th = r() * Math.PI * 2, ph = Math.acos(2 * r() - 1)
    pos[i * 3] = Math.sin(ph) * Math.cos(th) * rad
    pos[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * rad
    pos[i * 3 + 2] = Math.cos(ph) * rad
    const t = 0.6 + r() * 0.4
    col[i * 3] = color[0] * t; col[i * 3 + 1] = color[1] * t; col[i * 3 + 2] = color[2] * t
    siz[i] = 5 + r() * 9
  }
  return { pos, col, siz }
}
function shellData(n: number, seed: number, color: RGB) {
  const r = rand(seed)
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), siz = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const th = r() * Math.PI * 2, ph = Math.acos(2 * r() - 1), rad = 0.75 + r() * 0.25
    pos[i * 3] = Math.sin(ph) * Math.cos(th) * rad
    pos[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * rad
    pos[i * 3 + 2] = Math.cos(ph) * rad
    col[i * 3] = color[0]; col[i * 3 + 1] = color[1]; col[i * 3 + 2] = color[2]
    siz[i] = 4 + r() * 6
  }
  return { pos, col, siz }
}
function webData(n: number, seed: number) {
  const r = rand(seed)
  const nodes: Vec3[] = []
  for (let i = 0; i < 14; i++) nodes.push([r() * 2 - 1, r() * 2 - 1, r() * 2 - 1])
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), siz = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const a = nodes[Math.floor(r() * nodes.length)], b = nodes[Math.floor(r() * nodes.length)], t = r()
    pos[i * 3] = a[0] + (b[0] - a[0]) * t + (r() - 0.5) * 0.06
    pos[i * 3 + 1] = a[1] + (b[1] - a[1]) * t + (r() - 0.5) * 0.06
    pos[i * 3 + 2] = a[2] + (b[2] - a[2]) * t + (r() - 0.5) * 0.06
    col[i * 3] = 0.55; col[i * 3 + 1] = 0.62; col[i * 3 + 2] = 1.0
    siz[i] = 4 + r() * 6
  }
  return { pos, col, siz }
}
function helixData(n: number) {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), siz = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 2 - 1, strand = i % 2, ang = t * Math.PI * 5 + strand * Math.PI
    pos[i * 3] = Math.cos(ang) * 0.4; pos[i * 3 + 1] = t; pos[i * 3 + 2] = Math.sin(ang) * 0.4
    col[i * 3] = 0.36; col[i * 3 + 1] = 0.8; col[i * 3 + 2] = 0.6
    siz[i] = 7
  }
  return { pos, col, siz }
}

const C = {
  earth: [0.18, 0.42, 0.7] as RGB, land: [0.3, 0.6, 0.36] as RGB, moon: [0.7, 0.72, 0.76] as RGB,
  sunCore: [1.0, 0.95, 0.75] as RGB, sun: [1.0, 0.6, 0.18] as RGB,
  gas: [0.8, 0.66, 0.46] as RGB, gas2: [0.62, 0.45, 0.3] as RGB, mars: [0.76, 0.35, 0.23] as RGB,
  bio: [0.36, 0.75, 0.58] as RGB, blood: [0.75, 0.18, 0.13] as RGB, sand: [0.85, 0.72, 0.45] as RGB,
  metal: [0.55, 0.6, 0.68] as RGB, cyan: [0.35, 0.82, 0.9] as RGB, star: [1.0, 0.88, 0.55] as RGB,
  rock: [0.42, 0.45, 0.5] as RGB, white: [0.95, 0.97, 1.0] as RGB, ant: [0.4, 0.26, 0.13] as RGB,
  whale: [0.42, 0.55, 0.66] as RGB, skin: [0.82, 0.6, 0.46] as RGB,
}

export type UniverseGL = {
  resize: (w: number, h: number, dpr: number) => void
  render: (viewLog: number, tMs: number) => void
  dispose: () => void
}

export function createUniverseGL(canvas: HTMLCanvasElement): UniverseGL {
  const renderer = new Renderer({ canvas, alpha: false, antialias: true, dpr: 1, powerPreference: 'high-performance' })
  const gl = renderer.gl
  gl.clearColor(0.024, 0.027, 0.05, 1)

  const camera = new Camera(gl, { fov: 32, near: 0.01, far: 200 })
  camera.position.set(0, 0, 6)
  const CAM_Z = 6
  const lightDir: Vec3 = [-0.45, 0.55, 0.8]

  const geos = {
    sphere: new Sphere(gl, { radius: 1, widthSegments: 48, heightSegments: 32 }),
    box: new Box(gl, { width: 1, height: 1, depth: 1 }),
    cone: new Cylinder(gl, { radiusTop: 0.001, radiusBottom: 1, height: 1, radialSegments: 24 }),
    torus: new Torus(gl, { radius: 1, tube: 0.035, radialSegments: 8, tubularSegments: 80 }),
  }

  const litProgram = new Program(gl, {
    vertex: LIT_VERT, fragment: LIT_FRAG, transparent: true, depthTest: false, depthWrite: false, cullFace: gl.BACK,
    uniforms: {
      uColor: { value: [1, 1, 1] }, uColor2: { value: [1, 1, 1] }, uOpacity: { value: 1 },
      uSurface: { value: 0 }, uTime: { value: 0 }, uLightDir: { value: lightDir },
    },
  })
  const pointsProgram = new Program(gl, {
    vertex: POINTS_VERT, fragment: POINTS_FRAG, transparent: true, depthTest: false, depthWrite: false, cullFace: false,
    uniforms: { uOpacity: { value: 1 }, uPointScale: { value: 200 } },
  })

  const geoMesh = {
    sphere: new Mesh(gl, { geometry: geos.sphere, program: litProgram }),
    box: new Mesh(gl, { geometry: geos.box, program: litProgram }),
    cone: new Mesh(gl, { geometry: geos.cone, program: litProgram }),
    torus: new Mesh(gl, { geometry: geos.torus, program: litProgram }),
  }

  const makePoints = (data: { pos: Float32Array; col: Float32Array; siz: Float32Array }, tiltX = 0, baseOff: Vec3 = [0, 0, 0]): PointPart => {
    const geometry = new Geometry(gl, {
      position: { size: 3, data: data.pos }, color: { size: 3, data: data.col }, size: { size: 1, data: data.siz },
    })
    return { mesh: new Mesh(gl, { geometry, program: pointsProgram, mode: gl.POINTS }), tiltX, baseOff }
  }

  const starfield = makePoints(blobData(420, 99, [0.85, 0.9, 1.0], 1.0))
  starfield.mesh.scale.set(40, 40, 40)

  const sph = (surface: number, color: RGB, color2: RGB = [1, 1, 1], scale = 1, pos: Vec3 = [0, 0, 0]): MeshPart =>
    ({ geom: 'sphere', surface, color, color2, pos, scale: [scale, scale, scale], tilt: [0, 0, 0], cull: true })
  const box = (color: RGB, scale: Vec3, pos: Vec3, surface = 6): MeshPart =>
    ({ geom: 'box', surface, color, color2: color, pos, scale, tilt: [0, 0, 0], cull: true })
  const ring = (color: RGB, scale: number, tilt: Vec3): MeshPart =>
    ({ geom: 'torus', surface: 0, color, color2: color, pos: [0, 0, 0], scale: [scale, scale, scale], tilt, cull: false })

  function buildSpec(id: string): ObjSpec {
    const m: MeshPart[] = []; const p: PointPart[] = []
    let spin = 0.25, axis: 'y' | 'x' = 'y'
    switch (id) {
      case 'planck': p.push(makePoints(blobData(60, 1, C.cyan, 1.1))); spin = 0.6; break
      case 'quark': m.push(sph(5, C.cyan, C.cyan, 0.55)); break
      case 'proton': spin = 0.8
        m.push(sph(5, C.cyan, C.cyan, 0.42, [0.42, 0, 0]))
        m.push(sph(5, [0.95, 0.45, 0.7], [1, 1, 1], 0.42, [-0.21, 0.36, 0]))
        m.push(sph(5, [0.98, 0.75, 0.25], [1, 1, 1], 0.42, [-0.21, -0.36, 0])); break
      case 'atom': spin = 0.9
        m.push(sph(5, C.mars, [1, 1, 1], 0.2))
        m.push(ring(C.cyan, 1, [1.2, 0, 0])); m.push(ring(C.cyan, 1, [1.2, 1.05, 0])); m.push(ring(C.cyan, 1, [1.2, 2.1, 0])); break
      case 'dna': p.push(makePoints(helixData(160))); spin = 0.5; break
      case 'virus':
        m.push(sph(5, C.bio, [1, 1, 1], 0.7))
        for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; m.push(sph(0, C.bio, [1, 1, 1], 0.12, [Math.cos(a) * 0.92, Math.sin(a) * 0.92, 0])) } break
      case 'bacterium': { const b = sph(5, C.bio, [1, 1, 1], 0.9); b.scale = [1.4, 0.7, 0.7]; m.push(b); break }
      case 'redcell': { const b = sph(5, C.blood, [1, 1, 1], 1); b.scale = [1, 1, 0.5]; m.push(b); break }
      case 'cell': m.push(sph(5, C.bio, [1, 1, 1], 1)); m.push(sph(5, [0.2, 0.5, 0.4], [1, 1, 1], 0.34)); break
      case 'hair': { const b = sph(5, C.sand, [1, 1, 1], 1); b.scale = [0.4, 1.6, 0.4]; m.push(b); break }
      case 'sand': m.push(sph(3, C.sand, [1, 1, 1], 1)); break
      case 'ant': {
        spin = 0.18
        const dark: RGB = [0.22, 0.13, 0.06]
        m.push(sph(5, [0.34, 0.21, 0.1], [1, 1, 1], 0.3, [0.62, 0.04, 0]))  // head
        m.push(sph(5, C.ant, [1, 1, 1], 0.24, [0.14, 0, 0]))                 // thorax
        m.push(sph(5, [0.3, 0.18, 0.09], [1, 1, 1], 0.42, [-0.58, 0, 0]))    // gaster
        for (const s of [-1, 1]) for (const lx of [-0.02, 0.16, 0.34]) {     // six legs, angled out/down
          m.push({ geom: 'box', surface: 6, color: dark, color2: dark, pos: [lx, -0.2, s * 0.3], scale: [0.05, 0.05, 0.62], tilt: [s * 0.55, 0, 0], cull: true })
        }
        for (const s of [-1, 1]) {                                           // two antennae
          m.push({ geom: 'box', surface: 6, color: dark, color2: dark, pos: [0.95, 0.2, s * 0.1], scale: [0.045, 0.045, 0.4], tilt: [0, s * 0.5, -0.6], cull: true })
        }
        break
      }
      case 'hand': { const b = sph(5, C.skin, [1, 1, 1], 1); b.scale = [0.7, 1, 0.4]; m.push(b); break }
      case 'human': spin = 0.15
        m.push(sph(5, C.skin, [1, 1, 1], 0.2, [0, 0.78, 0]))
        m.push(box([0.3, 0.45, 0.7], [0.34, 0.7, 0.22], [0, 0.2, 0]))
        m.push(box([0.2, 0.22, 0.3], [0.14, 0.8, 0.16], [-0.12, -0.5, 0]))
        m.push(box([0.2, 0.22, 0.3], [0.14, 0.8, 0.16], [0.12, -0.5, 0])); break
      case 'car': spin = 0.15
        m.push(box(C.mars, [1.8, 0.5, 0.8], [0, 0, 0]))
        m.push(box([0.6, 0.7, 0.85], [0.9, 0.45, 0.7], [0, 0.4, 0])); break
      case 'whale': spin = 0.12
        { const b = sph(5, C.whale, C.white, 1); b.scale = [2, 0.7, 0.7]; m.push(b) }
        m.push({ geom: 'cone', surface: 0, color: C.whale, color2: C.whale, pos: [1.9, 0, 0], scale: [0.5, 0.6, 0.5], tilt: [0, 0, 1.57], cull: false }); break
      case 'pitch': m.push(box([0.2, 0.55, 0.3], [1.6, 0.05, 1], [0, 0, 0])); break
      case 'skyscraper': spin = 0.18; m.push(box(C.metal, [0.5, 1.8, 0.5], [0, 0, 0])); break
      case 'city': spin = 0.12; m.push(box([0.5, 0.55, 0.62], [1.6, 0.2, 1.6], [0, 0, 0])); break
      case 'everest': spin = 0.18
        m.push({ geom: 'cone', surface: 3, color: C.rock, color2: C.rock, pos: [0, 0, 0], scale: [1.4, 1.6, 1.4], tilt: [0, 0, 0], cull: false })
        m.push({ geom: 'cone', surface: 0, color: C.white, color2: C.white, pos: [0, 0.55, 0], scale: [0.5, 0.5, 0.5], tilt: [0, 0, 0], cull: false }); break
      case 'moon': m.push(sph(3, C.moon)); break
      case 'earth': m.push(sph(1, C.earth, C.land)); break
      case 'jupiter': m.push(sph(4, C.gas, C.gas2)); m.push(ring([0.82, 0.75, 0.6], 1.7, [1.3, 0, 0.3])); break
      case 'sun': m.push(sph(2, C.sun, C.sunCore)); spin = 0.1; break
      case 'earthorbit': spin = 0.4
        m.push(sph(2, C.sun, C.sunCore, 0.06)); m.push(ring([0.5, 0.6, 0.8], 1, [1.45, 0, 0])); m.push(sph(1, C.earth, C.land, 0.05, [1, 0, 0])); break
      case 'solarsystem': spin = 0.3
        m.push(sph(2, C.sun, C.sunCore, 0.05))
        for (let i = 1; i <= 4; i++) { m.push(ring([0.45, 0.5, 0.7], i / 4, [1.45, 0, 0])); m.push(sph(i % 2 ? 1 : 4, i % 2 ? C.earth : C.gas, i % 2 ? C.land : C.gas2, 0.035, [i / 4, 0, 0])) } break
      case 'lightyear': case 'proxima': m.push(sph(2, C.sun, C.sunCore, 0.3)); break
      case 'nebula': p.push(makePoints(blobData(300, 11, [0.6, 0.4, 0.85], 1))); m.push(sph(2, C.sunCore, C.star, 0.08)); break
      case 'cluster-stars': p.push(makePoints(blobData(500, 13, C.star, 0.95))); break
      case 'milkyway': p.push(makePoints(galaxyData(2200, 21), 1.1)); spin = 0.18; break
      case 'localgroup': case 'virgo': spin = 0.1
        for (let i = 0; i < 5; i++) p.push(makePoints(galaxyData(420, 30 + i), 1.0 + i * 0.2, [Math.sin(i * 2.4) * 0.6, Math.sin(i * 1.7) * 0.4, Math.cos(i * 2.1) * 0.6])); break
      case 'laniakea': case 'cosmicweb': p.push(makePoints(webData(900, 41))); spin = 0.06; break
      case 'universe': p.push(makePoints(shellData(800, 51, [0.55, 0.6, 1.0]))); p.push(makePoints(blobData(300, 52, [0.4, 0.45, 0.9], 0.85))); spin = 0.05; break
      default: m.push(sph(5, C.rock)); break
    }
    return { meshes: m, points: p, spin, axis }
  }

  const specs = new Map<string, ObjSpec>()
  for (const o of CATALOG) specs.set(o.id, buildSpec(o.id))

  let W = 1, H = 1, worldPerPx = 0.01
  const resize = (w: number, h: number, dpr: number) => {
    renderer.dpr = dpr
    renderer.setSize(w, h)
    camera.perspective({ aspect: w / h })
    W = w; H = h
    const visH = 2 * CAM_Z * Math.tan((camera.fov * Math.PI) / 180 / 2)
    worldPerPx = visH / h
    pointsProgram.uniforms.uPointScale.value = h * dpr * 0.0016
  }

  const render = (viewLog: number, tMs: number) => {
    const t = tMs / 1000
    litProgram.uniforms.uTime.value = t
    gl.clear(gl.COLOR_BUFFER_BIT)

    const cosmic = Math.max(0, Math.min(1, (viewLog - 6.5) / 14))
    pointsProgram.uniforms.uOpacity.value = 0.12 + 0.7 * cosmic
    starfield.mesh.rotation.y = t * 0.01
    renderer.render({ scene: starfield.mesh, camera, clear: false })

    const minDim = Math.min(W, H)
    const refPx = minDim * 0.34

    // Each scale gets a slight 3-D offset from the focal one (a "string of
    // scales") so the next-smaller object doesn't sit on the focal face.
    const OFF: Vec3 = [0.62, -0.42, 0.5]
    const vis: { id: string; radius: number; alpha: number; spec: ObjSpec; off: Vec3 }[] = []
    for (const o of CATALOG) {
      const px = apparentPx(o.sizeMeters, viewLog, refPx)
      let a = alphaFor(px, minDim)
      if (a <= 0.012) continue
      if (px > minDim) a *= 0.4
      const dLog = Math.log10(o.sizeMeters) - viewLog
      const k = dLog * 1.85
      vis.push({ id: o.id, radius: (px * worldPerPx) / 2, alpha: a, spec: specs.get(o.id)!, off: [OFF[0] * k, OFF[1] * k, OFF[2] * k] })
    }
    vis.sort((u, v) => v.radius - u.radius)

    for (const v of vis) {
      const objRot = t * v.spec.spin
      // particle systems
      pointsProgram.uniforms.uOpacity.value = v.alpha
      for (const pp of v.spec.points) {
        pp.mesh.scale.set(v.radius, v.radius, v.radius)
        pp.mesh.position.set(pp.baseOff[0] * v.radius + v.off[0], pp.baseOff[1] * v.radius + v.off[1], pp.baseOff[2] * v.radius + v.off[2])
        pp.mesh.rotation.set(pp.tiltX, objRot, 0)
        renderer.render({ scene: pp.mesh, camera, clear: false })
      }
      // lit meshes
      litProgram.uniforms.uOpacity.value = v.alpha
      for (const part of v.spec.meshes) {
        const mesh = geoMesh[part.geom]
        mesh.program.cullFace = part.cull ? gl.BACK : false
        litProgram.uniforms.uSurface.value = part.surface
        litProgram.uniforms.uColor.value = part.color
        litProgram.uniforms.uColor2.value = part.color2
        const wp = v.spec.axis === 'y' ? rotY(part.pos, objRot) : rotX(part.pos, objRot)
        mesh.position.set(wp[0] * v.radius + v.off[0], wp[1] * v.radius + v.off[1], wp[2] * v.radius + v.off[2])
        mesh.scale.set(part.scale[0] * v.radius, part.scale[1] * v.radius, part.scale[2] * v.radius)
        mesh.rotation.set(part.tilt[0], part.tilt[1] + (v.spec.axis === 'y' ? objRot : 0), part.tilt[2])
        renderer.render({ scene: mesh, camera, clear: false })
      }
    }
  }

  const dispose = () => { gl.getExtension('WEBGL_lose_context')?.loseContext() }
  return { resize, render, dispose }
}
