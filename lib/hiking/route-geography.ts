/** Geographic foundation only. No live trail map consumes this module yet. */
export type LonLat = readonly [longitude: number, latitude: number]
export type Point = Readonly<{ x: number; y: number }>
export type Bounds = Readonly<{ west: number; south: number; east: number; north: number }>
export const CRS = 'EPSG:3857' as const
export const MERCATOR_RADIUS = 6378137
export const MEAN_EARTH_RADIUS = 6371008.8
export const MAX_LATITUDE = 85.0511287798066
const radians = Math.PI / 180
const halfWorld = Math.PI * MERCATOR_RADIUS

export function assertLonLat(coordinate: readonly number[]): asserts coordinate is LonLat {
  if (coordinate.length !== 2 || !coordinate.every(Number.isFinite) ||
      Math.abs(coordinate[0]) > 180 || Math.abs(coordinate[1]) > MAX_LATITUDE) {
    throw new RangeError('Expected finite [longitude, latitude] within Web Mercator coverage')
  }
}

/** No silent latitude clamping, coordinate rounding, smoothing or fitting. */
export function projectLonLat(coordinate: LonLat): Point {
  assertLonLat(coordinate)
  const [longitude, latitude] = coordinate
  return {
    x: MERCATOR_RADIUS * longitude * radians,
    y: MERCATOR_RADIUS * Math.log(Math.tan(Math.PI / 4 + latitude * radians / 2)),
  }
}

export function unprojectPoint(point: Point): LonLat {
  if (![point.x, point.y].every(Number.isFinite) ||
      Math.abs(point.x) > halfWorld + 1e-6 || Math.abs(point.y) > halfWorld + 1e-6) {
    throw new RangeError('Point is outside Web Mercator coverage')
  }
  return [point.x / MERCATOR_RADIUS / radians,
    (2 * Math.atan(Math.exp(point.y / MERCATOR_RADIUS)) - Math.PI / 2) / radians]
}

/** Horizontal spherical distance, not projected, walking or elevation-adjusted distance. */
export function groundDistance(a: LonLat, b: LonLat): number {
  assertLonLat(a)
  assertLonLat(b)
  const dLat = (b[1] - a[1]) * radians
  const dLon = (b[0] - a[0]) * radians
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * radians) * Math.cos(b[1] * radians) * Math.sin(dLon / 2) ** 2
  return 2 * MEAN_EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function lineDistance(coordinates: readonly LonLat[]): number {
  if (coordinates.length < 2) throw new RangeError('A route line needs at least two coordinates')
  return coordinates.slice(1).reduce((sum, coordinate, i) => sum + groundDistance(coordinates[i], coordinate), 0)
}

export type MapViewport = Readonly<{
  crs: typeof CRS
  width: number
  height: number
  center: Point
  pixelsPerProjectedMetre: number
}>

function assertViewport(viewport: MapViewport) {
  if (viewport.crs !== CRS ||
      ![viewport.width, viewport.height, viewport.center.x, viewport.center.y, viewport.pixelsPerProjectedMetre].every(Number.isFinite) ||
      viewport.width <= 0 || viewport.height <= 0 || viewport.pixelsPerProjectedMetre <= 0) {
    throw new RangeError('Expected a finite, positive EPSG:3857 viewport')
  }
}

/** Fit ONCE for the complete map. Route and geography must share this viewport. */
export function fitViewport(bounds: Bounds, width: number, height: number, padding = 24): MapViewport {
  if (![width, height, padding].every(Number.isFinite) || padding < 0 ||
      width <= padding * 2 || height <= padding * 2) throw new RangeError('Invalid map dimensions')
  assertLonLat([bounds.west, bounds.south])
  assertLonLat([bounds.east, bounds.north])
  if (bounds.west >= bounds.east || bounds.south >= bounds.north || bounds.east - bounds.west > 180) {
    throw new RangeError('Expected non-degenerate local bounds; antimeridian wrapping is unsupported')
  }
  const southwest = projectLonLat([bounds.west, bounds.south])
  const northeast = projectLonLat([bounds.east, bounds.north])
  return {
    crs: CRS, width, height,
    center: { x: (southwest.x + northeast.x) / 2, y: (southwest.y + northeast.y) / 2 },
    pixelsPerProjectedMetre: Math.min((width - padding * 2) / (northeast.x - southwest.x),
      (height - padding * 2) / (northeast.y - southwest.y)),
  }
}

export function projectedPixel(point: Point, viewport: MapViewport): Point {
  assertViewport(viewport)
  if (![point.x, point.y].every(Number.isFinite)) throw new RangeError('Expected a finite projected point')
  return {
    x: viewport.width / 2 + (point.x - viewport.center.x) * viewport.pixelsPerProjectedMetre,
    y: viewport.height / 2 - (point.y - viewport.center.y) * viewport.pixelsPerProjectedMetre,
  }
}

export function coordinatePixel(coordinate: LonLat, viewport: MapViewport): Point {
  return projectedPixel(projectLonLat(coordinate), viewport)
}

/** Separate arrays stay separate: never bridge MultiLineString gaps. */
export function projectLines(lines: readonly (readonly LonLat[])[], viewport: MapViewport): Point[][] {
  return lines.map(line => {
    if (line.length < 2) throw new RangeError('A line needs at least two coordinates')
    return line.map(coordinate => coordinatePixel(coordinate, viewport))
  })
}

/** Approximate local spherical ground scale, valid at this explicit latitude only. */
export function localMetresPerPixel(latitude: number, viewport: MapViewport): number {
  assertViewport(viewport)
  assertLonLat([0, latitude])
  return (MEAN_EARTH_RADIUS / MERCATOR_RADIUS) * Math.cos(latitude * radians) / viewport.pixelsPerProjectedMetre
}

/** XYZ (north-origin), not TMS. This computes alignment, never requests tiles. */
export function xyzTileBounds(z: number, x: number, y: number): { northwest: Point; southeast: Point } {
  const count = 2 ** z
  if (!Number.isInteger(z) || z < 0 || z > 22 || !Number.isInteger(x) || !Number.isInteger(y) ||
      x < 0 || y < 0 || x >= count || y >= count) throw new RangeError('Invalid XYZ tile address')
  const size = 2 * halfWorld / count
  return {
    northwest: { x: -halfWorld + x * size, y: halfWorld - y * size },
    southeast: { x: -halfWorld + (x + 1) * size, y: halfWorld - (y + 1) * size },
  }
}
