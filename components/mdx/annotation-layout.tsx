'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {connectorPath, type Rect} from './annotation-geometry'
export function AnnotationLayout({children,placement='margin',className=''}:{children:ReactNode;placement?:'margin'|'above'|'below';className?:string}){
 const root=useRef<HTMLDivElement>(null),[drawing,setDrawing]=useState<{path:string;width:number;height:number}|null>(null)
 useEffect(()=>{
  const el=root.current;if(!el)return
  let alive=true,frame=0
  const target=el.querySelector<HTMLElement>('[data-annotation-target]'),note=el.querySelector<HTMLElement>('[data-annotation-note]');if(!target||!note)return
  const measure=()=>{if(!alive)return;const box=el.getBoundingClientRect();const relative=(node:Element):Rect=>{const r=node.getBoundingClientRect();return{x:r.left-box.left,y:r.top-box.top,width:r.width,height:r.height}}
   const anchor=target.querySelector('[data-annotation-anchor]');const path=note.dataset.annotationMark==='none'?null:connectorPath(relative(target),relative(note),anchor?relative(anchor):undefined,note.dataset.annotationMark==='bracket'?'bracket':'arrow')
   const next=window.innerWidth>760&&box.width>200&&path?{path,width:box.width,height:box.height}:null
   setDrawing(old=>JSON.stringify(old)===JSON.stringify(next)?old:next)
  }
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure)}
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(schedule):null
  observer?.observe(el);observer?.observe(target);observer?.observe(note)
  // SVG anchors can move when a live chart's parameters change without resizing.
  const mutations=new MutationObserver(schedule);mutations.observe(target,{attributes:true,childList:true,subtree:true,characterData:true})
  window.addEventListener('resize',schedule);document.fonts?.ready.then(schedule);schedule()
  return()=>{alive=false;cancelAnimationFrame(frame);observer?.disconnect();mutations.disconnect();window.removeEventListener('resize',schedule)}
 },[])
 return <div ref={root} className={`annotation-layout annotation-layout-${placement} ${className}`}>{children}{drawing&&<svg className="annotation-connector-layer" aria-hidden="true" focusable="false" viewBox={`0 0 ${drawing.width} ${drawing.height}`} preserveAspectRatio="none"><path d={drawing.path} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/></svg>}</div>
}
