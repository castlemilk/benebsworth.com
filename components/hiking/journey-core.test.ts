import { describe, it, expect } from 'vitest'
import { project, smoothPath, buildProfile, peakIndex, VB_W, VB_H } from './journey-core'
import type { HikeWaypoint } from '@/lib/gen/content'

const wp = (x: number, y: number, elev: number): HikeWaypoint =>
  ({ name: 'p', x, y, elev, day: '', note: '' }) as HikeWaypoint

describe('journey-core', () => {
  it('projects normalized coords into the padded viewBox', () => {
    expect(project(wp(0, 0, 0))).toEqual({ x: 9, y: 9 })
    expect(project(wp(1, 1, 0))).toEqual({ x: VB_W - 9, y: VB_H - 9 })
  })

  it('smoothPath starts with a moveto and is empty for <2 points', () => {
    expect(smoothPath([])).toBe('')
    const d = smoothPath([{ x: 0, y: 0 }, { x: 10, y: 10 }])
    expect(d.startsWith('M 0.00 0.00')).toBe(true)
    expect(d).toContain('C ')
  })

  it('peakIndex finds the highest waypoint', () => {
    expect(peakIndex([wp(0, 0, 100), wp(0, 0, 900), wp(0, 0, 300)])).toBe(1)
  })

  it('buildProfile returns line/area/marks with one mark per waypoint', () => {
    const wps = [wp(0, 0.5, 100), wp(0.5, 0.2, 800), wp(1, 0.5, 200)]
    const p = buildProfile(wps)
    expect(p.line.startsWith('M ')).toBe(true)
    expect(p.area.endsWith('Z')).toBe(true)
    expect(p.marks).toHaveLength(3)
  })
})
