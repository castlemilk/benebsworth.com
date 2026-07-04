import type { HikeWaypoint } from '@/lib/gen/content'

// viewBox is 100 × 74 so 1 user-unit == 1% of width, making an HTML overlay
// trivial to align with the SVG markers. The plate is deliberately tall so the
// route + named landmark labels have room to breathe.
export const VB_W = 100
export const VB_H = 74
export const PAD_X = 9
export const PAD_TOP = 9
export const PAD_BOT = 9

export type Pt = { x: number; y: number }

export function project(w: HikeWaypoint): Pt {
  return {
    x: PAD_X + w.x * (VB_W - 2 * PAD_X),
    y: PAD_TOP + w.y * (VB_H - PAD_TOP - PAD_BOT),
  }
}

/** Catmull-Rom → cubic-bezier smooth path through points. */
export function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return ''
  const d: string[] = [`M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`]
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d.push(`C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`)
  }
  return d.join(' ')
}

// Build an elevation profile (area + line paths over a 100×20 box) by walking the
// waypoints along cumulative planar distance and interpolating elevation with a
// smoothstep. No invented terrain: the line only encodes the authored waypoint
// elevations. `marks` carries each waypoint's position ON the line so the
// component can pin interactive dots to it (in HTML, so they survive the
// strip's non-uniform preserveAspectRatio="none" stretch).
export function buildProfile(wps: HikeWaypoint[]) {
  const pts = wps.map(project)
  const cum: number[] = [0]
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  }
  const total = cum[cum.length - 1] || 1
  const elevs = wps.map((w) => w.elev)
  const minE = Math.min(...elevs)
  const maxE = Math.max(...elevs)
  const span = Math.max(1, maxE - minE)

  const N = 120
  const top = 2
  const bottom = 19
  const elevToY = (e: number) => top + (1 - (e - minE) / span) * (bottom - top)
  const xy: Pt[] = []
  for (let s = 0; s <= N; s++) {
    const d = (s / N) * total
    let seg = 0
    while (seg < cum.length - 2 && cum[seg + 1] < d) seg++
    const t = (d - cum[seg]) / Math.max(0.0001, cum[seg + 1] - cum[seg])
    const ts = t * t * (3 - 2 * t) // smoothstep
    const e = elevs[seg] + (elevs[seg + 1] - elevs[seg]) * ts
    xy.push({ x: (s / N) * 100, y: elevToY(e) })
  }
  const line = xy.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
  const area = `${line} L 100 ${bottom} L 0 ${bottom} Z`
  const marks = cum.map((c, i) => ({ x: (c / total) * 100, y: elevToY(elevs[i]) }))
  return { line, area, marks }
}

/**
 * Canonical anchor id for a stage/day, shared by the trailkit <Stage> (which
 * renders `id={stageAnchor(day)}`) and the journey map (which links waypoint
 * day labels to it). `3` and `"Day 3"` both yield `day-3`.
 */
export function stageAnchor(day: string | number | undefined | null): string | null {
  if (day == null || day === '') return null
  const slug = String(day)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!slug) return null
  return slug.startsWith('day') ? slug.replace(/^day-?/, 'day-') : `day-${slug}`
}

/** Index of the highest waypoint (the peak marker). */
export function peakIndex(wps: HikeWaypoint[]): number {
  return wps.reduce((best, w, i) => (w.elev > wps[best].elev ? i : best), 0)
}
