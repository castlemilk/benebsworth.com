// Raw-WebGL2 host for the black-hole ray tracer: a single attribute-less
// fullscreen triangle whose fragment shader integrates null geodesics per
// pixel. Mirrors the universe-scale gl/scene.ts contract — create →
// resize → render(params, tMs) → dispose — plus context-loss recovery.

import { BH_VERT, BH_FRAG } from './shaders'

export type BlackHoleParams = {
  /** camera orbit azimuth (rad) */
  camAz: number
  /** camera inclination above the disk plane (rad), clamp < 88° */
  camIncl: number
  /** camera distance from the hole (sim units, rs = 2) */
  camDist: number
  /** disk inner radius (sim units; ISCO = 6) */
  innerR: number
  /** disk outer radius (sim units) */
  outerR: number
  /** physical SS73 peak temperature (K) — drives colour via tClr */
  tPeakK: number
  /** chromatic compression min(1, DISPLAY_TPEAK_K / tPeak) */
  tClr: number
  /** Doppler-beaming mix 0..1 */
  beaming: number
  exposure: number
  /** ray-march step budget (180 / 200 / 320) */
  steps: number
}

export type BlackHoleGL = {
  /** cssW/cssH in CSS px; scale = quality-adjusted devicePixelRatio */
  resize: (cssW: number, cssH: number, scale: number) => void
  render: (p: BlackHoleParams, tMs: number) => void
  dispose: () => void
}

const UNIFORMS = [
  'uResolution', 'uTime', 'uCamPos', 'uCamRight', 'uCamUp', 'uCamFwd',
  'uFovTan', 'uInnerR', 'uOuterR', 'uTpeak', 'uTclr', 'uBeaming',
  'uExposure', 'uSteps',
] as const
type UniformName = (typeof UNIFORMS)[number]

const FOV_TAN = Math.tan((55 * Math.PI) / 180 / 2) // 55° vertical FOV

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)
  if (!sh) throw new Error('createShader failed')
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh)
    gl.deleteShader(sh)
    throw new Error(`shader compile failed: ${log}`)
  }
  return sh
}

export function createBlackHoleGL(canvas: HTMLCanvasElement): BlackHoleGL {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false, // the shader dithers; geodesics don't alias like geometry
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
  })
  if (!gl) throw new Error('WebGL2 unavailable')

  let program: WebGLProgram | null = null
  let loc: Record<UniformName, WebGLUniformLocation | null> = {} as Record<
    UniformName,
    WebGLUniformLocation | null
  >
  let lost = false

  const build = () => {
    const vs = compile(gl, gl.VERTEX_SHADER, BH_VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, BH_FRAG)
    const prog = gl.createProgram()
    if (!prog) throw new Error('createProgram failed')
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(prog)
      gl.deleteProgram(prog)
      throw new Error(`program link failed: ${log}`)
    }
    program = prog
    const next = {} as Record<UniformName, WebGLUniformLocation | null>
    for (const u of UNIFORMS) next[u] = gl.getUniformLocation(prog, u)
    loc = next
  }
  build()

  // WebGL context-loss handling: swallow the loss, rebuild on restore.
  const onLost = (e: Event) => {
    e.preventDefault()
    lost = true
  }
  const onRestored = () => {
    try {
      build()
      lost = false
    } catch {
      // stays lost; the canvas simply freezes rather than crashing React
    }
  }
  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onRestored)

  const resize = (cssW: number, cssH: number, scale: number) => {
    canvas.width = Math.max(1, Math.round(cssW * scale))
    canvas.height = Math.max(1, Math.round(cssH * scale))
  }

  const render = (p: BlackHoleParams, tMs: number) => {
    if (lost || !program) return

    // ── pinhole camera basis on the CPU (disk plane = y = 0) ────────────
    const ci = Math.cos(p.camIncl)
    const si = Math.sin(p.camIncl)
    const px = p.camDist * ci * Math.sin(p.camAz)
    const py = p.camDist * si
    const pz = p.camDist * ci * Math.cos(p.camAz)
    // fwd = normalize(-pos): look at the origin
    const fl = Math.hypot(px, py, pz) || 1
    const fx = -px / fl, fy = -py / fl, fz = -pz / fl
    // right = normalize(cross(fwd, worldUp)) — inclination is clamped < 88°
    let rx = -fz, rz = fx
    const rl = Math.hypot(rx, rz) || 1
    rx /= rl
    rz /= rl
    // up = cross(right, fwd)  (right.y = 0)
    const ux = -rz * fy
    const uy = rz * fx - rx * fz
    const uz = rx * fy

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
    gl.useProgram(program)
    gl.uniform2f(loc.uResolution, gl.drawingBufferWidth, gl.drawingBufferHeight)
    gl.uniform1f(loc.uTime, tMs / 1000)
    gl.uniform3f(loc.uCamPos, px, py, pz)
    gl.uniform3f(loc.uCamRight, rx, 0, rz)
    gl.uniform3f(loc.uCamUp, ux, uy, uz)
    gl.uniform3f(loc.uCamFwd, fx, fy, fz)
    gl.uniform1f(loc.uFovTan, FOV_TAN)
    gl.uniform1f(loc.uInnerR, p.innerR)
    gl.uniform1f(loc.uOuterR, p.outerR)
    gl.uniform1f(loc.uTpeak, p.tPeakK)
    gl.uniform1f(loc.uTclr, p.tClr)
    gl.uniform1f(loc.uBeaming, p.beaming)
    gl.uniform1f(loc.uExposure, p.exposure)
    gl.uniform1i(loc.uSteps, p.steps)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  const dispose = () => {
    canvas.removeEventListener('webglcontextlost', onLost)
    canvas.removeEventListener('webglcontextrestored', onRestored)
    if (program) gl.deleteProgram(program)
    program = null
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }

  return { resize, render, dispose }
}
