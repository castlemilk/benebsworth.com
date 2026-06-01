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
uniform float uTime, uAlpha;
uniform vec2 uResolution;
uniform vec3 uColor;
uniform vec2 uCenter; // word bbox centre, GL px
uniform vec2 uHalf;   // word bbox half-size (+pad), GL px
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
  // Soft elliptical mask over the word's bounding box, with a noise-wobbled edge so
  // the blob breathes organically. No uniform arrays → robust upload, and the mask
  // is exactly 0 outside the box (no stray corner contribution).
  vec2 q = (frag - uCenter) / uHalf;
  float dist = length(q);
  float edge = 1.12 + 0.22 * fbm(q * 1.6, uTime * 0.25);
  float m = smoothstep(edge, edge - 0.85, dist); // 1 inside → 0 past the edge

  vec2 np = frag / uResolution.y;
  float n = fbm(np * 2.2, uTime * 0.3);
  float flow = clamp(0.55 + 0.6 * n, 0.0, 1.25);
  float a = clamp(m * flow, 0.0, 1.0) * uAlpha;
  vec3 col = uColor * (0.8 + 0.4 * flow);
  // Premultiplied output so the mask gates the colour regardless of blend mode.
  gl_FragColor = vec4(col * a, a);
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

    // WebGL may be unavailable/blocked. This is a pure enhancement, so on any
    // init failure we bail silently — the SVG words still work without the glow.
    try {
      const renderer = new Renderer({ alpha: true, premultipliedAlpha: true, dpr })
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
          uCenter: { value: [0, 0] },
          uHalf: { value: [1, 1] },
        },
      })
      // Explicit premultiplied blend so the gate above is honoured regardless of
      // OGL's transparent default.
      program.setBlendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })
      const canvas = gl.canvas as HTMLCanvasElement
      canvas.style.display = 'block'
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      wrap.appendChild(canvas) // last GL step → on throw above, nothing is in the DOM

      let raf = 0
      let cur = 0 // current (eased) alpha
      let target = 0

      // A lost context (GPU reset, tab backgrounded, driver hiccup) would otherwise
      // throw on the next render and silently kill the blob. preventDefault lets the
      // browser restore it; we just park the loop until then.
      const onLost = (ev: Event) => { ev.preventDefault(); if (raf) { cancelAnimationFrame(raf); raf = 0 } }
      const onRestored = () => { if (target !== 0 || cur > 0) { if (!raf) raf = requestAnimationFrame(loop) } }
      canvas.addEventListener('webglcontextlost', onLost)
      canvas.addEventListener('webglcontextrestored', onRestored)

      const paint = (timeMs: number) => {
        program.uniforms.uTime.value = reduce ? 0 : timeMs * 0.001
        program.uniforms.uAlpha.value = cur
        renderer.render({ scene: mesh })
      }
      const loop = (timeMs: number) => {
        cur += 0.09 * (target - cur)
        if (Math.abs(target - cur) < 0.004) cur = target
        paint(timeMs)
        // Active blob keeps flowing; once fully faded out, park the loop.
        if (target === 0 && cur === 0) { raf = 0; return }
        raf = requestAnimationFrame(loop)
      }
      const ensure = () => { if (!raf) raf = requestAnimationFrame(loop) }

      apiRef.current = {
        setActive(points, color, radiusCss) {
          // Reduce the word's letter-cell centres to a padded bounding box.
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
          for (const [x, y] of points) {
            if (x < minX) minX = x; if (x > maxX) maxX = x
            if (y < minY) minY = y; if (y > maxY) maxY = y
          }
          const pad = radiusCss
          const cxv = (minX + maxX) / 2, cyv = (minY + maxY) / 2
          const hx = (maxX - minX) / 2 + pad, hy = (maxY - minY) / 2 + pad
          program.uniforms.uCenter.value = [cxv * dpr, gl.canvas.height - cyv * dpr] // GL origin bottom-left
          program.uniforms.uHalf.value = [hx * dpr, hy * dpr]
          program.uniforms.uColor.value = color
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
        canvas.removeEventListener('webglcontextlost', onLost)
        canvas.removeEventListener('webglcontextrestored', onRestored)
        apiRef.current = null
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
        gl.getExtension('WEBGL_lose_context')?.loseContext()
      }
    } catch (e) {
      // Pure enhancement: log once for diagnosis, then leave the words untouched.
      console.warn('[word-blob] WebGL init failed; words render without the glow', e)
      return
    }
  }, [width, height])

  return <div ref={wrapRef} className={className} aria-hidden style={{ pointerEvents: 'none' }} />
})
