// @vitest-environment jsdom
import React from 'react'
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {HikeGallery} from './hike-gallery'
import {hikes} from '@/content/hiking'
import type {Asset} from '@/lib/gen/content'

const photos:Asset[]=Array.from({length:24},(_,i)=>({id:String(i),url:`/photo-${i}.webp`,thumb:'',alt:`Photograph ${i+1}`,caption:'',slot:'',lat:0,lng:0,width:1200,height:800,takenAt:''}))
let width=350
const isStrip=(el:Element)=>el.firstElementChild?.getAttribute('aria-label')==='Go to photo 1'
const resizeObservers:{target?:Element;callback:()=>void;disconnect:ReturnType<typeof vi.fn<()=>void>>}[]=[]
const rect=(left:number,width:number)=>({left,right:left+width,top:400,bottom:448,x:left,y:400,width,height:48,toJSON:()=>({})})
let scrollTo:ReturnType<typeof vi.fn>
beforeEach(()=>{
 width=350;resizeObservers.length=0
 vi.stubGlobal('ResizeObserver',class{entry:{target?:Element;callback:()=>void;disconnect:ReturnType<typeof vi.fn<()=>void>>};constructor(callback:()=>void){this.entry={callback,disconnect:vi.fn()};resizeObservers.push(this.entry)}observe(target:Element){this.entry.target=target}disconnect(){this.entry.disconnect()}})
 vi.spyOn(HTMLElement.prototype,'clientWidth','get').mockImplementation(function(this:HTMLElement){return isStrip(this)?width:0})
 vi.spyOn(HTMLElement.prototype,'scrollWidth','get').mockImplementation(function(this:HTMLElement){return isStrip(this)?this.children.length*72:0})
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
  if(isStrip(this))return rect(20,width)
  const match=this.getAttribute('aria-label')?.match(/^Go to photo (\d+)$/)
  return match?rect(24+(Number(match[1])-1)*72-(this.parentElement?.scrollLeft??0),64):rect(0,0)
 })
 scrollTo=vi.fn(function(this:HTMLElement,options:ScrollToOptions){if(options.left!==undefined)this.scrollLeft=options.left})
 vi.stubGlobal('scrollTo',vi.fn())
 Object.defineProperty(HTMLElement.prototype,'scrollTo',{configurable:true,value:scrollTo})
})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();delete (HTMLElement.prototype as Partial<HTMLElement>).scrollTo})
function open(number:number,count=24){render(<HikeGallery gallery={photos.slice(0,count)} hike={hikes[0]} active={null} onSelect={()=>{}}/>);const opener=screen.getByRole('button',{name:`Photograph ${number}`});act(()=>opener.focus());fireEvent.click(opener);const dialog=screen.getByRole('dialog');return {dialog,opener,strip:within(dialog).queryByRole('button',{name:'Go to photo 1'})?.parentElement}}
function currentVisible(strip:HTMLElement){const item=strip.querySelector<HTMLElement>('[aria-current="true"]')!.getBoundingClientRect(),frame=strip.getBoundingClientRect();expect(item.left).toBeGreaterThanOrEqual(frame.left+4);expect(item.right).toBeLessThanOrEqual(frame.right-4)}

describe('selected photograph tracking in the horizontal filmstrip',()=>{
 it('reveals a late photo on opening without moving focus to its thumbnail',()=>{
  const {dialog,strip}=open(24);expect(strip!.scrollLeft).toBe(1378);currentVisible(strip!);expect(document.activeElement).toBe(dialog)
  expect(scrollTo).toHaveBeenLastCalledWith({left:1378,behavior:'instant'})
 })
 it('reveals both wrap directions while retaining arrow focus and vertical content position',()=>{
  const {dialog,strip}=open(1),content=dialog.querySelector('[data-photo-scroll]') as HTMLElement,next=within(dialog).getByRole('button',{name:'Next photo'}),previous=within(dialog).getByRole('button',{name:'Previous photo'})
  content.scrollTop=80;strip!.scrollTop=3;act(()=>previous.focus());fireEvent.click(previous);currentVisible(strip!);expect(strip!.scrollLeft).toBe(1378);expect(document.activeElement).toBe(previous);expect(content.scrollTop).toBe(80);expect(strip!.scrollTop).toBe(3)
  act(()=>next.focus());fireEvent.click(next);currentVisible(strip!);expect(strip!.scrollLeft).toBe(0);expect(document.activeElement).toBe(next);expect(content.scrollTop).toBe(80);expect(window.scrollTo).not.toHaveBeenCalled()
 })
 it('does not move for visible items and minimally reveals clipped items on either edge',()=>{
  const {dialog,strip}=open(3);expect(scrollTo).not.toHaveBeenCalled();fireEvent.keyDown(dialog,{key:'ArrowRight'});expect(scrollTo).not.toHaveBeenCalled()
  fireEvent.keyDown(dialog,{key:'ArrowRight'});expect(strip!.scrollLeft).toBe(10);currentVisible(strip!)
  strip!.scrollLeft=240;fireEvent.keyDown(dialog,{key:'ArrowLeft'});expect(strip!.scrollLeft).toBe(216);currentVisible(strip!)
 })
 it('tracks touch navigation and thumbnail activation without taking their focus',()=>{
  const {dialog,strip}=open(1),stage=within(dialog).getByRole('img',{name:'Photograph 1'}).parentElement!
  fireEvent.touchStart(stage,{touches:[{clientX:100,clientY:100}]});fireEvent.touchEnd(stage,{changedTouches:[{clientX:200,clientY:110}]});currentVisible(strip!);expect(strip!.scrollLeft).toBe(1378)
  const thumb=within(dialog).getByRole('button',{name:'Go to photo 12'});act(()=>thumb.focus());fireEvent.click(thumb);currentVisible(strip!);expect(document.activeElement).toBe(thumb)
 })
 it('preserves manual browsing until selection or width changes and cleans up the observer',()=>{
  const {dialog,strip,opener}=open(24),observer=resizeObservers.find(entry=>entry.target===strip)!
  strip!.scrollLeft=700;fireEvent.scroll(strip!);act(()=>observer.callback());expect(strip!.scrollLeft).toBe(700)
  width=200;act(()=>observer.callback());currentVisible(strip!);expect(strip!.scrollLeft).toBe(1528);expect(document.activeElement).toBe(dialog)
  fireEvent.keyDown(dialog,{key:'Escape'});expect(observer.disconnect).toHaveBeenCalled();expect(document.activeElement).toBe(opener)
 })
 it('does not reset manual browsing when equivalent gallery data is supplied again',()=>{
  const view=render(<HikeGallery gallery={photos} hike={hikes[0]} active={null} onSelect={()=>{}}/>)
  fireEvent.click(screen.getByRole('button',{name:'Photograph 24'}))
  const strip=within(screen.getByRole('dialog')).getByRole('button',{name:'Go to photo 1'}).parentElement!
  strip.scrollLeft=700
  view.rerender(<HikeGallery gallery={[...photos]} hike={hikes[0]} active={null} onSelect={()=>{}}/>)
  expect(strip.scrollLeft).toBe(700)
 })
 it('does not add a filmstrip for a single photo or move a short strip',()=>{
  const single=open(1,1);expect(single.strip).toBeUndefined();expect(scrollTo).not.toHaveBeenCalled();cleanup()
  width=2000;const short=open(3,3);expect(short.strip!.scrollLeft).toBe(0);expect(scrollTo).not.toHaveBeenCalled()
 })
})
