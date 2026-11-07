'use client'
import {useCallback,useEffect,useLayoutEffect,useRef,useState,type RefObject} from 'react'
import {createPortal} from 'react-dom'
import {Camera,Check} from 'lucide-react'
import type {TrailPhotoArea} from '@/lib/hiking/photo-trail'
import type {Asset} from '@/lib/gen/content'
import {thumbOf} from '@/lib/admin/storage'
import {markerPosition,type PhotoMarkerGroup} from '@/lib/hiking/photo-markers'
import type {MapViewport} from '@/lib/hiking/route-geography'
import styles from './photo-markers.module.css'

function Thumbnail({photo}:{photo:Asset}) {
 const [failed,setFailed]=useState(false)
 return failed?<Camera size={20} aria-hidden="true"/>:<img src={thumbOf(photo)} alt="" draggable={false} onError={()=>setFailed(true)}/>
}
/** Gamma Action Menu's selected-item and keyboard contract, adapted to photo
 * areas with viewport containment, 44px rows, and normal onward Tab behavior. */
export function PhotoMarkerControls({groups,viewport,selected,onSelect,fallback,onOpenChange}:{groups:PhotoMarkerGroup[];viewport:MapViewport;selected:string|null;onSelect:(id:string)=>void;fallback:RefObject<HTMLElement|null>;onOpenChange:(open:boolean)=>void}) {
 const [opened,setOpened]=useState<{group:PhotoMarkerGroup;groups:PhotoMarkerGroup[]}|null>(null)
 const trigger=useRef<HTMLButtonElement|null>(null),menu=useRef<HTMLDivElement|null>(null)
 const [position,setPosition]=useState({left:12,top:12,maxHeight:400,width:300})
 // Membership stays stable while a chooser is open, even during a resize.
 const shown=opened?.groups??groups
 const close=useCallback((restore=false)=>{setOpened(null);onOpenChange(false);if(restore)requestAnimationFrame(()=>{if(trigger.current?.isConnected)trigger.current.focus();else fallback.current?.focus()})},[fallback,onOpenChange])
 useLayoutEffect(()=>{
  if(!opened||!menu.current||!trigger.current)return
  function measure(){
   const el=menu.current,anchor=trigger.current;if(!el||!anchor)return
   const view=window.visualViewport,viewLeft=view?.offsetLeft??0,viewTop=view?.offsetTop??0,viewWidth=view?.width??window.innerWidth,viewHeight=view?.height??window.innerHeight
   const rect=anchor.getBoundingClientRect(),height=el.scrollHeight,width=Math.min(300,viewWidth-24),available=viewHeight-24,bottom=viewTop+viewHeight-12
   const below=bottom-rect.bottom-8,above=rect.top-8-viewTop-12,size=Math.min(height,available)
   const top=below>=size?rect.bottom+8:above>=size?rect.top-8-size:Math.max(viewTop+12,Math.min(rect.top,bottom-size))
   setPosition({left:Math.max(viewLeft+12,Math.min(rect.left,viewLeft+viewWidth-width-12)),top:Math.max(viewTop+12,Math.min(top,bottom-size)),maxHeight:available,width})
  }
  measure();window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);window.visualViewport?.addEventListener('resize',measure);window.visualViewport?.addEventListener('scroll',measure)
  const focusedItem=(menu.current.querySelector<HTMLElement>('[aria-checked="true"]')??menu.current.querySelector<HTMLElement>('[role="menuitemradio"]'))
  focusedItem?.focus()
  return()=>{window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true);window.visualViewport?.removeEventListener('resize',measure);window.visualViewport?.removeEventListener('scroll',measure)}
 },[opened])
 useEffect(()=>{
  if(!opened)return
  const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!menu.current?.contains(event.target)&&!trigger.current?.contains(event.target))close()}
  document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)
 },[opened,close])
 function activate(group:PhotoMarkerGroup,button:HTMLButtonElement){trigger.current=button;if(group.areas.length===1){onSelect(group.areas[0].id);return}if(opened?.group.id===group.id){close();return}onOpenChange(true);setOpened({group,groups:shown})}
 function choose(area:TrailPhotoArea){onSelect(area.id);close(true)}
 return <>
  {shown.map(group=>{const p=markerPosition(group,viewport),selectedArea=group.areas.find(area=>area.id===selected),active=!!selectedArea,multiple=group.areas.length>1;const photos=(multiple?group.areas.map(area=>area.photos[0]):group.areas[0].photos).slice(0,3);return <button key={group.id} type="button" className={`${styles.marker} ${active?styles.selected:''}`} style={{left:p.x,top:p.y}} data-photo-focus-target data-selected-photo-area={selectedArea?.id} aria-description={selectedArea&&multiple?`Includes selected photo area ${selectedArea.number}`:undefined} aria-label={multiple?`Choose from ${group.areas.length} photo areas`: `Select photo area ${group.areas[0].number}, ${group.areas[0].photos.length} photograph${group.areas[0].photos.length===1?'':'s'}`} aria-haspopup={multiple?'menu':undefined} aria-expanded={multiple?opened?.group.id===group.id:undefined} aria-pressed={!multiple?active:undefined} onClick={event=>activate(group,event.currentTarget)} onKeyDown={event=>{if(multiple&&event.key==='ArrowDown'){event.preventDefault();activate(group,event.currentTarget)}}}>
   <span className={styles.stack} aria-hidden="true">{photos.slice().reverse().map((photo,index)=><span key={photo.url} style={{'--layer':photos.length-index-1} as React.CSSProperties}><Thumbnail photo={photo}/></span>)}</span>
   <span className={styles.markerLabel}>{multiple?`${group.areas.length} areas`:`Area ${group.areas[0].number}`}</span>
  </button>})}
  {opened&&createPortal(<div ref={menu} className={styles.menu} role="menu" aria-label="Choose a photo area" style={position} onKeyDown={event=>{
   const items=[...menu.current!.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')],index=items.indexOf(document.activeElement as HTMLButtonElement)
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true)}
   else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items[next]?.focus()}
   else if(event.key==='Tab'){// Return to the trigger before the browser performs its normal Tab step.
    trigger.current?.focus();close()
   }
  }} onBlur={event=>{if(event.relatedTarget&&!event.currentTarget.contains(event.relatedTarget)&&event.relatedTarget!==trigger.current)close()}}>
   <p className={styles.menuHeading} role="presentation">Approximate photo areas</p>
   {opened.group.areas.map(area=><button key={area.id} type="button" tabIndex={-1} role="menuitemradio" aria-checked={selected===area.id} className={styles.choice} onClick={()=>choose(area)}><span className={styles.choicePhoto} aria-hidden="true"><Thumbnail photo={area.photos[0]}/></span><span>Area {area.number}<small>{area.photos.length} photograph{area.photos.length===1?'':'s'}</small></span>{selected===area.id&&<Check size={18} aria-hidden="true"/>}</button>)}
  </div>,document.body)}
 </>
}
