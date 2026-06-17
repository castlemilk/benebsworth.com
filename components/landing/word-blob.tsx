'use client'
import { useEffect, useImperativeHandle, useRef } from 'react'

/** Imperative handle: the SVG word links drive this from their hover/focus. */
export type WordBlobHandle = {
  /** Light up a word's blob. `mask` is a canvas with the word's glyphs drawn
   *  (soft white on transparent, same pixel space as the blob canvas); `color`
   *  is rgb 0..1. The shader tints + flows inside the glyph mask. */
  setActive: (mask: HTMLCanvasElement, color: [number, number, number], shape: number) => void
  /** Fade the blob back out. */
  clear: () => void
}

const vertex = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }
`

// Mask = the word's glyphs (sampled from a texture, so the blob follows the actual
// text shape). A Perlin/fbm flow field (ported from the SoftAurora reference)
// shimmers the brightness and slightly warps the lookup so the glow drifts like
// liquid inside the letters. Tinted by the section accent, faded by uAlpha.
const fragment = /* glsl */ `
precision highp float;
uniform float uTime, uAlpha, uShape; // uShape: 0 square · 1 circle · 2 triangle
uniform vec2 uResolution;
uniform vec3 uColor;
uniform sampler2D uMask;
varying vec2 vUv;
#define TAU 6.28318

vec3 gradientHash(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 234.6)),
           dot(p, vec3(269.5, 183.3, 198.3)),
           dot(p, vec3(169.5, 283.3, 156.9)));
  vec3 h = fract(sin(p) * 43758.5453123);
  float phi = acos(2.0 * h.x - 1.0);
  float theta = TAU * h.y;
  return vec3(cos(theta) * sin(phi), sin(theta) * cos(phi), cos(phi));
}
float qs(float t) { float t2 = t * t; float t3 = t * t2; return 6.0 * t3 * t2 - 15.0 * t2 * t2 + 10.0 * t3; }
float perlin(float amp, float freq, float px, float py, float pz) {
  float x = px * freq, y = py * freq;
  float fx = floor(x), fy = floor(y), fz = floor(pz);
  float cx = ceil(x),  cy = ceil(y),  cz = ceil(pz);
  vec3 g000 = gradientHash(vec3(fx, fy, fz)), g100 = gradientHash(vec3(cx, fy, fz));
  vec3 g010 = gradientHash(vec3(fx, cy, fz)), g110 = gradientHash(vec3(cx, cy, fz));
  vec3 g001 = gradientHash(vec3(fx, fy, cz)), g101 = gradientHash(vec3(cx, fy, cz));
  vec3 g011 = gradientHash(vec3(fx, cy, cz)), g111 = gradientHash(vec3(cx, cy, cz));
  float d000 = dot(g000, vec3(x - fx, y - fy, pz - fz)), d100 = dot(g100, vec3(x - cx, y - fy, pz - fz));
  float d010 = dot(g010, vec3(x - fx, y - cy, pz - fz)), d110 = dot(g110, vec3(x - cx, y - cy, pz - fz));
  float d001 = dot(g001, vec3(x - fx, y - fy, pz - cz)), d101 = dot(g101, vec3(x - cx, y - fy, pz - cz));
  float d011 = dot(g011, vec3(x - fx, y - cy, pz - cz)), d111 = dot(g111, vec3(x - cx, y - cy, pz - cz));
  float sx = qs(x - fx), sy = qs(y - fy), sz = qs(pz - fz);
  float lx00 = mix(d000, d100, sx), lx10 = mix(d010, d110, sx);
  float lx01 = mix(d001, d101, sx), lx11 = mix(d011, d111, sx);
  float ly0 = mix(lx00, lx10, sy), ly1 = mix(lx01, lx11, sy);
  return amp * mix(ly0, ly1, sz);
}
float fbm(vec2 p, float t) {
  float v = 0.0, amp = 0.6, freq = 1.0;
  for (int i = 0; i < 3; i++) { v += perlin(amp, freq, p.x, p.y, t); amp *= 0.5; freq *= 2.0; }
  return v;
}

// Moving lava field in [0,1] at a normalised uv (domain-warped, rising).
float lavaField(vec2 uv) {
  float t = uTime * 0.28;
  vec2 p = uv * vec2(uResolution.x / uResolution.y, 1.0) * 2.4;
  vec2 warp = vec2(fbm(p + vec2(0.0, t), t * 0.6), fbm(p + vec2(4.7, 1.3 - t), t * 0.6));
  float lava = fbm(p + 2.6 * warp + vec2(0.0, -t * 2.2), t * 0.4);
  return smoothstep(-0.22, 0.32, lava);
}

// Signed distance to an up-pointing equilateral triangle (iq), <0 inside.
float sdTriangle(vec2 p, float r) {
  const float k = 1.7320508; // sqrt(3)
  p.x = abs(p.x) - r;
  p.y = p.y + r / k;
  if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  p.x -= clamp(p.x, -2.0 * r, 0.0);
  return -length(p) * sign(p.y);
}

// Soft coverage of the per-section shape, radius r, local coord gv in [-0.5,0.5].
float shapeMask(vec2 gv, float r) {
  float aa = 0.06;
  if (uShape < 0.5) {            // square
    return smoothstep(r, r - aa, max(abs(gv.x), abs(gv.y)));
  } else if (uShape < 1.5) {     // circle
    return smoothstep(r, r - aa, length(gv));
  }
  return smoothstep(aa, -aa, sdTriangle(gv, r * 0.9)); // triangle
}

void main() {
  // Rasterise into a particle grid: one shape per cell, sized by the moving lava
  // field × the word-region mask, both sampled at the cell centre — so a field of
  // circles/squares/triangles grows and shrinks as the lava drifts through.
  float cellPx = uResolution.y / 44.0;
  vec2 id = floor(gl_FragCoord.xy / cellPx);
  vec2 center = (id + 0.5) * cellPx;        // cell centre, px
  vec2 gv = (gl_FragCoord.xy - center) / cellPx; // local [-0.5, 0.5]
  vec2 cuv = center / uResolution.xy;       // normalised cell centre

  float region = texture2D(uMask, cuv).a;
  float lava = lavaField(cuv);
  float inten = clamp(region * (0.35 + 0.85 * lava), 0.0, 1.0);
  if (inten < 0.02) discard;

  float r = inten * 0.6;                     // shape half-size (≤ touches cell edge)
  float s = shapeMask(gv, r);
  float a = s * uAlpha;
  vec3 col = uColor * (0.85 + 0.45 * lava);
  // Premultiplied output so the shape coverage gates the colour.
  gl_FragColor = vec4(col * a, a);
}
`

type Props = { width: number; height: number; className?: string; ref?: React.Ref<WordBlobHandle> }

export function WordBlob({ width, height, className, ref }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<WordBlobHandle | null>(null)
  // Latest size, read by the (run-once) init effect; resizing reuses the context.
  const sizeRef = useRef({ width, height })
  sizeRef.current = { width, height }
  const resizeRef = useRef<((w: number, h: number) => void) | null>(null)
  useImperativeHandle(ref, () => ({
    setActive: (m, c, s) => apiRef.current?.setActive(m, c, s),
    clear: () => apiRef.current?.clear(),
  }), [])

  // Init once. The GL context, shader and texture are created a single time;
  // resizing only calls renderer.setSize (see the resize effect below) instead of
  // rebuilding everything — rebuilding on every resize janks and churns through the
  // browser's WebGL-context budget until the canvas gets force-lost.
  useEffect(() => {
    const wrap = wrapRef.current
    const { width: w0, height: h0 } = sizeRef.current
    if (!wrap || w0 < 2 || h0 < 2) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let destroyed = false
    let cleanup: (() => void) | null = null

    // Dynamic import: ogl (~146KB) is only fetched when the blob actually
    // initialises, keeping it out of the initial page bundle entirely.
    // Pre-check WebGL support so ogl's Renderer (which logs console.error
    // on failure) never runs in headless/WebGL-blocked environments.
    const testCanvas = document.createElement('canvas')
    const testGl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl')
    if (!testGl) return

    import('ogl').then(({ Renderer, Program, Mesh, Triangle, Texture }) => {
      if (destroyed) return

      // WebGL may be unavailable/blocked. Pure enhancement → bail silently on any
      // init failure; the SVG words still work without the glow.
      try {
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const renderer = new Renderer({ alpha: true, premultipliedAlpha: true, dpr })
        const gl = renderer.gl
        gl.clearColor(0, 0, 0, 0)
        renderer.setSize(w0, h0)

        const mask = new Texture(gl, { generateMipmaps: false, flipY: true })
        const program = new Program(gl, {
          vertex, fragment, transparent: true,
          uniforms: {
            uTime: { value: 0 },
            uResolution: { value: [gl.canvas.width, gl.canvas.height] },
            uAlpha: { value: 0 },
            uColor: { value: [1, 1, 1] },
            uShape: { value: 1 },
            uMask: { value: mask },
          },
        })
        program.setBlendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA) // premultiplied
        const meshObj = new Mesh(gl, { geometry: new Triangle(gl), program })
        const canvas = gl.canvas as HTMLCanvasElement
        canvas.style.display = 'block'
        canvas.style.width = `${w0}px`
        canvas.style.height = `${h0}px`
        wrap.appendChild(canvas) // last GL step → on throw above, nothing is in the DOM

        let raf = 0
        let cur = 0 // current (eased) alpha
        let target = 0

        // A lost context (GPU reset, tab backgrounded) would otherwise throw on the
        // next render and silently kill the blob. preventDefault lets it restore.
        const onLost = (ev: Event) => { ev.preventDefault(); if (raf) { cancelAnimationFrame(raf); raf = 0 } }
        const onRestored = () => { if (target !== 0 || cur > 0) { if (!raf) raf = requestAnimationFrame(loop) } }
        canvas.addEventListener('webglcontextlost', onLost)
        canvas.addEventListener('webglcontextrestored', onRestored)

        const paint = (timeMs: number) => {
          program.uniforms.uTime.value = reduce ? 0 : timeMs * 0.001
          program.uniforms.uAlpha.value = cur
          renderer.render({ scene: meshObj })
        }
        const loop = (timeMs: number) => {
          cur += 0.09 * (target - cur)
          if (Math.abs(target - cur) < 0.004) cur = target
          paint(timeMs)
          if (target === 0 && cur === 0) { raf = 0; return } // park when fully out
          raf = requestAnimationFrame(loop)
        }
        const ensure = () => { if (!raf) raf = requestAnimationFrame(loop) }

        apiRef.current = {
          setActive(maskCanvas, color, shape) {
            mask.image = maskCanvas as unknown as HTMLImageElement
            mask.needsUpdate = true
            program.uniforms.uColor.value = color
            program.uniforms.uShape.value = shape
            target = 1
            if (reduce) { cur = 1; paint(0); return }
            ensure()
          },
          clear() {
            target = 0
            if (reduce) { cur = 0; paint(0); return }
            ensure()
          },
        }

        const onVis = () => {
          if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0 } }
          else if (target !== 0 || cur > 0) ensure()
        }
        document.addEventListener('visibilitychange', onVis)

        // Resize reuses the context: just resize the framebuffer + update the
        // resolution uniform, and re-render a frame if the blob is currently showing.
        resizeRef.current = (w, h) => {
          if (w < 2 || h < 2) return
          renderer.setSize(w, h)
          program.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height]
          canvas.style.width = `${w}px`
          canvas.style.height = `${h}px`
          if (target !== 0 || cur > 0) ensure()
        }

        cleanup = () => {
          if (raf) cancelAnimationFrame(raf)
          document.removeEventListener('visibilitychange', onVis)
          canvas.removeEventListener('webglcontextlost', onLost)
          canvas.removeEventListener('webglcontextrestored', onRestored)
          apiRef.current = null
          resizeRef.current = null
          if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
          gl.getExtension('WEBGL_lose_context')?.loseContext()
        }
      } catch {
        // WebGL unavailable/blocked — pure enhancement, words still work without the glow.
      }
    }).catch(() => {})

    return () => {
      destroyed = true
      cleanup?.()
    }
    // Init once — resizing is handled by the effect below, not by re-running this.
  }, [])

  // Apply size changes to the existing context (no teardown/rebuild).
  useEffect(() => { resizeRef.current?.(width, height) }, [width, height])

  return <div ref={wrapRef} className={className} aria-hidden style={{ pointerEvents: 'none' }} />
}
