import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

export const controls: ControlSpec[] = [
  { key: 'fieldTheta', label: 'Field θ', type: 'range', min: 0, max: 3.14, step: 0.05 },
  { key: 'fieldPhi', label: 'Field φ', type: 'range', min: 0, max: 6.28, step: 0.05 },
  { key: 'coupling', label: 'Coupling', type: 'range', min: 0.1, max: 5, step: 0.1 },
  { key: 'color', label: 'Color', type: 'color' },
]

export const defaults: Params = { fieldTheta: 0.4, fieldPhi: 0, coupling: 1.5, color: '#7c5cff' }

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/** Rotate a 3D point by Euler angles (rotateX then rotateY) */
function rotate(x: number, y: number, z: number, ax: number, ay: number): [number, number] {
  // Rotate around Y axis
  const x1 = x * Math.cos(ay) + z * Math.sin(ay)
  const z1 = -x * Math.sin(ay) + z * Math.cos(ay)
  // Rotate around X axis
  const y1 = y * Math.cos(ax) - z1 * Math.sin(ax)
  // Orthographic projection
  return [x1, y1]
}

export const blochSphere: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    // Trail buffer for state precession
    const TRAIL_LEN = 200
    const trailX = new Float32Array(TRAIL_LEN)
    const trailY = new Float32Array(TRAIL_LEN)
    const trailZ = new Float32Array(TRAIL_LEN)
    let trailIdx = 0
    let trailCount = 0

    return {
      step(t, p) {
        const { w, h } = dims
        const time = t / 1000
        const [cr, cg, cb] = hexRgb(p.color as string)
        const fTheta = p.fieldTheta as number
        const fPhi = p.fieldPhi as number
        const omega = p.coupling as number

        const cx = w / 2
        const cy = h / 2
        const R = Math.min(w, h) * 0.35

        // Slowly rotate the view angle
        const viewAx = 0.4
        const viewAy = time * 0.15

        const proj = (x: number, y: number, z: number): [number, number] => {
          const [px, py] = rotate(x, y, z, viewAx, viewAy)
          return [cx + px * R, cy - py * R]
        }

        ctx.clearRect(0, 0, w, h)

        // Draw sphere wireframe — longitude and latitude lines
        ctx.strokeStyle = theme.fg + '15'
        ctx.lineWidth = 0.8

        // Latitudes
        for (let lat = -60; lat <= 60; lat += 30) {
          const phi = (lat * Math.PI) / 180
          ctx.beginPath()
          for (let i = 0; i <= 72; i++) {
            const lon = (i / 72) * Math.PI * 2
            const [px, py] = proj(
              Math.cos(phi) * Math.cos(lon),
              Math.sin(phi),
              Math.cos(phi) * Math.sin(lon),
            )
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
          }
          ctx.closePath()
          ctx.stroke()
        }

        // Longitudes
        for (let lon = 0; lon < 360; lon += 30) {
          const theta = (lon * Math.PI) / 180
          ctx.beginPath()
          for (let i = 0; i <= 72; i++) {
            const phi = (i / 72) * Math.PI * 2
            const [px, py] = proj(
              Math.cos(phi) * Math.cos(theta),
              Math.sin(phi),
              Math.cos(phi) * Math.sin(theta),
            )
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
          }
          ctx.closePath()
          ctx.stroke()
        }

        // Equator (brighter)
        ctx.strokeStyle = theme.fg + '30'
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let i = 0; i <= 72; i++) {
          const lon = (i / 72) * Math.PI * 2
          const [px, py] = proj(Math.cos(lon), 0, Math.sin(lon))
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.stroke()

        // Axes
        const axes: { label: string; x: number; y: number; z: number; color: string }[] = [
          { label: '|0⟩', x: 0, y: 1.15, z: 0, color: '#4ade80' },
          { label: '|1⟩', x: 0, y: -1.15, z: 0, color: '#f87171' },
          { label: 'x', x: 1.2, y: 0, z: 0, color: theme.fg + '40' },
          { label: 'y', x: 0, y: 0, z: 1.2, color: theme.fg + '40' },
        ]
        for (const a of axes) {
          const [px, py] = proj(a.x, a.y, a.z)
          ctx.font = '11px monospace'
          ctx.fillStyle = a.color
          ctx.fillText(a.label, px + 4, py - 4)
        }

        // Hamiltonian / field direction vector
        const hx = Math.sin(fTheta) * Math.cos(fPhi)
        const hy = Math.cos(fTheta)
        const hz = Math.sin(fTheta) * Math.sin(fPhi)
        const [hpx, hpy] = proj(hx * 1.1, hy * 1.1, hz * 1.1)
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(hpx, hpy)
        ctx.strokeStyle = '#facc15'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.font = '10px monospace'
        ctx.fillStyle = '#facc15'
        ctx.fillText('B', hpx + 4, hpy - 4)

        // State evolution: Larmor precession
        // H = ω/2 (sin θ cos φ σx + cos θ σz + sin θ sin φ σy)
        // State precesses around B axis at frequency ω
        // Parametrise state on Bloch sphere: (θ_s, φ_s)
        // Precession: rotate state vector around B-axis by ωt
        const initTheta = Math.PI / 3 // initial state angle from z
        const initPhi = 0

        // State vector in Cartesian
        const sx0 = Math.sin(initTheta) * Math.cos(initPhi)
        const sy0 = Math.sin(initTheta) * Math.sin(initPhi)
        const sz0 = Math.cos(initTheta)

        // Rodrigues' rotation around axis (hx,hy,hz) by angle omega*time
        const angle = omega * time
        const cos_a = Math.cos(angle)
        const sin_a = Math.sin(angle)
        const dot = sx0 * hx + sy0 * hy + sz0 * hz
        const sx = sx0 * cos_a + (hy * sz0 - hz * sy0) * sin_a + hx * dot * (1 - cos_a)
        const sy = sy0 * cos_a + (hz * sx0 - hx * sz0) * sin_a + hy * dot * (1 - cos_a)
        const sz = sz0 * cos_a + (hx * sy0 - hy * sx0) * sin_a + hz * dot * (1 - cos_a)

        // Store trail
        trailX[trailIdx] = sx
        trailY[trailIdx] = sy
        trailZ[trailIdx] = sz
        trailIdx = (trailIdx + 1) % TRAIL_LEN
        if (trailCount < TRAIL_LEN) trailCount++

        // Draw precession trail
        if (trailCount > 1) {
          ctx.beginPath()
          for (let i = 0; i < trailCount; i++) {
            const idx = (trailIdx - trailCount + i + TRAIL_LEN) % TRAIL_LEN
            const [px, py] = proj(trailX[idx], trailY[idx], trailZ[idx])
            if (i === 0) {
              ctx.moveTo(px, py)
            } else {
              ctx.lineTo(px, py)
            }
          }
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.4)`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }

        // Draw state vector
        const [spx, spy] = proj(sx, sy, sz)
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(spx, spy)
        ctx.strokeStyle = `rgb(${cr},${cg},${cb})`
        ctx.lineWidth = 2.5
        ctx.stroke()

        // State point (bright dot)
        ctx.beginPath()
        ctx.arc(spx, spy, 5, 0, Math.PI * 2)
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`
        ctx.fill()

        // Glow
        ctx.beginPath()
        ctx.arc(spx, spy, 12, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${cr},${cg},${cb},0.2)`
        ctx.fill()

        // Probability readout
        const p0 = Math.cos(Math.acos(Math.max(-1, Math.min(1, sz))) / 2) ** 2
        ctx.font = '11px monospace'
        ctx.fillStyle = '#4ade80'
        ctx.fillText(`P(|0⟩) = ${p0.toFixed(3)}`, 8, 20)
        ctx.fillStyle = '#f87171'
        ctx.fillText(`P(|1⟩) = ${(1 - p0).toFixed(3)}`, 8, 36)
      },
      destroy() {
        trailIdx = 0
        trailCount = 0
      },
    }
  },
}
