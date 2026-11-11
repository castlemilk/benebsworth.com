import type {TrailPhotoArea} from './photo-trail'
import {coordinatePixel,type MapViewport} from './route-geography'
export type PhotoMarkerGroup={id:string;areas:TrailPhotoArea[];anchor:TrailPhotoArea}
export const PHOTO_MARKER_SIZE=64
export function markerPosition(group:PhotoMarkerGroup,viewport:MapViewport){
 const anchor=coordinatePixel(group.anchor.center,viewport)
 return {anchor,x:Math.max(36,Math.min(viewport.width-36,anchor.x+34)),y:Math.max(36,Math.min(viewport.height-36,anchor.y))}
}
function groupOf(areas:TrailPhotoArea[],viewport:MapViewport):PhotoMarkerGroup{
 const sorted=[...areas].sort((a,b)=>a.number-b.number),points=sorted.map(area=>coordinatePixel(area.center,viewport))
 const average={x:points.reduce((n,p)=>n+p.x,0)/points.length,y:points.reduce((n,p)=>n+p.y,0)/points.length}
 let best=0
 for(let i=1;i<points.length;i++)if(Math.hypot(points[i].x-average.x,points[i].y-average.y)<Math.hypot(points[best].x-average.x,points[best].y-average.y))best=i
 return {id:sorted.map(area=>area.id).join('_'),areas:sorted,anchor:sorted[best]}
}
/** Screen-space overlap grouping. Every anchor is an existing coarse cell,
 * never a new geographic centre or a photograph's precise GPS location. */
export function groupPhotoMarkers(areas:TrailPhotoArea[],viewport:MapViewport):PhotoMarkerGroup[]{
 const groups=areas.map(area=>groupOf([area],viewport))
 for(let merged=true;merged;){
  merged=false
  outer:for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++){
   const a=markerPosition(groups[i],viewport),b=markerPosition(groups[j],viewport)
   if(Math.abs(a.x-b.x)<PHOTO_MARKER_SIZE+8&&Math.abs(a.y-b.y)<PHOTO_MARKER_SIZE+8){
    groups[i]=groupOf([...groups[i].areas,...groups[j].areas],viewport);groups.splice(j,1);merged=true;break outer
   }
  }
 }
 return groups.sort((a,b)=>a.areas[0].number-b.areas[0].number)
}
