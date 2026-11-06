import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  CRS, MAX_LATITUDE, MERCATOR_RADIUS, MEAN_EARTH_RADIUS,
  coordinatePixel, fitViewport, groundDistance, lineDistance, localMetresPerPixel,
  projectLines, projectLonLat, projectedPixel, unprojectPoint, xyzTileBounds,
  type Bounds, type LonLat,
} from './route-geography'

const geometry = JSON.parse(readFileSync('public/hiking/routes/overland-standard-osm.json','utf8')) as {geometry:{coordinates:LonLat[][]}}
const coordinates = geometry.geometry.coordinates.flat()
const bounds: Bounds = {west:145.8,east:146.3,south:-42.2,north:-41.5}

describe('one geographic projection and viewport for every map layer', () => {
  it('projects known anchors with longitude first, radians and the Web Mercator radius', () => {
    expect(projectLonLat([0, 0]).x).toBe(0)
    expect(projectLonLat([0, 0]).y).toBeCloseTo(0, 7)
    expect(projectLonLat([180, 0]).x).toBeCloseTo(Math.PI * MERCATOR_RADIUS, 6)
    expect(projectLonLat([0, 45]).y).toBeCloseTo(5621521.486192, 5)
    expect(projectLonLat([0, MAX_LATITUDE]).y).toBeCloseTo(Math.PI * MERCATOR_RADIUS, 5)
    for (const point of [coordinates[0], coordinates[100], coordinates[125], coordinates.at(-1)!]) {
      const roundTrip = unprojectPoint(projectLonLat(point))
      expect(roundTrip[0]).toBeCloseTo(point[0], 11)
      expect(roundTrip[1]).toBeCloseTo(point[1], 11)
    }
  })
  it.each([[1180, 757], [394, 505], [293, 400]])('shares pixels at %i×%i including after pan/zoom', (width, height) => {
    const initial = fitViewport(bounds, width, height)
    expect(initial.crs).toBe(CRS)
    const zoomed = { ...initial, center: { x: initial.center.x + 1000, y: initial.center.y - 300 }, pixelsPerProjectedMetre: initial.pixelsPerProjectedMetre * 1.7 }
    const anchors: LonLat[] = [[bounds.west, bounds.south], [bounds.east, bounds.north],
      [bounds.west, bounds.north], [bounds.east, bounds.south], coordinates[100], coordinates[125]]
    for (const viewport of [initial, zoomed]) {
      for (const point of anchors) {
        // A preprojected geography anchor and the route coordinate use exactly the same transform.
        expect(coordinatePixel(point, viewport)).toEqual(projectedPixel(projectLonLat(point), viewport))
      }
      const center = projectedPixel(viewport.center, viewport)
      const east = projectedPixel({ ...viewport.center, x: viewport.center.x + 100 }, viewport)
      const north = projectedPixel({ ...viewport.center, y: viewport.center.y + 100 }, viewport)
      expect(east.x - center.x).toBeCloseTo(center.y - north.y, 10)
    }
    for (const point of coordinates) {
      const pixel = coordinatePixel(point, initial)
      expect(pixel.x).toBeGreaterThanOrEqual(24 - 1e-6)
      expect(pixel.x).toBeLessThanOrEqual(width - 24 + 1e-6)
      expect(pixel.y).toBeGreaterThanOrEqual(24 - 1e-6)
      expect(pixel.y).toBeLessThanOrEqual(height - 24 + 1e-6)
    }
  })
  it('preserves disjoint line boundaries and exact vertex count without curves', () => {
    const viewport = fitViewport(bounds, 800, 600)
    const lines = [coordinates.slice(0, 25), coordinates.slice(100, 125)]
    const projected = projectLines(lines, viewport)
    expect(projected.map(x => x.length)).toEqual([25, 25])
    expect(projected[0].at(-1)).toEqual(coordinatePixel(coordinates[24], viewport))
    expect(projected[1][0]).toEqual(coordinatePixel(coordinates[100], viewport))
  })
  it('uses north-origin XYZ tiles and aligns tile boundaries with the same viewport', () => {
    const viewport = fitViewport({ west: -20, east: 20, south: -20, north: 20 }, 800, 600)
    const nw = xyzTileBounds(1, 0, 0)
    const se = xyzTileBounds(1, 1, 1)
    expect(nw.southeast).toEqual({ x: 0, y: 0 })
    expect(se.northwest).toEqual({ x: 0, y: 0 })
    expect(projectedPixel(nw.southeast, viewport)).toEqual(projectedPixel(se.northwest, viewport))
    const tile = xyzTileBounds(10, 546, 362)
    const left = projectedPixel(tile.northwest, viewport)
    const right = projectedPixel(tile.southeast, viewport)
    expect(right.x - left.x).toBeCloseTo(right.y - left.y, 8)
    expect(right.y).toBeGreaterThan(left.y)
    expect(xyzTileBounds(10, 547, 362).northwest.x).toBe(tile.southeast.x)
  })
  it('labels local ground scale rather than Mercator metres', () => {
    const viewport = fitViewport(bounds, 800, 600)
    expect(localMetresPerPixel(0, viewport)).toBeCloseTo((MEAN_EARTH_RADIUS / MERCATOR_RADIUS) / viewport.pixelsPerProjectedMetre, 8)
    expect(localMetresPerPixel(60, viewport)).toBeCloseTo(localMetresPerPixel(0, viewport) / 2, 8)
    expect(groundDistance([0, 0], [1, 0])).toBeCloseTo(111195.0802335, 4)
  })
  it('fails closed for invalid geometry, dimensions, unsupported wrapping and CRS', () => {
    for (const coordinate of [[NaN, 1], [181, 0], [0, 90], [0, Infinity]] as LonLat[]) expect(() => projectLonLat(coordinate)).toThrow()
    expect(() => fitViewport({ west: 170, east: -170, south: 0, north: 1 }, 400, 300)).toThrow()
    expect(() => fitViewport(bounds, 40, 300)).toThrow()
    expect(() => lineDistance([])).toThrow()
    expect(() => xyzTileBounds(2, 4, 0)).toThrow()
    expect(() => xyzTileBounds(-1, 0, 0)).toThrow()
    expect(() => unprojectPoint({ x: Infinity, y: 0 })).toThrow()
    expect(() => projectedPixel({ x: 0, y: 0 }, { ...fitViewport(bounds, 400, 300), crs: 'EPSG:4326' as typeof CRS })).toThrow()
    for (const scale of [0, -1, NaN, Infinity]) {
      const invalid = { ...fitViewport(bounds, 400, 300), pixelsPerProjectedMetre: scale }
      expect(() => projectedPixel({ x: 0, y: 0 }, invalid)).toThrow()
      expect(() => localMetresPerPixel(46, invalid)).toThrow()
    }
  })
})
