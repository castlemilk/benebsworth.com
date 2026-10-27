'use client'
import {useEffect,useRef,useState,type ReactNode} from 'react'
import {underlinePaths} from './annotation-geometry'
export function HandUnderline({children}:{children:ReactNode}){
 const root=useRef<HTMLSpanElement>(null),text=useRef<HTMLSpanElement>(null),[drawing,setDrawing]=useState<{paths:string[];width:number;height:number}|null>(null)
 useEffect(()=>{const el=root.current,node=text.current;if(!el||!node)return;let alive=true,frame=0
 const measure=()=>{if(!alive)return;const box=el.getBoundingClientRect();const range=document.createRange();range.selectNodeContents(node);const paths=underlinePaths(Array.from(range.getClientRects()).map(r=>({x:r.left-box.left,y:r.top-box.top,width:r.width,height:r.height})));const next=box.width&&paths.length?{paths,width:box.width,height:box.height}:null;setDrawing(old=>JSON.stringify(old)===JSON.stringify(next)?old:next)}
 const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure)};const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(schedule):null;observer?.observe(el);window.addEventListener('resize',schedule);document.fonts?.ready.then(schedule);schedule();return()=>{alive=false;cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('resize',schedule)}
 },[children])
 return <span ref={root} className="hand-underline" data-measured={!!drawing}><span ref={text}>{children}</span>{drawing&&<svg aria-hidden="true" focusable="false" viewBox={`0 0 ${drawing.width} ${drawing.height}`} preserveAspectRatio="none">{drawing.paths.map((d,i)=><path key={i} d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>)}</svg>}</span>
}
