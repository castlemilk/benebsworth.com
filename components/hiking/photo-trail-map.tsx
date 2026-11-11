'use client'
import {useId,useMemo,useRef,useState,useLayoutEffect,type RefObject} from 'react'
import type {PhotoTrailConnections,PhotoTrailReference} from '@/lib/hiking/photo-trail'
import {coordinatePixel,fitViewport,projectLines} from '@/lib/hiking/route-geography'
import {thumbOf} from '@/lib/admin/storage'
import type {Asset} from '@/lib/gen/content'
import styles from './photo-trail.module.css'
import {TrailButton,TrailPhotoButton,TrailSelect} from './trail-controls'
import {PhotoMarkerControls} from './photo-marker-controls'
import {groupPhotoMarkers,markerPosition,type PhotoMarkerGroup} from '@/lib/hiking/photo-markers'
import {OVERLAND_LANDMARKS} from '@/lib/hiking/overland-landmarks'
import {ArrowDownRight} from 'lucide-react'

export function PhotoTrailMap({reference,connections,selected,onSelect,onBrowse,headingRef,mapFocusRef,loading,error,onRetry,galleryLoading,galleryError}: {
 reference:PhotoTrailReference|null; connections:PhotoTrailConnections|null; selected:string|null;onSelect:(id:string|null)=>void;onBrowse:()=>void;headingRef:RefObject<HTMLHeadingElement|null>;mapFocusRef:RefObject<HTMLElement|null>;loading:boolean;error:boolean;onRetry:()=>void;galleryLoading:boolean;galleryError:boolean
}) {
 const id=useId()
 const figureRef=useRef<HTMLElement>(null)
 const [width,setWidth]=useState(640)
 useLayoutEffect(()=>{const el=figureRef.current;if(!el)return;const measure=()=>setWidth(Math.max(240,el.clientWidth||640));measure();const observer=new ResizeObserver(measure);observer.observe(el);return ()=>observer.disconnect()},[reference])
 const height=Math.max(480,Math.min(680,width*1.3))
 const viewport=useMemo(()=>reference ? fitViewport(reference.bounds,width,height,32):null,[reference,width,height])
 const paths=useMemo(()=>reference&&viewport ? projectLines(reference.lines,viewport).map(line=>line.map((p,i)=>`${i?'L':'M'}${p.x},${p.y}`).join(' ')):[],[reference,viewport])
 const [frozenGroups,setFrozenGroups]=useState<PhotoMarkerGroup[]|null>(null)
 const groups=useMemo(()=>viewport?groupPhotoMarkers(connections?.areas??[],viewport):[],[connections,viewport])
 const shownGroups=frozenGroups??groups
 const area=connections?.areas.find(area=>area.id===selected)
 const previewPhoto=area?.photos[0]??(!selected?connections?.areas[0]?.photos[0]:undefined)
 return <section className={styles.section} aria-labelledby={`${id}-title`}>
  <div className={styles.heading}><div><h2 id={`${id}-title`} ref={headingRef} tabIndex={-1}>Photographs along the trail</h2></div><p>Choose an area on the walking reference, then look through the photographs taken nearby.</p></div>
  {loading ? <p role="status">Loading the walking reference…</p> : error ? <div role="alert"><p>The walking reference could not be loaded. The gallery is still available below.</p><TrailButton onClick={onRetry}>Retry walking reference</TrailButton></div> : reference&&viewport ? <>
   <div className={styles.layout}>
    <figure data-photo-focus-target ref={element=>{figureRef.current=element;mapFocusRef.current=element}} tabIndex={-1} aria-label="Overland photo areas and walking reference" className={styles.figure}>
     <div className={styles.mapSurface}>
     <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${id}-map-title`} aria-describedby={`${id}-map-desc`}>
      <title id={`${id}-map-title`}>Overland standard walking reference with approximate photo areas</title>
      <desc id={`${id}-map-desc`}>Six unjoined source sections with a 185 metre source gap. Shaded areas contain published photographs near the reference. Photograph stacks group nearby screen positions; their connectors lead to coarse photo cells, not precise photograph locations. Pelion Gap is a sourced saddle. Choose an area using a stack or the adjacent selector. No terrain or basemap is inferred.</desc>
      <text x="22" y="30" className={styles.north}>N ↑</text>
      {connections?.areas.map(item=>{const nw=coordinatePixel([item.bounds.west,item.bounds.north],viewport),se=coordinatePixel([item.bounds.east,item.bounds.south],viewport);return <rect key={item.id} x={nw.x} y={nw.y} width={se.x-nw.x} height={se.y-nw.y} className={`${styles.area} ${selected===item.id?styles.selected:''}`} />})}
      {paths.map((path,index)=><path key={index} data-source-section={index+1} d={path} className={styles.route}/>)}
      {shownGroups.map(group=>{const p=markerPosition(group,viewport);return <g key={group.id} aria-hidden="true"><path d={`M${p.anchor.x},${p.anchor.y} L${p.x},${p.y}`} className={styles.photoLeader}/><circle cx={p.anchor.x} cy={p.anchor.y} r="2.5" className={styles.photoAnchor}/></g>})}
      {OVERLAND_LANDMARKS.map(landmark=>{
       const p=coordinatePixel(landmark.coordinate,viewport),labelWidth=140
       const candidates=[{x:p.x-10,y:p.y-10,side:'end' as const},{x:p.x-10,y:p.y+20,side:'end' as const},{x:p.x+10,y:p.y-10,side:'start' as const},{x:p.x+10,y:p.y+20,side:'start' as const}]
       const label=candidates.find(candidate=>{const left=candidate.side==='end'?candidate.x-labelWidth:candidate.x,right=left+labelWidth;return left>8&&right<width-8&&candidate.y>18&&candidate.y<height-8&&!shownGroups.some(group=>{const m=markerPosition(group,viewport);return m.x+36>left&&m.x-36<right&&m.y+36>candidate.y-14&&m.y-36<candidate.y+3})})
       return <g key={landmark.id} data-landmark={landmark.id}><title>{landmark.name}, mapped {landmark.kind}. OpenStreetMap source edited December 2020.</title><path d={`M${p.x},${p.y-5} l5,5 l-5,5 l-5,-5 Z`} className={styles.landmark}/>{label&&<text x={label.x} y={label.y} textAnchor={label.side} className={styles.landmarkLabel}>{landmark.name} · {landmark.kind}</text>}</g>
      })}
      {reference.lines.slice(0,2).map((line,index)=>{const point=coordinatePixel(index===0?line.at(-1)!:line[0],viewport);return <circle key={index} cx={point.x} cy={point.y} r="5" className={styles.gap}/>})}
     </svg>
     <PhotoMarkerControls groups={shownGroups} viewport={viewport} selected={selected} onSelect={onSelect} fallback={mapFocusRef} onOpenChange={open=>setFrozenGroups(open?shownGroups:null)}/>
     </div>
     <figcaption>Approximate photo areas · about 1.7 × 2.2 km each. Stacks group photo areas, not exact positions. Open circles mark a 185 m source gap. Diamond: Pelion Gap saddle. No terrain or basemap.</figcaption>
    </figure>
    <div className={styles.controls}>
     {galleryLoading ? <p role="status">Loading photo locations…</p>:galleryError?<p>Photo locations are unavailable until the gallery loads successfully.</p>:<>

      {!!connections?.areas.length && <TrailSelect className={styles.field} label="Photo area" value={selected??''} onChange={e=>onSelect(e.target.value||null)}><option value="">All photographs</option>{connections.areas.map(item=><option key={item.id} value={item.id}>Area {item.number} · {item.photos.length} photo{item.photos.length===1?'':'s'}</option>)}{!!connections.unmatched.size&&<option value="unlinked">Not linked to reference · {connections.unmatched.size}</option>}</TrailSelect>}

      {previewPhoto?<AreaPreview key={previewPhoto.url} photo={previewPhoto} count={area?.photos.length??((connections?.linkedCount??0)+(connections?.unmatched.size??0))} onBrowse={onBrowse}/>:<TrailButton variant="primary" icon={<ArrowDownRight size={18}/>} className={styles.primary} onClick={onBrowse}>{selected==='unlinked'?'View unlinked photographs':'View all photographs'}</TrailButton>}
      {!!connections?.unmatched.size&&<TrailButton variant="quiet" className={styles.other} onClick={()=>onSelect('unlinked')}>Not linked to reference · {connections.unmatched.size}</TrailButton>}
      {!connections?.areas.length&&<p>No photographs can currently be placed near this reference. All remain available in the gallery.</p>}
     </>}
     <aside className={styles.warning}>
      <p>Standard walking reference, not Ben’s recorded trek. Photo areas are approximate. Not for navigation.</p>
      <details><summary>About these locations &amp; the route</summary>
       {galleryLoading||galleryError?<p>Photo locations become available after the gallery loads.</p>:<p>{connections?.linkedCount??0} photograph{connections?.linkedCount===1?' has':'s have'} published locations within 2 km of the retained walking segments. Proximity does not establish a walked route or stage. Other photographs remain in the gallery without an inferred trail position.</p>}
       <p>The reference includes the Lake St Clair lakeshore walk; Ben’s authored trip finished by ferry and included side trips not mapped here.</p>
       <p>Six source sections remain separate. An unresolved 185 m gap near Waterfall Valley is marked with two open circles. No connector is invented.</p>
       <p>Photo stacks are displaced for readability; a fine connector marks their existing coarse cell. Nearby cells may share a chooser. They do not mark exact camera positions.</p>
       <p><a href="https://www.openstreetmap.org/node/647695394">Pelion Gap</a> is a mapped saddle from the retained OSM source, last edited 12 December 2020. No elevation or summit location is asserted. Other mountain landmarks are not yet available in the verified source.</p>
       <p>North-up, EPSG:3857. Route and 0.02° photo cells share one projection. Source acquired 5 November 2026; it does not establish current trail conditions.</p>
      </details>
     </aside>
     <p className={styles.credit}>© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL 1.0</a> · <a href="https://www.openstreetmap.org/relation/1673569">Source relation</a></p>
    </div>
   </div>
  </>:null}
 </section>
}

function AreaPreview({photo,count,onBrowse}:{photo:Asset;count:number;onBrowse:()=>void}) {
 const [failed,setFailed]=useState(false)
 return <TrailPhotoButton onClick={onBrowse} media={failed?<span className={styles.previewError}>Photo preview unavailable</span>:<img src={thumbOf(photo)} alt="" onError={()=>setFailed(true)}/>}>
  View {count} photograph{count===1?'':'s'}
 </TrailPhotoButton>
}
