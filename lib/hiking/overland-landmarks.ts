import type {LonLat} from './route-geography'
/** A named OSM feature retained in the same licensed source as the route.
 * No elevation is asserted and no general mountain/context layer is inferred. */
export const OVERLAND_LANDMARKS=[{
 id:'647695394',version:'7',name:'Pelion Gap',kind:'saddle',
 coordinate:[146.0580786,-41.8639840] as LonLat,
 source:'https://www.openstreetmap.org/node/647695394',
 sourceFile:'data/hiking-routes/overland-track/source/section-7765184.osm',
 sourceSha256:'3dd8165fb648f4ea11584b1bea18f5a05c068ac2e5663b333fffb6af1141efa5',
 editedAt:'2020-12-12T04:51:26Z',acquiredAt:'2026-11-05',license:'ODbL-1.0',
}] as const
