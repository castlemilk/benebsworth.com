'use client'
import { Renderer, Program, Mesh, Triangle } from 'ogl'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

/** Imperative handle: the SVG word links drive this from their hover/focus. */
export type WordBlobHandle = {
  /** Light up a word's blob. `pointsCss` are letter-cell centres in CSS px
   *  (canvas-local), `color` is linear-ish rgb 0..1, `radiusCss` the metaball
   *  sigma in CSS px. */
  setActive: (pointsCss: [number, number][], color: [number, number, number], radiusCss: number) => void
  /** Fade the blob back out. */
  clear: () => void
}

const vertex = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }
`

// Metaball mask over the word's letter cells × a Perlin/fbm flow field (ported
// from the SoftAurora reference), tinted by the section accent and faded by uAlpha.
const fragment = /* glsl */ `
precision highp float;
uniform float uTime, uAlpha, uRadius, uCount;
uniform vec2 uResolution;
uniform vec3 uColor;
uniform vec2 uPoints[8];
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

void main() {
  vec2 frag = gl_FragCoord.xy;
  // Metaball mask: sum of gaussians at the (slowly wobbling) letter cells so the
  // visible field is one connected blob shaped to the word, with edges that flow.
  float m = 0.0;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= uCount) break;
    vec2 pt = uPoints[i] + uRadius * 0.22 * vec2(sin(uTime * 0.7 + float(i) * 1.7),
                                                 cos(uTime * 0.6 + float(i) * 1.1));
    vec2 d = frag - pt;
    m += exp(-dot(d, d) / (uRadius * uRadius));
  }
  m = clamp(m, 0.0, 1.0);

  vec2 np = frag / uResolution.y;
  float n = fbm(np * 2.2, uTime * 0.3);
  float flow = clamp(0.5 + 0.7 * n, 0.0, 1.3);
  float intensity = m * flow;
  vec3 col = uColor * (0.7 + 0.5 * flow);
  gl_FragColor = vec4(col, intensity * uAlpha);
}
`

type Props = { width: number; height: number; className?: string }

export const WordBlob = forwardRef<WordBlobHandle, Props>(function WordBlob({ width, height, className }, ref) {
  const wrapRef = useRef<HTMLDivElement>(null)
  // The live API is wired up inside the effect (once GL exists); the handle just
  // forwards to it, so calls before mount are safely dropped.
  const apiRef = useRef<WordBlobHandle | null>(null)
  useImperativeHandle(ref, () => ({
    setActive: (p, c, r) => apiRef.current?.setActive(p, c, r),
    clear: () => apiRef.current?.clear(),
  }), [])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap || width < 2 || height < 2) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const renderer = new Renderer({ alpha: true, premultipliedAlpha: false, dpr })
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)
    renderer.setSize(width, height)

    const program = new Program(gl, {
      vertex, fragment, transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [gl.canvas.width, gl.canvas.height] },
        uAlpha: { value: 0 },
        uColor: { value: [1, 1, 1] },
        uRadius: { value: 60 },
        uCount: { value: 0 },
        uPoints: { value: new Float32Array(16) },
      },
    })
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })
    const canvas = gl.canvas as HTMLCanvasElement
    canvas.style.display = 'block'
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    wrap.appendChild(canvas)

    let raf = 0
    let cur = 0 // current (eased) alpha
    let target = 0

    function paint(timeMs: number) {
      program.uniforms.uTime.value = reduce ? 0 : timeMs * 0.001
      program.uniforms.uAlpha.value = cur
      renderer.render({ scene: mesh })
    }
    function loop(timeMs: number) {
      cur += 0.09 * (target - cur)
      if (Math.abs(target - cur) < 0.004) cur = target
      paint(timeMs)
      // Active blob keeps flowing; once fully faded out, park the loop.
      if (target === 0 && cur === 0) { raf = 0; return }
      raf = requestAnimationFrame(loop)
    }
    function ensure() { if (!raf) raf = requestAnimationFrame(loop) }

    apiRef.current = {
      setActive(points, color, radiusCss) {
        const buf = program.uniforms.uPoints.value as Float32Array
        const n = Math.min(points.length, 8)
        for (let i = 0; i < n; i++) {
          buf[i * 2] = points[i][0] * dpr
          buf[i * 2 + 1] = gl.canvas.height - points[i][1] * dpr // GL origin is bottom-left
        }
        program.uniforms.uCount.value = n
        program.uniforms.uColor.value = color
        program.uniforms.uRadius.value = radiusCss * dpr
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

    return () => {
      if (raf) cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVis)
      apiRef.current = null
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [width, height])

  return <div ref={wrapRef} className={className} aria-hidden style={{ pointerEvents: 'none' }} />
})
