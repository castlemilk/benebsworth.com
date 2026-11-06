import type { Asset } from '@/lib/gen/content'
import { hasRecordedLocation } from './photo-discovery'
import { galleryAssignmentNotice } from './gallery-source-review'
import { assertLonLat, groundDistance, MAX_LATITUDE, type Bounds, type LonLat } from './route-geography'

export const OVERLAND_REFERENCE_URL = '/hiking/routes/overland-standard-osm.json'
export const OVERLAND_REFERENCE_SHA256 = '0a8751d4c41582ad177851e7da4378ece285a07c42b802604e7f515a80bfccc2'
/** Reject changed route bytes before rendering the retained reference. */
export async function readRetainedPhotoTrail(text:string) {
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),byte=>byte.toString(16).padStart(2,'0')).join('')
  if(hash!==OVERLAND_REFERENCE_SHA256) throw new Error('Walking reference integrity mismatch')
  return readPhotoTrailReference(JSON.parse(text))
}
export const PHOTO_TRAIL_RADIUS_METRES = 2000
export const PHOTO_AREA_GRID_DEGREES = 0.02
export type PhotoTrailReference = { slug: 'overland-track'; lines: LonLat[][]; bounds: Bounds }
export type TrailPhotoArea = { id: string; number: number; bounds: Bounds; center: LonLat; photos: Asset[] }
export type PhotoTrailReason = 'no-location' | 'outside-reference' | 'unsupported-projection' | 'unverified-source'
export type PhotoTrailConnections = { areas: TrailPhotoArea[]; unmatched: Map<string, PhotoTrailReason>; linkedCount: number }

/** Exact retained source structure only; separate sections never become a joined line. */
export function readPhotoTrailReference(value: unknown): PhotoTrailReference {
  const data = value as {type?:string;properties?:Record<string,unknown>;geometry?:{type?:string;coordinates?:unknown}}
  if (data?.type !== 'Feature' || data.properties?.source !== 'https://api.openstreetmap.org/api/0.6/relation/1673569/full' || data.properties?.relationVersion !== '33' || data.properties?.license !== 'ODbL-1.0' || data.geometry?.type !== 'MultiLineString') throw new Error('Unexpected walking reference')
  const lines = data.geometry.coordinates
  const counts = [702,716,1067,527,1093,969]
  if (!Array.isArray(lines) || lines.length !== counts.length) throw new Error('Missing source sections')
  for (const [index,line] of lines.entries()) {
    if (!Array.isArray(line) || line.length !== counts[index]) throw new Error('Changed source section')
    for (const point of line) {
      if (!Array.isArray(point)) throw new Error('Invalid route coordinate')
      assertLonLat(point)
      if (point[0] < 145.8 || point[0] > 146.3 || point[1] < -42.3 || point[1] > -41.5) throw new Error('Reference outside expected region')
    }
  }
  const typed = lines as LonLat[][]
  const points = typed.flat()
  // Fixed route extent with a coarse-area margin; remote photographs cannot zoom out the map.
  return {slug:'overland-track',lines:typed,bounds:{west:Math.min(...points.map(p=>p[0]))-.03,east:Math.max(...points.map(p=>p[0]))+.03,south:Math.min(...points.map(p=>p[1]))-.03,north:Math.max(...points.map(p=>p[1]))+.03}}
}

/** Local ground approximation for short source segments, then spherical distance.
 * Never tests an invented segment between separate sections. No route snapping. */
export function nearestReferenceMetres(point: LonLat, lines: readonly (readonly LonLat[])[]) {
  assertLonLat(point)
  const cos = Math.cos(point[1] * Math.PI / 180)
  let nearest = Infinity
  for (const line of lines) for (let i=1;i<line.length;i++) {
    const a=line[i-1],b=line[i]
    const ax=(a[0]-point[0])*cos,ay=a[1]-point[1],bx=(b[0]-point[0])*cos,by=b[1]-point[1]
    const dx=bx-ax,dy=by-ay
    const t=dx*dx+dy*dy===0 ? 0 : Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy)))
    nearest=Math.min(nearest,groundDistance(point,[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]))
  }
  return nearest
}

/** Only published assets are input. New output positions are coarse grid areas,
 * never exact photograph GPS, guessed places, offsets or route-snapped points. */
export function connectPhotosToTrail(slug:string,gallery:Asset[],reference:PhotoTrailReference): PhotoTrailConnections {
  const areas:TrailPhotoArea[]=[], cells=new Map<string,TrailPhotoArea>(), unmatched=new Map<string,PhotoTrailReason>()
  const blocked=slug!==reference.slug || Boolean(galleryAssignmentNotice(slug,gallery))
  for (const photo of gallery) {
    if(blocked) { unmatched.set(photo.url,'unverified-source');continue }
    if(!hasRecordedLocation(photo)) {unmatched.set(photo.url,'no-location');continue}
    if(Math.abs(photo.lat)>MAX_LATITUDE) {unmatched.set(photo.url,'unsupported-projection');continue}
    if(nearestReferenceMetres([photo.lng,photo.lat],reference.lines)>PHOTO_TRAIL_RADIUS_METRES) {unmatched.set(photo.url,'outside-reference');continue}
    // Eligibility is per photograph BEFORE grouping: an eligible cell cannot admit an outside photo.
    const col=Math.floor(photo.lng/PHOTO_AREA_GRID_DEGREES), row=Math.floor(photo.lat/PHOTO_AREA_GRID_DEGREES), key=`${col}:${row}`
    let area=cells.get(key)
    if(!area) {
      const west=col*PHOTO_AREA_GRID_DEGREES,south=row*PHOTO_AREA_GRID_DEGREES
      area={id:`trail-area-${areas.length+1}`,number:areas.length+1,bounds:{west,south,east:west+PHOTO_AREA_GRID_DEGREES,north:south+PHOTO_AREA_GRID_DEGREES},center:[west+PHOTO_AREA_GRID_DEGREES/2,south+PHOTO_AREA_GRID_DEGREES/2],photos:[]}
      cells.set(key,area);areas.push(area)
    }
    area.photos.push(photo)
  }
  return {areas,unmatched,linkedCount:areas.reduce((n,area)=>n+area.photos.length,0)}
}

export const photoTrailReasonText:Record<PhotoTrailReason,string>={
  'no-location':'No usable published location. This photograph remains in the gallery.',
  'outside-reference':'Outside the 2 km reference corridor. This may be a side trip or transfer; no route position is inferred.',
  'unsupported-projection':'This location is outside the supported map projection. This photograph remains in the gallery.',
  'unverified-source':'Photo-to-trail assignment is unverified. No position is shown on this reference.',
}
