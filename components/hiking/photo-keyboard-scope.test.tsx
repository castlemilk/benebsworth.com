// @vitest-environment jsdom
import React from 'react'
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {HikeGallery} from './hike-gallery'
import {SiteSearch} from '../search/site-search'
import {hikes} from '@/content/hiking'
import type {Asset} from '@/lib/gen/content'

const photos:Asset[]=['first','second'].map(id=>({id,url:`/photos/${id}.webp`,thumb:'',alt:`Photo ${id}`,caption:'',slot:'',lat:0,lng:0,width:1200,height:800,takenAt:''}))
beforeEach(()=>{
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}})
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:vi.fn(function(this:HTMLDialogElement){this.open=true})})
 Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:vi.fn(function(this:HTMLDialogElement){this.open=false})})
})
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();document.body.style.overflow=''})

function openViewer(){
 render(<><SiteSearch/><HikeGallery hike={hikes[0]} gallery={photos} active={null} onSelect={()=>{}}/></>)
 const opener=screen.getByRole('button',{name:'Photo first'})
 act(()=>opener.focus());fireEvent.click(opener)
 return {opener,viewer:screen.getByRole('dialog')}
}

describe('photo keyboard ownership',()=>{
 it('leaves search cursor keys alone while the native search dialog is above the viewer',()=>{
  const {viewer}=openViewer()
  fireEvent.keyDown(viewer,{key:'k',ctrlKey:true})
  const input=screen.getByRole('textbox',{name:'Search posts and assets'})
  fireEvent.change(input,{target:{value:'mountain'}})
  for(const key of ['ArrowLeft','ArrowRight','Tab']){
   expect(fireEvent.keyDown(input,{key,cancelable:true})).toBe(true)
   expect(viewer.getAttribute('aria-label')).toContain('photo 1 of 2')
   expect(document.activeElement).toBe(input)
  }
 })

 it('dismisses search first, restores viewer focus and scroll lock, then closes only the viewer',()=>{
  document.body.style.overflow='clip'
  const {opener,viewer}=openViewer(),next=within(viewer).getByRole('button',{name:'Next photo'})
  act(()=>next.focus());fireEvent.keyDown(next,{key:'k',metaKey:true})
  fireEvent.keyDown(screen.getByRole('textbox'),{key:'Escape'})
  expect(screen.queryByRole('dialog',{name:'Search'})).toBeNull()
  expect(screen.getByRole('dialog')).toBe(viewer)
  expect(document.activeElement).toBe(next)
  expect(document.body.style.overflow).toBe('hidden')
  fireEvent.keyDown(next,{key:'ArrowRight'})
  expect(viewer.getAttribute('aria-label')).toContain('photo 2 of 2')
  fireEvent.keyDown(next,{key:'Escape'})
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(document.activeElement).toBe(opener)
  expect(document.body.style.overflow).toBe('clip')
 })

 it('keeps repeated shortcut and pointer dismissal separate from photo navigation',()=>{
  const {viewer}=openViewer()
  for(const modifiers of [{ctrlKey:true},{metaKey:true}]){
   fireEvent.keyDown(viewer,{key:'k',...modifiers})
   fireEvent.click(screen.getByRole('button',{name:'Close search'}))
   expect(screen.getByRole('dialog')).toBe(viewer)
   expect(document.activeElement).toBe(viewer)
  }
  fireEvent.keyDown(viewer,{key:'ArrowLeft'})
  expect(viewer.getAttribute('aria-label')).toContain('photo 2 of 2')
 })

 it.each([{altKey:true},{ctrlKey:true},{metaKey:true},{shiftKey:true},{isComposing:true},{keyCode:229}])('does not consume native modified or composing commands: %j',modifiers=>{
  const {viewer}=openViewer()
  for(const key of ['ArrowLeft','ArrowRight','Escape']){
   expect(fireEvent.keyDown(viewer,{key,...modifiers,cancelable:true})).toBe(true)
   expect(screen.getByRole('dialog')).toBe(viewer)
   expect(viewer.getAttribute('aria-label')).toContain('photo 1 of 2')
  }
 })

 it('respects a handled descendant event while retaining plain Tab wrapping and Escape',()=>{
  const {viewer}=openViewer(),next=within(viewer).getByRole('button',{name:'Next photo'})
  next.addEventListener('keydown',event=>event.preventDefault(),{once:true})
  fireEvent.keyDown(next,{key:'ArrowRight'})
  expect(viewer.getAttribute('aria-label')).toContain('photo 1 of 2')
  fireEvent.keyDown(viewer,{key:'Tab',shiftKey:true})
  expect(document.activeElement).toBe(within(viewer).getByRole('button',{name:'Go to photo 2'}))
  fireEvent.keyDown(document.activeElement!,{key:'Tab'})
  expect(document.activeElement).toBe(within(viewer).getByRole('button',{name:'Close'}))
  fireEvent.keyDown(document.activeElement!,{key:'Escape'})
  expect(screen.queryByRole('dialog')).toBeNull()
 })
})
